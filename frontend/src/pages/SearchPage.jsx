import { useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";

function useSavedFilters() {
    const KEY = "saved-search-filters";
    const [filters, setFilters] = useState(() => {
        try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
    });
    const save = useCallback((name, params) => {
        setFilters((prev) => {
            const next = [...prev, { id: Date.now(), name, params }];
            localStorage.setItem(KEY, JSON.stringify(next));
            return next;
        });
    }, []);
    const remove = useCallback((id) => {
        setFilters((prev) => {
            const next = prev.filter((f) => f.id !== id);
            localStorage.setItem(KEY, JSON.stringify(next));
            return next;
        });
    }, []);
    return { filters, save, remove };
}

const STATUS_OPTIONS = ["", "PENDING", "IN_PROGRESS", "DONE"];
const PRIORITY_OPTIONS = ["", "LOW", "MEDIUM", "HIGH"];
const TYPE_OPTIONS = ["", "TASK", "STORY", "BUG", "EPIC"];

const STATUS_DOT = { PENDING: "bg-slate-400", IN_PROGRESS: "bg-blue-500", DONE: "bg-green-500" };
const PRIORITY_BADGE = { LOW: "bg-green-100 text-green-700", MEDIUM: "bg-amber-100 text-amber-700", HIGH: "bg-red-100 text-red-700" };
const TYPE_ICON = { TASK: "☐", STORY: "📖", BUG: "🐛", EPIC: "⚡" };

async function advancedSearch(params) {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    const r = await api.get("/api/search/advanced", { params: clean });
    return r.data;
}

export default function SearchPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "";
    const priority = searchParams.get("priority") || "";
    const issueType = searchParams.get("issueType") || "";
    const assignee = searchParams.get("assignee") || "";
    const projectKey = searchParams.get("projectKey") || "";

    const [localQ, setLocalQ] = useState(q);
    const { filters: savedFilters, save: saveFilter, remove: removeFilter } = useSavedFilters();
    const [savingFilter, setSavingFilter] = useState(false);
    const [filterName, setFilterName] = useState("");

    const params = useMemo(() => ({ q, status, priority, issueType, assignee, projectKey }), [q, status, priority, issueType, assignee, projectKey]);
    const hasFilters = q || status || priority || issueType || assignee || projectKey;

    const { data: results = [], isLoading, isFetching } = useQuery({
        queryKey: ["advancedSearch", params],
        queryFn: () => advancedSearch(params),
        enabled: !!hasFilters,
        keepPreviousData: true,
    });

    const setFilter = (key, value) => {
        const next = { ...Object.fromEntries(searchParams), [key]: value };
        if (!value) delete next[key];
        setSearchParams(next, { replace: true });
    };

    const doSearch = (e) => {
        e?.preventDefault();
        setFilter("q", localQ);
    };

    const clearAll = () => {
        setLocalQ("");
        setSearchParams({});
    };

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Search Issues</h1>

            {/* Search bar */}
            <form onSubmit={doSearch} className="flex gap-2 mb-4">
                <input
                    autoFocus
                    placeholder="Search by title, key, or description…"
                    value={localQ}
                    onChange={(e) => setLocalQ(e.target.value)}
                    className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                    type="submit"
                    className="px-4 py-2.5 bg-slate-900 dark:bg-blue-600 text-white text-sm rounded-lg hover:bg-slate-800 dark:hover:bg-blue-700"
                >
                    Search
                </button>
            </form>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
                <FilterSelect label="Status" value={status} options={STATUS_OPTIONS} onChange={(v) => setFilter("status", v)} />
                <FilterSelect label="Priority" value={priority} options={PRIORITY_OPTIONS} onChange={(v) => setFilter("priority", v)} />
                <FilterSelect label="Type" value={issueType} options={TYPE_OPTIONS} onChange={(v) => setFilter("issueType", v)} />
                <input
                    placeholder="Assignee"
                    value={assignee}
                    onChange={(e) => setFilter("assignee", e.target.value)}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded px-2.5 py-1.5 text-sm w-32"
                />
                <input
                    placeholder="Project key"
                    value={projectKey}
                    onChange={(e) => setFilter("projectKey", e.target.value.toUpperCase())}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded px-2.5 py-1.5 text-sm w-28 font-mono"
                />
                {hasFilters && (
                    <button onClick={clearAll} className="text-xs text-slate-500 hover:text-red-600 px-2 py-1.5">
                        Clear all
                    </button>
                )}
                {hasFilters && !savingFilter && (
                    <button
                        onClick={() => setSavingFilter(true)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 px-2 py-1.5"
                    >
                        💾 Save filter
                    </button>
                )}
                {savingFilter && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (filterName.trim()) {
                                saveFilter(filterName.trim(), Object.fromEntries(searchParams));
                                setFilterName("");
                                setSavingFilter(false);
                            }
                        }}
                        className="flex gap-1"
                    >
                        <input
                            autoFocus
                            placeholder="Filter name"
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded px-2 py-1 text-xs w-32"
                        />
                        <button type="submit" className="text-xs text-green-600 hover:text-green-800 px-1">Save</button>
                        <button type="button" onClick={() => setSavingFilter(false)} className="text-xs text-slate-400 hover:text-slate-600 px-1">Cancel</button>
                    </form>
                )}
            </div>

            {/* Saved filters */}
            {savedFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs text-slate-400 dark:text-slate-500 py-1">Saved:</span>
                    {savedFilters.map((f) => (
                        <span key={f.id} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full text-xs">
                            <button
                                onClick={() => setSearchParams(f.params)}
                                className="hover:text-blue-900 dark:hover:text-blue-100"
                            >
                                {f.name}
                            </button>
                            <button
                                onClick={() => removeFilter(f.id)}
                                className="text-blue-400 hover:text-red-500 ml-0.5"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Results */}
            {!hasFilters ? (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <div className="text-4xl mb-3">🔍</div>
                    <div className="text-sm">Enter a search term or apply filters to find issues across all your projects.</div>
                    <div className="text-xs text-slate-400 mt-2">Tip: Use Ctrl+K for quick search from anywhere</div>
                </div>
            ) : isLoading ? (
                <div className="text-slate-500 py-8 text-center">Searching…</div>
            ) : (
                <>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <span>
                            {results.length} result{results.length !== 1 ? "s" : ""}
                            {isFetching && " (updating…)"}
                        </span>
                        {results.length > 0 && (
                            <button
                                onClick={() => {
                                    const esc = (v) => {
                                        if (v == null) return "";
                                        const s = String(v);
                                        return s.includes(",") || s.includes('"') || s.includes("\n")
                                            ? '"' + s.replace(/"/g, '""') + '"' : s;
                                    };
                                    const header = "Key,Title,Status,Priority,Type,Assignee,Project";
                                    const rows = results.map((r) =>
                                        [r.issueKey, r.title, r.status, r.priority, r.issueType, r.assigneeUsername, r.projectKey].map(esc).join(",")
                                    );
                                    const csv = [header, ...rows].join("\n");
                                    const blob = new Blob([csv], { type: "text/csv" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = "search-results.csv";
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-xs"
                            >
                                Export CSV
                            </button>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700">
                        {results.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 dark:text-slate-400">No issues found matching your criteria.</div>
                        ) : (
                            results.map((issue) => (
                                <button
                                    key={issue.id}
                                    onClick={() => navigate(`/projects/${issue.projectKey}/board/${issue.issueKey}`)}
                                    className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    {/* Status dot */}
                                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[issue.status] || "bg-slate-300"}`} />

                                    {/* Type icon */}
                                    <span className="text-sm" title={issue.issueType}>
                                        {TYPE_ICON[issue.issueType] || "☐"}
                                    </span>

                                    {/* Key */}
                                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400 w-20 flex-shrink-0">
                                        {issue.issueKey}
                                    </span>

                                    {/* Title */}
                                    <span className={`flex-1 text-sm truncate ${issue.status === "DONE" ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>
                                        {issue.title}
                                    </span>

                                    {/* Priority badge */}
                                    <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${PRIORITY_BADGE[issue.priority] || "bg-slate-100 text-slate-600"}`}>
                                        {issue.priority}
                                    </span>

                                    {/* Assignee */}
                                    {issue.assigneeUsername && (
                                        <span className="text-xs text-slate-500 dark:text-slate-400 w-20 truncate text-right">
                                            {issue.assigneeUsername}
                                        </span>
                                    )}

                                    {/* Project */}
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                        {issue.projectKey}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function FilterSelect({ label, value, options, onChange }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded px-2.5 py-1.5 text-sm"
        >
            <option value="">{label}: All</option>
            {options.filter(Boolean).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
    );
}
