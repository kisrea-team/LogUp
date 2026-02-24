
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Loader2, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TranslateMode = 'bilingual' | 'translation-only';

interface ContentTranslatorProps {
    content: string;
    versionId?: number;
    cachedTranslation?: string | null;
    onTranslationSaved?: (translation: string) => void;
}

// Returns true if the text is predominantly Chinese characters
function isMostlyChinese(text: string): boolean {
    const chinese = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    return chinese / Math.max(text.replace(/\s/g, '').length, 1) > 0.25;
}

// Recursively extract plain text from React children
function getChildrenText(children: React.ReactNode): string {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(getChildrenText).join('');
    if (React.isValidElement(children))
        return getChildrenText((children.props as { children?: React.ReactNode }).children);
    return '';
}

// Colour class applied to Chinese text in bilingual mode
const ZH_COLOR = 'text-blue-600 dark:text-blue-400';

export const ContentTranslator: React.FC<ContentTranslatorProps> = ({
    content,
    versionId,
    cachedTranslation,
    onTranslationSaved,
}) => {
    // Initialize from cache if available
    const [translatedContent, setTranslatedContent] = useState<string | null>(
        cachedTranslation || null
    );
    const [isTranslating, setIsTranslating] = useState(false);
    const [showTranslated, setShowTranslated] = useState(false);
    const [translateMode, setTranslateMode] = useState<TranslateMode>('translation-only');
    const abortControllerRef = useRef<AbortController | null>(null);
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const jobIdRef = useRef(0);

    const stopActiveStream = useCallback(() => {
        try { abortControllerRef.current?.abort(); } catch { }
        abortControllerRef.current = null;
        try { void readerRef.current?.cancel(); } catch { }
        readerRef.current = null;
    }, []);

    // Save translation to DB after streaming completes
    const saveTranslationToDb = useCallback(async (translation: string) => {
        if (!versionId || !translation) return;
        try {
            await fetch(`/api/versions/${versionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ translation }),
            });
            onTranslationSaved?.(translation);
        } catch {
            // Silently ignore save errors — translation is still shown to user
        }
    }, [versionId, onTranslationSaved]);

    const startTranslation = useCallback(
        async (nextContent: string, mode: TranslateMode) => {
            const jobId = ++jobIdRef.current;
            stopActiveStream();
            setIsTranslating(true);
            setTranslatedContent('');
            setShowTranslated(true);

            let accumulated = '';

            try {
                const controller = new AbortController();
                abortControllerRef.current = controller;
                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
                    body: JSON.stringify({ content: nextContent, stream: true, mode }),
                    signal: controller.signal,
                });

                if (!response.ok) throw new Error('Translation failed');

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
                                    try { await reader.cancel(); } catch { }
                                    return;
                                }
                                if (jobIdRef.current !== jobId) return;
                                try {
                                    const payload = JSON.parse(dataText);
                                    const delta =
                                        payload?.choices?.[0]?.delta?.content ??
                                        payload?.choices?.[0]?.message?.content ?? '';
                                    if (delta) {
                                        accumulated += delta;
                                        setTranslatedContent((prev) => {
                                            if (jobIdRef.current !== jobId) return prev;
                                            return `${prev ?? ''}${delta}`;
                                        });
                                    }
                                } catch {
                                    accumulated += dataText;
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
                const result = data?.translatedContent || '';
                accumulated = result;
                setTranslatedContent(result);
            } finally {
                if (jobIdRef.current === jobId) {
                    abortControllerRef.current = null;
                    readerRef.current = null;
                    setIsTranslating(false);
                    // Save to DB only for fresh translations (not from cache)
                    if (accumulated && mode === 'translation-only') {
                        void saveTranslationToDb(accumulated);
                    }
                }
            }
        },
        [stopActiveStream, saveTranslationToDb]
    );

    const handleTranslate = async () => {
        if (translatedContent && translatedContent.length > 0) {
            setShowTranslated(true);
            return;
        }
        try {
            await startTranslation(content, translateMode);
        } catch (error) {
            console.error('Translation error:', error);
        }
    };

    const handleModeChange = (newMode: TranslateMode) => {
        if (newMode === translateMode) return;
        setTranslateMode(newMode);
        if (showTranslated) {
            void startTranslation(content, newMode);
        }
    };

    useEffect(() => {
        return () => { stopActiveStream(); };
    }, [stopActiveStream]);

    const toggleView = () => { setShowTranslated(!showTranslated); };

    const displayContent = showTranslated && translatedContent ? translatedContent : content;

    // Only colour Chinese segments in bilingual mode
    const colorChinese = translateMode === 'bilingual' && showTranslated && !!translatedContent;

    const zhClass = (text: string) =>
        colorChinese && isMostlyChinese(text) ? ZH_COLOR : '';

    const mdComponents = {
        h1: ({ node, children, ...props }: any) => (
            <h1
                className={`text-2xl font-bold mt-6 mb-4 dark:text-white ${zhClass(getChildrenText(children))}`}
                {...props}
            >{children}</h1>
        ),
        h2: ({ node, children, ...props }: any) => (
            <h2
                className={`text-xl font-semibold mt-5 mb-3 dark:text-white ${zhClass(getChildrenText(children))}`}
                {...props}
            >{children}</h2>
        ),
        h3: ({ node, children, ...props }: any) => (
            <h3
                className={`text-lg font-medium mt-4 mb-2 dark:text-white ${zhClass(getChildrenText(children))}`}
                {...props}
            >{children}</h3>
        ),
        p: ({ node, children, ...props }: any) => (
            <p
                className={`mb-3 ${zhClass(getChildrenText(children)) || 'text-content'}`}
                {...props}
            >{children}</p>
        ),
        ul: ({ node, ...props }: any) => (
            <ul className="list-disc pl-5 mb-4 dark:text-gray-300" {...props} />
        ),
        ol: ({ node, ...props }: any) => (
            <ol className="list-decimal pl-5 mb-4 dark:text-gray-300" {...props} />
        ),
        li: ({ node, children, ...props }: any) => (
            <li
                className={`mb-1 ${zhClass(getChildrenText(children)) || 'dark:text-gray-300'}`}
                {...props}
            >{children}</li>
        ),
        a: ({ node, ...props }: any) => (
            <a className="text-blue-600 hover:underline dark:text-blue-400" {...props} />
        ),
        strong: ({ node, children, ...props }: any) => (
            <strong
                className={`font-semibold ${zhClass(getChildrenText(children)) || 'dark:text-white'}`}
                {...props}
            >{children}</strong>
        ),
        em: ({ node, children, ...props }: any) => (
            <em
                className={`italic ${zhClass(getChildrenText(children)) || 'dark:text-gray-300'}`}
                {...props}
            >{children}</em>
        ),
        img: ({ node, src, alt, ...props }: any) => (
            <img
                src={src}
                alt={alt || ''}
                className="max-w-full h-auto rounded my-2"
                loading="lazy"
                {...props}
            />
        ),
    };

    const showModeToggle = showTranslated && !!translatedContent && !isTranslating;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">更新内容</h3>
                <div className="flex items-center gap-3">
                    {showModeToggle && (
                        <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
                            <button
                                onClick={() => handleModeChange('bilingual')}
                                className={`px-2.5 py-1 transition-colors ${translateMode === 'bilingual'
                                        ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                                        : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                中英对照
                            </button>
                            <button
                                onClick={() => handleModeChange('translation-only')}
                                className={`px-2.5 py-1 transition-colors ${translateMode === 'translation-only'
                                        ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                                        : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                仅译文
                            </button>
                        </div>
                    )}
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
                                    ? '查看译文'
                                    : '翻译'}
                    </Button>
                </div>
            </div>
            <div className="prose prose-sm max-w-none">
                <ReactMarkdown components={mdComponents} rehypePlugins={[rehypeRaw]}>
                    {displayContent}
                </ReactMarkdown>
            </div>
        </div>
    );
};
