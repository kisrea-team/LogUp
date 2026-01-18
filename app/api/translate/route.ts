
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const MODEL = 'openai/gpt-oss-20b';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const content = body?.content;
        const stream = Boolean(body?.stream) || request.headers.get('accept')?.includes('text/event-stream');

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const apiKey = String(process.env.NVIDIA_API_KEY || '').trim();
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing NVIDIA_API_KEY' }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey,
            baseURL: BASE_URL,
        });

        const messages = [
            {
                role: 'system' as const,
                content:
                    'You are a helpful translator assistant. Your task is to translate the provided Markdown content into Chinese, but maintain a bilingual format. For every line, sentence, or list item of the original text, keep the original English text and append the Chinese translation immediately after it (e.g., on a new line or in parentheses if short). Preserve the original Markdown formatting (headers, bullet points, etc.).',
            },
            {
                role: 'user' as const,
                content: `Please translate the following Markdown content:\n\n${content}`,
            },
        ];

        if (stream) {
            const completion = await openai.chat.completions.create({
                model: MODEL,
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
        }

        const data: any = await openai.chat.completions.create({
            model: MODEL,
            messages,
            temperature: 1,
            top_p: 1,
            max_tokens: 4096,
            stream: false,
        });

        const translatedContent = data?.choices?.[0]?.message?.content || '';
        return NextResponse.json({ translatedContent });
    } catch (error) {
        console.error('Translation API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
