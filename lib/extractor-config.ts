// version-extractor 地址配置：DB 优先（后台可改，不用重启），env EXTRACTOR_URL 兜底
import { prisma } from '@/lib/prisma';

const KEY = 'extractor_url';

export async function getExtractorUrl(): Promise<string> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
    if (row?.value) return row.value.trim().replace(/\/+$/, '');
  } catch {
    /* DB 不可用则回退 env */
  }
  return (process.env.EXTRACTOR_URL || '').trim().replace(/\/+$/, '');
}

export async function setExtractorUrl(url: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: KEY },
    update: { value: url.trim() },
    create: { key: KEY, value: url.trim() },
  });
}

export async function isExtractorConfigured(): Promise<boolean> {
  return Boolean(await getExtractorUrl());
}
