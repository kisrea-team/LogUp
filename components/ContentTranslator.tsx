
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContentTranslatorProps {
    content: string;
}

export const ContentTranslator: React.FC<ContentTranslatorProps> = ({ content }) => {
    const [translatedContent, setTranslatedContent] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [showTranslated, setShowTranslated] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const prevContentRef = useRef<string>(content);
    const jobIdRef = useRef(0);

    const stopActiveStream = useCallback(() => {
        try {
            abortControllerRef.current?.abort();
        } catch { }
        abortControllerRef.current = null;

        try {
            void readerRef.current?.cancel();
        } catch { }
        readerRef.current = null;
    }, []);

    const startTranslation = useCallback(
        async (nextContent: string) => {
            const jobId = ++jobIdRef.current;
            stopActiveStream();

            setIsTranslating(true);
            setTranslatedContent('');
            setShowTranslated(true);

            try {
                const controller = new AbortController();
                abortControllerRef.current = controller;
                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'text/event-stream',
                    },
                    body: JSON.stringify({ content: nextContent, stream: true }),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error('Translation failed');
                }

                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('text/event-stream') && response.body) {
                    const reader = response.body.getReader();
                    readerRef.current = reader;
                    const decoder = new TextDecoder();
                    let buffer = '';

                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        if (jobIdRef.current !== jobId) return;
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
                                if (dataText === '[DONE]') {
                                    try {
                                        await reader.cancel();
                                    } catch { }
                                    return;
                                }

                                if (jobIdRef.current !== jobId) return;

                                try {
                                    const payload = JSON.parse(dataText);
                                    const delta =
                                        payload?.choices?.[0]?.delta?.content ??
                                        payload?.choices?.[0]?.message?.content ??
                                        '';
                                    if (delta) {
                                        setTranslatedContent((prev) => {
                                            if (jobIdRef.current !== jobId) return prev;
                                            return `${prev ?? ''}${delta}`;
                                        });
                                    }
                                } catch {
                                    setTranslatedContent((prev) => {
                                        if (jobIdRef.current !== jobId) return prev;
                                        return `${prev ?? ''}${dataText}`;
                                    });
                                }
                            }
                        }
                    }

                    return;
                }

                const data = await response.json().catch(() => null);
                if (jobIdRef.current !== jobId) return;
                setTranslatedContent(data?.translatedContent || '');
            } finally {
                if (jobIdRef.current === jobId) {
                    abortControllerRef.current = null;
                    readerRef.current = null;
                    setIsTranslating(false);
                }
            }
        },
        [stopActiveStream]
    );

    useEffect(() => {
        const prev = prevContentRef.current;
        if (prev === content) return;
        prevContentRef.current = content;

        const wasShowingTranslated = showTranslated;
        stopActiveStream();
        setIsTranslating(false);
        setTranslatedContent(null);

        if (wasShowingTranslated) {
            void startTranslation(content);
        } else {
            setShowTranslated(false);
        }
    }, [content, showTranslated, startTranslation, stopActiveStream]);

    const handleTranslate = async () => {
        if (translatedContent && translatedContent.length > 0) {
            setShowTranslated(true);
            return;
        }

        try {
            await startTranslation(content);
        } catch (error) {
            console.error('Translation error:', error);
        }
    };

    useEffect(() => {
        return () => {
            stopActiveStream();
        };
    }, [stopActiveStream]);

    const toggleView = () => {
        setShowTranslated(!showTranslated);
    };

    const displayContent = showTranslated && translatedContent ? translatedContent : content;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">更新内容</h3>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">由英伟达技术支持</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={showTranslated ? toggleView : handleTranslate}
                        disabled={isTranslating}
                        className="flex items-center gap-2"
                    >
                        {isTranslating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Languages className="h-4 w-4" />
                        )}
                        {isTranslating
                            ? '翻译中...'
                            : showTranslated
                                ? '显示原文'
                                : translatedContent
                                    ? '显示译文'
                                    : '中英对照'}
                    </Button>
                </div>
            </div>
            <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                    components={{
                        h1: ({ node, ...props }) => (
                            <h1 className="text-2xl font-bold mt-6 mb-4 dark:text-white" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-semibold mt-5 mb-3 dark:text-white" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-lg font-medium mt-4 mb-2 dark:text-white" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="text-content mb-3" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-5 mb-4 dark:text-gray-300" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                            <ol className="list-decimal pl-5 mb-4 dark:text-gray-300" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li className="mb-1 dark:text-gray-300" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-blue-600 hover:underline dark:text-blue-400" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-semibold dark:text-white" {...props} />
                        ),
                        em: ({ node, ...props }) => (
                            <em className="italic dark:text-gray-300" {...props} />
                        ),
                    }}
                >
                    {displayContent}
                </ReactMarkdown>
            </div>
        </div>
    );
};
