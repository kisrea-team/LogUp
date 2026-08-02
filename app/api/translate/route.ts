
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { unauthorizedIfNotAdmin } from '@/lib/auth';
import { listEnabledWithKeys } from '@/lib/ai-providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 兜底：未配置 ai_providers 时使用旧环境变量
const LEGACY_BASE_URL = 'https://api.siliconflow.cn/v1';
const LEGACY_MODEL = 'tencent/Hunyuan-MT-7B';

interface ProviderEndpoint {
  baseUrl: string;
  apiKey: string;
  model: string;
  name: string;
}

async function loadProviders(): Promise<ProviderEndpoint[]> {
  const rows = await listEnabledWithKeys('translate').catch(() => []);
  const providers = rows
    .filter((r) => r.baseUrl && r.apiKey && r.model)
    .map((r) => ({ baseUrl: r.baseUrl, apiKey: r.apiKey, model: r.model, name: r.name }));
  if (providers.length > 0) return providers;

  // 兼容旧配置
  const legacyKey = String(process.env.NVIDIA_API_KEY || '').trim();
  if (legacyKey) {
    return [{ baseUrl: LEGACY_BASE_URL, apiKey: legacyKey, model: LEGACY_MODEL, name: 'legacy' }];
  }
  return [];
}

export async function POST(request: NextRequest) {
    const denied = await unauthorizedIfNotAdmin(request);
    if (denied) return denied;

    try {
        const body = await request.json().catch(() => ({}));
        const content = body?.content;
        const stream = Boolean(body?.stream) || request.headers.get('accept')?.includes('text/event-stream');
        const mode: 'bilingual' | 'translation-only' = body?.mode === 'translation-only' ? 'translation-only' : 'bilingual';

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const providers = await loadProviders();
        if (providers.length === 0) {
            return NextResponse.json({ error: 'No AI provider configured' }, { status: 500 });
        }

        const systemPrompt = mode === 'translation-only'
            ? [
                '你是软件版本更新日志的中文整理助手。你的输出会直接写入项目版本表的 content 字段，面向中文用户阅读。',
                '任务：将输入的 Markdown 更新日志整理并翻译成高质量中文 Markdown。',
                '硬性要求：',
                '1. 只输出中文内容，不保留英文原文，不写解释，不加前言，不加“以下是翻译”之类套话。',
                '2. 忠实于原文，不得杜撰、扩写不存在的功能、修复、计划或结论。',
                '3. 保留 Markdown 结构；标题、列表、引用、表格、链接、代码块、内联代码都要尽量保留。代码、命令、路径、API 名称、配置键、版本号、提交哈希、链接 URL 不翻译。',
                '4. 允许做轻度编辑整理，让结果更像中文软件更新日志：语句更自然，列表更清晰，标题层级更规整。',
                '5. 若原文存在明显类别，可整理为常见中文小节，如“新增”“改进”“修复”“文档”“性能”“其他”；但只有原文确实包含该类信息时才创建小节。',
                '6. 若原文本身很短或只是若干条 bullet，就保持简洁，不要为了“好看”强行补结构。',
                '7. 专有名词优先采用常见中文技术表达；拿不准时保留英文原词。',
                '8. 不遗漏关键信息，尤其是 breaking changes、弃用、迁移说明、兼容性变化、安全修复。',
                '输出目标：结果应像人工整理过的中文版本更新日志，简洁、准确、可直接展示。',
            ].join('\n')
            : [
                '你是软件版本更新日志的中英对照整理助手。',
                '任务：将输入的 Markdown 内容整理为中英对照格式，适合中文用户查看。',
                '要求：',
                '1. 对每个标题、段落、列表项，先保留英文原文，再在下一行给出忠实的中文翻译。',
                '2. 保留 Markdown 结构；代码块、命令、路径、链接 URL、版本号、提交哈希不翻译。',
                '3. 中文部分允许轻度润色与整理，使其更像软件更新日志，但不得杜撰或遗漏信息。',
                '4. 如原文存在明显类别，可在不改变信息的前提下保持清晰层次。',
                '5. 不要添加额外解释、总结或无关说明。',
            ].join('\n');

        const messages = [
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content: `Please translate the following Markdown content:\n\n${content}` },
        ];

        // 非流式：按优先级尝试每个 provider，失败自动降级到下一个
        if (!stream) {
            let lastError = 'no provider succeeded';
            for (const provider of providers) {
                try {
                    const openai = new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseUrl });
                    const data: any = await openai.chat.completions.create({
                        model: provider.model,
                        messages,
                        temperature: 1,
                        top_p: 1,
                        max_tokens: 4096,
                        stream: false,
                    });
                    const translatedContent = data?.choices?.[0]?.message?.content || '';
                    if (translatedContent) {
                        return NextResponse.json({ translatedContent });
                    }
                    lastError = 'empty response';
                } catch (error: any) {
                    lastError = error?.message ? String(error.message) : String(error);
                    console.warn(`[translate] provider ${provider.name} failed, trying next: ${lastError}`);
                }
            }
            return NextResponse.json({ error: `All providers failed: ${lastError}` }, { status: 502 });
        }

        // 流式：取第一个可用 provider（流式无法中途降级）
        const provider = providers[0];
        const openai = new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseUrl });
        const completion = await openai.chat.completions.create({
            model: provider.model,
            messages,
            temperature: 1,
            top_p: 1,
            max_tokens: 4096,
            stream: true,
        });

        const sseStream = new ReadableStream<Uint8Array>({
            start(controller) {
                const encoder = new TextEncoder();
                (async () => {
                    try {
                        for await (const chunk of completion as any) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                        }
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                    } catch (e: any) {
                        const message = e?.message ? String(e.message) : String(e);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                    }
                })();
            },
        });

        return new Response(sseStream, {
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Translation API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
