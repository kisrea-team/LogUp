/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-09-06
 * @FilePath: /LogUp/app/admin/page.tsx
 * Helllllloo!
 */
'use client';
import { AdminChartArea } from '@/components/asset/Admin-chart';
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
export default function AdminPage() {
    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <Card>
                    <CardHeader>
                        <CardDescription>总项目数</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            100+
                        </CardTitle>
                        <CardAction>
                            昨日： <Badge>+12.5%</Badge>
                        </CardAction>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>版本数量</CardDescription>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>浏览量</CardDescription>
                    </CardHeader>
                </Card>
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Total Revenue</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            $1,250.00
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                {/* <IconTrendingUp /> */}
                                +12.5%
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            Trending up this month
                            {/* <IconTrendingUp className="size-4" /> */}
                        </div>
                        <div className="text-muted-foreground">Visitors for the last 6 months</div>
                    </CardFooter>
                </Card>
            </div>
            <AdminChartArea />
        </div>
    );
}
