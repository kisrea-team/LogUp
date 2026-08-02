const fs = require('fs');

const SITE_URL = (process.env.SITE_URL || 'https://zitons-logup-re.hf.space').replace(/\/$/, '');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const CHANGED_FILE = process.env.CHANGED_FILE || '/tmp/changed-projects.txt';
const REPORT_FILE = process.env.GITHUB_UPDATE_REPORT_FILE || '/tmp/github-update-report.json';

// 给站点 API 请求注入鉴权头（写接口需要 x-admin-key）
function withAdminAuth(headers = {}) {
  return ADMIN_API_KEY ? { ...headers, 'x-admin-key': ADMIN_API_KEY } : headers;
}

function parseGitHubRepo(url) {
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname === 'github.com') {
            const parts = parsedUrl.pathname.replace(/\/$/, '').split('/').filter(Boolean);
            if (parts.length >= 2) {
                let sourceType = 'auto';
                if (parts[2] === 'tags') sourceType = 'tags';
                if (parts[2] === 'releases') sourceType = 'releases';
                return { owner: parts[0], repo: parts[1], sourceType };
            }
        }
        if (parsedUrl.hostname === 'api.github.com') {
            const parts = parsedUrl.pathname.replace(/\/$/, '').split('/').filter(Boolean);
            if (parts.length >= 4 && parts[0] === 'repos') {
                let sourceType = 'auto';
                if (parts[3] === 'tags') sourceType = 'tags';
                if (parts[3] === 'releases') sourceType = 'releases';
                return { owner: parts[1], repo: parts[2], sourceType };
            }
        }
    } catch {
        return null;
    }
    return null;
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

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: withAdminAuth(options.headers || {}),
    });
    const text = await response.text();
    let body = null;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`);
    }
    return { response, body };
}

async function fetchText(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();
    return { response, text };
}

async function fetchAllProjects() {
    const projects = [];
    let page = 1;
    while (true) {
        const { response, body } = await fetchJson(`${SITE_URL}/api/projects?page=${page}&per_page=100`);
        if (!response.ok) {
            throw new Error(`Failed to fetch projects page ${page}: http-${response.status}`);
        }
        const items = Array.isArray(body?.data) ? body.data : [];
        projects.push(...items);
        if (items.length < 100 || page >= body.total_pages) break;
        page += 1;
    }
    return projects;
}

async function fetchProjectDetail(projectId) {
    const { response, body } = await fetchJson(`${SITE_URL}/api/projects/${projectId}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch project ${projectId}: http-${response.status}`);
    }
    return body;
}

function getGitHubHeaders() {
    const headers = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'logup-github-auto-updater/1.0',
    };
    if (GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
    }
    return headers;
}

async function fetchLatestRelease(owner, repo) {
    const { response, body } = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
        headers: getGitHubHeaders(),
    });
    if (response.status === 404) return null;
    if (!response.ok) {
        throw new Error(`GitHub release latest failed: http-${response.status}`);
    }
    if (!body?.tag_name) return null;
    return {
        version: body.tag_name,
        publishedAt: body.published_at || body.created_at || new Date().toISOString(),
        body: typeof body.body === 'string' ? body.body.trim() : '',
        downloadUrl: body.html_url || body.zipball_url || `https://github.com/${owner}/${repo}/releases/latest`,
        source: 'release',
    };
}

async function fetchCommitDate(owner, repo, sha) {
    const { response, body } = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
        headers: getGitHubHeaders(),
    });
    if (!response.ok) {
        return new Date().toISOString();
    }
    return body?.commit?.committer?.date || body?.commit?.author?.date || new Date().toISOString();
}

async function fetchLatestTag(owner, repo) {
    const { response, body } = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`, {
        headers: getGitHubHeaders(),
    });
    if (!response.ok) {
        throw new Error(`GitHub tags failed: http-${response.status}`);
    }
    const firstTag = Array.isArray(body) ? body[0] : null;
    if (!firstTag?.name) return null;
    const publishedAt = await fetchCommitDate(owner, repo, firstTag.commit?.sha);
    return {
        version: firstTag.name,
        publishedAt,
        body: '',
        downloadUrl: `https://github.com/${owner}/${repo}/archive/refs/tags/${encodeURIComponent(firstTag.name)}.zip`,
        source: 'tag',
    };
}

async function fetchLatestGitHubVersion(owner, repo, sourceType) {
    if (sourceType === 'tags') {
        return fetchLatestTag(owner, repo);
    }
    if (sourceType === 'releases') {
        return (await fetchLatestRelease(owner, repo)) || (await fetchLatestTag(owner, repo));
    }
    return (await fetchLatestRelease(owner, repo)) || (await fetchLatestTag(owner, repo));
}

async function translateMarkdown(content) {
    const { response, body } = await fetchJson(`${SITE_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content,
            mode: 'translation-only',
            stream: false,
        }),
    });
    if (!response.ok) {
        throw new Error(`Translation failed: http-${response.status}`);
    }
    return typeof body?.translatedContent === 'string' ? body.translatedContent.trim() : '';
}

async function updateProject(projectId, payload) {
    const { response, body } = await fetchJson(`${SITE_URL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Project update failed: http-${response.status} ${JSON.stringify(body)}`);
    }
    return body;
}

async function createVersion(payload) {
    const { response, body } = await fetchJson(`${SITE_URL}/api/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Version create failed: http-${response.status} ${JSON.stringify(body)}`);
    }
    return body;
}

function buildFallbackContent(projectName, version, source) {
    if (source === 'tag') {
        return `${projectName} 发布了新标签 ${version}，该版本未提供 GitHub Releases 更新日志。`;
    }
    return `${projectName} 发布了新版本 ${version}，该版本未提供可用的更新日志。`;
}

function readChangedNames() {
    if (!fs.existsSync(CHANGED_FILE)) return [];
    const content = fs.readFileSync(CHANGED_FILE, 'utf-8');
    return content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function writeChangedNames(names) {
    fs.writeFileSync(CHANGED_FILE, names.join('\n'));
}

async function processGitHubProject(project) {
    const repoInfo = parseGitHubRepo(project.update_source_url);
    if (!repoInfo) {
        return { name: project.name, action: 'skipped', reason: 'not-github' };
    }

    const detail = await fetchProjectDetail(project.id);
    const latest = await fetchLatestGitHubVersion(repoInfo.owner, repoInfo.repo, repoInfo.sourceType);

    if (!latest?.version) {
        return { name: project.name, action: 'skipped', reason: 'no-latest-version' };
    }

    if (areVersionsEquivalent(detail.latest_version, latest.version)) {
        return { name: project.name, action: 'no-change', version: latest.version };
    }

    let content = latest.body;
    if (content) {
        try {
            content = await translateMarkdown(content);
        } catch (error) {
            console.warn(`[github-auto-update] translate-failed: ${project.name} — ${error.message}`);
        }
    }
    if (!content) {
        content = buildFallbackContent(project.name, latest.version, latest.source);
    }

    await updateProject(project.id, {
        latest_version: latest.version,
        latest_update_time: latest.publishedAt,
    });

    const hasExistingVersion = Array.isArray(detail.versions)
        && detail.versions.some((item) => areVersionsEquivalent(item.version, latest.version));

    if (!hasExistingVersion) {
        await createVersion({
            project_id: project.id,
            version: latest.version,
            update_time: latest.publishedAt,
            content,
            download_url: latest.downloadUrl,
        });
    }

    return {
        name: project.name,
        action: hasExistingVersion ? 'project-updated-only' : 'updated',
        version: latest.version,
        source: latest.source,
    };
}

async function main() {
    const changedNames = readChangedNames();
    if (changedNames.length === 0) {
        fs.writeFileSync(REPORT_FILE, JSON.stringify({ processed: [], remainingChanged: [] }, null, 2));
        console.log('[github-auto-update] No changed projects to process.');
        return;
    }

    const allProjects = await fetchAllProjects();
    const changedSet = new Set(changedNames);
    const githubChangedProjects = allProjects.filter((project) => (
        changedSet.has(project.name) && parseGitHubRepo(project.update_source_url)
    ));
    const remainingChanged = changedNames.filter((name) => !githubChangedProjects.some((project) => project.name === name));

    const processed = [];
    for (const project of githubChangedProjects) {
        try {
            const result = await processGitHubProject(project);
            processed.push(result);
            console.log(`[github-auto-update] ${result.action}: ${project.name}${result.version ? ` — ${result.version}` : ''}`);
        } catch (error) {
            processed.push({ name: project.name, action: 'failed', error: error.message });
            console.error(`[github-auto-update] failed: ${project.name} — ${error.message}`);
        }
    }

    writeChangedNames(remainingChanged);
    fs.writeFileSync(REPORT_FILE, JSON.stringify({ processed, remainingChanged }, null, 2));
    console.log(`[github-auto-update] Processed ${githubChangedProjects.length} GitHub changed project(s); ${remainingChanged.length} non-GitHub changed project(s) left for AI.`);
}

main().catch((error) => {
    console.error('[github-auto-update] Fatal error:', error.message);
    fs.writeFileSync(REPORT_FILE, JSON.stringify({ fatal: error.message }, null, 2));
    process.exit(0);
});