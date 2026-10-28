import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import toast from "react-hot-toast";
import { getTimeReport } from "../api/timeReport";
import api from "../api/client";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function fmtTime(mins) {
    if (!mins) return "0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TimeReportView() {
    const { projectKey } = useParams();
    const [filter, setFilter] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["timeReport", projectKey],
        queryFn: () => getTimeReport(projectKey),
    });

    const exportCsv = async () => {
        try {
            const res = await api.get(`/api/projects/${projectKey}/time-report/export`, { responseType: "blob" });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${projectKey}-time-report.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("CSV exported");
        } catch { toast.error("Export failed"); }
    };

    if (isLoading) return <div className="text-slate-500">Loading…</div>;
    if (!data) return null;

    const filtered = filter
        ? data.entries.filter((e) =>
            e.username.toLowerCase().includes(filter.toLowerCase()) ||
            e.issueKey.toLowerCase().includes(filter.toLowerCase()) ||
            (e.description || "").toLowerCase().includes(filter.toLowerCase())
        )
        : data.entries;

    const userData = data.byUser.map((u, i) => ({
        ...u, hours: +(u.minutes / 60).toFixed(1), fill: COLORS[i % COLORS.length],
    }));
    const issueData = data.byIssue.slice(0, 10).map((it, i) => ({
        ...it, hours: +(it.minutes / 60).toFixed(1), fill: COLORS[i % COLORS.length],
    }));
    const dayData = data.byDay.map((d) => ({
        date: d.date, hours: +(d.minutes / 60).toFixed(1),
    }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Time Report</h2>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {fmtTime(data.totalMinutes)} logged across {data.totalEntries} entries
                    </div>
                </div>
                <button
                    onClick={exportCsv}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                    Export CSV
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total Time</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">{fmtTime(data.totalMinutes)}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Hours</div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">{(data.totalMinutes / 60).toFixed(1)}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Contributors</div>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">{data.byUser.length}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Issues Tracked</div>
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{data.byIssue.length}</div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By user pie */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Time by User</h3>
                    {userData.length === 0 ? (
                        <div className="text-sm text-slate-500 py-8 text-center">No time logged.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={userData} dataKey="hours" nameKey="username" cx="50%" cy="50%"
                                    outerRadius={80} label={({ username, hours }) => `${username} (${hours}h)`}>
                                    {userData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                </Pie>
                                <Tooltip formatter={(v) => `${v}h`} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* By issue bar */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Top Issues (hours)</h3>
                    {issueData.length === 0 ? (
                        <div className="text-sm text-slate-500 py-8 text-center">No time logged.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={issueData} layout="vertical" margin={{ left: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="issueKey" type="category" width={55} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v) => `${v}h`} />
                                <Bar dataKey="hours" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Daily trend */}
            {dayData.length > 0 && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Daily Time (last 30 days)</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={dayData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip formatter={(v) => `${v}h`} />
                            <Bar dataKey="hours" fill="#22c55e" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Entries table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">All Entries</h3>
                    <input
                        placeholder="Filter by user, issue, or description…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-1.5 text-sm w-64"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Issue</th>
                                <th className="px-4 py-2">User</th>
                                <th className="px-4 py-2">Time</th>
                                <th className="px-4 py-2">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No time entries found.</td></tr>
                            ) : (
                                filtered.map((e) => (
                                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{e.loggedAt}</td>
                                        <td className="px-4 py-2">
                                            <span className="font-mono text-blue-600 dark:text-blue-400">{e.issueKey}</span>
                                            <span className="text-slate-400 ml-1 truncate max-w-[150px] inline-block align-bottom">{e.issueTitle}</span>
                                        </td>
                                        <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">{e.username}</td>
                                        <td className="px-4 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{fmtTime(e.minutes)}</td>
                                        <td className="px-4 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{e.description || "—"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
