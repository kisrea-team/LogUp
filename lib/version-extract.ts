// 从 HTML 文本中提取版本号（规则化，不依赖 LLM）
//
// 策略优先级：
// 1. 传入的 version_regex（显式规则）
// 2. <title>/meta/JSON-LD 等结构化位置中的版本号
// 3. 正文中带上下文（version/release/更新 等关键词）的版本号
// 同时给出建议的 version_regex，供写入项目配置。

export interface VersionExtractResult {
  version: string | null;
  source: string; // version_regex | title | meta | json-ld | body | none
  suggestedRegex: string | null;
  matchedContext?: string;
}

const VERSION_PATTERNS: Array<{ re: RegExp; source: string }> = [
  // 完整 semver：1.2.3 或 v1.2.3
  { re: /\bv?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+][0-9A-Za-z.-]+)?\b/g, source: 'semver' },
  // 次版本：1.2
  { re: /\bv?(0|[1-9]\d*)\.(0|[1-9]\d*)\b/g, source: 'minor' },
  // 主版本：v1 / 1.x
  { re: /\bv?(0|[1-9]\d*)\b/g, source: 'major' },
];

// 提取 JSON-LD / __NEXT_DATA__ / __INITIAL_STATE__ 中的内联 JSON 文本
function extractStructuredText(html: string): string {
  const parts: string[] = [];
  const jsonLd = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  jsonLd.forEach((m) => parts.push(m.replace(/<[^>]+>/g, '')));
  const nextData = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextData) parts.push(nextData[1]);
  const initState = html.match(/<script[^>]*id=["']__INITIAL_STATE__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (initState) parts.push(initState[1]);
  return parts.join('\n');
}

function normalizeVersion(raw: string): string {
  const t = raw.trim();
  return t.startsWith('v') || t.startsWith('V') ? t : `v${t}`;
}

function suggestRegex(version: string): string | null {
  const cleaned = version.replace(/^v/i, '');
  const parts = cleaned.split('.').length;
  if (parts >= 3) return `v?(\\d+\\.\\d+\\.\\d+(?:[-+][0-9A-Za-z.-]+)?)`;
  if (parts === 2) return `v?(\\d+\\.\\d+)`;
  return `v?(\\d+)`;
}

function findInScopedText(scopedText: string, source: string): { version: string; source: string } | null {
  for (const pattern of VERSION_PATTERNS) {
    const matches = [...scopedText.matchAll(pattern.re)];
    for (const m of matches) {
      const v = m[0];
      // 避免把年份/日期(2024, 4.0 误判为版本) 当版本：单独数字需有版本语义
      if (pattern.source === 'major' && /^\d{4}$/.test(v)) continue;
      return { version: normalizeVersion(v), source };
    }
  }
  return null;
}

export function extractVersionFromHtml(
  html: string,
  opts: { versionRegex?: string | null; url?: string } = {}
): VersionExtractResult {
  if (!html) return { version: null, source: 'none', suggestedRegex: null };

  // 1. 显式正则
  if (opts.versionRegex) {
    try {
      const re = new RegExp(opts.versionRegex);
      const match = re.exec(html);
      const raw = match ? (match[1] !== undefined ? match[1] : match[0]) : null;
      if (raw) {
        return { version: normalizeVersion(raw), source: 'version_regex', suggestedRegex: opts.versionRegex, matchedContext: extractContext(html, match ? match.index : -1) };
      }
    } catch {
      // 正则无效，继续启发式
    }
  }

  // 2. 结构化位置
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const metas = [...html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:title|og:description)["'][^>]*content=["']([^"']*)["']/gi)].map((m) => m[1]).join(' ');
  const structured = extractStructuredText(html);

  const scoped = [
    { text: `${title}\n${metas}`, source: 'title' },
    { text: structured, source: 'json-ld' },
  ];
  for (const s of scoped) {
    const found = findInScopedText(s.text, s.source);
    if (found) {
      return { version: found.version, source: found.source, suggestedRegex: suggestRegex(found.version), matchedContext: extractContext(html, html.indexOf(found.version.replace(/^v/, ''))) };
    }
  }

  // 3. 正文带关键词上下文
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const keywordRe = /(?:version|v\.?\s|release|changelog|更新|版本)[^\n]{0,80}/gi;
  const kwMatches = [...body.matchAll(keywordRe)];
  for (const kw of kwMatches) {
    const found = findInScopedText(kw[0], 'body');
    if (found) {
      return { version: found.version, source: found.source, suggestedRegex: suggestRegex(found.version), matchedContext: kw[0].trim() };
    }
  }

  // 4. 全文兜底：优先 semver 完整三段
  for (const pattern of VERSION_PATTERNS) {
    if (pattern.source !== 'semver') continue;
    const m = html.match(pattern.re);
    if (m) {
      const v = m[0];
      if (!/^\d{4}$/.test(v)) {
        return { version: normalizeVersion(v), source: 'body', suggestedRegex: suggestRegex(v) };
      }
    }
  }

  return { version: null, source: 'none', suggestedRegex: null };
}

function extractContext(html: string, index: number): string {
  if (index < 0) return '';
  const start = Math.max(0, index - 60);
  const end = Math.min(html.length, index + 60);
  return html.slice(start, end).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
