'use client';

import { useState, useEffect } from 'react';
import { adConfigs } from '@/lib/adConfigs';
import { AdConfig } from '@/lib/adManager';

export default function AdConfigManager() {
    const [configs, setConfigs] = useState<Record<string, AdConfig>>(adConfigs);
    const [editingConfig, setEditingConfig] = useState<string | null>(null);
    const [newConfig, setNewConfig] = useState<AdConfig>({
        id: '',
        size: '',
        slot: '',
        format: 'auto',
        responsive: true,
    });

    const handleSaveConfig = (configKey: string, config: AdConfig) => {
        setConfigs((prev) => ({
            ...prev,
            [configKey]: config,
        }));
        setEditingConfig(null);

        // 在实际应用中，这里应该保存到后端
        console.log('保存广告配置:', configKey, config);
    };

    const handleAddConfig = () => {
        if (newConfig.id && newConfig.slot) {
            const configKey = newConfig.id.replace(/-/g, '_');
            setConfigs((prev) => ({
                ...prev,
                [configKey]: { ...newConfig },
            }));
            setNewConfig({
                id: '',
                size: '',
                slot: '',
                format: 'auto',
                responsive: true,
            });
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6" data-oid="mzxvbfn">
            <h3 className="text-lg font-semibold mb-4" data-oid="y55.l_i">
                广告配置管理
            </h3>

            {/* 添加新配置 */}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg" data-oid="n93pdd_">
                <h4 className="font-medium mb-3" data-oid="6j0bs06">
                    添加新广告位
                </h4>
                <div className="grid grid-cols-2 gap-4" data-oid="kaepzza">
                    <input
                        type="text"
                        placeholder="广告位ID"
                        value={newConfig.id}
                        onChange={(e) => setNewConfig((prev) => ({ ...prev, id: e.target.value }))}
                        className="border border-gray-300 rounded-md px-3 py-2"
                        data-oid="6nh.mgx"
                    />

                    <input
                        type="text"
                        placeholder="尺寸 (如: 728x90)"
                        value={newConfig.size}
                        onChange={(e) =>
                            setNewConfig((prev) => ({ ...prev, size: e.target.value }))
                        }
                        className="border border-gray-300 rounded-md px-3 py-2"
                        data-oid="0__r:ie"
                    />

                    <input
                        type="text"
                        placeholder="广告位代码"
                        value={newConfig.slot}
                        onChange={(e) =>
                            setNewConfig((prev) => ({ ...prev, slot: e.target.value }))
                        }
                        className="border border-gray-300 rounded-md px-3 py-2"
                        data-oid="m7l81lq"
                    />

                    <select
                        value={newConfig.format}
                        onChange={(e) =>
                            setNewConfig((prev) => ({ ...prev, format: e.target.value }))
                        }
                        className="border border-gray-300 rounded-md px-3 py-2"
                        data-oid="c-86-mr"
                    >
                        <option value="auto" data-oid="pn8h6lc">
                            自动
                        </option>
                        <option value="horizontal" data-oid="z-gy8c1">
                            横向
                        </option>
                        <option value="vertical" data-oid="mrnwxc.">
                            纵向
                        </option>
                        <option value="rectangle" data-oid="wj1hd.k">
                            矩形
                        </option>
                    </select>
                </div>
                <div className="mt-3 flex items-center space-x-4" data-oid="_d1f8if">
                    <label className="flex items-center" data-oid="5bbz9n5">
                        <input
                            type="checkbox"
                            checked={newConfig.responsive}
                            onChange={(e) =>
                                setNewConfig((prev) => ({ ...prev, responsive: e.target.checked }))
                            }
                            className="mr-2"
                            data-oid="2u_2ycx"
                        />
                        响应式
                    </label>
                    <button
                        onClick={handleAddConfig}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        data-oid="33rk1q3"
                    >
                        添加配置
                    </button>
                </div>
            </div>

            {/* 现有配置列表 */}
            <div className="space-y-4" data-oid="i9k31nw">
                {Object.entries(configs).map(([key, config]) => (
                    <div
                        key={key}
                        className="border border-gray-200 rounded-lg p-4"
                        data-oid=".-b9exu"
                    >
                        {editingConfig === key ? (
                            <EditConfigForm
                                config={config}
                                onSave={(updatedConfig) => handleSaveConfig(key, updatedConfig)}
                                onCancel={() => setEditingConfig(null)}
                                data-oid="ghul.8d"
                            />
                        ) : (
                            <div className="flex justify-between items-center" data-oid=":zg2ezf">
                                <div data-oid="y7qfa93">
                                    <h5 className="font-medium" data-oid="u0h-_u5">
                                        {config.id}
                                    </h5>
                                    <p className="text-sm text-gray-600" data-oid="ss_xfzb">
                                        尺寸: {config.size} | 格式: {config.format} | 响应式:{' '}
                                        {config.responsive ? '是' : '否'}
                                    </p>
                                    <p className="text-xs text-gray-500" data-oid="6g-sqf8">
                                        广告位: {config.slot}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditingConfig(key)}
                                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                    data-oid="mq22hey"
                                >
                                    编辑
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

interface EditConfigFormProps {
    config: AdConfig;
    onSave: (config: AdConfig) => void;
    onCancel: () => void;
}

function EditConfigForm({ config, onSave, onCancel }: EditConfigFormProps) {
    const [editedConfig, setEditedConfig] = useState<AdConfig>(config);

    return (
        <div className="space-y-3" data-oid="cx9jr:8">
            <div className="grid grid-cols-2 gap-3" data-oid="8lb-m-d">
                <input
                    type="text"
                    value={editedConfig.id}
                    onChange={(e) => setEditedConfig((prev) => ({ ...prev, id: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    data-oid="cneepsd"
                />

                <input
                    type="text"
                    value={editedConfig.size}
                    onChange={(e) => setEditedConfig((prev) => ({ ...prev, size: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    data-oid="ohuyqiw"
                />

                <input
                    type="text"
                    value={editedConfig.slot}
                    onChange={(e) => setEditedConfig((prev) => ({ ...prev, slot: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    data-oid="r8kgtzc"
                />

                <select
                    value={editedConfig.format}
                    onChange={(e) =>
                        setEditedConfig((prev) => ({ ...prev, format: e.target.value }))
                    }
                    className="border border-gray-300 rounded-md px-3 py-2"
                    data-oid="c9glypq"
                >
                    <option value="auto" data-oid="kunszg7">
                        自动
                    </option>
                    <option value="horizontal" data-oid="z7bbyn6">
                        横向
                    </option>
                    <option value="vertical" data-oid="uoy6_ft">
                        纵向
                    </option>
                    <option value="rectangle" data-oid="o3at7us">
                        矩形
                    </option>
                </select>
            </div>
            <div className="flex items-center justify-between" data-oid="p4i55wy">
                <label className="flex items-center" data-oid="o3rn7of">
                    <input
                        type="checkbox"
                        checked={editedConfig.responsive}
                        onChange={(e) =>
                            setEditedConfig((prev) => ({ ...prev, responsive: e.target.checked }))
                        }
                        className="mr-2"
                        data-oid="dfcaqsj"
                    />
                    响应式
                </label>
                <div className="space-x-2" data-oid="2fd-azp">
                    <button
                        onClick={() => onSave(editedConfig)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        data-oid="8e93lbs"
                    >
                        保存
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        data-oid="2mwkrca"
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>
    );
}
