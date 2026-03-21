import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

export default function FilterType({ filterType, handleTypeChange, availableTypes }: { filterType: string; handleTypeChange: (type: string) => void; availableTypes: string[] }) {
    return (
        <div className="flex flex-wrap gap-1.5 items-center">
            <Button
                onClick={() => handleTypeChange('')}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${filterType === ''
                    ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-500'
                    }`}
            >
                全部
            </Button>
            {availableTypes.slice(0, 12).map((t) => (
                <ButtonGroup key={t}>
                    <Button

                        onClick={() => handleTypeChange(filterType === t ? '' : t)}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${filterType === t
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600'
                            }`}
                    >
                        {t}
                    </Button>
                </ButtonGroup>
            ))}
        </div>
    )
}