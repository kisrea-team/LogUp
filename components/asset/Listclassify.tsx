/*
 * @Date: 2025-08-26
 * @LastEditors: vhko
 * @LastEditTime: 2025-09-17
 * @FilePath: /LogUp/components/asset/Listclassify.tsx
 * Helllllloo!
 */
import { Card } from '../ui/card';
import { classify } from '@/components/utils/classify';
// interface
const ListClassify = () => {
    return (
        <Card className="projectlist-classify">
            <p className="mx-auto">分类</p>
            <div className="classify--items">
                {classify.map((item) => (
                    <div key={item.key}>
                        <item.icon />
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default ListClassify;
