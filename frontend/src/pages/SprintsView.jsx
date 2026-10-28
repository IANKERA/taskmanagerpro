import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { listSprints, createSprint, startSprint, closeSprint, listSprintIssues, sprintBurndown } from "../api/sprints";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import ConfirmDialog from "../components/ConfirmDialog";
import { updateIssue } from "../api/issues";

const STATE_STYLES = {
    PLANNED: "bg-slate-100 text-slate-700",
    ACTIVE:  "bg-green-100 text-green-700",
    CLOSED:  "bg-slate-200 text-slate-500",
};

const STATUS_BADGE = {
    PENDING:     "bg-slate-100 text-slate-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    DONE:        "bg-green-100 text-green-700",
};

export default function SprintsView() {
    const { projectKey } = useParams();
    const qc = useQueryClient();
    const [creating, setCreating] = useState(false);

    const { data: sprints = [], isLoading } = useQuery({
        queryKey: ["sprints", projectKey],
        queryFn: () => listSprints(projectKey),
    });

    const startMut = useMutation({
        mutationFn: (id) => startSprint(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["sprints", projectKey] }); toast.success("Sprint started"); },
        onError: (e) => toast.error(e.message),
    });
    const closeMut = useMutation({
        mutationFn: (id) => closeSprint(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["sprints", projectKey] }); toast.success("Sprint closed"); },
        onError: (e) => toast.error(e.message),
    });

    const activeSprint = sprints.find((s) => s.state === "ACTIVE");

    return (
        <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-500">
                    {sprints.length} sprint{sprints.length === 1 ? "" : "s"}
                    {activeSprint && (
                        <>
                            {" · "}
                            <span className="font-medium text-green-700">{activeSprint.name}</span> active
                        </>
                    )}
                </div>
                <button
                    onClick={() => setCreating((v) => !v)}
                    className="px-3 py-1.5 bg-slate-900 dark:bg-blue-600 text-white text-sm rounded hover:bg-slate-800 dark:hover:bg-blue-700"
                >
                    {creating ? "Cancel" : "+ New sprint"}
                </button>
            </div>

            {creating && (
                <CreateSprintForm
                    projectKey={projectKey}
                    onDone={() => {
                        qc.invalidateQueries({ queryKey: ["sprints", projectKey] });
                        setCreating(false);
                    }}
                />
            )}

            {isLoading ? (
                <div className="text-slate-500">Loading…</div>
            ) : sprints.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
                    No sprints yet.
                </div>
            ) : (
                <div className="space-y-3">
                    {sprints.map((s) => (
                        <SprintPanel
                            key={s.id}
                            sprint={s}
                            projectKey={projectKey}
                            allSprints={sprints}
                            activeSprint={activeSprint}
                            onStart={() => startMut.mutate(s.id)}
                            onClose={() => closeMut.mutate(s.id)}
                            startPending={startMut.isPending}
                            closePending={closeMut.isPending}
                        />
                    ))}
                </div>
            )}

            <VelocityChart sprints={sprints} />
        </div>
    );
}

function VelocityChart({ sprints }) {
    const closedSprints = sprints
        .filter((s) => s.state === "CLOSED" || s.state === "ACTIVE")
        .sort((a, b) => (a.startedAt || a.startDate || "").localeCompare(b.startedAt || b.startDate || ""));

    if (closedSprints.length < 1) return null;

    const data = closedSprints.map((s) => ({
        name: s.name,
        completed: s.donePoints || 0,
        total: s.totalPoints || 0,
        issues: s.doneCount || 0,
    }));

    return (
        <div className="mt-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Velocity</h3>
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="completed" fill="#22c55e" name="Points Done" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total" fill="#e2e8f0" name="Total Points" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function SprintPanel({ sprint: s, projectKey, allSprints, activeSprint, onStart, onClose, startPending, closePending }) {
    const [expanded, setExpanded] = useState(s.state === "ACTIVE");
    const [confirmClose, setConfirmClose] = useState(false);
    const navigate = useNavigate();
    const qc = useQueryClient();

    const { data: issues = [] } = useQuery({
        queryKey: ["sprint-issues", s.id],
        queryFn: () => listSprintIssues(s.id),
        enabled: expanded,
    });

    const showChart = expanded && (s.state === "ACTIVE" || s.state === "CLOSED");
    const { data: burndownData = [] } = useQuery({
        queryKey: ["burndown", s.id],
        queryFn: () => sprintBurndown(s.id),
        enabled: showChart,
    });

    const moveMut = useMutation({
        mutationFn: ({ issueKey, sprintId }) => updateIssue(issueKey, { sprintId }),
        onSuccess: (_, { sprintId }) => {
            qc.invalidateQueries({ queryKey: ["sprint-issues"] });
            qc.invalidateQueries({ queryKey: ["sprints", projectKey] });
            qc.invalidateQueries({ queryKey: ["backlog", projectKey] });
            qc.invalidateQueries({ queryKey: ["burndown"] });
            toast.success(sprintId === -1 ? "Moved to backlog" : "Moved to sprint");
        },
        onError: (e) => toast.error(e.message),
    });

    const otherSprints = allSprints.filter((sp) => sp.id !== s.id && sp.state !== "CLOSED");

    const pct = s.issueCount > 0 ? Math.round((s.doneCount / s.issueCount) * 100) : 0;

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                onClick={() => setExpanded((v) => !v)}
            >
                <span className="text-slate-400 text-sm">{expanded ? "▼" : "▶"}</span>
                <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${STATE_STYLES[s.state]}`}>
                    {s.state}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white">{s.name}</div>
                    {s.goal && <div className="text-sm text-slate-500 truncate">{s.goal}</div>}
                    <div className="text-xs text-slate-400 mt-0.5">
                        {fmtDateRange(s.startDate, s.endDate)}
                        {s.startedAt && ` · started ${new Date(s.startedAt).toLocaleDateString()}`}
                        {s.closedAt && ` · closed ${new Date(s.closedAt).toLocaleDateString()}`}
                    </div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                    <div className="text-xs text-slate-500">
                        {s.doneCount}/{s.issueCount} issues · {s.donePoints}/{s.totalPoints} pts
                    </div>
                    {s.issueCount > 0 && (
                        <div className="w-32 bg-slate-200 rounded-full h-1.5">
                            <div
                                className="bg-green-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    )}
                </div>
                <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {s.state === "PLANNED" && (
                        <button
                            disabled={startPending || !!activeSprint}
                            title={activeSprint ? `Close ${activeSprint.name} first` : "Start sprint"}
                            onClick={onStart}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Start
                        </button>
                    )}
                    {s.state === "ACTIVE" && (
                        <>
                            <button
                                disabled={closePending}
                                onClick={() => setConfirmClose(true)}
                                className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded hover:bg-slate-800"
                            >
                                Close
                            </button>
                            <ConfirmDialog
                                open={confirmClose}
                                title="Close sprint?"
                                message={`Are you sure you want to close "${s.name}"? Issues not marked Done will remain in the sprint.`}
                                confirmLabel="Close Sprint"
                                danger
                                onConfirm={() => { setConfirmClose(false); onClose(); }}
                                onCancel={() => setConfirmClose(false)}
                            />
                        </>
                    )}
                </div>
            </div>

            {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3">
                    {issues.length === 0 ? (
                        <div className="text-sm text-slate-400 py-2">No issues in this sprint.</div>
                    ) : (
                        <div className="space-y-1">
                            {issues.map((issue) => (
                                <div key={issue.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50">
                                    <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${STATUS_BADGE[issue.status] || ""}`}>
                                        {issue.status?.replace("_", " ")}
                                    </span>
                                    <span className="font-mono text-xs text-slate-500 shrink-0">{issue.issueKey}</span>
                                    <button
                                        onClick={() => navigate(`/projects/${projectKey}/board/${issue.issueKey}`)}
                                        className="text-sm text-slate-800 dark:text-slate-200 hover:text-blue-600 hover:underline truncate flex-1 text-left"
                                    >
                                        {issue.title}
                                    </button>
                                    <span className="text-xs text-slate-400 shrink-0">
                                        {issue.assigneeUsername || "Unassigned"}
                                    </span>
                                    {issue.storyPoints != null && (
                                        <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                            {issue.storyPoints} SP
                                        </span>
                                    )}
                                    {s.state !== "CLOSED" && (
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val) moveMut.mutate({ issueKey: issue.issueKey, sprintId: Number(val) });
                                            }}
                                            className="text-[11px] text-slate-400 bg-transparent border border-slate-200 rounded px-1 py-0.5 shrink-0 cursor-pointer hover:border-slate-400"
                                        >
                                            <option value="">Move...</option>
                                            <option value={-1}>Backlog</option>
                                            {otherSprints.map((sp) => (
                                                <option key={sp.id} value={sp.id}>{sp.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {showChart && burndownData.length > 1 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Burndown Chart</h4>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={burndownData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(d) => d.slice(5)}
                                    />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip
                                        labelFormatter={(d) => `Date: ${d}`}
                                        contentStyle={{ fontSize: 12 }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Line
                                        type="monotone"
                                        dataKey="ideal"
                                        stroke="#94a3b8"
                                        strokeDasharray="5 5"
                                        dot={false}
                                        name="Ideal"
                                    />
                                    <Line
                                        type="stepAfter"
                                        dataKey="remaining"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={{ r: 2 }}
                                        name="Remaining"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function fmtDateRange(start, end) {
    if (!start && !end) return "no dates";
    return `${start || "—"} → ${end || "—"}`;
}

function CreateSprintForm({ projectKey, onDone }) {
    const [form, setForm] = useState({ name: "", goal: "", startDate: "", endDate: "" });
    const mut = useMutation({
        mutationFn: (body) =>
            createSprint(projectKey, {
                ...body,
                startDate: body.startDate || null,
                endDate: body.endDate || null,
            }),
        onSuccess: () => { toast.success("Sprint created"); onDone(); },
        onError: (e) => toast.error(e.message),
    });
    return (
        <form
            onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4 space-y-3"
        >
            <input
                required
                placeholder="Sprint name (e.g. Sprint 1)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm"
            />
            <input
                placeholder="Goal (optional)"
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
                <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm"
                />
                <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm"
                />
            </div>
            <div className="flex items-center gap-3">
                <button
                    disabled={mut.isPending}
                    className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white text-sm rounded hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50"
                >
                    {mut.isPending ? "Creating…" : "Create"}
                </button>
                {mut.error && <span className="text-sm text-red-600">{mut.error.message}</span>}
            </div>
        </form>
    );
}
