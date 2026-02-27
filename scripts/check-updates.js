/**
 * 预检脚本：用 curl -I (HEAD request) + ETag/Last-Modified 探测项目是否有更新
 *
 * 逻辑：
 * 1. 从 API 拉取所有项目列表（含 update_source_url）
 * 2. 从缓存文件读取上次的 ETag/Last-Modified（由 actions/cache 恢复）
 * 3. 并发对每个有 update_source_url 的项目发送 HEAD 请求
 *    - 若响应 304 Not Modified → 未变化
 *    - 若响应其他状态 → 视为可能已更新
 * 4. 将可能更新的项目名列表写入 /tmp/changed-projects.txt
 * 5. 将新的 ETag/Last-Modified 写回缓存文件（由 actions/cache 保存）
 *
 * 环境变量：
 *   SITE_URL      - API 根地址，如 https://zitons-logup-re.hf.space
 *   ETAG_CACHE    - ETag 缓存文件路径，默认 /tmp/etag-cache.json
 *   CHANGED_FILE  - 输出文件路径，默认 /tmp/changed-projects.txt
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

const SITE_URL = (process.env.SITE_URL || 'https://zitons-logup-re.hf.space').replace(/\/$/, '');
const ETAG_CACHE = process.env.ETAG_CACHE || '/tmp/etag-cache.json';
const CHANGED_FILE = process.env.CHANGED_FILE || '/tmp/changed-projects.txt';
const CONCURRENCY = 10;
const REQUEST_TIMEOUT = 12000;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: REQUEST_TIMEOUT }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout fetching ${url}`)); });
  });
}

function headRequest(url, etag, lastModified) {
  return new Promise((resolve) => {
    const headers = { 'User-Agent': 'logup-update-probe/1.0' };
    if (etag) headers['If-None-Match'] = etag;
    if (lastModified) headers['If-Modified-Since'] = lastModified;

    try {
      const parsedUrl = new URL(url);
      const mod = parsedUrl.protocol === 'https:' ? https : http;
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'HEAD',
        headers,
        timeout: REQUEST_TIMEOUT,
      };
      const req = mod.request(options, (res) => {
        res.resume(); // drain
        resolve({
          status: res.statusCode,
          etag: res.headers['etag'] || null,
          lastModified: res.headers['last-modified'] || null,
          unchanged: res.statusCode === 304,
        });
      });
      req.on('error', () => resolve({ status: 0, unchanged: null }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, unchanged: null }); });
      req.end();
    } catch {
      resolve({ status: 0, unchanged: null });
    }
  });
}

async function fetchAllProjects() {
  const results = [];
  let page = 1;
  while (true) {
    const data = await fetchJson(`${SITE_URL}/api/projects?page=${page}&per_page=100`);
    const items = data.data || [];
    results.push(...items);
    if (items.length < 100 || page >= data.total_pages) break;
    page++;
  }
  return results;
}

async function main() {
  console.log('[check-updates] Starting ETag probe...');

  // Load ETag cache
  let cache = {};
  try {
    if (fs.existsSync(ETAG_CACHE)) {
      cache = JSON.parse(fs.readFileSync(ETAG_CACHE, 'utf-8'));
      console.log(`[check-updates] Loaded cache with ${Object.keys(cache).length} entries`);
    }
  } catch {
    console.log('[check-updates] No valid cache found, starting fresh');
  }

  // Fetch all projects
  let projects;
  try {
    projects = await fetchAllProjects();
  } catch (e) {
    console.error(`[check-updates] Failed to fetch projects: ${e.message}`);
    fs.writeFileSync(CHANGED_FILE, '');
    process.exit(0);
  }

  const probeTargets = projects.filter((p) => p.update_source_url);
  console.log(`[check-updates] ${projects.length} projects total, ${probeTargets.length} have update_source_url`);

  const changedNames = [];
  const newCache = { ...cache };

  // Process in batches
  for (let i = 0; i < probeTargets.length; i += CONCURRENCY) {
    const batch = probeTargets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (p) => {
        const cached = cache[p.id] || {};
        const result = await headRequest(p.update_source_url, cached.etag, cached.lastModified);

        if (result.unchanged === null) {
          // Network error — skip silently, don't mark as changed
          return;
        }

        const isFirstCheck = !cached.etag && !cached.lastModified;

        // Update cache with new ETag/Last-Modified if available
        if (result.etag || result.lastModified) {
          newCache[p.id] = {
            etag: result.etag,
            lastModified: result.lastModified,
            url: p.update_source_url,
            checkedAt: new Date().toISOString(),
          };
        }

        if (isFirstCheck) {
          // First time seeing this project — just record baseline, don't flag as changed
          console.log(`[check-updates] baseline (${result.status}): ${p.name} — first check, recording`);
          return;
        }

        if (result.unchanged) {
          // Server returned 304 Not Modified
          console.log(`[check-updates] unchanged (304): ${p.name}`);
          return;
        }

        // Server returned 200 — compare ETag / Last-Modified values
        // If either header is the same as cached, treat as unchanged
        const etagSame = result.etag && cached.etag && result.etag === cached.etag;
        const lmSame = result.lastModified && cached.lastModified && result.lastModified === cached.lastModified;
        const noHeaders = !result.etag && !result.lastModified;

        if (etagSame || lmSame) {
          // At least one header matches — unchanged
          console.log(`[check-updates] unchanged (${result.status}): ${p.name}`);
        } else if (noHeaders) {
          // Server doesn't support caching headers — cannot determine, skip
          console.log(`[check-updates] no-cache (${result.status}): ${p.name} — server has no ETag/Last-Modified`);
        } else {
          // Both available headers differ from cache — likely changed
          console.log(`[check-updates] CHANGED  (${result.status}): ${p.name}`);
          changedNames.push(p.name);
        }
      })
    );
  }

  // Save updated cache
  try {
    fs.writeFileSync(ETAG_CACHE, JSON.stringify(newCache, null, 2));
  } catch (e) {
    console.warn(`[check-updates] Could not write cache: ${e.message}`);
  }

  // Write changed project list
  fs.writeFileSync(CHANGED_FILE, changedNames.join('\n'));
  console.log(`[check-updates] Done. ${changedNames.length}/${probeTargets.length} projects may have updates`);
}

main().catch((e) => {
  console.error('[check-updates] Fatal error:', e.message);
  fs.writeFileSync(CHANGED_FILE, '');
  process.exit(0); // Don't fail the workflow on probe errors
});
