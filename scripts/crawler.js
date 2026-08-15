/**
 * 工业级页面抓取层（CommonJS）
 *
 * 提供代理池、UA/浏览器头轮换、TLS 指纹、指数退避重试、礼貌限速、反爬降级等能力。
 * 供 CI 脚本（check-updates.js / process-regex-updates.js / run-task.js）与后台任务使用。
 *
 * 环境变量：
 *   PROXY_URLS              代理池，逗号分隔，如 "http://user:pass@host:port,http://user:pass@host2:port"
 *   CRAWLER_RESPECT_ROBOTS  是否遵守 robots.txt（默认 false）
 *   CRAWLER_MIN_DELAY_MS    每域名最小间隔（默认 1200）
 *   CRAWLER_MAX_CONCURRENCY 全局并发上限（默认 5）
 *   CRAWLER_RETRIES         失败重试次数（默认 3）
 *   CRAWLER_TIMEOUT_MS      请求超时（默认 15000）
 *   GITHUB_TOKEN, GITHUB_TOKEN_2..5  GitHub API token（轮换）
 */
'use strict';

const { HeaderGenerator } = require('header-generator');
const { randomInt, sleep } = require('./crawler-utils');

// ── 配置 ──
const PROXY_URLS = (process.env.PROXY_URLS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const RESPECT_ROBOTS = process.env.CRAWLER_RESPECT_ROBOTS === 'true';
const MIN_DELAY_MS = parseInt(process.env.CRAWLER_MIN_DELAY_MS || '1200', 10);
const MAX_CONCURRENCY = parseInt(process.env.CRAWLER_MAX_CONCURRENCY || '5', 10);
const RETRIES = parseInt(process.env.CRAWLER_RETRIES || '3', 10);
const REQUEST_TIMEOUT_MS = parseInt(process.env.CRAWLER_TIMEOUT_MS || '15000', 10);
const BROWSER_UA =
  process.env.CRAWLER_BROWSER_UA ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

// ── 代理池（轮询 + 失败旋转）──
let proxyCursor = 0;
let lastProxyFailed = false;

function nextProxy() {
  if (PROXY_URLS.length === 0) return undefined;
  // 若上一代理失败，跳过它强制轮换
  if (lastProxyFailed) {
    proxyCursor = (proxyCursor + 1) % PROXY_URLS.length;
    lastProxyFailed = false;
  }
  const proxy = PROXY_URLS[proxyCursor % PROXY_URLS.length];
  proxyCursor += 1;
  return proxy;
}

// ── 浏览器头预设（每次请求随机选一组）──
let headerPresets = null;

function getHeaderPresets() {
  if (headerPresets) return headerPresets;
  // header-generator 同实例 getHeaders() 结果是确定性的，需按组合显式构造不同预设
  const browsers = ['chrome', 'firefox', 'edge'];
  const operatingSystems = ['windows', 'linux', 'macos'];
  const locales = ['zh-CN', 'zh', 'en-US'];
  const presetCount = 12;
  headerPresets = Array.from({ length: presetCount }, (_, i) => {
    const generator = new HeaderGenerator({
      browsers: [{ name: browsers[i % browsers.length], minVersion: 100 }],
      operatingSystems: [operatingSystems[Math.floor(i / 4) % operatingSystems.length]],
      locales: [locales[i % locales.length]],
    });
    const h = generator.getHeaders();
    return {
      'user-agent': h['user-agent'] || BROWSER_UA,
      accept: h.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': h['accept-language'] || 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'accept-encoding': 'gzip, deflate, br',
      'sec-ch-ua': h['sec-ch-ua'] || '',
      'sec-ch-ua-mobile': h['sec-ch-ua-mobile'] || '?0',
      'sec-ch-ua-platform': h['sec-ch-ua-platform'] || '"Windows"',
      'upgrade-insecure-requests': h['upgrade-insecure-requests'] || '1',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'cache-control': 'max-age=0',
    };
  });
  return headerPresets;
}

function randomHeaders() {
  const presets = getHeaderPresets();
  return { ...presets[randomInt(0, presets.length - 1)] };
}

// ── 礼貌限速：每域名最小间隔 ──
const lastHitByDomain = new Map();

async function politeDelay(url) {
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return;
  }
  const last = lastHitByDomain.get(hostname) || 0;
  const elapsed = Date.now() - last;
  // 间隔加入 20% 随机抖动，避免固定节奏
  const delay = Math.floor(MIN_DELAY_MS * (0.8 + Math.random() * 0.4));
  if (elapsed < delay) {
    await sleep(delay - elapsed);
  }
  lastHitByDomain.set(hostname, Date.now());
}

// ── 并发控制（信号量）──
class Semaphore {
  constructor(max) {
    this.max = max;
    this.active = 0;
    this.queue = [];
  }
  async acquire() {
    if (this.active < this.max) {
      this.active += 1;
      return;
    }
    await new Promise((resolve) => this.queue.push(resolve));
    this.active += 1;
  }
  release() {
    this.active -= 1;
    const next = this.queue.shift();
    if (next) next();
  }
}
const semaphore = new Semaphore(MAX_CONCURRENCY);

// ── 指数退避 ──
function backoffMs(attempt) {
  const base = Math.min(1000 * Math.pow(2, attempt), 8000);
  return base + randomInt(0, 300); // 抖动
}

// ── robots.txt（可选）──
const robotsCache = new Map();
async function isAllowedByRobots(url) {
  if (!RESPECT_ROBOTS) return true;
  try {
    const u = new URL(url);
    const key = u.origin;
    if (robotsCache.has(key)) return robotsCache.get(key);
    let allowed = true;
    try {
      const res = await fetch(`${key}/robots.txt`, { redirect: 'follow' });
      if (res.ok) {
        const text = await res.text();
        // 极简解析：仅处理 User-agent: * 与 Disallow
        const disallow = [];
        let applyToAll = false;
        for (const line of text.split(/\r?\n/)) {
          const l = line.trim().toLowerCase();
          if (l.startsWith('user-agent:')) {
            applyToAll = l.includes('*');
          } else if (l.startsWith('disallow:') && applyToAll) {
            const p = l.slice('disallow:'.length).trim();
            if (p) disallow.push(p);
          }
        }
        const path = u.pathname;
        allowed = !disallow.some((d) => path.startsWith(d));
      }
    } catch {
      // robots 不可达则不阻断
    }
    robotsCache.set(key, allowed);
    return allowed;
  } catch {
    return true;
  }
}

// ── 反爬判定 ──
function looksLikeChallenge(status, text) {
  const body = (text || '').slice(0, 4000).toLowerCase();
  if (status === 403 || status === 429) return true;
  if (status === 503 && /captcha|cf-browser-verification|cloudflare|检查.*浏览器/.test(body)) return true;
  if (/just a moment|access denied|verify you are human|安全检查|人机验证/.test(body)) return true;
  return false;
}

let gotScrapingInstance = null;
async function getGotScraping() {
  if (gotScrapingInstance) return gotScrapingInstance;
  const mod = await import('got-scraping');
  gotScrapingInstance = mod.gotScraping;
  return gotScrapingInstance;
}

/**
 * 普通 HTTP 抓取（got-scraping：TLS 指纹 + HTTP/2 + 代理 + 自带头）
 * 不做重试/降级，由 fetchPage 统一编排。
 */
async function rawFetch(url, { timeout = REQUEST_TIMEOUT_MS } = {}) {
  const gotScraping = await getGotScraping();
  const headers = randomHeaders();
  const proxyUrl = nextProxy();
  const response = await gotScraping.get(url, {
    headers,
    proxyUrl,
    useHeaderGenerator: false,
    timeout: { request: timeout, response: timeout },
    retry: { limit: 0 },
    decompress: true,
    responseType: 'text',
    http2: true,
  });
  return {
    status: response.statusCode,
    headers: response.headers,
    text: typeof response.body === 'string' ? response.body : String(response.body),
  };
}

let playwrightBrowserPromise = null;
let playwright = null;

async function getPlaywright() {
  if (!playwright) {
    playwright = await import('playwright');
  }
  if (!playwrightBrowserPromise) {
    playwrightBrowserPromise = playwright.chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        ...(PROXY_URLS.length ? [`--proxy-server=${nextProxy()}`] : []),
      ],
    });
  }
  return playwrightBrowserPromise;
}

async function closeBrowser() {
  if (!playwrightBrowserPromise) return;
  try {
    const browser = await playwrightBrowserPromise;
    await browser.close();
  } catch {
    // ignore
  } finally {
    playwrightBrowserPromise = null;
  }
}

async function createStealthContext(browser) {
  const context = await browser.newContext({
    userAgent: BROWSER_UA,
    viewport: { width: 1366, height: 768 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    colorScheme: 'light',
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'Upgrade-Insecure-Requests': '1',
    },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' },
      ],
    });
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    Object.defineProperty(window, 'chrome', {
      get: () => ({ runtime: {}, app: { isInstalled: false } }),
    });
  });
  await context.route('**/*', async (route) => {
    const type = route.request().resourceType();
    if (type === 'image' || type === 'media' || type === 'font') {
      await route.abort();
    } else {
      await route.continue();
    }
  });
  return context;
}

/**
 * Playwright stealth 抓取（JS 渲染 / 反爬降级用）
 */
async function browserFetch(url, { timeout = REQUEST_TIMEOUT_MS } = {}) {
  const browser = await getPlaywright();
  let context;
  try {
    context = await createStealthContext(browser);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout });
    const text = await page.content();
    return { status: 200, headers: {}, text };
  } catch (error) {
    return { status: 0, headers: {}, text: null, error: error.message };
  } finally {
    if (context) await context.close().catch(() => {});
  }
}

/**
 * 抓取一个页面（工业编排：代理/UA/重试/降级）
 * @returns {Promise<{status:number, headers:object, text:string|null, error?:string, viaBrowser?:boolean}>}
 */
async function fetchPage(url, { js = false, timeout = REQUEST_TIMEOUT_MS, retries = RETRIES } = {}) {
  if (!(await isAllowedByRobots(url))) {
    return { status: 0, headers: {}, text: null, error: 'blocked by robots.txt' };
  }

  await semaphore.acquire();
  try {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      await politeDelay(url);
      let result;
      if (js) {
        result = await browserFetch(url, { timeout });
      } else {
        try {
          result = await rawFetch(url, { timeout });
        } catch (error) {
          lastError = error.message;
          // 网络/超时错误 → 退避重试
          if (attempt < retries) await sleep(backoffMs(attempt));
          continue;
        }
      }

      if (result.error) {
        lastError = result.error;
        if (attempt < retries) await sleep(backoffMs(attempt));
        continue;
      }

      // 反爬响应 → 旋转代理重试；JS 页失败 → 浏览器降级
      if (looksLikeChallenge(result.status, result.text)) {
        lastError = `anti-bot ${result.status}`;
        lastProxyFailed = true;
        if (!js && attempt >= retries) {
          const browserResult = await browserFetch(url, { timeout });
          if (!browserResult.error && browserResult.text) {
            return { ...browserResult, viaBrowser: true };
          }
        }
        if (attempt < retries) await sleep(backoffMs(attempt));
        continue;
      }

      // 5xx → 退避重试
      if (result.status >= 500 && attempt < retries) {
        lastError = `http ${result.status}`;
        await sleep(backoffMs(attempt));
        continue;
      }

      return result;
    }
    return { status: 0, headers: {}, text: null, error: lastError || 'fetch failed' };
  } finally {
    semaphore.release();
  }
}

/**
 * JSON 抓取
 */
async function fetchJson(url, options = {}) {
  const result = await fetchPage(url, { timeout: options.timeout, retries: options.retries ?? 1 });
  if (result.error || result.status === 0) {
    return { status: result.status, body: null, error: result.error || 'fetch failed' };
  }
  if (result.status >= 400) {
    return { status: result.status, body: null, error: `http ${result.status}` };
  }
  try {
    return { status: result.status, body: JSON.parse(result.text), error: null };
  } catch (error) {
    return { status: result.status, body: null, error: `invalid json: ${error.message}` };
  }
}

/**
 * HEAD 请求（ETag 探测用）：取响应头，不下载 body
 */
function headRequest(url, etag = null, lastModified = null, { timeout = REQUEST_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? require('https') : require('http');
    const headers = randomHeaders();
    if (etag) headers['If-None-Match'] = etag;
    if (lastModified) headers['If-Modified-Since'] = lastModified;

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return resolve({ status: 0, etag: null, lastModified: null, contentLength: null, unchanged: null });
    }
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'HEAD',
      headers,
      timeout,
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
    req.on('error', () => resolve({ status: 0, etag: null, lastModified: null, contentLength: null, unchanged: null }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, etag: null, lastModified: null, contentLength: null, unchanged: null });
    });
    req.end();
  });
}

// ── GitHub API（限流感知 + 多 token 轮换）──
const GITHUB_TOKENS = [];
for (let i = 1; i <= 5; i += 1) {
  const t = process.env[`GITHUB_TOKEN${i === 1 ? '' : `_${i}`}`];
  if (t) GITHUB_TOKENS.push(t);
}
let githubTokenCursor = 0;

function nextGithubToken() {
  if (GITHUB_TOKENS.length === 0) return '';
  const token = GITHUB_TOKENS[githubTokenCursor % GITHUB_TOKENS.length];
  githubTokenCursor += 1;
  return token;
}

/**
 * GitHub API 请求：403 限流时等待 x-ratelimit-reset 或切换 token 重试
 */
async function githubApi(path, { token, retries = 3 } = {}) {
  const apiToken = token || nextGithubToken();
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'logup-scraper',
  };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;

  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const resp = await fetch(url, { headers }).catch((e) => {
      lastError = e.message;
      return null;
    });
    if (!resp) {
      if (attempt < retries) await sleep(backoffMs(attempt));
      continue;
    }

    if (resp.ok) {
      const body = resp.status === 204 ? null : await resp.json().catch(() => null);
      return { status: resp.status, body, error: null };
    }

    // 限流：等待重置或切换 token
    if (resp.status === 403 || resp.status === 429) {
      const retryAfter = resp.headers.get('retry-after');
      const reset = resp.headers.get('x-ratelimit-reset');
      lastError = `rate-limited ${resp.status}`;
      if (GITHUB_TOKENS.length > 1) {
        // 有多 token → 直接切换，不等
        githubTokenCursor += 1;
        headers.Authorization = `Bearer ${nextGithubToken()}`;
        continue;
      }
      if (retryAfter) {
        await sleep(Number(retryAfter) * 1000);
        continue;
      }
      if (reset) {
        const waitMs = Number(reset) * 1000 - Date.now();
        if (waitMs > 0 && waitMs < 60000) {
          await sleep(waitMs);
          continue;
        }
      }
      if (attempt < retries) {
        await sleep(backoffMs(attempt));
        continue;
      }
    }

    const text = await resp.text().catch(() => '');
    return { status: resp.status, body: null, error: `http ${resp.status}: ${text.slice(0, 200)}` };
  }
  return { status: 0, body: null, error: lastError || 'github api failed' };
}

module.exports = {
  fetchPage,
  fetchJson,
  headRequest,
  githubApi,
  closeBrowser,
  nextProxy,
  getProxyPool: () => PROXY_URLS.slice(),
  getHeaderPresets,
  randomHeaders,
};
