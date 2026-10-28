import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listIssues } from "../api/issues";

const STATUS_COLOR = { PENDING: "#94a3b8", IN_PROGRESS: "#3b82f6", DONE: "#22c55e" };
const PRIORITY_BORDER = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e" };
const DAY_MS = 86400000;

function parseDate(d) { return d ? new Date(d + "T00:00:00") : null; }
function toDateStr(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { return new Date(d.getTime() + n * DAY_MS); }
function diffDays(a, b) { return Math.round((b - a) / DAY_MS); }

export default function TimelineView() {
    const { projectKey } = useParams();
    const navigate = useNavigate();
    const [weeksToShow, setWeeksToShow] = useState(6);

    const { data: allIssues = [], isLoading } = useQuery({
        queryKey: ["issues", projectKey],
        queryFn: () => listIssues(projectKey),
    });

    // Only show issues with due dates
    const issues = useMemo(() =>
        allIssues
            .filter((i) => i.dueDate)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
        [allIssues]
    );

    // Timeline range
    const { startDate, endDate, totalDays, days } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = addDays(today, -7); // 1 week before today
        const end = addDays(today, weeksToShow * 7);
        const total = diffDays(start, end);
        const dayArr = [];
        for (let i = 0; i <= total; i++) {
            dayArr.push(addDays(start, i));
        }
        return { startDate: start, endDate: end, totalDays: total, days: dayArr };
    }, [weeksToShow]);

    // Group days by week for headers
    const weeks = useMemo(() => {
        const w = [];
        let current = null;
        for (const d of days) {
            const weekStart = new Date(d);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const key = toDateStr(weekStart);
            if (!current || current.key !== key) {
                current = { key, start: d, days: 0 };
                w.push(current);
            }
            current.days++;
        }
        return w;
    }, [days]);

    const todayOffset = diffDays(startDate, new Date());
    const colWidth = 32; // px per day

    if (isLoading) return <div className="text-slate-500">Loading…</div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Timeline</h2>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {issues.length} issue{issues.length !== 1 ? "s" : ""} with due dates
                        {issues.length < allIssues.length && ` (${allIssues.length - issues.length} without)`}
                    </div>
                </div>
                <div className="flex gap-2">
                    {[4, 6, 8, 12].map((w) => (
                        <button
                            key={w}
                            onClick={() => setWeeksToShow(w)}
                            className={`px-2 py-1 text-xs rounded border ${
                                weeksToShow === w
                                    ? "bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600"
                                    : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                            }`}
                        >
                            {w}w
                        </button>
                    ))}
                </div>
            </div>

            {issues.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <div className="text-3xl mb-2">📅</div>
                    <div className="text-sm">No issues with due dates. Add due dates to see them on the timeline.</div>
                </div>
            ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                    {/* Header */}
                    <div style={{ minWidth: `${240 + totalDays * colWidth}px` }}>
                        {/* Week headers */}
                        <div className="flex border-b border-slate-200 dark:border-slate-700">
                            <div className="w-60 flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                                Issue
                            </div>
                            <div className="flex">
                                {weeks.map((w) => (
                                    <div
                                        key={w.key}
                                        style={{ width: `${w.days * colWidth}px` }}
                                        className="text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 py-1.5 border-r border-slate-100 dark:border-slate-700"
                                    >
                                        {w.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Day headers */}
                        <div className="flex border-b border-slate-200 dark:border-slate-700">
                            <div className="w-60 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                            <div className="flex">
                                {days.map((d, i) => {
                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                    const isToday = i === todayOffset;
                                    return (
                                        <div
                                            key={i}
                                            style={{ width: `${colWidth}px` }}
                                            className={`text-center text-[9px] py-0.5 border-r border-slate-50 dark:border-slate-700/50 ${
                                                isToday ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-bold" :
                                                isWeekend ? "bg-slate-50 dark:bg-slate-800/70 text-slate-300 dark:text-slate-600" :
                                                "text-slate-400 dark:text-slate-500"
                                            }`}
                                        >
                                            {d.getDate()}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Issue rows */}
                        {issues.map((issue) => {
                            const dueDate = parseDate(issue.dueDate);
                            const barOffset = diffDays(startDate, dueDate);
                            // Bar: show 1-day marker at due date position
                            const barLeft = barOffset * colWidth;
                            const inRange = barOffset >= 0 && barOffset <= totalDays;
                            const isPast = dueDate < new Date() && issue.status !== "DONE";

                            return (
                                <div key={issue.id} className="flex border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                                    {/* Issue label */}
                                    <button
                                        onClick={() => navigate(`/projects/${projectKey}/board/${issue.issueKey}`)}
                                        className="w-60 flex-shrink-0 px-3 py-2 border-r border-slate-200 dark:border-slate-700 text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                    >
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ backgroundColor: STATUS_COLOR[issue.status] }} />
                                        <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 flex-shrink-0">{issue.issueKey}</span>
                                        <span className={`text-xs truncate ${issue.status === "DONE" ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>
                                            {issue.title}
                                        </span>
                                    </button>

                                    {/* Timeline bar */}
                                    <div className="relative flex-1" style={{ minWidth: `${totalDays * colWidth}px` }}>
                                        {/* Today line */}
                                        {todayOffset >= 0 && todayOffset <= totalDays && (
                                            <div
                                                className="absolute top-0 bottom-0 w-px bg-blue-400 dark:bg-blue-500 z-10"
                                                style={{ left: `${todayOffset * colWidth + colWidth / 2}px` }}
                                            />
                                        )}

                                        {/* Due date marker */}
                                        {inRange && (
                                            <div
                                                className="absolute top-1 h-5 rounded-sm flex items-center px-1"
                                                style={{
                                                    left: `${(barOffset - 2) * colWidth}px`,
                                                    width: `${3 * colWidth}px`,
                                                    backgroundColor: STATUS_COLOR[issue.status] + "30",
                                                    borderLeft: `3px solid ${PRIORITY_BORDER[issue.priority] || "#94a3b8"}`,
                                                }}
                                                title={`Due: ${issue.dueDate}`}
                                            >
                                                {isPast && <span className="text-[9px] text-red-600 font-bold">!</span>}
                                            </div>
                                        )}

                                        {/* Assignee chip */}
                                        {inRange && issue.assigneeUsername && (
                                            <div
                                                className="absolute text-[8px] text-slate-400 dark:text-slate-500 top-[22px]"
                                                style={{ left: `${(barOffset - 2) * colWidth}px` }}
                                            >
                                                {issue.assigneeUsername}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> To Do</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> In Progress</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Done</span>
                <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-blue-400" /> Today</span>
                <span className="flex items-center gap-1"><span className="text-red-600 font-bold">!</span> Overdue</span>
            </div>
        </div>
    );
}
