/**
 * 预检脚本：检测项目是否有更新
 *
 * 逻辑：
 * 1. 从 API 拉取所有项目列表（含 update_source_url）
 * 2. 从缓存文件读取上次记录（由 actions/cache 恢复）
 * 3. 并发探测每个有 update_source_url 的项目：
 *    - GitHub URL → 调用 GitHub API /releases/latest，比较 tag_name
 *    - 其他 URL（有 version_regex）→ 直接 GET 页面提取版本号，跳过 HEAD；
 *                   匹配失败则加入 regex-failed 列表
 *    - 其他 URL（无 version_regex）→ HEAD 请求：
 *                   无 ETag → 比较 Content-Length，变化则加入 no-cache 列表交 AI 筛查；
 *                   有 ETag + 变化 → 加入 changed 列表，AI 核查无更新时补充 version_regex；
 *                   有 ETag + 相同/304 → 未变化
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

const fs = require('fs');
const crawler = require('./crawler');

const SITE_URL = (process.env.SITE_URL || 'https://zitons-logup-re.hf.space').replace(/\/$/, '');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const ETAG_CACHE = process.env.ETAG_CACHE || '/tmp/etag-cache.json';
const CHANGED_FILE = process.env.CHANGED_FILE || '/tmp/changed-projects.txt';
const NOCACHE_FILE = process.env.NOCACHE_FILE || '/tmp/nocache-projects.txt';
const REGEX_FAILED_FILE = process.env.REGEX_FAILED_FILE || '/tmp/regex-failed-projects.txt';
// 正则检测到新版本的项目（含新版本号），供 process-regex-updates.js 程序化入库，避免 AI 重复抓页
const REGEX_CHANGED_FILE = process.env.REGEX_CHANGED_FILE || '/tmp/regex-changed.json';
const RSSHUB_RADAR_RULES_URL = process.env.RSSHUB_RADAR_RULES_URL || 'https://rsshub.js.org/build/radar-rules.js';
const CONCURRENCY = 10;
const REQUEST_TIMEOUT = 12000;

let rssHubRadarDomainsPromise = null;

// 站点自有 API（同源，无反爬）：简单 JSON GET，保留自定义头透传
async function fetchJson(url, headers = {}) {
  const resp = await fetch(url, { headers: { 'User-Agent': 'logup-check-updates/2', ...headers } });
  const text = await resp.text();
  try {
    return { status: resp.status, body: text ? JSON.parse(text) : null };
  } catch (e) {
    throw new Error(`JSON parse error for ${url}: ${e.message}`);
  }
}

function extractDomainsFromRadarRules(sourceText) {
  const matches = sourceText.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi) || [];
  const domains = new Set();
  for (const rawMatch of matches) {
    const domain = rawMatch.toLowerCase();
    if (
      domain === 'www.w3.org'
      || domain === 'localhost'
      || domain.endsWith('.json')
      || domain.endsWith('.js')
    ) {
      continue;
    }
    domains.add(domain);
  }
  return [...domains].sort((a, b) => a.length - b.length);
}

async function getRssHubRadarDomains() {
  if (!rssHubRadarDomainsPromise) {
    rssHubRadarDomainsPromise = (async () => {
      const { status, text } = await crawler.fetchPage(RSSHUB_RADAR_RULES_URL, { retries: 1 });
      if (status !== 200 || !text) {
        throw new Error(`http-${status}`);
      }
      const domains = extractDomainsFromRadarRules(text);
      console.log(`[check-updates] RSSHub radar domains loaded: ${domains.length}`);
      return domains;
    })().catch((error) => {
      console.warn(`[check-updates] rsshub-radar-load-failed: ${error.message}`);
      return [];
    });
  }
  return rssHubRadarDomainsPromise;
}

async function logRssHubRadarMatch(projectName, projectUrl) {
  try {
    const hostname = new URL(projectUrl).hostname.toLowerCase();
    const domains = await getRssHubRadarDomains();
    if (!domains.length) return;

    const matchedDomain = domains.find((domain) => (
      hostname === domain || hostname.endsWith(`.${domain}`)
    ));

    if (matchedDomain) {
      console.log(`[check-updates] rsshub-radar-match: ${projectName} — ${hostname} matches ${matchedDomain}`);
    }
  } catch {
    // ignore invalid URL / remote errors for informational logging
  }
}

function normalizeVersionForComparison(rawVersion) {
  if (typeof rawVersion !== 'string') return null;

  let value = rawVersion.trim();
  if (!value) return null;

  value = value.toLowerCase();
  value = value.replace(/^version[:\s-]*/i, '');

  const semverLikeMatch = value.match(/(?:^|[^a-z0-9])(?:[a-z0-9-]+[@-])?(v?\d+(?:\.\d+){1,3}(?:[-+._][a-z0-9.-]+)?)(?=$|[^a-z0-9])/i);
  if (semverLikeMatch) {
    return semverLikeMatch[1].replace(/^v/i, '');
  }

  const buildLikeMatch = value.match(/(?:^|[^a-z0-9])(v?b\d+)(?=$|[^a-z0-9])/i);
  if (buildLikeMatch) {
    return buildLikeMatch[1].replace(/^v/i, '');
  }

  const trailingVersionMatch = value.match(/(?:^|[^a-z0-9])v?(\d+(?:\.\d+){1,3})(?=$|[^a-z0-9])/i);
  if (trailingVersionMatch) {
    return trailingVersionMatch[1];
  }

  return value;
}

function areVersionsEquivalent(leftVersion, rightVersion) {
  const leftNormalized = normalizeVersionForComparison(leftVersion);
  const rightNormalized = normalizeVersionForComparison(rightVersion);

  if (!leftNormalized || !rightNormalized) {
    return leftVersion === rightVersion;
  }

  return leftNormalized === rightNormalized;
}

/**
 * GitHub URL → extract owner/repo
 * Matches:
 * - github.com/{owner}/{repo} with any optional trailing path
 * - api.github.com/repos/{owner}/{repo} with any optional trailing path
 */
function parseGitHubRepo(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'github.com') {
      const parts = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      if (parts.length >= 2) {
        let sourceType = 'auto';
        if (parts[2] === 'tags') sourceType = 'tags';
        if (parts[2] === 'releases') sourceType = 'releases';
        return { owner: parts[0], repo: parts[1], sourceType };
      }
    }
    if (u.hostname === 'api.github.com') {
      const parts = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      if (parts.length >= 4 && parts[0] === 'repos') {
        let sourceType = 'auto';
        if (parts[3] === 'tags') sourceType = 'tags';
        if (parts[3] === 'releases') sourceType = 'releases';
        return { owner: parts[1], repo: parts[2], sourceType };
      }
    }
  } catch { }
  return null;
}

async function githubTagsCheck(owner, repo, cachedTagName) {
  const result = await crawler.githubApi(`/repos/${owner}/${repo}/tags?per_page=1`);
  if (result.error) {
    return { tagName: null, changed: false, isFirst: false, error: result.error };
  }
  const status = result.status;
  const body = result.body;
  if (status !== 200) {
    return { tagName: null, changed: false, isFirst: false, error: `http-${status}` };
  }

    const tagName = Array.isArray(body) && body[0] && typeof body[0].name === 'string'
      ? body[0].name
      : null;
    if (!tagName) return { tagName: null, changed: false, isFirst: false, error: 'no-tag' };

    if (!cachedTagName) return { tagName, changed: false, isFirst: true, error: null };
    const changed = !areVersionsEquivalent(tagName, cachedTagName);
    return { tagName, changed, isFirst: false, error: null };
}

/**
 * Check GitHub project via /releases/latest API — compare tag_name
 * Returns: { tagName, changed, isFirst, error }
 */
async function githubCheck(owner, repo, cachedTagName) {
  const result = await crawler.githubApi(`/repos/${owner}/${repo}/releases/latest`);
  if (result.error) {
    return { tagName: null, changed: false, isFirst: false, error: result.error };
  }
  const status = result.status;
  const body = result.body;
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
  const changed = !areVersionsEquivalent(tagName, cachedTagName);
  return { tagName, changed, isFirst: false, error: null };
}

async function githubCheckBySource(owner, repo, sourceType, cachedTagName) {
  if (sourceType === 'tags') {
    return githubTagsCheck(owner, repo, cachedTagName);
  }

  if (sourceType === 'releases') {
    const releaseResult = await githubCheck(owner, repo, cachedTagName);
    if (releaseResult.error === 'no-releases' || releaseResult.error === 'no-tag') {
      return githubTagsCheck(owner, repo, cachedTagName);
    }
    return releaseResult;
  }

  const releaseResult = await githubCheck(owner, repo, cachedTagName);
  if (releaseResult.error === 'no-releases' || releaseResult.error === 'no-tag') {
    return githubTagsCheck(owner, repo, cachedTagName);
  }
  return releaseResult;
}

// 页面抓取统一由 ./crawler 提供（代理池 / UA 轮换 / TLS 指纹 / 重试 / 反爬降级）

/**
 * Fetch a page. Returns { status, text, error }
 * js=false 时若命中反爬自动降级到无头浏览器。
 */
async function fetchText(url, { js = false } = {}) {
  const result = await crawler.fetchPage(url, { js, retries: 2 });
  if (result.error || result.status === 0) {
    return { status: result.status, text: null, error: result.error || 'fetch failed' };
  }
  return { status: result.status, text: result.text, error: null };
}

/**
 * Non-GitHub: HEAD request, compare ETag/Last-Modified/Content-Length
 */
function headRequest(url, etag, lastModified) {
  return crawler.headRequest(url, etag, lastModified);
}

/**
 * Scan <head> for RSS/Atom feed <link> tags and log any found.
 * Does not affect cache or change detection — purely informational.
 */
function detectFeeds(projectName, pageUrl, html) {
  try {
    const headMatch = html.match(/<head[\s>]([\s\S]*?)<\/head>/i);
    if (!headMatch) return;
    const head = headMatch[1];
    const linkRe = /<link\b[^>]*>/gi;
    let m;
    while ((m = linkRe.exec(head)) !== null) {
      const tag = m[0];
      const typeMatch = tag.match(/type\s*=\s*["']([^"']+)["']/i);
      if (!typeMatch) continue;
      const type = typeMatch[1].toLowerCase();
      if (type !== 'application/rss+xml' && type !== 'application/atom+xml') continue;
      const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
      if (!hrefMatch) continue;
      let href = hrefMatch[1];
      // Resolve relative URLs
      if (href.startsWith('/')) {
        try { href = new URL(href, pageUrl).href; } catch { }
      }
      const titleMatch = tag.match(/title\s*=\s*["']([^"']+)["']/i);
      const title = titleMatch ? titleMatch[1] : '';
      console.log(`[check-updates] feed-found: ${projectName} — ${type} ${title ? `"${title}" ` : ''}${href}`);
    }
  } catch { /* ignore parse errors */ }
}

async function fetchAllProjects() {
  const results = [];
  let page = 1;
  while (true) {
    console.log(`[check-updates] Fetching projects page ${page}...`);
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

  try {
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
      fs.writeFileSync(REGEX_FAILED_FILE, '');
      process.exit(0);
    }

    const probeTargets = projects.filter((p) => p.update_source_url);
    console.log(`[check-updates] ${projects.length} projects total, ${probeTargets.length} have update_source_url`);

    const changedNames = [];
    const noCacheNames = [];
    const regexFailedNames = [];
    const newCache = { ...cache };

    // Process in batches
    for (let i = 0; i < probeTargets.length; i += CONCURRENCY) {
      const batch = probeTargets.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (p) => {
          const cached = cache[p.id] || {};
          const ghRepo = parseGitHubRepo(p.update_source_url);

          if (ghRepo) {
            const dbVersion = typeof p.latest_version === 'string' && p.latest_version.trim()
              ? p.latest_version.trim()
              : null;
            // ── GitHub: compare tag_name via API ──
            const { tagName, changed, isFirst, error } = await githubCheckBySource(
              ghRepo.owner, ghRepo.repo, ghRepo.sourceType, dbVersion || cached.tagName || null
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

            if (changed) {
              console.log(`[check-updates] CHANGED: ${p.name} — ${(dbVersion || cached.tagName)} → ${tagName}`);
              changedNames.push(p.name);
            } else if (isFirst) {
              console.log(`[check-updates] baseline: ${p.name} — tag ${tagName}`);
            } else if (dbVersion && areVersionsEquivalent(tagName, dbVersion)) {
              console.log(`[check-updates] unchanged (db): ${p.name} — ${tagName}`);
            } else if (!dbVersion && !cached.tagName) {
              console.log(`[check-updates] baseline: ${p.name} — tag ${tagName}`);
            } else {
              console.log(`[check-updates] unchanged: ${p.name} — ${tagName}`);
            }

          } else {
            // ── Non-GitHub ──
            const isFirstCheck = cache[p.id] === undefined;
            await logRssHubRadarMatch(p.name, p.update_source_url);

            if (p.version_regex) {
              // ── Priority: version_regex → GET page and extract version (skip HEAD) ──
              const { text, error } = await fetchText(p.update_source_url);
              if (error) {
                console.log(`[check-updates] regex-fetch-error: ${p.name} — ${error}`);
                return;
              }
              detectFeeds(p.name, p.update_source_url, text);
              let version = null;
              try {
                const re = new RegExp(p.version_regex);
                const match = re.exec(text);
                if (match && match[1] === undefined) {
                  console.log(`[check-updates] regex-no-capture: ${p.name} — regex has no capture group, flagging for AI`);
                  regexFailedNames.push(p.name);
                  return;
                }
                version = match ? match[1] : null;
              } catch (e) {
                console.log(`[check-updates] regex-invalid: ${p.name} — ${e.message}`);
                return;
              }
              if (!version) {
                console.log(`[check-updates] regex-no-match: ${p.name} — no version found, flagging for AI`);
                regexFailedNames.push(p.name);
                return;
              }
              newCache[p.id] = { regexVersion: version, url: p.update_source_url, checkedAt: new Date().toISOString() };
              if (isFirstCheck || !cached.regexVersion) {
                console.log(`[check-updates] baseline (regex): ${p.name} — ${version}`);
              } else if (areVersionsEquivalent(version, cached.regexVersion)) {
                console.log(`[check-updates] unchanged (regex): ${p.name} — ${version}`);
              } else {
                console.log(`[check-updates] CHANGED (regex): ${p.name} — ${cached.regexVersion} → ${version}`);
                changedNames.push(p.name);
              }
              return;
            }

            // ── No version_regex: HEAD request + ETag ──
            const result = await headRequest(p.update_source_url, cached.etag, null);

            if (result.unchanged === null) return; // network error

            if (!result.etag) {
              // No ETag: Content-Length comparison, flag suspect for AI triage
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

            // Has ETag
            newCache[p.id] = {
              etag: result.etag,
              url: p.update_source_url,
              checkedAt: new Date().toISOString(),
            };

            if (isFirstCheck) {
              console.log(`[check-updates] baseline (${result.status}): ${p.name} — first check`);
            } else if (result.unchanged) {
              console.log(`[check-updates] unchanged (304): ${p.name}`);
            } else {
              const etagSame = result.etag && cached.etag && result.etag === cached.etag;
              if (etagSame) {
                console.log(`[check-updates] unchanged (${result.status}): ${p.name}`);
              } else {
                // ETag changed → flag for AI check; if no actual update, AI will add version_regex
                console.log(`[check-updates] CHANGED (etag): ${p.name} — ETag changed`);
                changedNames.push(p.name);
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
    fs.writeFileSync(REGEX_FAILED_FILE, regexFailedNames.join('\n'));
    console.log(`[check-updates] Done. ${changedNames.length} changed, ${noCacheNames.length} no-cache suspect, ${regexFailedNames.length} regex-failed (out of ${probeTargets.length} probed from ${projects.length} total)`);
  } finally {
    await crawler.closeBrowser();
  }
}

main().catch((e) => {
  console.error('[check-updates] Fatal error:', e.message);
  fs.writeFileSync(CHANGED_FILE, '');
  fs.writeFileSync(NOCACHE_FILE, '');
  fs.writeFileSync(REGEX_FAILED_FILE, '');
  process.exit(0);
});
