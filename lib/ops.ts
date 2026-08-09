// 运营控制：OpRun 记录 + 站内阶段异步执行
import { prisma } from '@/lib/prisma';
import {
  scrapeGithubReleasesToDb,
  runTrendingScheduleOnce,
  getGithubScheduleStatus,
  getTrendingScheduleStatus,
} from '@/lib/github';
import { extractFromRemote, isExtractorConfigured } from '@/lib/extractor';

export interface RunPhaseOptions {
  phase: 'github' | 'trending';
  triggeredBy: string;
  repos?: string[];
  reposText?: string;
  includePrerelease?: boolean;
  limitPerRepo?: number;
  language?: string;
  since?: 'daily' | 'weekly' | 'monthly';
  perPage?: number;
}

export function createOpRun(triggeredBy: string, phase: string) {
  return prisma.opRun.create({ data: { triggeredBy, phase, status: 'running' } });
}

export function finishOpRun(id: number, status: string, summary?: unknown, error?: string) {
  return prisma.opRun.update({
    where: { id },
    data: {
      status,
      summary: summary === undefined ? undefined : (summary as object),
      error: error ?? undefined,
      finishedAt: new Date(),
    },
  });
}

export function listOpRuns(limit = 20) {
  return prisma.opRun.findMany({ orderBy: { id: 'desc' }, take: limit });
}

// 启动一次站内运营（异步执行，立即返回 run id；UI 轮询 /api/ops/status 看进度）
export async function startRunAsync(opts: RunPhaseOptions): Promise<{ id: number }> {
  const run = await createOpRun(opts.triggeredBy, opts.phase);

  // 不阻塞响应；容器内事件循环保持任务运行
  void (async () => {
    try {
      if (opts.phase === 'github') {
        const rawRepos = opts.repos || [];
        const repos =
          rawRepos.length > 0
            ? rawRepos
            : (opts.reposText || '')
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter(Boolean);
        if (repos.length === 0) {
          await finishOpRun(run.id, 'failed', null, 'repos is required');
          return;
        }
        // version-extractor 优先：每个 repo 提取最新版本（取代 logup 自写 scrapeGithubReleasesToDb）
        if (await isExtractorConfigured()) {
          const results: Array<{ repo: string; version: string | null; confidence: string; source: string }> = [];
          for (const repo of repos) {
            const ghUrl = /^https?:\/\//.test(repo)
              ? repo
              : `https://api.github.com/repos/${repo.replace(/^@/, '')}/releases/latest`;
            const name = repo.split('/').pop()?.replace(/\.git$/, '') || repo;
            try {
              const remote = await extractFromRemote(ghUrl, { fields: ['version'], productName: name });
              const v = remote.version;
              results.push({ repo, version: v?.version || null, confidence: v?.confidence || 'low', source: v?.source || 'none' });
            } catch {
              results.push({ repo, version: null, confidence: 'low', source: 'error' });
            }
          }
          await finishOpRun(run.id, 'success', results);
        } else {
          // extractor 未配置 → 回退本地 GitHub 抓取
          const result = await scrapeGithubReleasesToDb({
            repos,
            includePrerelease: opts.includePrerelease,
            limitPerRepo: opts.limitPerRepo,
          });
          await finishOpRun(run.id, 'success', result);
        }
      } else if (opts.phase === 'trending') {
        // 用请求参数优先，否则沿用当前 trending 调度配置
        const result = await runTrendingScheduleOnce();
        if (result?.success) {
          await finishOpRun(run.id, 'success', result.result);
        } else if (result?.skipped) {
          // 已有运行在跑 → 记 partial，不算失败
          await finishOpRun(run.id, 'partial', null, `skipped: ${result.reason || 'running'}`);
        } else {
          await finishOpRun(run.id, 'failed', null, result?.error || 'trending run failed');
        }
      } else {
        await finishOpRun(run.id, 'failed', null, `unknown phase: ${opts.phase}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await finishOpRun(run.id, 'failed', null, message).catch(() => {});
    }
  })();

  return { id: run.id };
}

// 全局状态聚合（供 /api/ops/status 与后台运营控制页）
export async function getOpsStatus() {
  const [recentRuns, enabledProviders, projects] = await Promise.all([
    listOpRuns(15),
    prisma.aiProvider.count({ where: { enabled: true } }),
    prisma.project.count(),
  ]);

  return {
    recent_runs: recentRuns,
    github_schedule: getGithubScheduleStatus(),
    trending_schedule: getTrendingScheduleStatus(),
    ai_providers_enabled: enabledProviders,
    proxy_configured: Boolean(process.env.PROXY_URLS),
    proxy_count: (process.env.PROXY_URLS || '').split(',').filter(Boolean).length,
    projects_count: projects,
    site_url: (process.env.SITE_URL || '').replace(/\/$/, ''),
  };
}
