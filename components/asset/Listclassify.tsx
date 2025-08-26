/*
 * @Date: 2025-08-26
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-26
 * @FilePath: /LogUp/components/asset/Listclassify.tsx
 * Helllllloo!
 */
import { Card } from '../ui/card';
import { Badge } from '@/components/ui/badge';
import { classify } from '@/components/data/classify';
// interface
const ListClassify = () => {
    return (
        <Card className="flex flex-col projectlist-classify">
            <p className="mx-auto">分类</p>
            <div className="flex-col">
                {classify.map((item) => (
                    <Badge key={item.key} className="w-max" variant="secondary">
                        {item.label}
                    </Badge>
                ))}
                
            </div>
        </Card>
    );
};

export default ListClassify;
