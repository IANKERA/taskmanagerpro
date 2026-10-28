import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listIssues } from "../api/issues";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRIORITY_DOT = {
    HIGH: "bg-red-500",
    MEDIUM: "bg-amber-400",
    LOW: "bg-green-500",
};

export default function CalendarView() {
    const { projectKey } = useParams();
    const navigate = useNavigate();
    const [month, setMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    const { data: issues = [], isLoading } = useQuery({
        queryKey: ["issues", projectKey],
        queryFn: () => listIssues(projectKey),
    });

    // Build calendar grid
    const { cells, title } = useMemo(() => {
        const y = month.getFullYear();
        const m = month.getMonth();
        const firstDay = new Date(y, m, 1).getDay(); // 0=Sun
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const title = month.toLocaleString("default", { month: "long", year: "numeric" });

        const cells = [];
        // leading blanks
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            cells.push({ day: d, date: dateStr });
        }
        return { cells, title };
    }, [month]);

    // Map issues by due date
    const issuesByDate = useMemo(() => {
        const map = {};
        for (const issue of issues) {
            if (!issue.dueDate) continue;
            const d = issue.dueDate.slice(0, 10); // YYYY-MM-DD
            if (!map[d]) map[d] = [];
            map[d].push(issue);
        }
        return map;
    }, [issues]);

    const prev = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    const next = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    const today = () => {
        const now = new Date();
        setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    const todayStr = new Date().toISOString().slice(0, 10);

    if (isLoading) return <div className="text-slate-500">Loading…</div>;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <button onClick={prev} className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300">←</button>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white min-w-[180px] text-center">{title}</h2>
                    <button onClick={next} className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300">→</button>
                    <button onClick={today} className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 ml-1">Today</button>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                    {issues.filter((i) => i.dueDate).length} issues with due dates
                </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-1">{d}</div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 border-t border-l border-slate-200 dark:border-slate-700">
                {cells.map((cell, i) => {
                    if (!cell) {
                        return <div key={`blank-${i}`} className="border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 min-h-[100px]" />;
                    }
                    const dayIssues = issuesByDate[cell.date] || [];
                    const isToday = cell.date === todayStr;
                    return (
                        <div
                            key={cell.date}
                            className={`border-b border-r border-slate-200 dark:border-slate-700 min-h-[100px] p-1 ${
                                isToday ? "bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-slate-800"
                            }`}
                        >
                            <div className={`text-xs font-medium mb-1 ${isToday ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 dark:text-slate-400"}`}>
                                {cell.day}
                            </div>
                            <div className="space-y-0.5">
                                {dayIssues.slice(0, 4).map((issue) => (
                                    <button
                                        key={issue.id}
                                        onClick={() => navigate(`/projects/${projectKey}/board/${issue.issueKey}`)}
                                        className="w-full text-left px-1 py-0.5 rounded text-[11px] leading-tight truncate hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 group"
                                        title={`${issue.issueKey}: ${issue.title}`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[issue.priority] || "bg-slate-400"}`} />
                                        <span className={`truncate ${issue.status === "DONE" ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>
                                            {issue.issueKey}
                                        </span>
                                    </button>
                                ))}
                                {dayIssues.length > 4 && (
                                    <div className="text-[10px] text-slate-400 px-1">+{dayIssues.length - 4} more</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
