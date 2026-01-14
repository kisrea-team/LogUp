
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = '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';
const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export async function POST(request: NextRequest) {
    try {
        const { content } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'meta/llama-3.1-70b-instruct',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful translator assistant. Your task is to translate the provided Markdown content into Chinese, but maintain a bilingual format. For every line, sentence, or list item of the original text, keep the original English text and append the Chinese translation immediately after it (e.g., on a new line or in parentheses if short). Preserve the original Markdown formatting (headers, bullet points, etc.).'
                    },
                    {
                        role: 'user',
                        content: `Please translate the following Markdown content:\n\n${content}`
                    }
                ],
                temperature: 0.2,
                top_p: 0.7,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('NVIDIA API Error:', errorData);
            return NextResponse.json({ error: 'Translation failed', details: errorData }, { status: response.status });
        }

        const data = await response.json();
        const translatedContent = data.choices[0]?.message?.content || '';

        return NextResponse.json({ translatedContent });
    } catch (error) {
        console.error('Translation API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
