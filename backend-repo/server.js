const http = require('http');
const { URL } = require('url');
require('../lib/ensure-ssh-tunnel');
const { PrismaClient } = require('@prisma/client');
const { CheerioCrawler } = require('@crawlee/cheerio');
const TurndownService = require('turndown');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
});

const allowOrigins = new Set([
    'http://localhost:3000',
    'https://log-up-wine.vercel.app',
]);

function setCORS(res, origin) {
    const allowOrigin = origin && allowOrigins.has(origin) ? origin : '*';
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function send(res, status, body, origin) {
    setCORS(res, origin);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function notFound(res, origin) {
    send(res, 404, { error: 'Not Found' }, origin);
}

async function readJson(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
            if (data.length > 10 * 1024 * 1024) {
                reject(new Error('Request body too large'));
            }
        });
        req.on('end', () => {
            if (!data) return resolve({});
            try {
                const json = JSON.parse(data);
                resolve(json);
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

function isNumeric(str) {
    return /^[0-9]+$/.test(str);
}

function toDate(value) {
    if (!value) return undefined;
    try {
        return new Date(value);
    } catch {
        return undefined;
    }
}

function cleanHtmlContent(content) {
    if (!content) return '';
    try {
        const mdContent = turndownService.turndown(content);
        return mdContent.replace(/\n\s*\n/g, '\n\n').replace(/\n{3,}/g, '\n\n').trim();
    } catch {
        return String(content).replace(/<[^>]*>/g, '').trim();
    }
}

function normalizeVersion(input) {
    const trimmed = String(input || '').trim();
    const withoutPrefix = trimmed.startsWith('v') || trimmed.startsWith('V') ? trimmed.slice(1) : trimmed;
    return `v${withoutPrefix}`;
}

function toDateInputValue(value) {
    if (!value) return '';
    try {
        return new Date(value).toISOString().split('T')[0];
    } catch {
        return '';
    }
}

function parseGithubRepoInput(input) {
    let trimmed = String(input || '').trim();
    // Remove wrapping quotes/backticks/brackets that often come from copy-paste or markdown
    trimmed = trimmed.replace(/^[\s`'"]+|[\s`'"]+$/g, '');
    trimmed = trimmed.replace(/^[<]+|[>]+$/g, '');
    // Common trailing punctuation
    trimmed = trimmed.replace(/[),.;]+$/g, '');
    const urlMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)(?:[/?#].*)?$/i);
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
    const shortMatch = trimmed.match(/^([^/]+)\/([^/#?]+)$/);
    if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
    return null;
}

async function fetchGithubRepo(owner, repo) {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'logup-scraper',
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const resp = await fetch(apiUrl, { headers });
    if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`GitHub API ${resp.status} for ${owner}/${repo}: ${text}`);
    }
    return resp.json();
}

async function fetchGithubReleases(owner, repo, { includePrerelease, maxItems } = {}) {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'logup-scraper',
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    const releases = [];
    let page = 1;
    const perPage = 100;
    const maxPages = 10;

    while (true) {
        if (page > maxPages) break;
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`;
        const resp = await fetch(apiUrl, { headers });
        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            throw new Error(`GitHub API ${resp.status} for ${owner}/${repo}: ${text}`);
        }
        const batch = await resp.json();
        if (!Array.isArray(batch) || batch.length === 0) break;

        for (const r of batch) {
            if (!r || r.draft) continue;
            if (!includePrerelease && r.prerelease) continue;
            if (!r.tag_name || !r.html_url) continue;
            releases.push(r);
            if (typeof maxItems === 'number' && Number.isFinite(maxItems) && maxItems > 0 && releases.length >= maxItems) {
                return releases;
            }
        }

        if (batch.length < perPage) break;
        page += 1;
    }

    return releases;
}

async function fetchGithubRepoInfo(repoUrlOrName) {
    const parsed = parseGithubRepoInput(repoUrlOrName);
    if (!parsed) return null;
    const { owner, repo } = parsed;

    const repoData = await fetchGithubRepo(owner, repo);
    const releases = await fetchGithubReleases(owner, repo, { includePrerelease: false, maxItems: 1 });

    const latestRelease = Array.isArray(releases) && releases.length > 0 ? releases[0] : null;
    const latestVersion = latestRelease?.tag_name ? normalizeVersion(latestRelease.tag_name) : 'v0.0.0';
    const latestTime =
        latestRelease?.published_at ||
        repoData?.pushed_at ||
        repoData?.updated_at ||
        new Date().toISOString();

    return {
        icon: repoData?.owner?.avatar_url || 'GH',
        name: `${owner}/${repo}`,
        latest_version: latestVersion,
        latest_update_time: toDateInputValue(latestTime),
        describe: repoData?.description || '',
        summar: repoData?.description || '',
        author: repoData?.owner?.login || owner,
        type: repoData?.language || '',
    };
}

async function scrapeGithubReleasesToDb({ repos, includePrerelease, limitPerRepo }) {
    const summary = {
        repos: [],
        created: 0,
        updated: 0,
        skipped: 0,
    };

    for (const input of repos) {
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
            maxItems: typeof limitPerRepo === 'number' && Number.isFinite(limitPerRepo) && limitPerRepo > 0 ? limitPerRepo : undefined,
        });

        if (selected.length === 0) {
            summary.repos.push({ repo: projectName, processed: 0, created: 0, updated: 0 });
            continue;
        }

        let repoCreated = 0;
        let repoUpdated = 0;

        const crawler = new CheerioCrawler({
            maxRequestsPerCrawl: selected.length,
            maxConcurrency: 3,
            requestHandler: async ({ request, $ }) => {
                const { release } = request.userData || {};
                if (!release || !release.tag_name) return;

                const version = normalizeVersion(release.tag_name);
                const updateTime = release.published_at ? new Date(release.published_at) : new Date();

                let content = String(release.body || '').trim();
                if (!content) {
                    const main = $('.markdown-body').first();
                    if (main.length > 0) content = cleanHtmlContent(main.html() || '');
                }
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
            },
        });

        await crawler.addRequests(
            selected.map((release) => ({
                url: release.html_url,
                userData: { release },
            }))
        );
        await crawler.run();

        const latest = selected[0];
        const latestVersion = normalizeVersion(latest.tag_name);
        const latestDate = latest.published_at ? new Date(latest.published_at) : new Date();
        await prisma.project.updateMany({
            where: { id: project.id },
            data: {
                latest_version: latestVersion,
                latest_update_time: latestDate,
            },
        });

        summary.repos.push({ repo: projectName, processed: selected.length, created: repoCreated, updated: repoUpdated });
    }

    return summary;
}

const githubSchedule = {
    repos: [],
    includePrerelease: false,
    limitPerRepo: undefined,
    intervalMs: 0,
    timer: null,
    running: false,
    lastRunAt: null,
    lastError: null,
};

function getGithubScheduleStatus() {
    return {
        enabled: Boolean(githubSchedule.timer) && githubSchedule.intervalMs > 0,
        repos: githubSchedule.repos,
        include_prerelease: githubSchedule.includePrerelease,
        limit_per_repo: githubSchedule.limitPerRepo,
        interval_minutes: githubSchedule.intervalMs ? Math.round(githubSchedule.intervalMs / 60000) : 0,
        last_run_at: githubSchedule.lastRunAt ? githubSchedule.lastRunAt.toISOString() : null,
        last_error: githubSchedule.lastError,
        running: githubSchedule.running,
    };
}

function clearGithubSchedule() {
    if (githubSchedule.timer) clearInterval(githubSchedule.timer);
    githubSchedule.timer = null;
    githubSchedule.intervalMs = 0;
}

async function runGithubScheduleOnce() {
    if (githubSchedule.running) return { skipped: true, reason: 'running' };
    if (!Array.isArray(githubSchedule.repos) || githubSchedule.repos.length === 0) return { skipped: true, reason: 'no_repos' };

    githubSchedule.running = true;
    try {
        const result = await scrapeGithubReleasesToDb({
            repos: githubSchedule.repos,
            includePrerelease: githubSchedule.includePrerelease,
            limitPerRepo: githubSchedule.limitPerRepo,
        });
        githubSchedule.lastRunAt = new Date();
        githubSchedule.lastError = null;
        return { success: true, result };
    } catch (e) {
        githubSchedule.lastRunAt = new Date();
        githubSchedule.lastError = e && e.message ? e.message : String(e);
        return { success: false, error: githubSchedule.lastError };
    } finally {
        githubSchedule.running = false;
    }
}

const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (req.method === 'OPTIONS') {
        setCORS(res, origin);
        res.statusCode = 204;
        res.end();
        return;
    }

    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const pathname = urlObj.pathname.replace(/\/+$/, '') || '/';
    const parts = pathname.split('/').filter(Boolean);

    try {
        if (req.method === 'GET' && pathname === '/') {
            return send(res, 200, { message: 'Project Updates API' }, origin);
        }

        if (parts[0] === 'projects') {
            if (req.method === 'GET' && parts.length === 1) {
                const pageParam = urlObj.searchParams.get('page') || '1';
                const perParam = urlObj.searchParams.get('per_page') || '10';
                const page = Math.max(1, parseInt(pageParam, 10) || 1);
                const perPage = Math.max(1, Math.min(100, parseInt(perParam, 10) || 10));
                const total = await prisma.project.count();
                const totalPages = Math.ceil(total / perPage);
                const finalPage = Math.min(page, totalPages > 0 ? totalPages : 1);
                const projects = await prisma.project.findMany({
                    skip: (finalPage - 1) * perPage,
                    take: perPage,
                    orderBy: { latest_update_time: 'desc' },
                    select: {
                        id: true,
                        icon: true,
                        name: true,
                        slug: true,
                        latest_version: true,
                        latest_update_time: true,
                        describe: true,
                        summar: true,
                        author: true,
                        type: true,
                    },
                });
                return send(
                    res,
                    200,
                    {
                        data: projects,
                        total,
                        page: finalPage,
                        per_page: perPage,
                        total_pages: totalPages,
                    },
                    origin
                );
            }

            if (req.method === 'GET' && parts.length === 2) {
                const idOrSlug = parts[1];
                const where = isNumeric(idOrSlug)
                    ? { id: parseInt(idOrSlug, 10) }
                    : { slug: idOrSlug };

                const project = await prisma.project.findUnique({
                    where,
                    select: {
                        id: true,
                        icon: true,
                        name: true,
                        slug: true,
                        latest_version: true,
                        latest_update_time: true,
                        describe: true,
                        summar: true,
                        author: true,
                        type: true,
                        versions: {
                            orderBy: { update_time: 'desc' },
                            select: {
                                id: true,
                                project_id: true,
                                version: true,
                                update_time: true,
                                content: true,
                                download_url: true,
                            },
                        },
                    },
                });
                if (!project) return send(res, 404, { error: 'Project not found' }, origin);
                return send(res, 200, project, origin);
            }

            if (req.method === 'POST' && parts.length === 1) {
                const body = await readJson(req);
                let { icon, name, slug, latest_version, latest_update_time, describe, summar, author, type } = body;
                let finalSlug = slug;
                if (!finalSlug && name) {
                    finalSlug = String(name)
                        .toLowerCase()
                        .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
                        .replace(/\s+/g, '-');
                }
                if (!finalSlug) finalSlug = `p-${Date.now()}`;
                const existing = await prisma.project.findUnique({ where: { slug: finalSlug }, select: { id: true } });
                if (existing) return send(res, 400, { error: 'Slug already exists' }, origin);
                const project = await prisma.project.create({
                    data: {
                        icon,
                        name,
                        slug: finalSlug,
                        latest_version: latest_version || 'v1.0.0',
                        latest_update_time: latest_update_time ? toDate(latest_update_time) : new Date(),
                        describe,
                        summar,
                        author,
                        type,
                    },
                    select: {
                        id: true,
                        icon: true,
                        name: true,
                        slug: true,
                        latest_version: true,
                        latest_update_time: true,
                        describe: true,
                        summar: true,
                        author: true,
                        type: true,
                    },
                });
                return send(res, 201, project, origin);
            }

            if (req.method === 'POST' && parts.length === 3 && parts[2] === 'update') {
                const projectId = parseInt(parts[1], 10);
                if (!projectId) return send(res, 400, { error: 'Invalid project id' }, origin);
                const body = await readJson(req);
                const { icon, name, latest_version, latest_update_time, describe, summar, author, type } = body;
                const exists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
                if (!exists) return send(res, 404, { error: 'Project not found' }, origin);
                const updated = await prisma.project.updateMany({
                    where: { id: projectId },
                    data: {
                        icon,
                        name,
                        latest_version,
                        latest_update_time: latest_update_time ? toDate(latest_update_time) : undefined,
                        describe,
                        summar,
                        author,
                        type,
                    },
                });
                if (!updated.count) return send(res, 404, { error: 'Project not found' }, origin);
                const project = await prisma.project.findUnique({
                    where: { id: projectId },
                    select: {
                        id: true,
                        icon: true,
                        name: true,
                        slug: true,
                        latest_version: true,
                        latest_update_time: true,
                        describe: true,
                        summar: true,
                        author: true,
                        type: true,
                        versions: {
                            orderBy: { update_time: 'desc' },
                            select: {
                                id: true,
                                project_id: true,
                                version: true,
                                update_time: true,
                                content: true,
                                download_url: true,
                            },
                        },
                    },
                });
                return send(res, 200, project, origin);
            }

            if (req.method === 'GET' && parts.length === 3 && parts[2] === 'versions') {
                const projectId = parseInt(parts[1], 10);
                if (!projectId) return send(res, 400, { error: 'Invalid project id' }, origin);
                const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
                if (!project) return send(res, 404, { error: 'Project not found' }, origin);
                const versions = await prisma.version.findMany({
                    where: { project_id: projectId },
                    orderBy: { update_time: 'desc' },
                    select: {
                        id: true,
                        project_id: true,
                        version: true,
                        update_time: true,
                        content: true,
                        download_url: true,
                    },
                });
                return send(res, 200, versions, origin);
            }

            if (req.method === 'DELETE' && parts.length === 2) {
                const projectId = parseInt(parts[1], 10);
                if (!projectId) return send(res, 400, { error: 'Invalid project id' }, origin);
                try {
                    await prisma.project.delete({ where: { id: projectId } });
                    return send(res, 200, { message: 'Project deleted successfully' }, origin);
                } catch (e) {
                    return send(res, 500, { error: 'Failed to delete project' }, origin);
                }
            }
        }

        if (parts[0] === 'versions') {
            if (req.method === 'POST' && parts.length === 1) {
                const body = await readJson(req);
                const { project_id, version, update_time, content, download_url } = body;
                const project = await prisma.project.findUnique({
                    where: { id: project_id },
                    select: { id: true, latest_update_time: true },
                });
                if (!project) return send(res, 404, { error: 'Project not found' }, origin);
                const newVersion = await prisma.version.create({
                    data: {
                        project_id,
                        version,
                        update_time: update_time ? toDate(update_time) : new Date(),
                        content,
                        download_url,
                    },
                    select: {
                        id: true,
                        project_id: true,
                        version: true,
                        update_time: true,
                        content: true,
                        download_url: true,
                    },
                });
                if (update_time) {
                    const updateDate = toDate(update_time);
                    if (!project.latest_update_time || (updateDate && updateDate > project.latest_update_time)) {
                        await prisma.project.updateMany({
                            where: { id: project_id },
                            data: { latest_version: version, latest_update_time: updateDate || new Date() },
                        });
                    }
                }
                return send(res, 201, newVersion, origin);
            }

            if (req.method === 'PUT' && parts.length === 2) {
                const versionId = parseInt(parts[1], 10);
                if (!versionId) return send(res, 400, { error: 'Invalid version id' }, origin);
                const body = await readJson(req);
                const { project_id, version, update_time, content, download_url } = body;
                const exists = await prisma.version.findUnique({ where: { id: versionId }, select: { id: true, project_id: true } });
                if (!exists) return send(res, 404, { error: 'Version not found' }, origin);
                await prisma.version.updateMany({
                    where: { id: versionId },
                    data: {
                        version,
                        update_time: update_time ? toDate(update_time) : undefined,
                        content,
                        download_url,
                    },
                });
                if (project_id && update_time) {
                    const updateDate = toDate(update_time);
                    await prisma.project.updateMany({
                        where: { id: project_id },
                        data: { latest_version: version, latest_update_time: updateDate || new Date() },
                    });
                }
                const updated = await prisma.version.findUnique({
                    where: { id: versionId },
                    select: { id: true, project_id: true, version: true, update_time: true, content: true, download_url: true },
                });
                return send(res, 200, updated, origin);
            }

            if (req.method === 'DELETE' && parts.length === 2) {
                const versionId = parseInt(parts[1], 10);
                if (!versionId) return send(res, 400, { error: 'Invalid version id' }, origin);
                try {
                    await prisma.version.delete({ where: { id: versionId } });
                    return send(res, 200, { message: 'Version deleted successfully' }, origin);
                } catch (e) {
                    return send(res, 500, { error: 'Failed to delete version' }, origin);
                }
            }
        }

        if (parts[0] === 'scrape' && parts[1] === 'github') {
            if (req.method === 'POST' && parts.length === 3 && parts[2] === 'repo') {
                const body = await readJson(req);
                const repoUrl = body.repoUrl || body.repo || body.name;
                if (!repoUrl) return send(res, 400, { error: 'repoUrl is required' }, origin);
                const info = await fetchGithubRepoInfo(repoUrl);
                if (!info) return send(res, 400, { error: 'Invalid GitHub repo input' }, origin);
                return send(res, 200, { success: true, data: info }, origin);
            }

            if (parts.length === 3 && parts[2] === 'schedule') {
                if (req.method === 'GET') {
                    return send(res, 200, { success: true, schedule: getGithubScheduleStatus() }, origin);
                }
                if (req.method !== 'POST') return send(res, 405, { error: 'Method Not Allowed' }, origin);

                const body = await readJson(req);
                const repos = Array.isArray(body.repos)
                    ? body.repos
                    : typeof body.repos === 'string'
                        ? body.repos.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
                        : [];
                const includePrerelease = Boolean(body.include_prerelease);
                const limitPerRepo = body.limit_per_repo === undefined ? undefined : Number(body.limit_per_repo);
                const intervalMinutes = body.interval_minutes === undefined ? 0 : Number(body.interval_minutes);
                const runNow = Boolean(body.run_now);

                githubSchedule.repos = repos;
                githubSchedule.includePrerelease = includePrerelease;
                githubSchedule.limitPerRepo = Number.isFinite(limitPerRepo) ? limitPerRepo : undefined;

                clearGithubSchedule();
                if (Number.isFinite(intervalMinutes) && intervalMinutes > 0) {
                    githubSchedule.intervalMs = Math.round(intervalMinutes * 60000);
                    githubSchedule.timer = setInterval(() => {
                        runGithubScheduleOnce().catch(() => { });
                    }, githubSchedule.intervalMs);
                }

                const runResult = runNow ? await runGithubScheduleOnce() : null;
                return send(
                    res,
                    200,
                    { success: true, schedule: getGithubScheduleStatus(), run_result: runResult },
                    origin
                );
            }

            if (req.method !== 'POST' || parts.length !== 2) return send(res, 405, { error: 'Method Not Allowed' }, origin);

            const body = await readJson(req);
            const repos = Array.isArray(body.repos) ? body.repos : (process.env.GITHUB_REPOS || '').split(',').filter(Boolean);
            const includePrerelease = Boolean(body.include_prerelease);
            const limitPerRepo = body.limit_per_repo === undefined ? undefined : Number(body.limit_per_repo);

            if (!repos.length) return send(res, 400, { error: 'repos is required' }, origin);
            const result = await scrapeGithubReleasesToDb({ repos, includePrerelease, limitPerRepo });
            return send(res, 200, { success: true, result }, origin);
        }

        return notFound(res, origin);
    } catch (error) {
        console.error('Unhandled error:', error);
        return send(res, 500, { error: 'Internal server error' }, origin);
    }
});

const port = process.env.BACKEND_NODE_PORT ? parseInt(process.env.BACKEND_NODE_PORT, 10) : 8000;
server.listen(port, '0.0.0.0', () => { });
