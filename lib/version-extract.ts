// 从 HTML 文本中提取版本号（规则化，不依赖 LLM）
//
// 策略优先级：
// 1. 传入的 version_regex（显式规则）
// 2. <title>/meta/JSON-LD 等结构化位置中的版本号
// 3. 正文中带上下文（version/release/更新 等关键词）的版本号
//
// 关键：每次提取都返回【置信度】。低置信度结果必须升级到 AI 复核，
// 而不是直接写入 —— 否则用户无法知道哪个版本是错的。

export type Confidence = 'high' | 'medium' | 'low';

export interface VersionExtractResult {
  version: string | null;
  source: string; // version_regex | title | meta | json-ld | body | none
  confidence: Confidence;
  needsAiCheck: boolean; // confidence === 'low'
  suggestedRegex: string | null;
  matchedContext?: string;
}

const VERSION_PATTERNS: Array<{ re: RegExp; source: string }> = [
  // 完整 semver：1.2.3 / v1.2.3；预发布仅接受 alpha/beta/rc/pre/patch，避免吞文件名(-windows-x64.msi)
  {
    re: /\bv?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:alpha|beta|rc|pre|patch)[0-9.]*)?(?:[+][0-9A-Za-z.-]+)?\b/g,
    source: 'semver',
  },
  // 次版本：1.2 或 v1.2（裸数字需带小数点，避免年份/计数误报）
  { re: /\bv?(0|[1-9]\d*)\.(0|[1-9]\d*)\b/g, source: 'minor' },
  // 主版本：仅接受带 v 前缀的（v1 / v25），裸数字不算版本
  { re: /\bv(0|[1-9]\d*)\b/g, source: 'major' },
];

// 置信度：来源(scope) + 精度(pattern) 共同决定
function confidenceFor(scope: string, pattern: string): Confidence {
  if (scope === 'version_regex' || scope === 'json-ld') return 'high';
  if (scope === 'title') return pattern === 'semver' ? 'high' : pattern === 'minor' ? 'medium' : 'low';
  if (scope === 'body') return pattern === 'semver' ? 'medium' : 'low';
  return 'low';
}

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

export function suggestRegex(version: string): string | null {
  const cleaned = version.replace(/^v/i, '');
  const parts = cleaned.split('.').length;
  if (parts >= 3) return `v?(\\d+\\.\\d+\\.\\d+(?:[-+][0-9A-Za-z.-]+)?)`;
  if (parts === 2) return `v?(\\d+\\.\\d+)`;
  return `v?(\\d+)`;
}

function findInScopedText(scopedText: string, scope: string): { version: string; scope: string; pattern: string } | null {
  for (const pattern of VERSION_PATTERNS) {
    const matches = [...scopedText.matchAll(pattern.re)];
    for (const m of matches) {
      const v = m[0];
      if (pattern.source === 'major' && /^\d{4}$/.test(v)) continue;
      return { version: normalizeVersion(v), scope, pattern: pattern.source };
    }
  }
  return null;
}

export function extractVersionFromHtml(
  html: string,
  opts: { versionRegex?: string | null; url?: string } = {}
): VersionExtractResult {
  const none = (): VersionExtractResult => ({ version: null, source: 'none', confidence: 'low', needsAiCheck: true, suggestedRegex: null });

  if (!html) return none();

  // 1. 显式正则
  if (opts.versionRegex) {
    try {
      const re = new RegExp(opts.versionRegex);
      const match = re.exec(html);
      const raw = match ? (match[1] !== undefined ? match[1] : match[0]) : null;
      if (raw) {
        const v = normalizeVersion(raw);
        return { version: v, source: 'version_regex', confidence: 'high', needsAiCheck: false, suggestedRegex: opts.versionRegex, matchedContext: extractContext(html, match ? match.index : -1) };
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
      const v = found.version;
      return {
        version: v,
        source: found.scope,
        confidence: confidenceFor(found.scope, found.pattern),
        needsAiCheck: confidenceFor(found.scope, found.pattern) === 'low',
        suggestedRegex: suggestRegex(v),
        matchedContext: extractContext(html, html.indexOf(v.replace(/^v/, ''))),
      };
    }
  }

  // 3. 正文带关键词上下文
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const keywordRe = /(?:version|v\.?\s|release|changelog|download|下载|更新|版本)[^\n]{0,80}/gi;
  const kwMatches = [...body.matchAll(keywordRe)];
  for (const kw of kwMatches) {
    const found = findInScopedText(kw[0], 'body');
    if (found) {
      const v = found.version;
      return {
        version: v,
        source: 'body',
        confidence: confidenceFor('body', found.pattern),
        needsAiCheck: confidenceFor('body', found.pattern) === 'low',
        suggestedRegex: suggestRegex(v),
        matchedContext: kw[0].trim(),
      };
    }
  }

  // 4. 全文兜底：仅接受完整 semver（来源不可控，一律标低置信需要复核）
  for (const pattern of VERSION_PATTERNS) {
    if (pattern.source !== 'semver') continue;
    const m = html.match(pattern.re);
    if (m) {
      const v = m[0];
      if (!/^\d{4}$/.test(v)) {
        return { version: normalizeVersion(v), source: 'body', confidence: 'low', needsAiCheck: true, suggestedRegex: suggestRegex(v) };
      }
    }
  }

  return none();
}

function extractContext(html: string, index: number): string {
  if (index < 0) return '';
  const start = Math.max(0, index - 60);
  const end = Math.min(html.length, index + 60);
  return html.slice(start, end).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── 版本比较与交叉校验（无需 AI 的低成本防错）──

// 把版本号拆成数字段做比较；处理 v 前缀、预发布、构建号
export function compareVersions(a: string, b: string): number {
  const parse = (v: string): number[] => {
    const cleaned = String(v || '').replace(/^v/i, '').replace(/-.*$/, '').replace(/\+.*$/, '');
    const nums = cleaned.split('.').map((x) => parseInt(x, 10) || 0);
    while (nums.length < 3) nums.push(0);
    return nums;
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export interface CrossCheckResult {
  verdict: 'update' | 'equal' | 'downgrade' | 'incomparable';
  reason: string;
  // 只有 verdict=update 才信任；downgrade/equal 几乎必错
  trustable: boolean;
}

// 用数据库当前版本做交叉校验：真实更新几乎总是版本变大
export function crossCheckVersion(
  extracted: string | null,
  currentDbVersion: string | null | undefined
): CrossCheckResult {
  if (!extracted) {
    return { verdict: 'incomparable', reason: '未提取到版本', trustable: false };
  }
  if (!currentDbVersion) {
    return { verdict: 'incomparable', reason: '数据库无当前版本，无法交叉校验', trustable: true };
  }
  const cmp = compareVersions(extracted, currentDbVersion);
  if (cmp > 0) {
    return { verdict: 'update', reason: `提取 ${extracted} > 库里 ${currentDbVersion}，符合更新方向`, trustable: true };
  }
  if (cmp === 0) {
    return { verdict: 'equal', reason: `提取 ${extracted} == 库里 ${currentDbVersion}，无更新`, trustable: false };
  }
  return { verdict: 'downgrade', reason: `提取 ${extracted} < 库里 ${currentDbVersion}，疑似提取错误`, trustable: false };
}

// 最终裁决：置信度 + 交叉校验共同决定是否可无 AI 直接写入
export function shouldTrustExtraction(
  extract: VersionExtractResult,
  currentDbVersion: string | null | undefined
): { trust: boolean; reason: string; needsAiCheck: boolean } {
  const cross = crossCheckVersion(extract.version, currentDbVersion);
  if (extract.confidence === 'high' && cross.trustable) {
    return { trust: true, reason: `高置信(${extract.source}) + ${cross.reason}`, needsAiCheck: false };
  }
  if (extract.confidence === 'high' && cross.verdict === 'incomparable') {
    return { trust: true, reason: `高置信(${extract.source})，无当前版本可比`, needsAiCheck: false };
  }
  if (extract.confidence === 'high' && !cross.trustable) {
    return { trust: false, reason: `高置信但交叉校验异常(${cross.reason})，需人工/AI 确认`, needsAiCheck: true };
  }
  if (extract.confidence === 'medium') {
    return { trust: false, reason: `中置信(${extract.source})，需确认（建议 AI 复核）`, needsAiCheck: true };
  }
  return { trust: false, reason: `低置信(${extract.source}) + ${cross.reason}，需 AI 复核`, needsAiCheck: true };
}
