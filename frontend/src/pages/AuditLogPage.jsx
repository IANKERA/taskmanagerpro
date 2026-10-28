import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

const TYPE_COLORS = {
    CREATED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    COMMENTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    FIELD_CHANGED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    ASSIGNED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    UNASSIGNED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    DELETED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function AuditLogPage() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState({ user: "", project: "", type: "" });

    const { data: logs = [], isLoading } = useQuery({
        queryKey: ["auditLog"],
        queryFn: () => api.get("/api/admin/audit-log", { params: { limit: 500 } }).then((r) => r.data),
    });

    const filtered = logs.filter((l) => {
        if (filter.user && l.actorUsername !== filter.user) return false;
        if (filter.project && l.projectKey !== filter.project) return false;
        if (filter.type && l.activityType !== filter.type) return false;
        return true;
    });

    const uniqueUsers = [...new Set(logs.map((l) => l.actorUsername).filter(Boolean))].sort();
    const uniqueProjects = [...new Set(logs.map((l) => l.projectKey).filter(Boolean))].sort();
    const uniqueTypes = [...new Set(logs.map((l) => l.activityType).filter(Boolean))].sort();

    if (isLoading) return <div className="text-slate-500 py-8 text-center">Loading audit log...</div>;

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Audit Log</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">All user actions across all projects</p>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
                <select value={filter.user} onChange={(e) => setFilter((p) => ({ ...p, user: e.target.value }))}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded px-2.5 py-1.5 text-sm">
                    <option value="">All users</option>
                    {uniqueUsers.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <select value={filter.project} onChange={(e) => setFilter((p) => ({ ...p, project: e.target.value }))}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded px-2.5 py-1.5 text-sm">
                    <option value="">All projects</option>
                    {uniqueProjects.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={filter.type} onChange={(e) => setFilter((p) => ({ ...p, type: e.target.value }))}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded px-2.5 py-1.5 text-sm">
                    <option value="">All types</option>
                    {uniqueTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {(filter.user || filter.project || filter.type) && (
                    <button onClick={() => setFilter({ user: "", project: "", type: "" })}
                        className="text-xs text-slate-500 hover:text-red-600 px-2 py-1.5">Clear</button>
                )}
                <span className="text-xs text-slate-400 self-center ml-auto">{filtered.length} entries</span>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <tr>
                            <th className="text-left px-4 py-2">Time</th>
                            <th className="text-left px-4 py-2">User</th>
                            <th className="text-left px-4 py-2">Action</th>
                            <th className="text-left px-4 py-2">Issue</th>
                            <th className="text-left px-4 py-2">Project</th>
                            <th className="text-left px-4 py-2">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filtered.slice(0, 200).map((l) => (
                            <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    {new Date(l.at).toLocaleString()}
                                </td>
                                <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">
                                    {l.actorUsername || "system"}
                                </td>
                                <td className="px-4 py-2">
                                    <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${TYPE_COLORS[l.activityType] || "bg-slate-100 text-slate-600"}`}>
                                        {l.activityType}
                                    </span>
                                </td>
                                <td className="px-4 py-2">
                                    {l.issueKey ? (
                                        <button
                                            onClick={() => navigate(`/projects/${l.projectKey}/board/${l.issueKey}`)}
                                            className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            {l.issueKey}
                                        </button>
                                    ) : "—"}
                                </td>
                                <td className="px-4 py-2">
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                        {l.projectKey || "—"}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                                    {l.field && (
                                        <span>
                                            <strong>{l.field}</strong>: {l.oldValue || "—"} → {l.newValue || "—"}
                                        </span>
                                    )}
                                    {l.message && <span>{l.message}</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">No audit entries found.</div>
                )}
            </div>
        </div>
    );
}
