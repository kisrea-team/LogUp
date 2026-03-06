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

const https = require('https');
const http = require('http');
const fs = require('fs');

const SITE_URL = (process.env.SITE_URL || 'https://zitons-logup-re.hf.space').replace(/\/$/, '');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const ETAG_CACHE = process.env.ETAG_CACHE || '/tmp/etag-cache.json';
const CHANGED_FILE = process.env.CHANGED_FILE || '/tmp/changed-projects.txt';
const NOCACHE_FILE = process.env.NOCACHE_FILE || '/tmp/nocache-projects.txt';
const REGEX_FAILED_FILE = process.env.REGEX_FAILED_FILE || '/tmp/regex-failed-projects.txt';
const RSSHUB_RADAR_RULES_URL = process.env.RSSHUB_RADAR_RULES_URL || 'https://rsshub.js.org/build/radar-rules.js';
const CONCURRENCY = 10;
const REQUEST_TIMEOUT = 12000;
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
const BROWSER_HEADERS = {
  'User-Agent': BROWSER_USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

let sharedBrowserPromise = null;
let rssHubRadarDomainsPromise = null;

function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const options = {
      headers: { 'User-Agent': BROWSER_USER_AGENT, ...headers },
      timeout: REQUEST_TIMEOUT,
    };
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

function fetchRemoteText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const options = {
      headers: { ...BROWSER_HEADERS, ...headers },
      timeout: REQUEST_TIMEOUT,
    };
    const req = mod.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, text: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout fetching ${url}`)); });
  });
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
      const { status, text } = await fetchRemoteText(RSSHUB_RADAR_RULES_URL);
      if (status !== 200) {
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

async function getSharedBrowser() {
  if (!sharedBrowserPromise) {
    const { chromium } = require('playwright');
    sharedBrowserPromise = chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });
  }
  return sharedBrowserPromise;
}

async function closeSharedBrowser() {
  if (!sharedBrowserPromise) return;
  try {
    const browser = await sharedBrowserPromise;
    await browser.close();
  } catch {
    // ignore close errors
  } finally {
    sharedBrowserPromise = null;
  }
}

async function createStealthContext(browser) {
  const context = await browser.newContext({
    userAgent: BROWSER_USER_AGENT,
    viewport: { width: 1366, height: 768 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    colorScheme: 'light',
    deviceScaleFactor: 1,
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    Object.defineProperty(navigator, 'languages', {
      get: () => ['zh-CN', 'zh', 'en-US', 'en'],
    });

    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' },
      ],
    });

    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32',
    });

    Object.defineProperty(window, 'chrome', {
      get: () => ({
        runtime: {},
        app: { isInstalled: false },
      }),
    });

    const originalQuery = window.navigator.permissions?.query;
    if (originalQuery) {
      window.navigator.permissions.query = (parameters) => (
        parameters && parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters)
      );
    }
  });

  await context.route('**/*', async (route) => {
    const resourceType = route.request().resourceType();
    if (resourceType === 'image' || resourceType === 'media' || resourceType === 'font') {
      await route.abort();
      return;
    }
    await route.continue();
  });

  return context;
}

// Domains that return plain text/JSON and don't need JS rendering — use curl-like GET instead of Playwright.
const PLAIN_HTTP_DOMAINS = ['api.github.com', 'itunes.apple.com'];

/**
 * Fetch URL using plain HTTP GET (no browser, suitable for API/JSON endpoints).
 * Returns: { text, error }
 */
function fetchTextPlain(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const options = { headers: { ...BROWSER_HEADERS }, timeout: REQUEST_TIMEOUT };
    const req = mod.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ text: data, error: null }));
    });
    req.on('error', (e) => resolve({ text: null, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ text: null, error: 'Timeout' }); });
  });
}

/**
 * Fetch URL using Playwright (fully rendered HTML, supports JS-rendered pages).
 * For api.github.com and itunes.apple.com, uses plain HTTP GET instead.
 * Returns: { text, error }
 */
async function fetchText(url) {
  try {
    const hostname = new URL(url).hostname;
    if (PLAIN_HTTP_DOMAINS.includes(hostname)) {
      return await fetchTextPlain(url);
    }
  } catch { /* malformed URL — fall through to Playwright */ }
  let context;
  try {
    const browser = await getSharedBrowser();
    context = await createStealthContext(browser);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: REQUEST_TIMEOUT });
    const text = await page.content();
    return { text, error: null };
  } catch (e) {
    return { text: null, error: e.message };
  } finally {
    if (context) await context.close();
  }
}

/**
 * Non-GitHub: HEAD request, compare ETag/Last-Modified/Content-Length
 */
function headRequest(url, etag, lastModified) {
  return new Promise((resolve) => {
    const headers = { ...BROWSER_HEADERS };
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
              } else if (version === cached.regexVersion) {
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
    await closeSharedBrowser();
  }
}

main().catch((e) => {
  console.error('[check-updates] Fatal error:', e.message);
  fs.writeFileSync(CHANGED_FILE, '');
  fs.writeFileSync(NOCACHE_FILE, '');
  fs.writeFileSync(REGEX_FAILED_FILE, '');
  process.exit(0);
});
