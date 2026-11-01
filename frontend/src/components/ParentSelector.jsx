import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listIssues } from "../api/issues";

const TYPE_BADGES = {
    STORY: { bg: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", label: "Story" },
    BUG:   { bg: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", label: "Bug" },
    EPIC:  { bg: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", label: "Epic" },
    TASK:  { bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", label: "Task" },
};

export function getValidParentCandidates(issues, currentIssueKey) {
    if (!issues || issues.length === 0) return [];
    if (!currentIssueKey) return issues;

    const descendants = new Set();
    let added = true;
    while (added) {
        added = false;
        for (const issue of issues) {
            if (
                issue.parentIssueKey &&
                (issue.parentIssueKey === currentIssueKey || descendants.has(issue.parentIssueKey))
            ) {
                if (!descendants.has(issue.issueKey)) {
                    descendants.add(issue.issueKey);
                    added = true;
                }
            }
        }
    }

    return issues.filter(
        (issue) => issue.issueKey !== currentIssueKey && !descendants.has(issue.issueKey)
    );
}

export default function ParentSelector({
    projectKey,
    currentIssueKey,
    value,
    onChange,
    disabled = false,
    placeholder = "Select parent or epic…",
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);

    const { data: issues = [], isLoading } = useQuery({
        queryKey: ["issues", projectKey],
        queryFn: () => listIssues(projectKey),
        enabled: Boolean(projectKey),
    });

    const validCandidates = useMemo(() => {
        return getValidParentCandidates(issues, currentIssueKey);
    }, [issues, currentIssueKey]);

    const filteredCandidates = useMemo(() => {
        if (!search.trim()) return validCandidates;
        const q = search.trim().toLowerCase();
        return validCandidates.filter(
            (i) =>
                i.issueKey.toLowerCase().includes(q) ||
                (i.title && i.title.toLowerCase().includes(q))
        );
    }, [validCandidates, search]);

    const selectedIssue = useMemo(() => {
        return issues.find((i) => i.issueKey === value) || null;
    }, [issues, value]);

    useEffect(() => {
        if (!open) return undefined;
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    const handleSelect = (key) => {
        onChange(key);
        setOpen(false);
        setSearch("");
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange("");
        setOpen(false);
        setSearch("");
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {value ? (
                <div className="flex items-center justify-between gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {selectedIssue?.issueType && (
                            <span
                                className={`px-1 py-0.2 rounded text-[10px] font-semibold uppercase shrink-0 ${
                                    TYPE_BADGES[selectedIssue.issueType]?.bg || "bg-slate-100 text-slate-700"
                                }`}
                            >
                                {TYPE_BADGES[selectedIssue.issueType]?.label || selectedIssue.issueType}
                            </span>
                        )}
                        <span className="font-mono font-medium text-blue-600 dark:text-blue-400 shrink-0">
                            {value}
                        </span>
                        {selectedIssue?.title && (
                            <span className="truncate text-slate-700 dark:text-slate-200">
                                {selectedIssue.title}
                            </span>
                        )}
                    </div>
                    {!disabled && (
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                type="button"
                                onClick={() => setOpen((prev) => !prev)}
                                className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline"
                                aria-label="Change parent"
                            >
                                Change
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="rounded p-0.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-600 dark:hover:text-slate-200"
                                aria-label="Remove parent"
                                title="Remove parent"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setOpen((prev) => !prev)}
                    className="w-full text-left rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                >
                    {placeholder}
                </button>
            )}

            {open && (
                <div
                    className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg"
                    role="listbox"
                    aria-label="Parent issues"
                >
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                        <input
                            type="text"
                            autoFocus
                            placeholder="Search by key or title…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            aria-label="Search parent issue"
                        />
                    </div>

                    <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                        {value && (
                            <button
                                type="button"
                                onClick={() => handleSelect("")}
                                className="w-full rounded px-2 py-1.5 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-1.5"
                                role="option"
                                aria-selected={false}
                            >
                                <span>✕</span> None (Clear parent)
                            </button>
                        )}

                        {isLoading ? (
                            <div className="p-3 text-center text-xs text-slate-400">Loading issues…</div>
                        ) : filteredCandidates.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400">
                                {search.trim() ? "No matching issues found" : "No candidate parent issues available"}
                            </div>
                        ) : (
                            filteredCandidates.map((candidate) => {
                                const isSelected = candidate.issueKey === value;
                                const typeInfo = TYPE_BADGES[candidate.issueType] || {
                                    bg: "bg-slate-100 text-slate-700",
                                    label: candidate.issueType,
                                };
                                return (
                                    <button
                                        key={candidate.id}
                                        type="button"
                                        onClick={() => handleSelect(candidate.issueKey)}
                                        className={`w-full rounded px-2 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                                            isSelected
                                                ? "bg-blue-50 dark:bg-blue-900/30 font-medium"
                                                : "text-slate-800 dark:text-slate-200"
                                        }`}
                                        role="option"
                                        aria-selected={isSelected}
                                    >
                                        <span
                                            className={`px-1 py-0.2 rounded text-[10px] font-semibold uppercase shrink-0 ${typeInfo.bg}`}
                                        >
                                            {typeInfo.label}
                                        </span>
                                        <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0">
                                            {candidate.issueKey}
                                        </span>
                                        <span className="truncate flex-1">
                                            {candidate.title}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
