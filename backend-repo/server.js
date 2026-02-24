const http = require('http');
const { URL } = require('url');
const { PrismaClient } = require('@prisma/client');
const { CheerioCrawler } = require('@crawlee/cheerio');
const TurndownService = require('turndown');
const Parser = require('rss-parser');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const rssParser = new Parser({
    headers: {
        'User-Agent': 'logup-scraper',
        Accept: 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
    },
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
                resolve({});
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

function extractVersionFromText(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    const match = t.match(/\bv?(\d+(?:\.\d+){0,4})(?:[-+][0-9A-Za-z.-]+)?\b/);
    if (!match) return null;
    return normalizeVersion(match[0]);
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

function normalizeRsshubPathParts({ routePrefix, suffix }) {
    let prefix = String(routePrefix || '');
    let tail = suffix == null ? '' : String(suffix);

    prefix = prefix.replace(/^\/+/, '/');
    if (prefix === '/apple/apps/update' || prefix.startsWith('/apple/apps/update/')) {
        prefix = '/appstore/update';
    } else if (prefix === '/apple/appstore/update' || prefix.startsWith('/apple/appstore/update/')) {
        prefix = '/appstore/update';
    }

    if (prefix === '/appstore/update' || prefix.startsWith('/appstore/update/')) {
        tail = tail.replace(/^\/+/, '/');
        tail = tail.replace(/^\/(cn|us|hk|jp|gb|tw)\/id(\d+)/i, '/$1/$2');
        tail = tail.replace(/^\/id(\d+)/i, '/$1');
    }

    return { prefix, tail };
}

function coerceRsshubSuffixInput(value) {
    if (value === undefined || value === null) return null;
    if (Array.isArray(value)) {
        const parts = value.map((v) => String(v || '').trim()).filter(Boolean);
        return parts.length ? parts.join('\n') : null;
    }
    const text = String(value).trim();
    return text ? text : null;
}

function parseRsshubSuffixList(value) {
    if (value === undefined || value === null) return [null];
    const raw = Array.isArray(value) ? value.join('\n') : String(value);
    const parts = raw
        .split(/\r?\n|,|;|\|/)
        .map((s) => String(s || '').trim())
        .filter(Boolean);
    return parts.length ? parts : [null];
}

function buildRsshubFeedUrl(source, suffixOverride) {
    const baseFromEnv = process.env.RSSHUB_BASE_URL ? String(process.env.RSSHUB_BASE_URL) : '';
    const base = String(baseFromEnv || source.base_url || '').replace(/\/+$/, '');
    const normalized = normalizeRsshubPathParts({
        routePrefix: source.route_prefix,
        suffix: suffixOverride !== undefined ? suffixOverride : source.suffix,
    });
    const route = normalized.prefix.startsWith('/') ? normalized.prefix : `/${normalized.prefix}`;
    const tail = normalized.tail ? (normalized.tail.startsWith('/') ? normalized.tail : `/${normalized.tail}`) : '';
    return `${base}${route}${tail}`;
}

async function resolveOrCreateProjectByRef(projectRef, defaults) {
    const ref = String(projectRef || '').trim();
    if (!ref) throw new Error('project_ref is required');

    if (isNumeric(ref)) {
        const byId = await prisma.project
            .findUnique({ where: { id: parseInt(ref, 10) }, select: { id: true } })
            .catch(() => null);
        if (byId && byId.id) return byId.id;

        const bySlug = await prisma.project.findUnique({ where: { slug: ref }, select: { id: true } }).catch(() => null);
        if (bySlug && bySlug.id) return bySlug.id;
    } else {
        const bySlug = await prisma.project.findUnique({ where: { slug: ref }, select: { id: true } }).catch(() => null);
        if (bySlug && bySlug.id) return bySlug.id;
    }

    const slug = ref;
    const name = (defaults && defaults.name) ? String(defaults.name) : ref;
    const icon = (defaults && defaults.icon) ? String(defaults.icon) : 'RSS';

    try {
        const created = await prisma.project.create({
            data: {
                icon,
                name,
                slug,
                latest_version: 'v0.0.0',
                latest_update_time: new Date(0),
            },
            select: { id: true },
        });
        return created.id;
    } catch (e) {
        if (e && (e.code === 'P2002' || String(e.message || '').includes('Unique constraint'))) {
            const existing = await prisma.project.findUnique({ where: { slug }, select: { id: true } }).catch(() => null);
            if (existing && existing.id) return existing.id;
        }
        throw e;
    }
}

async function runRsshubSourceOnce(source, { maxItems } = {}) {
    const suffixes = parseRsshubSuffixList(source.suffix);
    const feeds = [];
    let projectId = null;
    let existingSet = null;
    let newest = null;

    for (const suffix of suffixes) {
        const feedUrl = buildRsshubFeedUrl(source, suffix);
        try {
            const feed = await rssParser.parseURL(feedUrl);
            if (!projectId) {
                projectId = await resolveOrCreateProjectByRef(source.project_ref, {
                    name: feed && feed.title ? feed.title : undefined,
                    icon: 'RSS',
                });
                const existingVersions = await prisma.version.findMany({
                    where: { project_id: projectId },
                    select: { version: true },
                });
                existingSet = new Set(existingVersions.map((v) => v.version));
            }

            const items = Array.isArray(feed.items) ? feed.items : [];
            const limitedItems =
                typeof maxItems === 'number' && Number.isFinite(maxItems) && maxItems > 0 ? items.slice(0, maxItems) : items;

            const results = [];
            for (const item of limitedItems) {
                const title = item && item.title ? String(item.title) : '';
                const parsedVersion = extractVersionFromText(title);
                const fallbackVersion = title ? normalizeVersion(title.replace(/\s+/g, '-').slice(0, 32)) : null;
                const version = parsedVersion || fallbackVersion;
                if (!version) continue;

                const updateDate = toDate(item.isoDate || item.pubDate) || new Date();
                const content = cleanHtmlContent(item.content || item.contentSnippet || '');
                const downloadUrl = item.link || '';

                if (!newest || updateDate > newest.updateDate) {
                    newest = { version, updateDate };
                }

                if (!existingSet.has(version)) {
                    await prisma.version.create({
                        data: {
                            project_id: projectId,
                            version,
                            update_time: updateDate,
                            content,
                            download_url: downloadUrl,
                        },
                        select: { id: true },
                    });
                    existingSet.add(version);
                    results.push({ version, created: true });
                } else {
                    await prisma.version.updateMany({
                        where: { project_id: projectId, version },
                        data: {
                            update_time: updateDate,
                            content,
                            download_url: downloadUrl,
                        },
                    });
                    results.push({ version, updated: true });
                }
            }

            feeds.push({ suffix, feed_url: feedUrl, success: true, processed: results.length, results });
        } catch (e) {
            const message = e && e.message ? e.message : String(e);
            feeds.push({ suffix, feed_url: feedUrl, success: false, error: message });
        }
    }

    if (!projectId) {
        const firstError = feeds.find((f) => !f.success)?.error || 'Unknown error';
        throw new Error(firstError);
    }

    if (newest) {
        await prisma.project.updateMany({
            where: { id: projectId },
            data: { latest_version: newest.version, latest_update_time: newest.updateDate },
        });
    }

    const processed = feeds.reduce((sum, f) => sum + (f.success ? f.processed : 0), 0);
    return { project_id: projectId, processed, feeds };
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

// Extract first image URL from markdown/HTML text (README content)
function isBadgeUrl(url) {
    const badgeHosts = [
        'shields.io', 'img.shields.io', 'badge.fury.io', 'badgen.net',
        'travis-ci.org', 'travis-ci.com', 'circleci.com', 'codecov.io',
        'coveralls.io', 'snyk.io', 'sonarcloud.io', 'app.fossa.com',
        'david-dm.org', 'deps.rs', 'crates.io', 'actions.cherkashin.dev',
    ];
    try {
        const u = new URL(url);
        if (badgeHosts.some((h) => u.hostname === h || u.hostname.endsWith('.' + h))) return true;
        // GitHub Actions badge URLs
        if (u.hostname === 'github.com' && u.pathname.includes('/badge')) return true;
        // Any URL with /badge or /shield in the path
        if (/\/(badge|shield)s?[/._]/i.test(u.pathname) || u.pathname.toLowerCase().endsWith('/badge')) return true;
        // SVG files named like badges
        if (/badge|shield/i.test(u.pathname)) return true;
    } catch {
        return false;
    }
    return false;
}

function extractFirstImageFromReadme(content) {
    if (!content) return null;
    // Collect all markdown images: ![alt](url)
    for (const m of content.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)) {
        if (!isBadgeUrl(m[1])) return m[1];
    }
    // Collect all HTML img tags: <img src="url"
    for (const m of content.matchAll(/<img[^>]+src=["'](https?:\/\/[^"'\s]+)["']/gi)) {
        if (!isBadgeUrl(m[1])) return m[1];
    }
    return null;
}

// Fetch the first image from a repo's README as an icon URL
async function fetchReadmeIcon(owner, repo) {
    try {
        const headers = {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'logup-scraper',
        };
        if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

        const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!data.content) return null;

        const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
        const imageUrl = extractFirstImageFromReadme(decoded);
        return imageUrl || null;
    } catch {
        return null;
    }
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

// Fetch trending repos via GitHub Search API
async function fetchGithubTrendingRepos({ language, since, perPage = 25 } = {}) {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'logup-scraper',
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    const sinceDate = new Date();
    if (since === 'daily') sinceDate.setDate(sinceDate.getDate() - 1);
    else if (since === 'monthly') sinceDate.setMonth(sinceDate.getMonth() - 1);
    else sinceDate.setDate(sinceDate.getDate() - 7); // default: weekly
    const dateStr = sinceDate.toISOString().split('T')[0];

    let q = `stars:>100 pushed:>${dateStr}`;
    if (language) q += ` language:${language}`;

    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${perPage}`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`GitHub Search API ${resp.status}: ${text}`);
    }
    const data = await resp.json();
    return (data.items || []).map((item) => ({
        full_name: item.full_name,
        owner: item.owner && item.owner.login,
        repo: item.name,
        description: item.description || '',
        stars: item.stargazers_count,
        language: item.language || '',
        topics: Array.isArray(item.topics) ? item.topics.slice(0, 3).join(', ') : '',
    }));
}

async function scrapeGithubTrendingToDb({ language, since, perPage, limitPerRepo, includePrerelease } = {}) {
    const trending = await fetchGithubTrendingRepos({ language, since, perPage: perPage || 25 });
    if (!trending.length) return { trending: [], summary: { repos: [], created: 0, updated: 0, skipped: 0 } };

    const repos = trending.map((r) => `${r.owner}/${r.repo}`);
    const summary = await scrapeGithubReleasesToDb({
        repos,
        includePrerelease: Boolean(includePrerelease),
        limitPerRepo: limitPerRepo || 10,
    });

    // Enrich project metadata from trending API response
    for (const t of trending) {
        if (!t.owner || !t.repo) continue;
        const projectName = `${t.owner}/${t.repo}`;

        // 优先使用作者头像，其次 README 首图
        const repoData = await fetchGithubRepo(t.owner, t.repo).catch(() => null);
        const readmeIcon = await fetchReadmeIcon(t.owner, t.repo).catch(() => null);
        const icon = repoData?.owner?.avatar_url || readmeIcon || 'GH';

        await prisma.project.updateMany({
            where: { name: projectName },
            data: {
                ...(t.owner ? { author: t.owner } : {}),
                ...(t.language ? { type: t.language } : {}),
                icon,
            },
        }).catch(() => {});
    }

    return { trending, summary };
}

const trendingSchedule = {
    language: '',
    since: 'weekly',
    perPage: 25,
    limitPerRepo: 10,
    intervalMs: 6 * 60 * 60 * 1000, // default 6h
    timer: null,
    running: false,
    lastRunAt: null,
    lastError: null,
};

function getTrendingScheduleStatus() {
    return {
        enabled: Boolean(trendingSchedule.timer) && trendingSchedule.intervalMs > 0,
        language: trendingSchedule.language,
        since: trendingSchedule.since,
        per_page: trendingSchedule.perPage,
        limit_per_repo: trendingSchedule.limitPerRepo,
        interval_minutes: trendingSchedule.intervalMs ? Math.round(trendingSchedule.intervalMs / 60000) : 0,
        last_run_at: trendingSchedule.lastRunAt ? trendingSchedule.lastRunAt.toISOString() : null,
        last_error: trendingSchedule.lastError,
        running: trendingSchedule.running,
    };
}

function clearTrendingSchedule() {
    if (trendingSchedule.timer) clearInterval(trendingSchedule.timer);
    trendingSchedule.timer = null;
}

async function runTrendingScheduleOnce() {
    if (trendingSchedule.running) return { skipped: true, reason: 'running' };
    trendingSchedule.running = true;
    try {
        const result = await scrapeGithubTrendingToDb({
            language: trendingSchedule.language,
            since: trendingSchedule.since,
            perPage: trendingSchedule.perPage,
            limitPerRepo: trendingSchedule.limitPerRepo,
        });
        trendingSchedule.lastRunAt = new Date();
        trendingSchedule.lastError = null;
        return { success: true, result };
    } catch (e) {
        trendingSchedule.lastRunAt = new Date();
        trendingSchedule.lastError = e && e.message ? e.message : String(e);
        return { success: false, error: trendingSchedule.lastError };
    } finally {
        trendingSchedule.running = false;
    }
}

// Auto-start: first run 60s after boot, then every 6h
setTimeout(() => {
    console.log('[trending] Auto-starting first trending scrape...');
    runTrendingScheduleOnce().catch((e) => console.error('[trending] Auto run error:', e));
    trendingSchedule.timer = setInterval(() => {
        runTrendingScheduleOnce().catch((e) => console.error('[trending] Interval error:', e));
    }, trendingSchedule.intervalMs);
}, 60 * 1000);

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
        for (const release of selected) {
            if (!release || !release.tag_name) continue;

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

const rsshubSchedule = {
    intervalMs: 0,
    timer: null,
    running: false,
    lastRunAt: null,
    lastError: null,
};

function getRsshubScheduleStatus() {
    return {
        enabled: Boolean(rsshubSchedule.timer) && rsshubSchedule.intervalMs > 0,
        interval_minutes: rsshubSchedule.intervalMs ? Math.round(rsshubSchedule.intervalMs / 60000) : 0,
        last_run_at: rsshubSchedule.lastRunAt ? rsshubSchedule.lastRunAt.toISOString() : null,
        last_error: rsshubSchedule.lastError,
        running: rsshubSchedule.running,
    };
}

function clearRsshubSchedule() {
    if (rsshubSchedule.timer) clearInterval(rsshubSchedule.timer);
    rsshubSchedule.timer = null;
    rsshubSchedule.intervalMs = 0;
}

async function runRsshubScheduleOnce() {
    if (rsshubSchedule.running) return { skipped: true, reason: 'running' };
    rsshubSchedule.running = true;
    try {
        const sources = await prisma.rsshubSource.findMany({
            where: {
                enabled: true,
                interval_minutes: { gt: 0 },
            },
            orderBy: { id: 'asc' },
        });

        const now = Date.now();
        const dueSources = sources.filter((s) => {
            if (!s.interval_minutes || s.interval_minutes <= 0) return false;
            if (!s.last_run_at) return true;
            const intervalMs = s.interval_minutes * 60000;
            return s.last_run_at.getTime() <= now - intervalMs;
        });

        const results = [];
        for (const source of dueSources) {
            try {
                const runResult = await runRsshubSourceOnce(source, {});
                results.push({ id: source.id, success: true, result: runResult });
                await prisma.rsshubSource.update({
                    where: { id: source.id },
                    data: { last_run_at: new Date() },
                });
            } catch (e) {
                const message = e && e.message ? e.message : String(e);
                results.push({ id: source.id, success: false, error: message });
                await prisma.rsshubSource.update({
                    where: { id: source.id },
                    data: { last_run_at: new Date() },
                });
            }
        }

        rsshubSchedule.lastRunAt = new Date();
        rsshubSchedule.lastError = null;
        return { success: true, processed: results.length, results };
    } catch (e) {
        rsshubSchedule.lastRunAt = new Date();
        rsshubSchedule.lastError = e && e.message ? e.message : String(e);
        return { success: false, error: rsshubSchedule.lastError };
    } finally {
        rsshubSchedule.running = false;
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

        if (parts[0] === 'everything' && parts[1] === 'changes') {
            if (req.method !== 'GET') return send(res, 405, { error: 'Method Not Allowed' }, origin);
            const limitParam = urlObj.searchParams.get('limit') || '50';
            const limit = Math.max(1, Math.min(200, parseInt(limitParam, 10) || 50));
            const changes = await prisma.version.findMany({
                take: limit,
                orderBy: { update_time: 'desc' },
                select: {
                    id: true,
                    project_id: true,
                    version: true,
                    update_time: true,
                    content: true,
                    download_url: true,
                    project: {
                        select: {
                            id: true,
                            icon: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
            });
            return send(res, 200, { success: true, data: changes }, origin);
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
                const select = {
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
                };

                let project = null;
                if (isNumeric(idOrSlug)) {
                    project = await prisma.project
                        .findUnique({ where: { id: parseInt(idOrSlug, 10) }, select })
                        .catch(() => null);
                    if (!project) {
                        project = await prisma.project.findUnique({ where: { slug: idOrSlug }, select }).catch(() => null);
                    }
                } else {
                    project = await prisma.project.findUnique({ where: { slug: idOrSlug }, select }).catch(() => null);
                }
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

        if (parts[0] === 'scrape' && parts[1] === 'rsshub') {
            if (req.method === 'GET' && parts.length === 3 && parts[2] === 'routes') {
                const baseFromEnv = process.env.RSSHUB_BASE_URL ? String(process.env.RSSHUB_BASE_URL) : '';
                const base = (baseFromEnv || 'http://127.0.0.1:1200').replace(/\/+$/, '');
                const url = `${base}/__routes`;
                try {
                    const resp = await fetch(url, { headers: { 'User-Agent': 'logup-backend' } });
                    const text = await resp.text();
                    if (!resp.ok) return send(res, 502, { success: false, error: `RSSHub ${resp.status}`, body: text }, origin);
                    const data = JSON.parse(text);
                    return send(res, 200, { success: true, data }, origin);
                } catch (e) {
                    const message = e && e.message ? e.message : String(e);
                    return send(res, 500, { success: false, error: message, url }, origin);
                }
            }

            if (parts.length === 3 && parts[2] === 'schedule') {
                if (req.method === 'GET') {
                    return send(res, 200, { success: true, schedule: getRsshubScheduleStatus() }, origin);
                }
                if (req.method !== 'POST') return send(res, 405, { error: 'Method Not Allowed' }, origin);

                const body = await readJson(req);
                const intervalMinutes = body.interval_minutes === undefined ? 0 : Number(body.interval_minutes);
                const runNow = Boolean(body.run_now);

                clearRsshubSchedule();
                if (Number.isFinite(intervalMinutes) && intervalMinutes > 0) {
                    rsshubSchedule.intervalMs = Math.round(intervalMinutes * 60000);
                    rsshubSchedule.timer = setInterval(() => {
                        runRsshubScheduleOnce().catch(() => { });
                    }, rsshubSchedule.intervalMs);
                }

                const runResult = runNow ? await runRsshubScheduleOnce() : null;
                return send(res, 200, { success: true, schedule: getRsshubScheduleStatus(), run_result: runResult }, origin);
            }

            if (parts.length >= 3 && parts[2] === 'sources') {
                if (req.method === 'GET' && parts.length === 3) {
                    const sources = await prisma.rsshubSource.findMany({
                        orderBy: { id: 'desc' },
                    });
                    return send(res, 200, { success: true, data: sources }, origin);
                }

                if (req.method === 'POST' && parts.length === 3) {
                    const body = await readJson(req);
                    const name = String(body.name || '').trim();
                    const project_ref = String(body.project_ref || '').trim();
                    const base_url = String(body.base_url || '').trim();
                    const route_prefix = String(body.route_prefix || '').trim();
                    const suffix = coerceRsshubSuffixInput(body.suffix);
                    const enabled = body.enabled === undefined ? true : Boolean(body.enabled);
                    const interval_minutes =
                        body.interval_minutes === undefined || body.interval_minutes === null || body.interval_minutes === ''
                            ? null
                            : Number(body.interval_minutes);

                    if (!name || !project_ref || !base_url || !route_prefix) {
                        return send(res, 400, { error: 'name, project_ref, base_url, route_prefix are required' }, origin);
                    }

                    const created = await prisma.rsshubSource.create({
                        data: {
                            name,
                            project_ref,
                            base_url,
                            route_prefix,
                            suffix,
                            enabled,
                            interval_minutes: Number.isFinite(interval_minutes) ? Math.trunc(interval_minutes) : null,
                        },
                    });
                    return send(res, 201, { success: true, data: created }, origin);
                }

                if (req.method === 'PUT' && parts.length === 4) {
                    const sourceId = parseInt(parts[3], 10);
                    if (!sourceId) return send(res, 400, { error: 'Invalid source id' }, origin);
                    const body = await readJson(req);

                    const patch = {};
                    if (body.name !== undefined) patch.name = String(body.name || '').trim();
                    if (body.project_ref !== undefined) patch.project_ref = String(body.project_ref || '').trim();
                    if (body.base_url !== undefined) patch.base_url = String(body.base_url || '').trim();
                    if (body.route_prefix !== undefined) patch.route_prefix = String(body.route_prefix || '').trim();
                    if (body.suffix !== undefined) patch.suffix = coerceRsshubSuffixInput(body.suffix);
                    if (body.enabled !== undefined) patch.enabled = Boolean(body.enabled);
                    if (body.interval_minutes !== undefined) {
                        patch.interval_minutes =
                            body.interval_minutes === null || body.interval_minutes === '' ? null : Number(body.interval_minutes);
                    }

                    const keys = Object.keys(patch);
                    if (keys.length === 0) return send(res, 400, { error: 'No fields to update' }, origin);

                    if (patch.interval_minutes !== undefined) {
                        patch.interval_minutes = Number.isFinite(patch.interval_minutes)
                            ? Math.trunc(patch.interval_minutes)
                            : patch.interval_minutes;
                    }

                    let updated = null;
                    try {
                        updated = await prisma.rsshubSource.update({
                            where: { id: sourceId },
                            data: patch,
                        });
                    } catch (e) {
                        return send(res, 404, { error: 'Source not found' }, origin);
                    }
                    return send(res, 200, { success: true, data: updated }, origin);
                }

                if (req.method === 'DELETE' && parts.length === 4) {
                    const sourceId = parseInt(parts[3], 10);
                    if (!sourceId) return send(res, 400, { error: 'Invalid source id' }, origin);
                    try {
                        await prisma.rsshubSource.delete({ where: { id: sourceId } });
                    } catch {
                        return send(res, 404, { error: 'Source not found' }, origin);
                    }
                    return send(res, 200, { success: true }, origin);
                }

                if (req.method === 'POST' && parts.length === 5 && parts[4] === 'run') {
                    const sourceId = parseInt(parts[3], 10);
                    if (!sourceId) return send(res, 400, { error: 'Invalid source id' }, origin);

                    const body = await readJson(req);
                    const maxItems = body.max_items === undefined ? undefined : Number(body.max_items);

                    const source = await prisma.rsshubSource.findUnique({ where: { id: sourceId } });
                    if (!source) return send(res, 404, { error: 'Source not found' }, origin);

                    try {
                        const result = await runRsshubSourceOnce(source, { maxItems: Number.isFinite(maxItems) ? maxItems : undefined });
                        await prisma.rsshubSource.update({
                            where: { id: sourceId },
                            data: { last_run_at: new Date() },
                        });
                        return send(res, 200, { success: true, result }, origin);
                    } catch (e) {
                        const message = e && e.message ? e.message : String(e);
                        await prisma.rsshubSource.update({
                            where: { id: sourceId },
                            data: { last_run_at: new Date() },
                        });
                        return send(res, 500, { success: false, error: message }, origin);
                    }
                }

                return send(res, 405, { error: 'Method Not Allowed' }, origin);
            }

            return send(res, 404, { error: 'Not Found' }, origin);
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

            if (parts.length === 3 && parts[2] === 'trending') {
                if (req.method === 'GET') {
                    return send(res, 200, { success: true, schedule: getTrendingScheduleStatus() }, origin);
                }
                if (req.method !== 'POST') return send(res, 405, { error: 'Method Not Allowed' }, origin);

                const tBody = await readJson(req);
                if (tBody.set_schedule) {
                    const intervalMinutes = tBody.interval_minutes === undefined ? 0 : Number(tBody.interval_minutes);
                    trendingSchedule.language = tBody.language || '';
                    trendingSchedule.since = tBody.since || 'weekly';
                    trendingSchedule.perPage = Number(tBody.per_page) > 0 ? Number(tBody.per_page) : 25;
                    trendingSchedule.limitPerRepo = Number(tBody.limit_per_repo) > 0 ? Number(tBody.limit_per_repo) : 10;
                    clearTrendingSchedule();
                    if (Number.isFinite(intervalMinutes) && intervalMinutes > 0) {
                        trendingSchedule.intervalMs = Math.round(intervalMinutes * 60000);
                        trendingSchedule.timer = setInterval(() => {
                            runTrendingScheduleOnce().catch(() => {});
                        }, trendingSchedule.intervalMs);
                    }
                }
                const runNow = tBody.run_now !== false;
                const tRunResult = runNow ? await runTrendingScheduleOnce() : null;
                return send(res, 200, { success: true, schedule: getTrendingScheduleStatus(), run_result: tRunResult }, origin);
            }

            if (req.method === 'POST' && parts.length === 3 && parts[2] === 'fix-icons') {
                const projects = await prisma.project.findMany({
                    select: { id: true, name: true },
                });
                let fixed = 0;
                let failed = 0;
                for (const project of projects) {
                    const parsed = parseGithubRepoInput(project.name);
                    if (!parsed) { failed += 1; continue; }
                    const { owner, repo } = parsed;
                    try {
                        const repoData = await fetchGithubRepo(owner, repo).catch(() => null);
                        const readmeIcon = await fetchReadmeIcon(owner, repo).catch(() => null);
                        const icon = repoData?.owner?.avatar_url || readmeIcon || null;
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
                return send(res, 200, { success: true, total: projects.length, fixed, failed }, origin);
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
server.listen(port, '0.0.0.0', () => {
    console.log(`Backend server listening on port ${port}`);
});
