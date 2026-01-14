
import React, { useState } from 'react';
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

    const handleTranslate = async () => {
        if (translatedContent) {
            setShowTranslated(true);
            return;
        }

        setIsTranslating(true);
        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content }),
            });

            if (!response.ok) {
                throw new Error('Translation failed');
            }

            const data = await response.json();
            setTranslatedContent(data.translatedContent);
            setShowTranslated(true);
        } catch (error) {
            console.error('Translation error:', error);
            // You might want to show a toast or error message here
        } finally {
            setIsTranslating(false);
        }
    };

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
