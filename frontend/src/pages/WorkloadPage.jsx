import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import Avatar from "../components/Avatar";

const PRIORITY_DOT = { HIGH: "bg-red-500", MEDIUM: "bg-amber-400", LOW: "bg-slate-300" };
const STATUS_DOT = { PENDING: "bg-slate-400", IN_PROGRESS: "bg-blue-500", DONE: "bg-green-500" };

export default function WorkloadPage() {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState({});

    const { data: workload = [], isLoading } = useQuery({
        queryKey: ["workload"],
        queryFn: () => api.get("/api/workload").then((r) => r.data),
    });

    const toggle = (username) => setExpanded((p) => ({ ...p, [username]: !p[username] }));

    if (isLoading) return <div className="text-slate-500 py-8 text-center">Loading workload...</div>;

    const maxOpen = Math.max(...workload.map((w) => w.totalOpen), 1);

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Team Workload</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Open issues per team member across all projects</p>

            {workload.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <div className="text-4xl mb-3">📊</div>
                    <div className="text-sm">No open issues found.</div>
                </div>
            ) : (
                <div className="space-y-3">
                    {workload.map((w) => (
                        <div key={w.username} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggle(w.username)}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Avatar username={w.username === "Unassigned" ? null : w.username} size="sm" />
                                    <span className="font-medium text-sm text-slate-900 dark:text-white flex-1">
                                        {w.username}
                                    </span>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                        {w.overdue > 0 && (
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                                {w.overdue} overdue
                                            </span>
                                        )}
                                        {w.highPriority > 0 && (
                                            <span className="text-amber-600 dark:text-amber-400">
                                                {w.highPriority} high
                                            </span>
                                        )}
                                        <span>{w.inProgress} in progress</span>
                                        <span>{w.storyPoints} SP</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                                            {w.totalOpen} issues
                                        </span>
                                        <span className="text-slate-400">{expanded[w.username] ? "▲" : "▼"}</span>
                                    </div>
                                </div>
                                {/* Bar */}
                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-2 rounded-full flex">
                                        <div
                                            className="bg-red-400 h-full"
                                            style={{ width: `${(w.highPriority / maxOpen) * 100}%` }}
                                        />
                                        <div
                                            className="bg-blue-400 h-full"
                                            style={{ width: `${(w.inProgress / maxOpen) * 100}%` }}
                                        />
                                        <div
                                            className="bg-slate-300 dark:bg-slate-500 h-full"
                                            style={{ width: `${(w.pending / maxOpen) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </button>

                            {expanded[w.username] && w.issues && (
                                <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700">
                                    {w.issues.map((issue) => (
                                        <button
                                            key={issue.issueKey}
                                            onClick={() => navigate(`/projects/${issue.projectKey}/board/${issue.issueKey}`)}
                                            className="w-full text-left flex items-center gap-3 px-6 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm"
                                        >
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[issue.status] || "bg-slate-300"}`} />
                                            <span className="font-mono text-xs text-blue-600 dark:text-blue-400 w-20 flex-shrink-0">
                                                {issue.issueKey}
                                            </span>
                                            <span className="flex-1 text-slate-900 dark:text-white truncate">{issue.title}</span>
                                            <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[issue.priority] || "bg-slate-300"}`}
                                                  title={issue.priority} />
                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                                {issue.projectKey}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-400 rounded" /> High priority</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-400 rounded" /> In progress</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-slate-300 dark:bg-slate-500 rounded" /> Pending</span>
            </div>
        </div>
    );
}
