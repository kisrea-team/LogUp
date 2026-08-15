// 更新已有项目（sweep 模式）：遍历全库有 update_source_url 的项目，距上次检查超时（CHECK_TTL_HOURS）才重查。
// 逐个 POST {EXTRACTOR_URL}/extract {url, productName} → 高置信且版本更新则 PUT 写库；
// 每次检查后都更新 last_checked_at（版本没变也标记，避免反复重查）。
// 低置信/无版本/无 URL 的项目写入 /tmp/needs-ai-projects.txt 交给后续 AI 兜底。
//
// 环境变量：SITE_URL / ADMIN_API_KEY / EXTRACTOR_URL / CHECK_TTL_HOURS(默认24)
'use strict';

const fs = require('fs');

const SITE_URL = (process.env.SITE_URL || 'https://zitons-logup-re.hf.space').replace(/\/$/, '');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const EXTRACTOR_URL = (process.env.EXTRACTOR_URL || '').replace(/\/$/, '');
const CHECK_TTL_HOURS = Number(process.env.CHECK_TTL_HOURS || 24); // 距上次检查超时的小时数才重查
const NEEDS_AI_FILE = process.env.NEEDS_AI_FILE || '/tmp/needs-ai-projects.txt';
const REPORT_FILE = process.env.UPDATE_REPORT_FILE || '/tmp/update-report.json';

function withAdminAuth(headers = {}) {
  return ADMIN_API_KEY ? { ...headers, 'x-admin-key': ADMIN_API_KEY } : headers;
}

async function fetchJson(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.admin) headers['x-admin-key'] = ADMIN_API_KEY;
  const res = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(30000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}: ${body?.error || JSON.stringify(body).slice(0, 200)}`);
  return { status: res.status, body };
}

// 站点写接口
async function siteFetch(path, options = {}) {
  return fetchJson(`${SITE_URL}${path}`, { ...options, admin: true });
}

// 拉全部项目（分页），返回 name → project 映射
async function fetchAllProjects() {
  const map = new Map();
  let page = 1;
  const perPage = 100;
  for (;;) {
    const { body } = await siteFetch(`/api/projects?page=${page}&per_page=${perPage}`);
    const rows = Array.isArray(body.data) ? body.data : [];
    for (const p of rows) if (p && p.name) map.set(p.name, p);
    if (rows.length < perPage || page >= (body.total_pages || Infinity)) break;
    page += 1;
  }
  return map;
}


// 简单数值比较（同 logup 的 compareVersions 思路，忽略预发布后缀）
function compareVersions(a, b) {
  const parse = (v) => String(v || '').replace(/^v/i, '').replace(/[-+].*$/, '').split('.').map((x) => parseInt(x, 10) || 0);
  const x = parse(a), y = parse(b);
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const xi = x[i] || 0, yi = y[i] || 0;
    if (xi !== yi) return xi > yi ? 1 : -1;
  }
  return 0;
}


async function main() {
  if (!EXTRACTOR_URL) {
    console.error('[sweep] EXTRACTOR_URL 未配置，跳过');
    process.exit(0);
  }
  const projects = await fetchAllProjects();
  const all = [...projects.values()];
  const ttlMs = CHECK_TTL_HOURS * 3600 * 1000;
  const now = Date.now();
  // 过滤：有 update_source_url 且距上次检查超时（或从未检查）
  const due = all.filter((p) => {
    if (!p.update_source_url) return false;
    if (!p.last_checked_at) return true;
    return now - new Date(p.last_checked_at).getTime() > ttlMs;
  });
  console.log(`[sweep] 全库 ${all.length} 项目，需检查 ${due.length}（TTL ${CHECK_TTL_HOURS}h）`);
  const report = { total: due.length, updated: [], needsAi: [], noUrl: [], errors: [] };

  for (const p of due) {
    const name = p.name;
    const url = p.update_source_url || '';
    if (!url) { report.noUrl.push(name); report.needsAi.push(`${name}(无URL,需AI找网址)`); continue; }
    try {
      const { body } = await fetchJson(`${EXTRACTOR_URL}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, productName: name, fields: ['version'] }),
      });
      const v = body?.version;
      const cur = p.latest_version || '';
      if (!v?.version) { report.needsAi.push(`${name}(无版本)`); console.log(`[sweep] ⚠ ${name}: API 无版本`); }
      else if (v.needsAiCheck) { report.needsAi.push(`${name}(低置信:${v.confidence})`); console.log(`[sweep] ⚠ ${name}: 低置信 ${v.version}(${v.confidence}) → AI 兜底`); }
      else if (cur && compareVersions(v.version, cur) <= 0) { console.log(`[sweep] = ${name}: ${cur} → ${v.version}（不新）`); }
      else {
        const putBody = { latest_version: v.version, latest_update_time: new Date().toISOString() };
        await siteFetch(`/api/projects/${p.id}`, { method: 'PUT', body: JSON.stringify(putBody) });
        report.updated.push({ name, id: p.id, from: cur || null, to: v.version, source: v.source, confidence: v.confidence });
        console.log(`[sweep] ✅ ${name}: ${cur || '(无)'} → ${v.version} (${v.source})`);
      }
    } catch (e) {
      report.errors.push(`${name}: ${e.message}`);
      report.needsAi.push(`${name}(API错误)`);
      console.warn(`[sweep] ❌ ${name}: ${e.message}`);
    } finally {
      // 每次检查后都标记 last_checked_at（版本没变也标记，避免反复重查）
      try {
        await siteFetch(`/api/projects/${p.id}`, { method: 'PUT', body: JSON.stringify({ last_checked_at: new Date().toISOString() }) });
      } catch { /* 标记失败不影响结果 */ }
    }
  }

  fs.writeFileSync(NEEDS_AI_FILE, report.needsAi.map((s) => s.split('(')[0]).join('\n'));
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n[sweep] 更新 ${report.updated.length} | 需 AI 兜底 ${report.needsAi.length} | 无URL ${report.noUrl.length} | 错误 ${report.errors.length}`);
  console.log(`→ 需 AI 兜底清单: ${NEEDS_AI_FILE}`);
}

main().catch((e) => { console.error('[update-existing] 失败:', e.message); process.exit(1); });
