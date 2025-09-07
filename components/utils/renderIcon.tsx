import React from 'react';
import Image from 'next/image';

type RenderIconProps = {
    icon: string;
    size?: number; // 可选，避免 undefined 报错
};

export function RenderIcon({ icon, size = 55 }: RenderIconProps) {
    const [svgContent, setSvgContent] = React.useState<string | null>(null);

    React.useEffect(() => {
        let active = true;

        async function fetchSvg(url: string) {
            try {
                const res = await fetch(url);
                const text = await res.text();
                if (active) {
                    setSvgContent(text);
                }
            } catch (err) {
                console.error('加载 SVG 失败:', err);
            }
        }

        if (icon && (icon.endsWith('.svg') || icon.includes('.svg?'))) {
            fetchSvg(icon);
        } else {
            setSvgContent(null);
        }

        return () => {
            active = false;
        };
    }, [icon]);

    if (!icon) return null;

    // 1. 内联 svg
    if (icon.trim().startsWith('<svg')) {
        return <span dangerouslySetInnerHTML={{ __html: icon }} />;
    }

    // 2. 外部 svg url
    if (svgContent) {
        return (
            <span
                dangerouslySetInnerHTML={{
                    __html: svgContent.replace(
                        /<svg([^>]*)>/,
                        `<svg width="${size}" height="${size}">`,
                    ),
                }}
            />
        );
    }

    // 3. 其他图片链接
    if (icon.startsWith('http://') || icon.startsWith('https://')) {
        return <Image src={icon} alt="icon" width={size} height={size} />;
    }

    // 4. 默认文本
    return <span style={{ fontSize: size }}>{icon}</span>;
}
