import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { searchIssues } from "../api/search";
import api from "../api/client";

const TYPE_ICON = { BUG: "🐛", TASK: "☑️", STORY: "📖", EPIC: "🏔️" };
const STATUS_DOT = { PENDING: "bg-slate-400", IN_PROGRESS: "bg-blue-500", DONE: "bg-green-500" };

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selected, setSelected] = useState(0);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const debounceRef = useRef(null);

    // Ctrl+K / Cmd+K to open
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen((v) => !v);
            }
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setQuery("");
            setResults([]);
            setSelected(0);
            setTimeout(() => inputRef.current?.focus(), 50);
            // Load projects for empty state
            api.get("/api/projects").then((r) => setProjects(r.data)).catch(() => {});
        }
    }, [open]);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setSelected(0);
            return;
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await searchIssues(query);
                setResults(data.slice(0, 10));
                setSelected(0);
            } catch { setResults([]); }
            setLoading(false);
        }, 200);
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    const allItems = query.trim()
        ? results.map((r) => ({ type: "issue", data: r }))
        : projects.map((p) => ({ type: "project", data: p }));

    const go = useCallback((item) => {
        setOpen(false);
        if (item.type === "issue") {
            const d = item.data;
            navigate(`/projects/${d.projectKey}/board/${d.issueKey}`);
        } else {
            navigate(`/projects/${item.data.key}/board`);
        }
    }, [navigate]);

    const onKeyDown = (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelected((s) => Math.min(s + 1, allItems.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelected((s) => Math.max(s - 1, 0));
        } else if (e.key === "Enter" && allItems[selected]) {
            e.preventDefault();
            go(allItems[selected]);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-slate-900/50 z-[100] flex items-start justify-center pt-[15vh]"
            onClick={() => setOpen(false)}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700"
            >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 text-lg">🔍</span>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Search issues, projects…"
                        className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400"
                    />
                    <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-400 font-mono">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                    {loading && (
                        <div className="px-4 py-3 text-sm text-slate-400">Searching…</div>
                    )}

                    {!loading && query.trim() && results.length === 0 && (
                        <div className="px-4 py-6 text-sm text-slate-400 text-center">
                            No issues found for "{query}"
                        </div>
                    )}

                    {!query.trim() && projects.length > 0 && (
                        <div className="px-3 py-2 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                            Projects
                        </div>
                    )}

                    {allItems.map((item, i) => (
                        <button
                            key={item.type === "issue" ? item.data.issueKey : item.data.key}
                            onClick={() => go(item)}
                            onMouseEnter={() => setSelected(i)}
                            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${
                                i === selected
                                    ? "bg-blue-50 dark:bg-slate-700"
                                    : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                            }`}
                        >
                            {item.type === "issue" ? (
                                <>
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[item.data.status] || "bg-slate-400"}`} />
                                    <span className="text-xs">{TYPE_ICON[item.data.issueType] || "☑️"}</span>
                                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0">
                                        {item.data.issueKey}
                                    </span>
                                    <span className="truncate text-slate-800 dark:text-slate-200">
                                        {item.data.title}
                                    </span>
                                    <span className="ml-auto text-xs text-slate-400 shrink-0">
                                        {item.data.assigneeUsername || "Unassigned"}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-base">📁</span>
                                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0">
                                        {item.data.key}
                                    </span>
                                    <span className="text-slate-800 dark:text-slate-200">
                                        {item.data.name}
                                    </span>
                                </>
                            )}
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4 text-[10px] text-slate-400">
                    <span>↑↓ navigate</span>
                    <span>↵ open</span>
                    <span>esc close</span>
                </div>
            </div>
        </div>
    );
}
