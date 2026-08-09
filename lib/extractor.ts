// 云端版本提取器客户端（version-extractor，取代 GitHub Actions 的远程抓取角色）
//
// 远端服务：POST {EXTRACTOR_URL}/extract
//   { url, fields: ["version","changelog"], registryKey?, productName? }
//   → { url, elapsedMs, version: { version, source, confidence, needsAiCheck, suggestedRegex, matchedContext?, ... }, changelog }
//
// 配置：后台 AppSetting 的 extractor_url 优先（后台可改），env EXTRACTOR_URL 兜底。
// 未配置 → 调用方全部回退本地规则。
import { getExtractorUrl, isExtractorConfigured as _isConfigured } from '@/lib/extractor-config';

export async function isExtractorConfigured(): Promise<boolean> {
  return _isConfigured();
}

export async function getExtractorBaseUrl(): Promise<string> {
  return getExtractorUrl();
}

export interface RemoteVersion {
  version: string | null;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  needsAiCheck: boolean;
  needsBrowser?: boolean;
  suggestedRegex: string | null;
  matchedContext?: string;
}

export interface RemoteChangelog {
  version?: string;
  date?: string | null;
  title?: string | null;
  content?: string;
  source?: string;
  confidence?: string;
}

export interface RemoteExtractResult {
  url: string;
  elapsedMs?: number;
  version?: RemoteVersion | null;
  changelog?: RemoteChangelog | null;
}

export async function extractFromRemote(
  url: string,
  opts: { fields?: Array<'version' | 'changelog'>; registryKey?: string; productName?: string; timeoutMs?: number } = {}
): Promise<RemoteExtractResult> {
  const base = await getExtractorBaseUrl();
  if (!base) throw new Error('EXTRACTOR_URL not configured');
  const timeoutMs = opts.timeoutMs ?? 60000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`${base}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        fields: opts.fields ?? ['version'],
        ...(opts.registryKey ? { registryKey: opts.registryKey } : {}),
        ...(opts.productName ? { productName: opts.productName } : {}),
      }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      let msg = `http ${resp.status}`;
      try {
        const d = await resp.json();
        if (d?.error) msg = String(d.error);
      } catch { /* keep status message */ }
      throw new Error(`extractor ${resp.status}: ${msg}`);
    }
    return (await resp.json()) as RemoteExtractResult;
  } finally {
    clearTimeout(timer);
  }
}
