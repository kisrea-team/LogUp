// GitHub 爬取核心逻辑（原 backend-repo/server.js 迁移）
//
// 提供 GitHub 仓库信息抓取、Releases/Tags 抓取、Trending 抓取以及入库函数。
// 供 Next.js route handlers 直接调用，取代原先独立 :8000 后端进程。

import { prisma } from '@/lib/prisma';

const GITHUB_API_HEADERS: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'logup-scraper',
};

function getGithubToken(): string {
  return process.env.GITHUB_TOKEN || '';
}

function githubHeaders(): Record<string, string> {
  const headers = { ...GITHUB_API_HEADERS };
  const token = getGithubToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ── 限流感知 GitHub API 请求（多 token 轮换 + x-ratelimit-reset 等待）──
function getGithubTokens(): string[] {
  const tokens: string[] = [];
  for (let i = 1; i <= 5; i += 1) {
    const t = process.env[`GITHUB_TOKEN${i === 1 ? '' : `_${i}`}`];
    if (t) tokens.push(t);
  }
  return tokens;
}
let githubTokenCursor = 0;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface GithubApiResult {
  status: number;
  body: unknown;
  error?: string;
}

export async function githubFetch(path: string, opts: { retries?: number } = {}): Promise<GithubApiResult> {
  const tokens = getGithubTokens();
  const { retries = 3 } = opts;
  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  let lastError: string | undefined;
  let currentToken = githubTokenCursor % Math.max(tokens.length, 1);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const token = tokens[currentToken] || '';
    const headers = { ...GITHUB_API_HEADERS };
    if (token) headers.Authorization = `Bearer ${token}`;

    const resp = await fetch(url, { headers }).catch((e: Error) => {
      lastError = e.message;
      return null;
    });
    if (!resp) {
      if (attempt < retries) await sleep(1000 * Math.pow(2, attempt));
      continue;
    }
    if (resp.ok) {
      githubTokenCursor = (currentToken + 1) % Math.max(tokens.length, 1);
      const body = resp.status === 204 ? null : await resp.json().catch(() => null);
      return { status: resp.status, body };
    }
    if (resp.status === 403 || resp.status === 429) {
      lastError = `rate-limited ${resp.status}`;
      const retryAfter = resp.headers.get('retry-after');
      const reset = resp.headers.get('x-ratelimit-reset');
      if (tokens.length > 1) {
        currentToken = (currentToken + 1) % tokens.length; // 切换 token
        continue;
      }
      // 无 token 可轮换：等待太久就直接失败，避免请求挂起
      const resetWaitMs = reset ? Number(reset) * 1000 - Date.now() : NaN;
      const maxWait = 30000; // 最多等 30s
      if (retryAfter && Number(retryAfter) <= 30) {
        await sleep(Number(retryAfter) * 1000);
        continue;
      }
      if (Number.isFinite(resetWaitMs) && resetWaitMs > 0 && resetWaitMs <= maxWait) {
        await sleep(resetWaitMs);
        continue;
      }
      const hint = tokens.length === 0
        ? '（未配置 GITHUB_TOKEN，匿名配额极低）'
        : '';
      return { status: resp.status, body: null, error: `GitHub API rate limit exceeded${hint} — 请在 .env 配置 GITHUB_TOKEN 或稍后再试` };
    }
    return { status: resp.status, body: null, error: `http ${resp.status}` };
  }
  return { status: 0, body: null, error: lastError || 'github api failed' };
}

// 解析用户输入的 GitHub 仓库（URL / owner/repo 短格式 / 带引号包裹）
export function parseGithubRepoInput(input: string): { owner: string; repo: string } | null {
  let trimmed = String(input || '').trim();
  // 去除包裹的引号、反引号、括号（常见于复制粘贴或 Markdown）
  trimmed = trimmed.replace(/^[\s`'"]+|[\s`'"]+$/g, '');
  trimmed = trimmed.replace(/^[<]+|[>]+$/g, '');
  // 常见尾部标点
  trimmed = trimmed.replace(/[),.;]+$/g, '');
  // github.com/owner/repo 与 api.github.com/repos/owner/repo（含 /releases、/tags 尾路径）
  const urlMatch = trimmed.match(/^https?:\/\/(?:www\.|api\.)?github\.com\/(?:repos\/)?([^/]+)\/([^/#?]+)(?:[/?#].*)?$/i);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const shortMatch = trimmed.match(/^([^/]+)\/([^/#?]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
  return null;
}

function normalizeVersion(input: string): string {
  const trimmed = String(input || '').trim();
  const withoutPrefix = trimmed.startsWith('v') || trimmed.startsWith('V') ? trimmed.slice(1) : trimmed;
  return `v${withoutPrefix}`;
}

function toDateInputValue(value: string | number | Date): string {
  try {
    return new Date(value).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export async function fetchGithubRepo(owner: string, repo: string): Promise<Record<string, unknown>> {
  const result = await githubFetch(`/repos/${owner}/${repo}`, { retries: 2 });
  if (result.error || result.status === 0) {
    throw new Error(`GitHub API failed for ${owner}/${repo}: ${result.error}`);
  }
  if (result.status >= 400) {
    throw new Error(`GitHub API ${result.status} for ${owner}/${repo}`);
  }
  return result.body as Record<string, unknown>;
}

export interface GithubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  html_url: string;
  zipball_url: string | null;
  published_at: string | null;
  body: string | null;
  [key: string]: unknown;
}

export async function fetchGithubReleases(
  owner: string,
  repo: string,
  opts: { includePrerelease?: boolean; maxItems?: number } = {}
): Promise<GithubRelease[]> {
  const { includePrerelease = false, maxItems } = opts;
  const releases: GithubRelease[] = [];
  let page = 1;
  const perPage = 100;
  const maxPages = 10;

  while (true) {
    if (page > maxPages) break;
    const result = await githubFetch(`/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`, { retries: 2 });
    if (result.error || result.status === 0) {
      throw new Error(`GitHub API failed for ${owner}/${repo}: ${result.error}`);
    }
    if (result.status >= 400) {
      throw new Error(`GitHub API ${result.status} for ${owner}/${repo}`);
    }
    const batch = result.body as GithubRelease[];
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const r of batch) {
      if (!r || r.draft) continue;
      if (!includePrerelease && r.prerelease) continue;
      if (!r.tag_name || !r.html_url) continue;
      releases.push(r);
      if (
        typeof maxItems === 'number' &&
        Number.isFinite(maxItems) &&
        maxItems > 0 &&
        releases.length >= maxItems
      ) {
        return releases;
      }
    }

    if (batch.length < perPage) break;
    page += 1;
  }

  return releases;
}

// ── README 首图提取（用作图标兜底）──

const BADGE_HOSTS = [
  'shields.io',
  'img.shields.io',
  'badge.fury.io',
  'badgen.net',
  'travis-ci.org',
  'travis-ci.com',
  'circleci.com',
  'codecov.io',
  'coveralls.io',
  'snyk.io',
  'sonarcloud.io',
  'app.fossa.com',
  'david-dm.org',
  'deps.rs',
  'crates.io',
  'actions.cherkashin.dev',
];

function isBadgeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (BADGE_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith('.' + h))) return true;
    if (u.hostname === 'github.com' && u.pathname.includes('/badge')) return true;
    if (/\/(badge|shield)s?[/._]/i.test(u.pathname) || u.pathname.toLowerCase().endsWith('/badge')) return true;
    if (/badge|shield/i.test(u.pathname)) return true;
  } catch {
    return false;
  }
  return false;
}

function extractFirstImageFromReadme(content: string): string | null {
  if (!content) return null;
  for (const m of content.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)) {
    if (!isBadgeUrl(m[1])) return m[1];
  }
  for (const m of content.matchAll(/<img[^>]+src=["'](https?:\/\/[^"'\s]+)["']/gi)) {
    if (!isBadgeUrl(m[1])) return m[1];
  }
  return null;
}

async function fetchReadmeIcon(owner: string, repo: string): Promise<string | null> {
  try {
    const result = await githubFetch(`/repos/${owner}/${repo}/readme`, { retries: 1 });
    if (result.error || result.status >= 400) return null;
    const data = result.body as { content?: string } | null;
    if (!data?.content) return null;
    const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
    return extractFirstImageFromReadme(decoded);
  } catch {
    return null;
  }
}

export interface GithubRepoInfo {
  icon: string;
  name: string;
  latest_version: string;
  latest_update_time: string;
  describe: string;
  summar: string;
  author: string;
  type: string;
}

// 抓取单个仓库的汇总信息（用于 admin「爬取 GitHub 信息」按钮）
export async function fetchGithubRepoInfo(repoUrlOrName: string): Promise<GithubRepoInfo | null> {
  const parsed = parseGithubRepoInput(repoUrlOrName);
  if (!parsed) return null;
  const { owner, repo } = parsed;

  const repoData = (await fetchGithubRepo(owner, repo)) as {
    description?: string | null;
    owner?: { login?: string; avatar_url?: string };
    language?: string | null;
    pushed_at?: string;
    updated_at?: string;
  };
  const releases = await fetchGithubReleases(owner, repo, { includePrerelease: false, maxItems: 1 });

  const latestRelease = releases.length > 0 ? releases[0] : null;
  const latestVersion = latestRelease?.tag_name ? normalizeVersion(latestRelease.tag_name) : 'v0.0.0';
  const latestTime =
    latestRelease?.published_at ||
    repoData?.pushed_at ||
    repoData?.updated_at ||
    new Date().toISOString();

  const readmeIcon = await fetchReadmeIcon(owner, repo);
  const icon = repoData?.owner?.avatar_url || readmeIcon || 'GH';

  return {
    icon,
    name: `${owner}/${repo}`,
    latest_version: latestVersion,
    latest_update_time: toDateInputValue(latestTime),
    describe: repoData?.description || '',
    summar: repoData?.description || '',
    author: repoData?.owner?.login || owner,
    type: repoData?.language || '',
  };
}

// ── Trending 抓取（GitHub Search API）──

export interface TrendingRepo {
  full_name: string;
  owner: string;
  repo: string;
  description: string;
  stars: number;
  language: string;
  topics: string;
}

export async function fetchGithubTrendingRepos(opts: {
  language?: string;
  since?: 'daily' | 'weekly' | 'monthly';
  perPage?: number;
} = {}): Promise<TrendingRepo[]> {
  const { language, since, perPage = 25 } = opts;
  const sinceDate = new Date();
  if (since === 'daily') sinceDate.setDate(sinceDate.getDate() - 1);
  else if (since === 'monthly') sinceDate.setMonth(sinceDate.getMonth() - 1);
  else sinceDate.setDate(sinceDate.getDate() - 7);
  const dateStr = sinceDate.toISOString().split('T')[0];

  let q = `stars:>100 pushed:>${dateStr}`;
  if (language) q += ` language:${language}`;

  const result = await githubFetch(
    `/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${perPage}`,
    { retries: 2 }
  );
  if (result.error || result.status >= 400) {
    throw new Error(`GitHub Search API ${result.status || 'failed'}: ${result.error || ''}`);
  }
  const data = result.body as {
    items?: Array<{
      full_name: string;
      owner?: { login?: string };
      name: string;
      description?: string | null;
      stargazers_count?: number;
      language?: string | null;
      topics?: string[];
    }>;
  };
  return (data.items || []).map((item) => ({
    full_name: item.full_name,
    owner: item.owner?.login || '',
    repo: item.name,
    description: item.description || '',
    stars: item.stargazers_count || 0,
    language: item.language || '',
    topics: Array.isArray(item.topics) ? item.topics.slice(0, 3).join(', ') : '',
  }));
}

// ── 批量入库 ──

export interface ScrapeSummary {
  repos: Array<{ repo: string; processed: number; created: number; updated: number }>;
  created: number;
  updated: number;
  skipped: number;
}

export async function scrapeGithubReleasesToDb(opts: {
  repos: string[];
  includePrerelease?: boolean;
  limitPerRepo?: number;
}): Promise<ScrapeSummary> {
  const { includePrerelease = false, limitPerRepo } = opts;
  const summary: ScrapeSummary = { repos: [], created: 0, updated: 0, skipped: 0 };

  for (const input of opts.repos) {
    const parsed = parseGithubRepoInput(input);
    if (!parsed) {
      summary.skipped += 1;
      continue;
    }
    const { owner, repo } = parsed;
    const projectName = `${owner}/${repo}`;

    let project = await prisma.project.findFirst({
      where: { name: projectName },
      select: { id: true },
    });

    if (!project) {
      const slug = `${owner}-${repo}`.toLowerCase();
      const slugExists = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
      project = await prisma.project.create({
        data: {
          icon: 'GH',
          name: projectName,
          slug: slugExists ? null : slug,
          latest_version: 'v0.0.0',
          latest_update_time: new Date(0),
          update_source_url: `https://github.com/${owner}/${repo}/releases`,
        },
        select: { id: true },
      });
    }

    const existingVersions = await prisma.version.findMany({
      where: { project_id: project.id },
      select: { version: true },
    });
    const existingVersionSet = new Set(existingVersions.map((v) => v.version));

    const selected = await fetchGithubReleases(owner, repo, {
      includePrerelease,
      maxItems:
        typeof limitPerRepo === 'number' && Number.isFinite(limitPerRepo) && limitPerRepo > 0
          ? limitPerRepo
          : undefined,
    });

    if (selected.length === 0) {
      summary.repos.push({ repo: projectName, processed: 0, created: 0, updated: 0 });
      continue;
    }

    let repoCreated = 0;
    let repoUpdated = 0;
    for (const release of selected) {
      if (!release.tag_name) continue;

      const version = normalizeVersion(release.tag_name);
      const updateTime = release.published_at ? new Date(release.published_at) : new Date();

      let content = String(release.body || '').trim();
      if (!content) content = `Release ${release.tag_name}`;

      const downloadUrl =
        release.zipball_url || `https://github.com/${owner}/${repo}/archive/refs/tags/${release.tag_name}.zip`;

      const isNew = !existingVersionSet.has(version);
      if (isNew) {
        await prisma.version.create({
          data: {
            project_id: project.id,
            version,
            update_time: updateTime,
            content,
            download_url: downloadUrl,
          },
          select: { id: true },
        });
        existingVersionSet.add(version);
        repoCreated += 1;
        summary.created += 1;
      } else {
        const r = await prisma.version.updateMany({
          where: { project_id: project.id, version },
          data: {
            update_time: updateTime,
            content,
            download_url: downloadUrl,
          },
        });
        if (r.count) {
          repoUpdated += 1;
          summary.updated += 1;
        }
      }
    }

    const latest = selected[0];
    await prisma.project.updateMany({
      where: { id: project.id },
      data: {
        latest_version: normalizeVersion(latest.tag_name),
        latest_update_time: latest.published_at ? new Date(latest.published_at) : new Date(),
      },
    });

    summary.repos.push({ repo: projectName, processed: selected.length, created: repoCreated, updated: repoUpdated });
  }

  return summary;
}

export async function scrapeGithubTrendingToDb(opts: {
  language?: string;
  since?: 'daily' | 'weekly' | 'monthly';
  perPage?: number;
  limitPerRepo?: number;
} = {}): Promise<{ trending: TrendingRepo[]; summary: ScrapeSummary }> {
  const { language, since, perPage = 25, limitPerRepo = 10 } = opts;
  const trending = await fetchGithubTrendingRepos({ language, since, perPage });
  if (!trending.length) {
    return { trending: [], summary: { repos: [], created: 0, updated: 0, skipped: 0 } };
  }

  const repos = trending.map((r) => `${r.owner}/${r.repo}`);
  const summary = await scrapeGithubReleasesToDb({ repos, limitPerRepo });

  // 用 trending API 返回的信息补全项目元数据
  for (const t of trending) {
    if (!t.owner || !t.repo) continue;
    const projectName = `${t.owner}/${t.repo}`;
    const repoData = await fetchGithubRepo(t.owner, t.repo).catch(() => null);
    const readmeIcon = await fetchReadmeIcon(t.owner, t.repo).catch(() => null);
    const icon = (repoData as { owner?: { avatar_url?: string } } | null)?.owner?.avatar_url || readmeIcon || 'GH';

    await prisma.project
      .updateMany({
        where: { name: projectName },
        data: {
          ...(t.owner ? { author: t.owner } : {}),
          ...(t.language ? { type: t.language } : {}),
          icon,
        },
      })
      .catch(() => {});
  }

  return { trending, summary };
}

// ── 计划调度状态（内存态，供 admin 查看 / 手动触发）──

interface ScheduleState<TConfig> {
  running: boolean;
  lastRunAt: Date | null;
  lastError: string | null;
  intervalMs: number;
  timer: ReturnType<typeof setInterval> | null;
  config: TConfig;
}

interface GithubScheduleConfig {
  repos: string[];
  includePrerelease: boolean;
  limitPerRepo?: number;
}

interface TrendingScheduleConfig {
  language: string;
  since: 'daily' | 'weekly' | 'monthly';
  perPage: number;
  limitPerRepo: number;
}

let githubSchedule: ScheduleState<GithubScheduleConfig> = {
  running: false,
  lastRunAt: null,
  lastError: null,
  intervalMs: 0,
  timer: null,
  config: { repos: [], includePrerelease: false, limitPerRepo: undefined },
};

let trendingSchedule: ScheduleState<TrendingScheduleConfig> = {
  running: false,
  lastRunAt: null,
  lastError: null,
  intervalMs: 0,
  timer: null,
  config: { language: '', since: 'weekly', perPage: 25, limitPerRepo: 10 },
};

function clearSchedule(state: ScheduleState<never>) {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  state.intervalMs = 0;
}

export function getGithubScheduleStatus() {
  const { running, lastRunAt, lastError, intervalMs, config } = githubSchedule;
  return {
    enabled: Boolean(githubSchedule.timer) && intervalMs > 0,
    repos: config.repos,
    include_prerelease: config.includePrerelease,
    limit_per_repo: config.limitPerRepo,
    interval_minutes: intervalMs ? Math.round(intervalMs / 60000) : 0,
    last_run_at: lastRunAt ? lastRunAt.toISOString() : null,
    last_error: lastError,
    running,
  };
}

export function getTrendingScheduleStatus() {
  const { running, lastRunAt, lastError, intervalMs, config } = trendingSchedule;
  return {
    enabled: Boolean(trendingSchedule.timer) && intervalMs > 0,
    language: config.language,
    since: config.since,
    per_page: config.perPage,
    limit_per_repo: config.limitPerRepo,
    interval_minutes: intervalMs ? Math.round(intervalMs / 60000) : 0,
    last_run_at: lastRunAt ? lastRunAt.toISOString() : null,
    last_error: lastError,
    running,
  };
}

export async function runGithubScheduleOnce() {
  if (githubSchedule.running) return { skipped: true, reason: 'running' };
  if (!Array.isArray(githubSchedule.config.repos) || githubSchedule.config.repos.length === 0) {
    return { skipped: true, reason: 'no_repos' };
  }
  githubSchedule.running = true;
  try {
    const result = await scrapeGithubReleasesToDb({
      repos: githubSchedule.config.repos,
      includePrerelease: githubSchedule.config.includePrerelease,
      limitPerRepo: githubSchedule.config.limitPerRepo,
    });
    githubSchedule.lastRunAt = new Date();
    githubSchedule.lastError = null;
    return { success: true, result };
  } catch (e) {
    githubSchedule.lastRunAt = new Date();
    githubSchedule.lastError = e instanceof Error ? e.message : String(e);
    return { success: false, error: githubSchedule.lastError };
  } finally {
    githubSchedule.running = false;
  }
}

export function updateGithubSchedule(repos: string[], intervalMinutes: number, includePrerelease: boolean, limitPerRepo?: number) {
  githubSchedule.config = { repos, includePrerelease, limitPerRepo };
  clearSchedule(githubSchedule as ScheduleState<never>);
  if (Number.isFinite(intervalMinutes) && intervalMinutes > 0) {
    githubSchedule.intervalMs = Math.round(intervalMinutes * 60000);
    githubSchedule.timer = setInterval(() => {
      runGithubScheduleOnce().catch(() => {});
    }, githubSchedule.intervalMs);
  }
}

export async function runTrendingScheduleOnce() {
  if (trendingSchedule.running) return { skipped: true, reason: 'running' };
  trendingSchedule.running = true;
  try {
    const result = await scrapeGithubTrendingToDb({
      language: trendingSchedule.config.language,
      since: trendingSchedule.config.since,
      perPage: trendingSchedule.config.perPage,
      limitPerRepo: trendingSchedule.config.limitPerRepo,
    });
    trendingSchedule.lastRunAt = new Date();
    trendingSchedule.lastError = null;
    return { success: true, result };
  } catch (e) {
    trendingSchedule.lastRunAt = new Date();
    trendingSchedule.lastError = e instanceof Error ? e.message : String(e);
    return { success: false, error: trendingSchedule.lastError };
  } finally {
    trendingSchedule.running = false;
  }
}

export function updateTrendingSchedule(opts: {
  language: string;
  since: 'daily' | 'weekly' | 'monthly';
  perPage: number;
  limitPerRepo: number;
  intervalMinutes: number;
}) {
  const { language, since, perPage, limitPerRepo, intervalMinutes } = opts;
  trendingSchedule.config = { language, since, perPage, limitPerRepo };
  clearSchedule(trendingSchedule as ScheduleState<never>);
  if (Number.isFinite(intervalMinutes) && intervalMinutes > 0) {
    trendingSchedule.intervalMs = Math.round(intervalMinutes * 60000);
    trendingSchedule.timer = setInterval(() => {
      runTrendingScheduleOnce().catch(() => {});
    }, trendingSchedule.intervalMs);
  }
}

// ── 修复 GitHub 项目图标 ──

export async function fixGithubIcons() {
  const projects = await prisma.project.findMany({ select: { id: true, name: true } });
  let fixed = 0;
  let failed = 0;
  for (const project of projects) {
    const parsed = parseGithubRepoInput(project.name);
    if (!parsed) {
      failed += 1;
      continue;
    }
    const { owner, repo } = parsed;
    try {
      const repoData = await fetchGithubRepo(owner, repo).catch(() => null);
      const readmeIcon = await fetchReadmeIcon(owner, repo).catch(() => null);
      const icon =
        (repoData as { owner?: { avatar_url?: string } } | null)?.owner?.avatar_url || readmeIcon || null;
      if (icon) {
        await prisma.project.update({ where: { id: project.id }, data: { icon } });
        fixed += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }
  return { total: projects.length, fixed, failed };
}
