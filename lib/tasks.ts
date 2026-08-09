// 微任务系统：注册表 + 执行引擎
//
// 站内（确定性引擎）任务直接执行；需要 LLM/DevTools 的任务标记为需派发 GH Actions。
// 任务执行写 OpTask 表，UI 轮询 /api/ops/task/[id] 查看进度/结果。
import { prisma } from '@/lib/prisma';
import { extractVersionFromHtml, type VersionExtractResult } from '@/lib/version-extract';
import { extractFromRemote, isExtractorConfigured, type RemoteVersion } from '@/lib/extractor';

// ── 任务定义 ──
export interface TaskDefinition {
  type: string;
  label: string;
  engine: 'in-app' | 'ai';
  description: string;
  inputs: Array<{ key: string; label: string; type: 'text' | 'number' | 'boolean'; required?: boolean; placeholder?: string }>;
}

export const TASK_REGISTRY: TaskDefinition[] = [
  {
    type: 'get-version',
    label: '获取版本号 + 建议正则',
    engine: 'in-app',
    description: '抓取页面并提取最新版本号，同时给出可写入的 version_regex 建议',
    inputs: [
      { key: 'url', label: '页面 URL', type: 'text', required: true, placeholder: 'https://example.com/download' },
      { key: 'version_regex', label: '已知正则（可选）', type: 'text', placeholder: 'Version\\s+(\\d+\\.\\d+)' },
    ],
  },
  {
    type: 'probe',
    label: '探测页面',
    engine: 'in-app',
    description: '探测 URL 可访问性、状态码、是否 JS 渲染/反爬',
    inputs: [{ key: 'url', label: '页面 URL', type: 'text', required: true }],
  },
  {
    type: 'verify-url',
    label: '验证 URL',
    engine: 'in-app',
    description: '验证 URL 可达且含版本信息，作为 update_source_url 候选',
    inputs: [{ key: 'url', label: '页面 URL', type: 'text', required: true }],
  },
  {
    type: 'detect-feed',
    label: '检测 RSS/Atom',
    engine: 'in-app',
    description: '扫描页面 <head> 中的 RSS/Atom feed',
    inputs: [{ key: 'url', label: '页面 URL', type: 'text', required: true }],
  },
  {
    type: 'github-repo',
    label: 'GitHub 仓库信息',
    engine: 'in-app',
    description: '抓取单个 GitHub 仓库信息（最新版本/描述/图标）',
    inputs: [{ key: 'repo', label: 'owner/repo', type: 'text', required: true }],
  },
  {
    type: 'github-releases',
    label: 'GitHub Releases',
    engine: 'in-app',
    description: '抓取仓库 releases 列表',
    inputs: [
      { key: 'repo', label: 'owner/repo', type: 'text', required: true },
      { key: 'limit', label: '条数上限（默认 10）', type: 'number' },
    ],
  },
  {
    type: 'github-trending',
    label: 'GitHub 热门仓库',
    engine: 'in-app',
    description: '抓取最近 7 天有推送的热门仓库',
    inputs: [
      { key: 'language', label: '语言（可选）', type: 'text' },
      { key: 'per_page', label: '数量（默认 25）', type: 'number' },
    ],
  },
  {
    type: 'update-project',
    label: '更新单项目',
    engine: 'in-app',
    description: '将单个项目更新到最新版本（GitHub 项目走 API；非 GitHub 项目需有 version_regex）',
    inputs: [{ key: 'project', label: '项目名或 ID', type: 'text', required: true }],
  },
  // ── 需 AI / DevTools，标记为派发 GH Actions ──
  {
    type: 'write-regex',
    label: '生成正则',
    engine: 'in-app',
    description: '为反爬/JS 页面生成 version_regex（优先云端提取器，未配置则本地启发式）',
    inputs: [{ key: 'url', label: '页面 URL', type: 'text', required: true }],
  },
  {
    type: 'inspect-page',
    label: 'F12 检查页面（AI）',
    engine: 'ai',
    description: '用 chrome-devtools 看网络请求/控制台提取版本，需派发 GH Actions',
    inputs: [{ key: 'url', label: '页面 URL', type: 'text', required: true }],
  },
  {
    type: 'add-project',
    label: '收录新项目（AI）',
    engine: 'ai',
    description: '完整收录新项目（原子：项目+版本+中文链接），需派发 GH Actions',
    inputs: [
      { key: 'name', label: '项目名', type: 'text', required: true },
      { key: 'url', label: '来源 URL', type: 'text' },
    ],
  },
];

export function getTaskDefinition(type: string): TaskDefinition | undefined {
  return TASK_REGISTRY.find((t) => t.type === type);
}

// ── OpTask 辅助 ──
function makeTaskId(): string {
  return `tk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createTaskRow(type: string, engine: string, inputs: unknown, triggeredBy: string) {
  return prisma.opTask.create({
    data: { taskId: makeTaskId(), type, engine, inputs: (inputs || {}) as object, triggeredBy },
  });
}

export function finishTask(taskId: string, status: string, progress: number, result?: unknown, error?: string) {
  return prisma.opTask.update({
    where: { taskId },
    data: {
      status,
      progress,
      result: result === undefined ? undefined : (result as object),
      error: error ?? undefined,
      finishedAt: new Date(),
    },
  });
}

// ── 加载爬虫引擎（懒加载，避免应用启动加载重依赖）──
async function getCrawler(): Promise<any> {
  const mod = await import('@/scripts/crawler');
  return mod;
}

// ── 站内确定性任务执行器 ──
export async function executeTaskHandler(task: {
  taskId: string;
  type: string;
  inputs: Record<string, unknown>;
}): Promise<unknown> {
  const { taskId, type, inputs } = task;
  try {
    if (type === 'get-version') return await runGetVersion(taskId, inputs);
    if (type === 'probe') return await runProbe(taskId, inputs);
    if (type === 'verify-url') return await runVerifyUrl(taskId, inputs);
    if (type === 'detect-feed') return await runDetectFeed(taskId, inputs);
    if (type === 'github-repo') return await runGithubRepo(taskId, inputs);
    if (type === 'github-releases') return await runGithubReleases(taskId, inputs);
    if (type === 'github-trending') return await runGithubTrending(taskId, inputs);
    if (type === 'update-project') return await runUpdateProject(taskId, inputs);
    if (type === 'write-regex') return await runWriteRegex(taskId, inputs);
    await finishTask(taskId, 'failed', 0, null, `unsupported task type: ${type}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishTask(taskId, 'failed', 0, null, message).catch(() => {});
  }
}

// 云端提取器结果 → 本地 VersionExtractResult 形状（供交叉校验等复用）
function remoteToExtract(remote: RemoteVersion | null | undefined): VersionExtractResult {
  if (!remote || !remote.version) {
    return { version: null, source: 'none', confidence: 'low', needsAiCheck: true, suggestedRegex: null };
  }
  return {
    version: remote.version,
    source: remote.source,
    confidence: remote.confidence,
    needsAiCheck: Boolean(remote.needsAiCheck),
    suggestedRegex: remote.suggestedRegex || null,
    matchedContext: remote.matchedContext || undefined,
  };
}

async function runGetVersion(taskId: string, inputs: Record<string, unknown>) {
  const url = String(inputs.url || '').trim();
  if (!url) return finishTask(taskId, 'failed', 0, null, 'url is required');

  // 云端提取器优先：注册表 / GitHub API / L2 浏览器兜底，强于本地规则
  if (await isExtractorConfigured()) {
    await finishTask(taskId, 'running', 0.3, null);
    try {
      const remote = await extractFromRemote(url, { fields: ['version'], productName: inputs.productName ? String(inputs.productName) : undefined });
      const v = remote.version;
      return finishTask(taskId, 'success', 1, {
        url,
        via_extractor: true,
        version: v?.version || null,
        source: v?.source || 'none',
        confidence: v?.confidence || 'low',
        needs_ai_check: v ? Boolean(v.needsAiCheck) : true,
        suggested_regex: v?.suggestedRegex || null,
        matched_context: v?.matchedContext || undefined,
      });
    } catch (e) {
      // 云端失败 → 回退本地抓取
      console.warn(`[get-version] cloud extractor failed, fallback to local: ${e instanceof Error ? e.message : e}`);
    }
  }

  const crawler = await getCrawler();
  await finishTask(taskId, 'running', 0.3, null);
  const result = await crawler.fetchPage(url, { retries: 2 });
  if (result.error || result.status === 0) {
    return finishTask(taskId, 'failed', 1, { status_code: result.status }, result.error || 'fetch failed');
  }
  const extraction = extractVersionFromHtml(result.text, {
    versionRegex: inputs.version_regex ? String(inputs.version_regex) : null,
    url,
  });
  return finishTask(taskId, 'success', 1, {
    url,
    status_code: result.status,
    page_length: (result.text || '').length,
    via_browser: Boolean(result.viaBrowser),
    version: extraction.version,
    source: extraction.source,
    confidence: extraction.confidence,
    needs_ai_check: extraction.needsAiCheck,
    suggested_regex: extraction.suggestedRegex,
    matched_context: extraction.matchedContext || undefined,
  });
}

async function runProbe(taskId: string, inputs: Record<string, unknown>) {
  const url = String(inputs.url || '').trim();
  if (!url) return finishTask(taskId, 'failed', 0, null, 'url is required');
  const crawler = await getCrawler();
  await finishTask(taskId, 'running', 0.3, null);
  const head = await crawler.headRequest(url);
  const page = await crawler.fetchPage(url, { retries: 1 });
  return finishTask(taskId, 'success', 1, {
    url,
    head_status: head.status,
    etag: head.etag,
    last_modified: head.lastModified,
    content_length: head.contentLength,
    get_status: page.status,
    page_length: (page.text || '').length,
    via_browser: Boolean(page.viaBrowser),
    error: page.error || undefined,
  });
}

async function runVerifyUrl(taskId: string, inputs: Record<string, unknown>) {
  const url = String(inputs.url || '').trim();
  if (!url) return finishTask(taskId, 'failed', 0, null, 'url is required');

  // 云端提取器优先：能返回版本即验证通过（无需本地抓取）
  if (await isExtractorConfigured()) {
    await finishTask(taskId, 'running', 0.3, null);
    try {
      const remote = await extractFromRemote(url, { fields: ['version'], productName: inputs.productName ? String(inputs.productName) : undefined });
      const v = remote.version;
      return finishTask(taskId, 'success', 1, {
        url,
        ok: true,
        via_extractor: true,
        version_found: Boolean(v?.version),
        version: v?.version || null,
        confidence: v?.confidence || 'low',
      });
    } catch (e) {
      console.warn(`[verify-url] cloud extractor failed, fallback to local: ${e instanceof Error ? e.message : e}`);
    }
  }

  const crawler = await getCrawler();
  await finishTask(taskId, 'running', 0.3, null);
  const result = await crawler.fetchPage(url, { retries: 2 });
  const extraction = result.text ? extractVersionFromHtml(result.text) : null;
  return finishTask(taskId, 'success', 1, {
    url,
    ok: result.status >= 200 && result.status < 400,
    status_code: result.status,
    version_found: Boolean(extraction?.version),
    version: extraction?.version || null,
    error: result.error || undefined,
  });
}

async function runDetectFeed(taskId: string, inputs: Record<string, unknown>) {
  const url = String(inputs.url || '').trim();
  if (!url) return finishTask(taskId, 'failed', 0, null, 'url is required');
  const crawler = await getCrawler();
  await finishTask(taskId, 'running', 0.3, null);
  const result = await crawler.fetchPage(url, { retries: 1 });
  const feeds: Array<{ type: string; href: string; title: string }> = [];
  if (result.text) {
    const head = result.text.match(/<head[\s>]([\s\S]*?)<\/head>/i)?.[1] || '';
    const linkRe = /<link\b[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(head)) !== null) {
      const tag = m[0];
      const type = tag.match(/type\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() || '';
      if (type !== 'application/rss+xml' && type !== 'application/atom+xml') continue;
      const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] || '';
      const title = tag.match(/title\s*=\s*["']([^"']+)["']/i)?.[1] || '';
      if (href.startsWith('/')) {
        try { feeds.push({ type, href: new URL(href, url).href, title }); } catch { feeds.push({ type, href, title }); }
      } else {
        feeds.push({ type, href, title });
      }
    }
  }
  return finishTask(taskId, 'success', 1, {
    url,
    feeds,
    feed_count: feeds.length,
    status_code: result.status,
    error: result.error || undefined,
  });
}

async function runGithubRepo(taskId: string, inputs: Record<string, unknown>) {
  const repo = String(inputs.repo || '').trim();
  if (!repo) return finishTask(taskId, 'failed', 0, null, 'repo is required');
  const { fetchGithubRepoInfo } = await import('@/lib/github');
  await finishTask(taskId, 'running', 0.3, null);
  const info = await fetchGithubRepoInfo(repo);
  if (!info) return finishTask(taskId, 'failed', 1, null, 'invalid GitHub repo');
  return finishTask(taskId, 'success', 1, info);
}

async function runGithubReleases(taskId: string, inputs: Record<string, unknown>) {
  const repo = String(inputs.repo || '').trim();
  if (!repo) return finishTask(taskId, 'failed', 0, null, 'repo is required');
  const { fetchGithubReleases, parseGithubRepoInput } = await import('@/lib/github');
  const parsed = parseGithubRepoInput(repo);
  if (!parsed) return finishTask(taskId, 'failed', 1, null, 'invalid GitHub repo');
  await finishTask(taskId, 'running', 0.3, null);
  const limit = Number(inputs.limit) > 0 ? Number(inputs.limit) : 10;
  const releases = await fetchGithubReleases(parsed.owner, parsed.repo, { maxItems: limit });
  return finishTask(taskId, 'success', 1, {
    repo,
    count: releases.length,
    releases: releases.map((r: any) => ({
      tag_name: r.tag_name,
      published_at: r.published_at,
      prerelease: r.prerelease,
      html_url: r.html_url,
      body_excerpt: String(r.body || '').slice(0, 120),
    })),
  });
}

async function runGithubTrending(taskId: string, inputs: Record<string, unknown>) {
  const { fetchGithubTrendingRepos } = await import('@/lib/github');
  await finishTask(taskId, 'running', 0.3, null);
  const repos = await fetchGithubTrendingRepos({
    language: inputs.language ? String(inputs.language) : undefined,
    perPage: Number(inputs.per_page) > 0 ? Number(inputs.per_page) : 25,
  });
  return finishTask(taskId, 'success', 1, {
    count: repos.length,
    repos: repos.slice(0, 20).map((r: any) => ({ full_name: r.full_name, stars: r.stars, language: r.language })),
  });
}

async function runUpdateProject(taskId: string, inputs: Record<string, unknown>) {
  const target = String(inputs.project || '').trim();
  if (!target) return finishTask(taskId, 'failed', 0, null, 'project is required');
  const { prisma: p } = await import('@/lib/prisma');
  const project = /^\d+$/.test(target)
    ? await p.project.findUnique({ where: { id: parseInt(target, 10) } })
    : await p.project.findFirst({ where: { name: target } });
  if (!project) return finishTask(taskId, 'failed', 1, null, `project not found: ${target}`);

  const sourceUrl = project.update_source_url || '';
  const extractorReady = await isExtractorConfigured();
  // GitHub 且未配置提取器 → 本地 GitHub 抓取兜底；配置了 → 统一走 version-extractor（含 github/api.github.com）
  if (/github\.com/.test(sourceUrl) && !extractorReady) {
    const { parseGithubRepoInput, scrapeGithubReleasesToDb } = await import('@/lib/github');
    const parsed = parseGithubRepoInput(sourceUrl);
    if (!parsed) return finishTask(taskId, 'failed', 1, null, 'cannot parse GitHub URL');
    await finishTask(taskId, 'running', 0.4, null);
    const summary = await scrapeGithubReleasesToDb({ repos: [`${parsed.owner}/${parsed.repo}`], limitPerRepo: 5 });
    const repoSummary = summary.repos[0] || {};
    return finishTask(taskId, 'success', 1, { name: project.name, summary: repoSummary });
  }

  // 云端提取器优先（注册表 / GitHub API / L2 浏览器兜底，不依赖 version_regex）
  if (extractorReady) {
    await finishTask(taskId, 'running', 0.4, null);
    try {
      const remote = await extractFromRemote(sourceUrl, { fields: ['version'], productName: project.name });
      const extraction = remoteToExtract(remote.version);
      if (!extraction.version) {
        return finishTask(taskId, 'failed', 1, {
          name: project.name,
          reason: '云端提取器未提取到版本号',
          confidence: extraction.confidence,
        }, 'cloud extractor returned no version');
      }
      const { shouldTrustExtraction } = await import('@/lib/version-extract');
      const verdict = shouldTrustExtraction(extraction, project.latest_version);
      if (!verdict.trust) {
        // 人工审核：批准过该版本 → 跳过交叉校验直接采用；拒绝过 → 明确失败
        const { prisma: pr } = await import('@/lib/prisma');
        const review = extraction.version
          ? await pr.versionReview.findUnique({ where: { url_version: { url: sourceUrl, version: extraction.version } } }).catch(() => null)
          : null;
        if (review?.decision === 'approve') {
          const updated = await p.project.update({
            where: { id: project.id },
            data: { latest_version: extraction.version, latest_update_time: new Date(), last_checked_at: new Date() },
          });
          return finishTask(taskId, 'success', 1, {
            name: project.name,
            new_version: updated.latest_version,
            confidence: extraction.confidence,
            source: extraction.source,
            via_extractor: true,
            via_review: true,
          });
        }
        if (review?.decision === 'reject') {
          return finishTask(taskId, 'failed', 1, {
            name: project.name,
            extracted: extraction.version,
            reason: '该版本已被人工拒绝',
          }, '该版本已被人工拒绝');
        }
        return finishTask(taskId, 'failed', 1, {
          name: project.name,
          extracted: extraction.version,
          reason: verdict.reason,
        }, verdict.reason);
      }
      const updated = await p.project.update({
        where: { id: project.id },
        data: { latest_version: extraction.version, latest_update_time: new Date(), last_checked_at: new Date() },
      });
      return finishTask(taskId, 'success', 1, {
        name: project.name,
        new_version: updated.latest_version,
        confidence: extraction.confidence,
        source: extraction.source,
        via_extractor: true,
      });
    } catch (e) {
      console.warn(`[update-project] cloud extractor failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (project.version_regex) {
    const crawler = await getCrawler();
    await finishTask(taskId, 'running', 0.4, null);
    const result = await crawler.fetchPage(sourceUrl, { retries: 2 });
    if (result.error) return finishTask(taskId, 'failed', 1, null, result.error);
    const extraction = extractVersionFromHtml(result.text, { versionRegex: project.version_regex });
    if (!extraction.version) return finishTask(taskId, 'failed', 1, null, 'no version extracted by regex');
    // 交叉校验：提取版本必须大于库里当前版本才信任，否则可能是正则匹配错误
    const { shouldTrustExtraction } = await import('@/lib/version-extract');
    const verdict = shouldTrustExtraction(extraction, project.latest_version);
    if (!verdict.trust) {
      return finishTask(taskId, 'failed', 1, {
        name: project.name,
        extracted: extraction.version,
        reason: verdict.reason,
      }, verdict.reason);
    }
    const updated = await p.project.update({
      where: { id: project.id },
      data: { latest_version: extraction.version, latest_update_time: new Date(), last_checked_at: new Date() },
    });
    return finishTask(taskId, 'success', 1, { name: project.name, new_version: updated.latest_version, confidence: extraction.confidence });
  }

  return finishTask(taskId, 'failed', 1, null, 'project has no GitHub URL, no version_regex, and cloud extractor not configured');
}

async function runWriteRegex(taskId: string, inputs: Record<string, unknown>) {
  const url = String(inputs.url || '').trim();
  if (!url) return finishTask(taskId, 'failed', 0, null, 'url is required');

  // 云端提取器优先：返回 suggested_regex
  if (await isExtractorConfigured()) {
    await finishTask(taskId, 'running', 0.3, null);
    try {
      const remote = await extractFromRemote(url, { fields: ['version'], productName: inputs.productName ? String(inputs.productName) : undefined });
      const v = remote.version;
      return finishTask(taskId, 'success', 1, {
        url,
        via_extractor: true,
        version: v?.version || null,
        regex: v?.suggestedRegex || null,
        source: v?.source || 'none',
        confidence: v?.confidence || 'low',
        note: v?.suggestedRegex ? '云端提取器给出的建议正则' : '云端提取器未给出正则',
      });
    } catch (e) {
      console.warn(`[write-regex] cloud extractor failed, fallback to local: ${e instanceof Error ? e.message : e}`);
    }
  }

  // 本地兜底：抓取 + 启发式 + suggestRegex
  const crawler = await getCrawler();
  await finishTask(taskId, 'running', 0.3, null);
  const result = await crawler.fetchPage(url, { retries: 2 });
  if (result.error || result.status === 0) {
    return finishTask(taskId, 'failed', 1, { status_code: result.status }, result.error || 'fetch failed');
  }
  const extraction = extractVersionFromHtml(result.text, { url });
  if (!extraction.version) {
    return finishTask(taskId, 'failed', 1, { url }, '未能提取到版本号，无法给出正则');
  }
  return finishTask(taskId, 'success', 1, {
    url,
    version: extraction.version,
    regex: extraction.suggestedRegex,
    source: extraction.source,
    confidence: extraction.confidence,
    matched_context: extraction.matchedContext || undefined,
  });
}

// ── 派发（站内执行）──
export async function dispatchTask(input: { type: string; inputs: Record<string, unknown>; triggeredBy?: string; recordOnly?: boolean }): Promise<{ taskId: string }> {
  const def = getTaskDefinition(input.type);
  if (!def) throw new Error(`Unknown task type: ${input.type}`);

  const row = await createTaskRow(input.type, def.engine, input.inputs || {}, input.triggeredBy || 'admin');
  if (input.recordOnly) {
    // 只记录历史，不派发/不执行（GH Actions 已废弃；执行统一走 version-extractor 特定入口）
    await finishTask(row.taskId, 'recorded', 0, null, '仅记录，未派发');
    return { taskId: row.taskId };
  }
  if (def.engine === 'in-app') {
    void executeTaskHandler({ taskId: row.taskId, type: row.type, inputs: row.inputs as Record<string, unknown> });
  } else {
    // AI 任务：标记为待派发 GH Actions
    await finishTask(row.taskId, 'queued', 0, null, 'AI 任务需派发 GitHub Actions 执行');
  }
  return { taskId: row.taskId };
}

export function listTasks(limit = 30) {
  return prisma.opTask.findMany({ orderBy: { id: 'desc' }, take: limit });
}
