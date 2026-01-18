type OpenAIClientOptions = {
    apiKey: string;
    baseURL?: string;
};

type ChatMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string;
};

type ChatCompletionCreateParams = {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    stream?: boolean;
};

function normalizeBaseUrl(input?: string) {
    const base = String(input || 'https://integrate.api.nvidia.com/v1').trim();
    return base.replace(/\/+$/, '');
}

async function* streamSseJson(resp: Response): AsyncGenerator<any> {
    if (!resp.body) return;
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        while (true) {
            const boundaryIndex = buffer.indexOf('\n\n');
            if (boundaryIndex === -1) break;
            const rawEvent = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);

            for (const line of rawEvent.split('\n')) {
                const trimmed = line.trimEnd();
                if (!trimmed.startsWith('data:')) continue;
                const dataText = trimmed.slice('data:'.length).trim();
                if (!dataText) continue;
                if (dataText === '[DONE]') return;
                yield JSON.parse(dataText);
            }
        }
    }
}

export default class OpenAI {
    private apiKey: string;
    private baseURL: string;

    constructor(opts: OpenAIClientOptions) {
        this.apiKey = String(opts.apiKey || '').trim();
        this.baseURL = normalizeBaseUrl(opts.baseURL);
    }

    chat = {
        completions: {
            create: async (params: ChatCompletionCreateParams) => {
                const url = `${this.baseURL}/chat/completions`;
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify(params),
                });

                if (!resp.ok) {
                    const text = await resp.text().catch(() => '');
                    const err = new Error(`Upstream error ${resp.status}: ${text}`);
                    (err as any).status = resp.status;
                    (err as any).body = text;
                    throw err;
                }

                if (params.stream) {
                    return streamSseJson(resp);
                }

                return await resp.json();
            },
        },
    };
}

