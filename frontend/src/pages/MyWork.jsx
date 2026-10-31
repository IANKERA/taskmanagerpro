import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { myIssues, dashboardStats, recentActivity } from "../api/search";
import { useRecentIssues } from "../hooks/useRecentIssues";

const STATUS_BADGE = {
    PENDING:     "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
    IN_PROGRESS: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    DONE:        "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
};

export default function MyWork() {
    const navigate = useNavigate();
    const [showClosed, setShowClosed] = useState(false);
    const { recentIssues } = useRecentIssues();

    const { data: stats } = useQuery({
        queryKey: ["dashboard-stats"],
        queryFn: dashboardStats,
    });

    const { data: issues = [], isLoading } = useQuery({
        queryKey: ["my-issues", !showClosed],
        queryFn: () => myIssues(!showClosed),
    });

    const { data: activity = [] } = useQuery({
        queryKey: ["recent-activity"],
        queryFn: () => recentActivity(20),
    });

    return (
        <div className="page-container">
            <h1 className="mb-5 text-2xl font-semibold text-slate-900 dark:text-white">My Work</h1>

            {stats && (
                <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard label="Projects" value={stats.projectCount} />
                    <StatCard label="To Do" value={stats.totalOpen} color="text-slate-700 dark:text-slate-300" />
                    <StatCard label="In Progress" value={stats.totalInProgress} color="text-blue-600 dark:text-blue-400" />
                    <StatCard label="Done" value={stats.totalDone} color="text-green-600 dark:text-green-400" />
                    <StatCard label="Assigned to me" value={stats.myOpenIssueCount} color="text-amber-600 dark:text-amber-400" />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* My Issues */}
                    <div>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                My Issues ({issues.length})
                            </h2>
                            <label className="flex min-h-11 items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showClosed}
                                    onChange={(e) => setShowClosed(e.target.checked)}
                                />
                                Show completed
                            </label>
                        </div>

                        {isLoading ? (
                            <div className="text-slate-500">Loading…</div>
                        ) : issues.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400">
                                No issues assigned to you.
                            </div>
                        ) : (
                            <div className="app-surface divide-y divide-slate-100 overflow-hidden dark:divide-slate-700">
                                {issues.map((issue) => (
                                    <button
                                        key={issue.id}
                                        onClick={() => navigate(`/projects/${issue.projectKey}/board/${issue.issueKey}`)}
                                        className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 sm:flex-nowrap"
                                    >
                                        <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${STATUS_BADGE[issue.status] || ""}`}>
                                            {issue.status?.replace("_", " ")}
                                        </span>
                                        <span className="shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">{issue.issueKey}</span>
                                        <span className="text-sm text-slate-900 dark:text-slate-100 truncate flex-1">{issue.title}</span>
                                        <span className="order-last w-full text-xs text-slate-400 sm:order-none sm:w-auto sm:shrink-0">{issue.projectKey}</span>
                                        {issue.priority && (
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                issue.priority === "HIGH" ? "bg-red-500" :
                                                issue.priority === "MEDIUM" ? "bg-amber-400" : "bg-slate-300"
                                            }`} />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recently Viewed */}
                    {recentIssues.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recently Viewed</h2>
                            <div className="app-surface divide-y divide-slate-100 overflow-hidden dark:divide-slate-700">
                                {recentIssues.map((ri) => (
                                    <button
                                        key={ri.issueKey}
                                        onClick={() => navigate(`/projects/${ri.projectKey}/board/${ri.issueKey}`)}
                                        className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 sm:flex-nowrap"
                                    >
                                        <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${STATUS_BADGE[ri.status] || "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"}`}>
                                            {ri.status?.replace("_", " ")}
                                        </span>
                                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0">{ri.issueKey}</span>
                                        <span className="text-sm text-slate-900 dark:text-slate-100 truncate flex-1">{ri.title}</span>
                                        <span className="order-last w-full text-[10px] font-mono text-slate-400 sm:order-none sm:w-auto sm:shrink-0">{ri.projectKey}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Activity sidebar */}
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Activity</h2>
                    {activity.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                            No recent activity.
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
                            {activity.map((a) => (
                                <button
                                    key={a.id}
                                    onClick={() => navigate(`/projects/${a.projectKey}/board/${a.issueKey}`)}
                                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 block"
                                >
                                    <div className="text-xs text-slate-800 dark:text-slate-200">
                                        <span className="font-medium">{a.actorUsername || "system"}</span>
                                        {" "}
                                        {renderActivity(a)}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                        <span className="font-mono">{a.issueKey}</span>
                                        <span>·</span>
                                        <span>{new Date(a.at).toLocaleString()}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function renderActivity(a) {
    switch (a.activityType) {
        case "CREATED":       return "created an issue";
        case "COMMENTED":     return "commented";
        case "ASSIGNED":      return <span>assigned to <strong>{a.newValue}</strong></span>;
        case "UNASSIGNED":    return "unassigned";
        case "FIELD_CHANGED": return (
            <span className="inline-flex items-center gap-1 flex-wrap">
                <span>changed {a.field}</span>
                {a.oldValue && <span className="line-through text-red-400 text-[10px]">{a.oldValue}</span>}
                <span className="text-slate-400">→</span>
                <span className="text-green-600 dark:text-green-400 text-[10px] font-medium">{a.newValue ?? "—"}</span>
            </span>
        );
        default:              return a.activityType;
    }
}

function StatCard({ label, value, color = "text-slate-900 dark:text-white" }) {
    return (
        <div className="app-surface p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
        </div>
    );
}
