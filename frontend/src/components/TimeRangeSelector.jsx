export const SUPPORTED_TIME_RANGES = [7, 14, 30, 60, 90];

export const TIME_RANGE_OPTIONS = [
    { label: "7 days", value: 7 },
    { label: "14 days", value: 14 },
    { label: "30 days", value: 30 },
    { label: "60 days", value: 60 },
    { label: "90 days", value: 90 },
];

export default function TimeRangeSelector({
    value = 30,
    onChange,
    id = "cfd-time-range-select",
    label = "Time range:",
    disabled = false,
}) {
    return (
        <div className="flex items-center gap-2">
            {label && (
                <label
                    htmlFor={id}
                    className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap"
                >
                    {label}
                </label>
            )}
            <select
                id={id}
                aria-label="Time range"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange?.(Number(e.target.value))}
                className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
                {TIME_RANGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
