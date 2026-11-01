import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { getAnalytics, getCfd } from "../api/analytics";
import TimeRangeSelector from "../components/TimeRangeSelector";

const STATUS_COLORS = { PENDING: "#94a3b8", IN_PROGRESS: "#3b82f6", DONE: "#22c55e" };
const PRIORITY_COLORS = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#ef4444" };
const TYPE_COLORS = { TASK: "#3b82f6", STORY: "#8b5cf6", BUG: "#ef4444", EPIC: "#f59e0b" };

function toChartData(map, colorMap) {
    return Object.entries(map || {}).map(([name, value]) => ({
        name, value, fill: colorMap?.[name] || "#94a3b8",
    }));
}

export default function AnalyticsView() {
    const { projectKey } = useParams();
    const navigate = useNavigate();
    const [days, setDays] = useState(30);

    const {
        data,
        isLoading,
        isError: isAnalyticsError,
        error: analyticsError,
        refetch: refetchAnalytics,
    } = useQuery({
        queryKey: ["analytics", projectKey],
        queryFn: () => getAnalytics(projectKey),
    });

    const {
        data: cfdData = [],
        isLoading: isCfdLoading,
        isError: isCfdError,
        error: cfdError,
        refetch: refetchCfd,
    } = useQuery({
        queryKey: ["cfd", projectKey, days],
        queryFn: () => getCfd(projectKey, days),
    });

    if (isLoading) {
        return (
            <div className="text-slate-500 dark:text-slate-400 p-6 text-center" role="status">
                Loading analytics…
            </div>
        );
    }

    if (isAnalyticsError || !data) {
        return (
            <div className="p-8 text-center text-sm" role="alert">
                <p className="text-red-600 dark:text-red-400 font-medium">Failed to load project analytics.</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {analyticsError?.message || "An unexpected error occurred."}
                </p>
                <button
                    type="button"
                    onClick={() => refetchAnalytics()}
                    className="mt-3 px-4 py-1.5 text-sm font-medium rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const statusData = toChartData(data.statusBreakdown, STATUS_COLORS);
    const priorityData = toChartData(data.priorityBreakdown, PRIORITY_COLORS);
    const typeData = toChartData(data.typeBreakdown, TYPE_COLORS);

    const healthColor = data.healthScore >= 80 ? "text-green-600 dark:text-green-400" :
        data.healthScore >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
    const healthBg = data.healthScore >= 80 ? "bg-green-50 dark:bg-green-900/20" :
        data.healthScore >= 50 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-red-50 dark:bg-red-900/20";
    const healthLabel = data.healthScore >= 80 ? "Healthy" : data.healthScore >= 50 ? "Needs Attention" : "At Risk";

    return (
        <div className="space-y-8">
            {/* Health Score */}
            <div className={`${healthBg} rounded-lg p-5 border border-slate-200 dark:border-slate-700`}>
                <div className="flex items-center gap-4 mb-3">
                    <div className={`text-4xl font-bold ${healthColor}`}>{data.healthScore}</div>
                    <div>
                        <div className={`text-lg font-semibold ${healthColor}`}>{healthLabel}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Project Health Score</div>
                    </div>
                    {data.avgVelocity > 0 && (
                        <div className="ml-auto text-right">
                            <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{data.avgVelocity}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Avg velocity (pts/sprint)</div>
                        </div>
                    )}
                </div>
                {/* Health bar */}
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full mb-3">
                    <div
                        className={`h-2 rounded-full transition-all ${data.healthScore >= 80 ? "bg-green-500" : data.healthScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${data.healthScore}%` }}
                    />
                </div>
                {(data.risks || []).length > 0 && (
                    <div className="space-y-1">
                        {data.risks.map((risk, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <span className="text-amber-500">⚠</span>
                                <span className="text-slate-700 dark:text-slate-300">{risk}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total Issues" value={data.totalIssues} color="bg-slate-100 dark:bg-slate-800" />
                <StatCard label="Open" value={data.openIssues} color="bg-blue-50 dark:bg-blue-900/30" textColor="text-blue-700 dark:text-blue-400" />
                <StatCard label="Done" value={data.doneIssues} color="bg-green-50 dark:bg-green-900/30" textColor="text-green-700 dark:text-green-400" />
                <StatCard label="Unassigned" value={data.unassignedCount} color="bg-amber-50 dark:bg-amber-900/30" textColor="text-amber-700 dark:text-amber-400" />
                <StatCard label="Overdue" value={data.overdueCount || 0} color="bg-red-50 dark:bg-red-900/30" textColor="text-red-700 dark:text-red-400" />
            </div>

            {/* Pie charts row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ChartCard title="By Status">
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                                {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="By Priority">
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                                {priorityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="By Type">
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                                {typeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Team workload */}
            <ChartCard title="Team Workload">
                {data.assigneeWorkload.length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No assigned issues.</div>
                ) : (
                    <ResponsiveContainer width="100%" height={Math.max(200, data.assigneeWorkload.length * 45)}>
                        <BarChart data={data.assigneeWorkload} layout="vertical" margin={{ left: 80 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis dataKey="username" type="category" width={70} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="open" name="Open" stackId="a" fill="#3b82f6" />
                            <Bar dataKey="done" name="Done" stackId="a" fill="#22c55e" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>

            {/* Stale issues */}
            {data.staleIssues?.length > 0 && (
                <ChartCard title={`Stale Issues (${data.staleIssues.length}) — no updates in 14+ days`}>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 -mx-4 -mb-4">
                        {data.staleIssues.slice(0, 10).map((si) => (
                            <button
                                key={si.issueKey}
                                onClick={() => navigate(`/projects/${projectKey}/board/${si.issueKey}`)}
                                className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                            >
                                <span className="font-mono text-xs text-blue-600 dark:text-blue-400 w-20 shrink-0">{si.issueKey}</span>
                                <span className="text-sm text-slate-900 dark:text-slate-100 truncate flex-1">{si.title}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{si.assignee || "unassigned"}</span>
                                <span className="text-xs font-semibold text-red-500 shrink-0">{si.daysSinceUpdate}d stale</span>
                            </button>
                        ))}
                    </div>
                </ChartCard>
            )}

            {/* Cumulative Flow Diagram */}
            <ChartCard
                title={`Cumulative Flow Diagram (${days} days)`}
                action={
                    <TimeRangeSelector
                        id="cfd-time-range-select"
                        value={days}
                        onChange={setDays}
                    />
                }
            >
                {isCfdLoading ? (
                    <div
                        className="text-sm text-slate-500 dark:text-slate-400 py-16 text-center flex flex-col items-center justify-center gap-2"
                        role="status"
                    >
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading chart data…</span>
                    </div>
                ) : isCfdError ? (
                    <div className="py-10 text-center text-sm" role="alert">
                        <p className="text-red-600 dark:text-red-400 font-medium">Failed to load Cumulative Flow Diagram.</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {cfdError?.message || "An unexpected error occurred while fetching CFD data."}
                        </p>
                        <button
                            type="button"
                            onClick={() => refetchCfd()}
                            className="mt-3 px-3 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                ) : cfdData.length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400 py-12 text-center">
                        No data available for the selected time range ({days} days).
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={cfdData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                            <YAxis allowDecimals={false} />
                            <Tooltip labelFormatter={(d) => d} />
                            <Legend />
                            <Area type="monotone" dataKey="DONE" name="Done" stackId="1" fill="#22c55e" stroke="#22c55e" fillOpacity={0.7} />
                            <Area type="monotone" dataKey="IN_PROGRESS" name="In Progress" stackId="1" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.7} />
                            <Area type="monotone" dataKey="PENDING" name="Pending" stackId="1" fill="#94a3b8" stroke="#94a3b8" fillOpacity={0.7} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>

            {/* Sprint velocity */}
            <ChartCard title="Sprint Velocity (Story Points)">
                {data.sprintVelocity.length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No completed sprints yet.</div>
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data.sprintVelocity}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="sprintName" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="committed" name="Committed" fill="#94a3b8" />
                            <Bar dataKey="completed" name="Completed" fill="#22c55e" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>
        </div>
    );
}

function StatCard({ label, value, color = "", textColor = "text-slate-900 dark:text-white" }) {
    return (
        <div className={`rounded-lg p-4 ${color}`}>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</div>
            <div className={`text-2xl font-bold mt-1 ${textColor}`}>{value}</div>
        </div>
    );
}

function ChartCard({ title, children, action }) {
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
                {action}
            </div>
            {children}
        </div>
    );
}
