
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContentTranslatorProps {
    content: string;
    cachedTranslation?: string | null;
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

export const ContentTranslator: React.FC<ContentTranslatorProps> = ({
    content,
    cachedTranslation,
}) => {
    const translatedContent = cachedTranslation || null;
    const [showTranslated, setShowTranslated] = useState(false);

    const toggleView = () => { setShowTranslated(!showTranslated); };

    const displayContent = showTranslated && translatedContent ? translatedContent : content;

    const zhClass = (text: string) =>
        isMostlyChinese(text) ? 'text-blue-600 dark:text-blue-400' : '';

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

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">更新内容</h3>
                <div className="flex items-center gap-3">
                    {translatedContent && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleView}
                            className="flex items-center gap-2"
                        >
                            <Languages className="h-4 w-4" />
                            {showTranslated ? '显示原文' : '查看译文'}
                        </Button>
                    )}
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
