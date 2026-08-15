// AI Provider 配置读写
//
// - api_key 用 AES-256-GCM 加密存储（密钥来自 AI_KEY_SECRET 或 ADMIN_SESSION_SECRET）
// - 对外返回时脱敏（仅显示首尾各 4 位）
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { AiProvider } from '@prisma/client';

const ENC_KEY = process.env.AI_KEY_SECRET || process.env.ADMIN_SESSION_SECRET || 'logup-dev-ai-key';

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(ENC_KEY), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) return '';
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(ENC_KEY), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

export interface AiProviderView {
  id: number;
  name: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  priority: number;
  scope: string;
  routerRole: string | null;
  apiKeyMasked: string;
  hasApiKey: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toView(p: AiProvider): AiProviderView {
  return {
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    model: p.model,
    enabled: p.enabled,
    priority: p.priority,
    scope: p.scope,
    routerRole: p.routerRole,
    apiKeyMasked: maskKey(p.apiKey),
    hasApiKey: Boolean(p.apiKey),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export async function listProviders(): Promise<AiProviderView[]> {
  const rows = await prisma.aiProvider.findMany({ orderBy: [{ enabled: 'desc' }, { priority: 'asc' }, { id: 'asc' }] });
  return rows.map(toView);
}

// 获取启用且优先级最高的 provider（解密后的完整 key，仅供服务端使用）
export async function getEnabledProvider(): Promise<
  (Omit<AiProvider, 'apiKey'> & { apiKey: string }) | null
> {
  const row = await prisma.aiProvider.findFirst({
    where: { enabled: true },
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
  });
  if (!row) return null;
  return { ...row, apiKey: decryptSecret(row.apiKey) };
}

// 获取启用且用于翻译的 provider（scope = translate|both），供 /api/translate 故障转移
export async function listEnabledWithKeys(scope: 'translate' | 'crawl' | 'both' = 'both'): Promise<
  Array<Omit<AiProvider, 'apiKey'> & { apiKey: string }>
> {
  const where =
    scope === 'both'
      ? { enabled: true }
      : { enabled: true, scope: { in: [scope, 'both'] } };
  const rows = await prisma.aiProvider.findMany({
    where,
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
  });
  return rows.map((row) => ({ ...row, apiKey: decryptSecret(row.apiKey) }));
}

// 生成 claude-code-router 配置（由 scope=crawl 的 provider 构建），供 GH Actions 动态生成 config.json
export async function getCrawlRouterConfig() {
  const rows = await prisma.aiProvider.findMany({
    where: { enabled: true, scope: { in: ['crawl', 'both'] } },
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
  });
  const providers = rows.map((row) => ({
    name: row.name,
    api_base_url: row.baseUrl,
    api_key: decryptSecret(row.apiKey),
    models: [row.model],
  }));
  const router: Record<string, string> = {};
  for (const row of rows) {
    if (row.routerRole) {
      router[row.routerRole] = `${row.name},${row.model}`;
    }
  }
  return {
    apiKey: rows[0] ? decryptSecret(rows[0].apiKey) : '',
    providers,
    router,
    configured: providers.length > 0,
  };
}

export interface AiProviderInput {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled?: boolean;
  priority?: number;
  scope?: string;
  routerRole?: string | null;
}

const VALID_SCOPES = ['translate', 'crawl', 'both'];

function normalizeScope(scope?: string): string {
  return VALID_SCOPES.includes(scope as string) ? (scope as string) : 'translate';
}

export async function createProvider(input: AiProviderInput) {
  const row = await prisma.aiProvider.create({
    data: {
      name: input.name.trim(),
      baseUrl: input.baseUrl.trim().replace(/\/+$/, ''),
      apiKey: encryptSecret(input.apiKey.trim()),
      model: input.model.trim(),
      enabled: input.enabled ?? true,
      priority: input.priority ?? 100,
      scope: normalizeScope(input.scope),
      routerRole: input.routerRole || null,
    },
  });
  return toView(row);
}

export async function updateProvider(id: number, input: Partial<AiProviderInput>) {
  const existing = await prisma.aiProvider.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.aiProvider.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl.trim().replace(/\/+$/, '') } : {}),
      ...(input.apiKey ? { apiKey: encryptSecret(input.apiKey.trim()) } : {}),
      ...(input.model !== undefined ? { model: input.model.trim() } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.scope !== undefined ? { scope: normalizeScope(input.scope) } : {}),
      ...(input.routerRole !== undefined ? { routerRole: input.routerRole || null } : {}),
    },
  });
  return toView(row);
}

export async function deleteProvider(id: number): Promise<boolean> {
  const existing = await prisma.aiProvider.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.aiProvider.delete({ where: { id } });
  return true;
}
