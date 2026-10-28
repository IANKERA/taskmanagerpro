import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Textarea with @mention autocomplete.
 * Props: value, onChange, users (string[]), placeholder, rows, className
 */
export default function MentionTextarea({ value, onChange, users = [], placeholder, rows = 3, className = "" }) {
    const [showMenu, setShowMenu] = useState(false);
    const [menuFilter, setMenuFilter] = useState("");
    const [menuIdx, setMenuIdx] = useState(0);
    const [cursorPos, setCursorPos] = useState(null);
    const ref = useRef(null);

    const filtered = users.filter((u) =>
        u.toLowerCase().includes(menuFilter.toLowerCase())
    ).slice(0, 8);

    const handleChange = useCallback((e) => {
        const val = e.target.value;
        const pos = e.target.selectionStart;
        onChange(val);

        // Detect @mention trigger
        const before = val.slice(0, pos);
        const atMatch = before.match(/@(\w*)$/);
        if (atMatch) {
            setShowMenu(true);
            setMenuFilter(atMatch[1]);
            setMenuIdx(0);
            setCursorPos(pos);
        } else {
            setShowMenu(false);
        }
    }, [onChange]);

    const insertMention = useCallback((username) => {
        const before = value.slice(0, cursorPos);
        const after = value.slice(cursorPos);
        const atStart = before.lastIndexOf("@");
        const newVal = before.slice(0, atStart) + `@${username} ` + after;
        onChange(newVal);
        setShowMenu(false);
        // Refocus
        setTimeout(() => {
            if (ref.current) {
                const newPos = atStart + username.length + 2;
                ref.current.focus();
                ref.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    }, [value, cursorPos, onChange]);

    const handleKeyDown = (e) => {
        if (!showMenu || filtered.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setMenuIdx((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setMenuIdx((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            insertMention(filtered[menuIdx]);
        } else if (e.key === "Escape") {
            setShowMenu(false);
        }
    };

    return (
        <div className="relative">
            <textarea
                ref={ref}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={rows}
                className={className}
                onBlur={() => setTimeout(() => setShowMenu(false), 200)}
            />
            {showMenu && filtered.length > 0 && (
                <div className="absolute left-0 bottom-full mb-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                    {filtered.map((u, i) => (
                        <button
                            key={u}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                            className={`w-full text-left px-3 py-1.5 text-sm ${
                                i === menuIdx
                                    ? "bg-blue-50 dark:bg-slate-700 text-blue-700 dark:text-blue-300"
                                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                            }`}
                        >
                            @{u}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
