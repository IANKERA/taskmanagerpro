import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAdminUsers, fetchAdminAuditLog } from "../../api/admin";
import { listProjects } from "../../api/projects";
import { formatApiError } from "../../api/errorMessage";

export default function AdminOverview() {
    const {
        data: users = [],
        isLoading: usersLoading,
        error: usersError,
    } = useQuery({
        queryKey: ["admin-users"],
        queryFn: fetchAdminUsers,
    });

    const {
        data: projects = [],
        isLoading: projectsLoading,
        error: projectsError,
    } = useQuery({
        queryKey: ["projects"],
        queryFn: listProjects,
    });

    const {
        data: recentLogs = [],
        isLoading: logsLoading,
        error: logsError,
    } = useQuery({
        queryKey: ["admin-overview-audit"],
        queryFn: () => fetchAdminAuditLog(5),
    });

    const isLoading = usersLoading || projectsLoading || logsLoading;
    const hasError = usersError || projectsError || logsError;

    // Derived statistics from real API responses
    const totalUsers = users.length;
    const adminUsers = users.filter((u) => u.role === "ROLE_ADMIN" || u.role === "ADMIN").length;
    const standardUsers = totalUsers - adminUsers;

    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => !p.archived).length;
    const archivedProjects = projects.filter((p) => p.archived).length;

    const totalIssues = projects.reduce(
        (sum, p) => sum + (p.openCount || 0) + (p.inProgressCount || 0) + (p.doneCount || 0),
        0
    );

    return (
        <div className="space-y-8">
            {hasError && (
                <div role="alert" className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                    Failed to load some administration data: {formatApiError(usersError || projectsError || logsError)}
                </div>
            )}

            {/* Top Metrics Cards */}
            <section aria-labelledby="overview-stats-heading">
                <h2 id="overview-stats-heading" className="sr-only">Platform Statistics</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Users Summary Card */}
                    <div className="app-surface rounded-xl p-5 shadow-xs border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Total Users
                            </span>
                            <span className="rounded-md bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                                👥
                            </span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {usersLoading ? "…" : totalUsers}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">registered</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-700/60 dark:text-slate-400">
                            <span>Admins: <strong>{adminUsers}</strong></span>
                            <span>Standard Users: <strong>{standardUsers}</strong></span>
                        </div>
                    </div>

                    {/* Projects Summary Card */}
                    <div className="app-surface rounded-xl p-5 shadow-xs border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Total Projects
                            </span>
                            <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                                📁
                            </span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {projectsLoading ? "…" : totalProjects}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">organization workspaces</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-700/60 dark:text-slate-400">
                            <span>Active: <strong>{activeProjects}</strong></span>
                            <span>Archived: <strong>{archivedProjects}</strong></span>
                        </div>
                    </div>

                    {/* Issues / Workload Card */}
                    <div className="app-surface rounded-xl p-5 shadow-xs border border-slate-200 dark:border-slate-700 sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Total Issues Tracked
                            </span>
                            <span className="rounded-md bg-purple-50 p-1.5 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 text-xs">
                                📋
                            </span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {projectsLoading ? "…" : totalIssues}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">across all projects</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-700/60 dark:text-slate-400">
                            <span>Open/Pending: <strong>{projects.reduce((acc, p) => acc + (p.openCount || 0), 0)}</strong></span>
                            <span>Done: <strong>{projects.reduce((acc, p) => acc + (p.doneCount || 0), 0)}</strong></span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Action Navigation Grid */}
            <section aria-labelledby="quick-actions-heading">
                <h2 id="quick-actions-heading" className="text-base font-semibold text-slate-900 dark:text-white mb-3">
                    Administrative Modules
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Link
                        to="/admin/users"
                        className="group app-surface rounded-xl p-5 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-xs"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                User Management →
                            </h3>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {totalUsers} users
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Search user accounts, review roles, update permissions, and reset user passwords securely.
                        </p>
                    </Link>

                    <Link
                        to="/admin/projects"
                        className="group app-surface rounded-xl p-5 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-xs"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                Project Management →
                            </h3>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {activeProjects} active
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Manage workspace projects, assign project leads, adjust membership roles, and archive completed initiatives.
                        </p>
                    </Link>

                    <Link
                        to="/admin/audit-log"
                        className="group app-surface rounded-xl p-5 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-xs"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                Audit Log →
                            </h3>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                Live Feed
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Inspect comprehensive chronological records of system events, issue modifications, and administrative actions.
                        </p>
                    </Link>
                </div>
            </section>

            {/* Recent System Activity Stream */}
            <section aria-labelledby="recent-activity-heading">
                <div className="flex items-center justify-between mb-3">
                    <h2 id="recent-activity-heading" className="text-base font-semibold text-slate-900 dark:text-white">
                        Recent Administrative & System Activity
                    </h2>
                    <Link
                        to="/admin/audit-log"
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        View full audit log ({recentLogs.length}+)
                    </Link>
                </div>

                {logsLoading ? (
                    <div className="app-surface rounded-xl p-8 text-center text-sm text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Loading recent activity…
                    </div>
                ) : recentLogs.length === 0 ? (
                    <div className="app-surface rounded-xl p-8 text-center text-sm text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        No activity records found.
                    </div>
                ) : (
                    <div className="app-surface overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {recentLogs.map((log) => (
                                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors">
                                    <div className="flex items-start sm:items-center gap-3">
                                        <span className="mt-0.5 sm:mt-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                            {log.activityType || "EVENT"}
                                        </span>
                                        <div>
                                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                                                {log.actorUsername || "system"}
                                            </span>
                                            {log.message && (
                                                <span className="text-sm text-slate-600 dark:text-slate-300 ml-1.5">
                                                    {log.message}
                                                </span>
                                            )}
                                            {log.issueKey && (
                                                <span className="ml-1.5 font-mono text-xs text-blue-600 dark:text-blue-400">
                                                    [{log.issueKey}]
                                                </span>
                                            )}
                                            {log.projectKey && !log.issueKey && (
                                                <span className="ml-1.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                                                    ({log.projectKey})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap self-end sm:self-center">
                                        {log.at ? new Date(log.at).toLocaleString() : "Just now"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

