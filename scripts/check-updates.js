/**
 * 预检脚本：检测项目是否有更新
 *
 * 逻辑：
 * 1. 从 API 拉取所有项目列表（含 update_source_url）
 * 2. 从缓存文件读取上次记录（由 actions/cache 恢复）
 * 3. 并发探测每个有 update_source_url 的项目：
 *    - GitHub URL → 调用 GitHub API /releases/latest，比较 tag_name
 *    - 其他 URL   → HEAD 请求，比较 ETag/Last-Modified；
 *                   若服务器不返回缓存头（no-cache），则比较 Content-Length：
 *                   Content-Length 有变化（或缺失）→ 加入 no-cache 列表交 AI 筛查；
 *                   Content-Length 相同 → 视为未变化
 * 4. 将确认有更新的项目名列表写入 /tmp/changed-projects.txt
 *    将需 AI 筛查的 no-cache 项目名列表写入 /tmp/nocache-projects.txt
 * 5. 将新的缓存数据写回文件（由 actions/cache 保存）
 *
 * 环境变量：
 *   SITE_URL      - API 根地址，如 https://zitons-logup-re.hf.space
 *   GITHUB_TOKEN  - GitHub Personal Access Token（用于 GitHub API）
 *   ETAG_CACHE    - 缓存文件路径，默认 /tmp/etag-cache.json
 *   CHANGED_FILE  - 输出文件路径，默认 /tmp/changed-projects.txt
 *   NOCACHE_FILE  - no-cache 输出文件路径，默认 /tmp/nocache-projects.txt
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

const SITE_URL = (process.env.SITE_URL || 'https://zitons-logup-re.hf.space').replace(/\/$/, '');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const ETAG_CACHE = process.env.ETAG_CACHE || '/tmp/etag-cache.json';
const CHANGED_FILE = process.env.CHANGED_FILE || '/tmp/changed-projects.txt';
const NOCACHE_FILE = process.env.NOCACHE_FILE || '/tmp/nocache-projects.txt';
const CONCURRENCY = 10;
const REQUEST_TIMEOUT = 12000;

function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const options = { headers: { 'User-Agent': 'logup-update-probe/1.0', ...headers } };
    const req = mod.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout fetching ${url}`)); });
  });
}

/**
 * GitHub URL → extract owner/repo
 * Matches github.com/{owner}/{repo} with any optional trailing path
 */
function parseGitHubRepo(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'github.com') {
      const parts = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
    }
  } catch { }
  return null;
}

/**
 * Check GitHub project via /releases/latest API — compare tag_name
 * Returns: { tagName, changed, isFirst, error }
 */
async function githubCheck(owner, repo, cachedTagName) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

  try {
    const { status, body } = await fetchJson(apiUrl, headers);
    if (status === 404) {
      // No releases published — skip
      return { tagName: null, changed: false, isFirst: false, error: 'no-releases' };
    }
    if (status !== 200) {
      return { tagName: null, changed: false, isFirst: false, error: `http-${status}` };
    }
    const tagName = body.tag_name || null;
    if (!tagName) return { tagName: null, changed: false, isFirst: false, error: 'no-tag' };

    if (!cachedTagName) return { tagName, changed: false, isFirst: true, error: null };
    const changed = tagName !== cachedTagName;
    return { tagName, changed, isFirst: false, error: null };
  } catch (e) {
    return { tagName: null, changed: false, isFirst: false, error: e.message };
  }
}

/**
 * Fetch URL using Playwright (fully rendered HTML, supports JS-rendered pages).
 * Returns: { text, error }
 */
async function fetchText(url) {
  let browser;
  try {
    const { chromium } = require('playwright');
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: REQUEST_TIMEOUT });
    const text = await page.content();
    return { text, error: null };
  } catch (e) {
    return { text: null, error: e.message };
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Non-GitHub: HEAD request, compare ETag/Last-Modified/Content-Length
 */
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
        res.resume();
        resolve({
          status: res.statusCode,
          etag: res.headers['etag'] || null,
          lastModified: res.headers['last-modified'] || null,
          contentLength: res.headers['content-length'] || null,
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
    const { body: data } = await fetchJson(`${SITE_URL}/api/projects?page=${page}&per_page=100`);
    const items = data.data || [];
    results.push(...items);
    if (items.length < 100 || page >= data.total_pages) break;
    page++;
  }
  return results;
}

async function main() {
  console.log('[check-updates] Starting update probe...');
  if (!GITHUB_TOKEN) console.warn('[check-updates] GITHUB_TOKEN not set — GitHub API calls may be rate-limited');

  // Load cache
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
    fs.writeFileSync(NOCACHE_FILE, '');
    process.exit(0);
  }

  const probeTargets = projects.filter((p) => p.update_source_url);
  console.log(`[check-updates] ${projects.length} projects total, ${probeTargets.length} have update_source_url`);

  const changedNames = [];
  const noCacheNames = [];
  const newCache = { ...cache };

  // Process in batches
  for (let i = 0; i < probeTargets.length; i += CONCURRENCY) {
    const batch = probeTargets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (p) => {
        const cached = cache[p.id] || {};
        const ghRepo = parseGitHubRepo(p.update_source_url);

        if (ghRepo) {
          // ── GitHub: compare tag_name via API ──
          const { tagName, changed, isFirst, error } = await githubCheck(
            ghRepo.owner, ghRepo.repo, cached.tagName || null
          );

          if (error === 'no-releases') {
            console.log(`[check-updates] no-releases: ${p.name} — skipped`);
            return;
          }
          if (error) {
            console.log(`[check-updates] error (${error}): ${p.name} — skipped`);
            return;
          }

          if (tagName) {
            newCache[p.id] = { tagName, url: p.update_source_url, checkedAt: new Date().toISOString() };
          }

          if (isFirst) {
            console.log(`[check-updates] baseline: ${p.name} — tag ${tagName}`);
          } else if (changed) {
            console.log(`[check-updates] CHANGED: ${p.name} — ${cached.tagName} → ${tagName}`);
            changedNames.push(p.name);
          } else {
            console.log(`[check-updates] unchanged: ${p.name} — ${tagName}`);
          }

        } else {
          // ── Non-GitHub: HEAD request, ETag/Last-Modified; fallback to Content-Length for no-cache ──
          const result = await headRequest(p.update_source_url, cached.etag, cached.lastModified);

          if (result.unchanged === null) return; // network error

          const isFirstCheck = cache[p.id] === undefined;
          const noHeaders = !result.etag && !result.lastModified;

          if (noHeaders) {
            // Server returns no cache headers.
            // If the project has a version_regex, GET the page and extract the version — reliable.
            // Otherwise fall back to Content-Length comparison and flag for AI triage.
            if (p.version_regex) {
              const { text, error } = await fetchText(p.update_source_url);
              if (error) {
                console.log(`[check-updates] regex-fetch-error: ${p.name} — ${error}`);
                return;
              }
              let version = null;
              try {
                const re = new RegExp(p.version_regex);
                const match = re.exec(text);
                if (match && match[1] === undefined) {
                  console.log(`[check-updates] regex-no-capture: ${p.name} — regex has no capture group, flagging for AI`);
                  noCacheNames.push(p.name);
                  return;
                }
                version = match ? match[1] : null;
              } catch (e) {
                console.log(`[check-updates] regex-invalid: ${p.name} — ${e.message}`);
                return;
              }
              if (!version) {
                console.log(`[check-updates] regex-no-match: ${p.name} — no version found, flagging for AI`);
                noCacheNames.push(p.name);
                return;
              }
              newCache[p.id] = { regexVersion: version, url: p.update_source_url, checkedAt: new Date().toISOString() };
              if (isFirstCheck || !cached.regexVersion) {
                console.log(`[check-updates] baseline (regex): ${p.name} — ${version}`);
              } else if (version === cached.regexVersion) {
                console.log(`[check-updates] unchanged (regex): ${p.name} — ${version}`);
              } else {
                console.log(`[check-updates] CHANGED (regex): ${p.name} — ${cached.regexVersion} → ${version}`);
                changedNames.push(p.name);
              }
              return;
            }

            // No version_regex — compare Content-Length as a lightweight signal.
            // If Content-Length changed (or is absent), flag for AI triage; if same, treat as unchanged.
            newCache[p.id] = {
              contentLength: result.contentLength,
              url: p.update_source_url,
              checkedAt: new Date().toISOString(),
            };
            const contentLengthUnchanged = result.contentLength && cached.contentLength &&
              result.contentLength === cached.contentLength;
            if (isFirstCheck || !cached.contentLength) {
              console.log(`[check-updates] baseline (no-cache): ${p.name} — Content-Length: ${result.contentLength ?? 'absent'}`);
            } else if (contentLengthUnchanged) {
              console.log(`[check-updates] unchanged (no-cache): ${p.name} — Content-Length ${result.contentLength}`);
            } else {
              console.log(`[check-updates] suspect (no-cache): ${p.name} — Content-Length ${cached.contentLength} → ${result.contentLength ?? 'absent'}`);
              noCacheNames.push(p.name);
            }
            return;
          }

          newCache[p.id] = {
            etag: result.etag,
            lastModified: result.lastModified,
            url: p.update_source_url,
            checkedAt: new Date().toISOString(),
          };

          if (isFirstCheck) {
            console.log(`[check-updates] baseline (${result.status}): ${p.name} — first check`);
          } else if (result.unchanged) {
            console.log(`[check-updates] unchanged (304): ${p.name}`);
          } else {
            const etagSame = result.etag && cached.etag && result.etag === cached.etag;
            const lmSame = result.lastModified && cached.lastModified && result.lastModified === cached.lastModified;
            const lmChanged = result.lastModified && cached.lastModified && result.lastModified !== cached.lastModified;

            if (etagSame || lmSame) {
              console.log(`[check-updates] unchanged (${result.status}): ${p.name}`);
            } else if (lmChanged) {
              // Last-Modified has definitively changed — reliable signal
              console.log(`[check-updates] CHANGED (${result.status}): ${p.name}`);
              changedNames.push(p.name);
            } else {
              // ETag changed but no Last-Modified confirmation — many CDNs/App Store
              // return volatile ETags that change every request without content changes
              console.log(`[check-updates] etag-volatile (${result.status}): ${p.name} — ETag changed but no Last-Modified to confirm`);
            }
          }
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

  fs.writeFileSync(CHANGED_FILE, changedNames.join('\n'));
  fs.writeFileSync(NOCACHE_FILE, noCacheNames.join('\n'));
  console.log(`[check-updates] Done. ${changedNames.length} changed, ${noCacheNames.length} no-cache suspect (out of ${probeTargets.length} probed from ${projects.length} total)`);
}

main().catch((e) => {
  console.error('[check-updates] Fatal error:', e.message);
  fs.writeFileSync(CHANGED_FILE, '');
  fs.writeFileSync(NOCACHE_FILE, '');
  process.exit(0);
});
