import { useEffect, useMemo, useState } from "react";
import { useParams, Outlet, useSearchParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    DndContext, PointerSensor, useSensor, useSensors, DragOverlay, closestCenter,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import toast from "react-hot-toast";
import { listIssues, createIssue, updateIssue, bulkUpdateIssues } from "../api/issues";
import { listSprints } from "../api/sprints";
import { listTemplates } from "../api/templates";
import api from "../api/client";
import IssueCard from "../components/board/IssueCard";
import BoardFilters, { applyFilters } from "../components/board/BoardFilters";

const COLUMNS = [
    { id: "PENDING",     title: "To Do" },
    { id: "IN_PROGRESS", title: "In Progress" },
    { id: "DONE",        title: "Done" },
];

export default function BoardView() {
    const { projectKey } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [creating, setCreating] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [swimlane, setSwimlane] = useState("none");  // "none" | "epic" | "assignee" | "priority"
    const [listView, setListView] = useState(false);  // compact list vs card toggle
    const [selected, setSelected] = useState(new Set());
    const [bulkMode, setBulkMode] = useState(false);
    const [wipLimits, setWipLimits] = useState(() => {
        try { return JSON.parse(localStorage.getItem(`wip-${projectKey}`)) || {}; } catch { return {}; }
    });
    const [showWipConfig, setShowWipConfig] = useState(false);
    const [collapsedCols, setCollapsedCols] = useState(() => {
        try { return JSON.parse(localStorage.getItem(`collapsed-${projectKey}`)) || {}; } catch { return {}; }
    });
    const toggleCollapse = (colId) => {
        setCollapsedCols((prev) => {
            const next = { ...prev, [colId]: !prev[colId] };
            localStorage.setItem(`collapsed-${projectKey}`, JSON.stringify(next));
            return next;
        });
    };

    const saveWipLimits = (next) => {
        setWipLimits(next);
        localStorage.setItem(`wip-${projectKey}`, JSON.stringify(next));
    };

    const { data: allIssues = [], isLoading } = useQuery({
        queryKey: ["issues", projectKey],
        queryFn: () => listIssues(projectKey),
    });

    const { data: sprints = [] } = useQuery({
        queryKey: ["sprints", projectKey],
        queryFn: () => listSprints(projectKey),
    });

    const [searchParams, setSearchParams] = useSearchParams();
    const filters = useMemo(() => Object.fromEntries(searchParams), [searchParams]);
    const setFilters = (next) => {
        const clean = Object.fromEntries(
            Object.entries(next).filter(([, v]) => v != null && v !== "")
        );
        setSearchParams(clean, { replace: true });
    };
    const issues = useMemo(() => applyFilters(allIssues, filters), [allIssues, filters]);

    const moveMut = useMutation({
        mutationFn: ({ issueKey, status }) => updateIssue(issueKey, { status }),
        onMutate: async ({ issueKey, status }) => {
            await qc.cancelQueries({ queryKey: ["issues", projectKey] });
            const prev = qc.getQueryData(["issues", projectKey]);
            qc.setQueryData(["issues", projectKey], (old = []) =>
                old.map((i) => (i.issueKey === issueKey ? { ...i, status } : i))
            );
            return { prev };
        },
        onError: (_e, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(["issues", projectKey], ctx.prev);
            toast.error("Failed to move issue");
        },
        onSettled: () => qc.invalidateQueries({ queryKey: ["issues", projectKey] }),
    });

    const bulkMut = useMutation({
        mutationFn: (body) => bulkUpdateIssues(projectKey, body),
        onSuccess: (data) => {
            toast.success(`Updated ${data.length} issue(s)`);
            setSelected(new Set());
            setBulkMode(false);
            qc.invalidateQueries({ queryKey: ["issues", projectKey] });
        },
        onError: (e) => toast.error(e.message),
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );

    // Keyboard shortcut: 'c' to toggle create form
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "c" && !e.metaKey && !e.ctrlKey &&
                !["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) {
                setCreating((v) => !v);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const activeIssue = useMemo(
        () => issues.find((i) => i.issueKey === activeId),
        [issues, activeId]
    );

    const handleDragEnd = ({ active, over }) => {
        setActiveId(null);
        if (!over) return;
        const targetStatus = over.id;
        const issue = issues.find((i) => i.issueKey === active.id);
        if (!issue || issue.status === targetStatus) return;
        moveMut.mutate({ issueKey: issue.issueKey, status: targetStatus });
    };

    const toggleSelect = (key) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const exitBulkMode = () => { setBulkMode(false); setSelected(new Set()); };

    // Swimlane grouping
    const swimlanes = useMemo(() => {
        if (swimlane === "none") return null;

        if (swimlane === "epic") {
            const epicMap = new Map();
            const noEpic = [];
            for (const i of issues) {
                if (i.issueType === "EPIC") continue;
                if (i.parentIssueKey) {
                    if (!epicMap.has(i.parentIssueKey)) epicMap.set(i.parentIssueKey, []);
                    epicMap.get(i.parentIssueKey).push(i);
                } else {
                    noEpic.push(i);
                }
            }
            const epicTitles = {};
            for (const i of allIssues) {
                if (i.issueType === "EPIC") epicTitles[i.issueKey] = i.title;
            }
            const lanes = [];
            for (const [key, items] of epicMap) {
                lanes.push({ key, title: epicTitles[key] || key, issues: items });
            }
            lanes.sort((a, b) => a.key.localeCompare(b.key));
            if (noEpic.length > 0) lanes.push({ key: "__none__", title: "No Epic", issues: noEpic });
            return lanes;
        }

        if (swimlane === "assignee") {
            const groups = new Map();
            for (const i of issues) {
                const key = i.assigneeUsername || "__unassigned__";
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(i);
            }
            const lanes = [];
            for (const [key, items] of groups) {
                lanes.push({ key, title: key === "__unassigned__" ? "Unassigned" : key, issues: items });
            }
            lanes.sort((a, b) => a.key === "__unassigned__" ? 1 : b.key === "__unassigned__" ? -1 : a.key.localeCompare(b.key));
            return lanes;
        }

        if (swimlane === "priority") {
            const order = ["HIGH", "MEDIUM", "LOW"];
            const groups = new Map();
            for (const i of issues) {
                const key = i.priority || "MEDIUM";
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(i);
            }
            return order.filter((k) => groups.has(k)).map((k) => ({
                key: k, title: k, issues: groups.get(k),
            }));
        }

        return null;
    }, [issues, allIssues, swimlane]);

    // Flat board issues
    const boardIssues = swimlane === "none" ? issues : null;

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="text-sm text-slate-500">
                        {issues.length === allIssues.length
                            ? `${issues.length} issue${issues.length === 1 ? "" : "s"}`
                            : `${issues.length} of ${allIssues.length} issues`}
                    </div>
                    <select
                        value={swimlane}
                        onChange={(e) => setSwimlane(e.target.value)}
                        className={`px-2 py-1 text-xs rounded border ${
                            swimlane !== "none" ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300" : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"
                        }`}
                    >
                        <option value="none">☰ Flat</option>
                        <option value="epic">✦ By Epic</option>
                        <option value="assignee">👤 By Assignee</option>
                        <option value="priority">⚡ By Priority</option>
                    </select>
                    <button
                        onClick={() => setListView((v) => !v)}
                        className={`px-2 py-1 text-xs rounded border ${
                            listView ? "bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600" : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                    >
                        {listView ? "≡ List" : "▦ Cards"}
                    </button>
                    <button
                        onClick={() => bulkMode ? exitBulkMode() : setBulkMode(true)}
                        className={`px-2 py-1 text-xs rounded border ${
                            bulkMode ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        {bulkMode ? `✓ ${selected.size} selected` : "Bulk"}
                    </button>
                    <button
                        onClick={() => setShowWipConfig((v) => !v)}
                        className={`px-2 py-1 text-xs rounded border ${
                            showWipConfig ? "bg-amber-100 border-amber-300 text-amber-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                        }`}
                        title="WIP limits"
                    >
                        WIP
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={async () => {
                            try {
                                const res = await api.get(`/api/projects/${projectKey}/issues/export`, { responseType: "blob" });
                                const url = URL.createObjectURL(res.data);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `${projectKey}-issues.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                                toast.success("CSV exported");
                            } catch { toast.error("Export failed"); }
                        }}
                        className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        Export CSV
                    </button>
                    <button
                        onClick={() => setCreating((v) => !v)}
                        className="px-3 py-1.5 bg-slate-900 text-white text-sm rounded hover:bg-slate-800"
                    >
                        {creating ? "Cancel" : "+ Create issue"}
                    </button>
                </div>
            </div>

            <BoardFilters issues={allIssues} filters={filters} onChange={setFilters} />

            {showWipConfig && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">WIP Limits:</span>
                    {COLUMNS.map((col) => (
                        <label key={col.id} className="flex items-center gap-1">
                            <span className="text-xs text-slate-600 dark:text-slate-400">{col.title}</span>
                            <input
                                type="number" min={0} placeholder="∞"
                                value={wipLimits[col.id] || ""}
                                onChange={(e) => saveWipLimits({ ...wipLimits, [col.id]: e.target.value ? Number(e.target.value) : undefined })}
                                className="w-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded px-1.5 py-0.5 text-xs text-center"
                            />
                        </label>
                    ))}
                    <button onClick={() => saveWipLimits({})} className="text-xs text-slate-500 hover:text-slate-900 underline ml-auto">Clear</button>
                </div>
            )}

            {/* Bulk action bar */}
            {bulkMode && selected.size > 0 && (
                <BulkActionBar
                    count={selected.size}
                    sprints={sprints}
                    assignees={[...new Set(allIssues.map((i) => i.assigneeUsername).filter(Boolean))].sort()}
                    onApply={(patch) => bulkMut.mutate({ issueKeys: [...selected], ...patch })}
                    isPending={bulkMut.isPending}
                />
            )}

            {creating && (
                <CreateIssueForm
                    projectKey={projectKey}
                    onDone={() => {
                        qc.invalidateQueries({ queryKey: ["issues", projectKey] });
                        setCreating(false);
                    }}
                />
            )}

            {isLoading ? (
                <div className="text-slate-500">Loading…</div>
            ) : listView ? (
                /* Compact list view */
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                        <span>Status</span><span>Issue</span><span>Type</span><span>Priority</span><span>Assignee</span><span>Due</span>
                    </div>
                    {issues.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">No issues match filters</div>
                    ) : issues.map((issue) => (
                            <button
                                key={issue.id}
                                onClick={() => navigate(`/projects/${projectKey}/board/${issue.issueKey}`)}
                                className="w-full grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 px-3 py-2 items-center text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                            >
                                <span className={`w-2.5 h-2.5 rounded-full ${
                                    issue.status === "DONE" ? "bg-green-500" : issue.status === "IN_PROGRESS" ? "bg-blue-500" : "bg-slate-400"
                                }`} />
                                <span className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 shrink-0">{issue.issueKey}</span>
                                    <span className={`text-sm truncate ${issue.status === "DONE" ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>{issue.title}</span>
                                </span>
                                <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400">{issue.issueType}</span>
                                <span className={`w-2 h-2 rounded-full ${
                                    issue.priority === "HIGH" ? "bg-red-500" : issue.priority === "MEDIUM" ? "bg-amber-400" : "bg-slate-300"
                                }`} />
                                <span className="text-xs text-slate-500 dark:text-slate-400 w-20 truncate">{issue.assigneeUsername || "—"}</span>
                                <span className="text-[10px] text-slate-400 w-16 text-right">
                                    {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                                </span>
                            </button>
                    ))}
                </div>
            ) : swimlane !== "none" && swimlanes ? (
                /* Epic swimlane view */
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(e) => setActiveId(e.active.id)}
                    onDragCancel={() => setActiveId(null)}
                    onDragEnd={handleDragEnd}
                >
                    <div className="space-y-6">
                        {swimlanes.map((lane) => (
                            <div key={lane.key}>
                                <div className="flex items-center gap-2 mb-2 px-1">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                                        {lane.key === "__none__" ? "—" : lane.key}
                                    </span>
                                    <span className="text-sm font-medium text-slate-700">{lane.title}</span>
                                    <span className="text-xs text-slate-400 ml-auto">{lane.issues.length} issues</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {COLUMNS.map((col) => (
                                        <DroppableColumn
                                            key={`${lane.key}-${col.id}`}
                                            column={col}
                                            issues={lane.issues.filter((i) => i.status === col.id)}
                                            selectable={bulkMode}
                                            selected={selected}
                                            onToggle={toggleSelect}
                                            projectKey={projectKey}
                                            onCreated={() => qc.invalidateQueries({ queryKey: ["issues", projectKey] })}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <DragOverlay>
                        {activeIssue && (
                            <div className="rotate-1 opacity-90">
                                <IssueCard issue={activeIssue} />
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            ) : (
                /* Flat board view */
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(e) => setActiveId(e.active.id)}
                    onDragCancel={() => setActiveId(null)}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-4">
                        {COLUMNS.map((col) => (
                            <div key={col.id} className={collapsedCols[col.id] ? "shrink-0" : "flex-1 min-w-0"}>
                                <DroppableColumn
                                    column={col}
                                    issues={issues.filter((i) => i.status === col.id)}
                                    selectable={bulkMode}
                                    selected={selected}
                                    onToggle={toggleSelect}
                                    wipLimit={wipLimits[col.id]}
                                    projectKey={projectKey}
                                    onCreated={() => qc.invalidateQueries({ queryKey: ["issues", projectKey] })}
                                    collapsed={!!collapsedCols[col.id]}
                                    onToggleCollapse={() => toggleCollapse(col.id)}
                                />
                            </div>
                        ))}
                    </div>
                    <DragOverlay>
                        {activeIssue && (
                            <div className="rotate-1 opacity-90">
                                <IssueCard issue={activeIssue} />
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            )}

            <Outlet />
        </>
    );
}

function DroppableColumn({ column, issues, selectable, selected, onToggle, wipLimit, projectKey, onCreated, collapsed, onToggleCollapse }) {
    const { setNodeRef, isOver } = useDroppable({ id: column.id });
    const overLimit = wipLimit && issues.length > wipLimit;
    const [quickCreate, setQuickCreate] = useState(false);
    const [title, setTitle] = useState("");
    const qc = useQueryClient();

    const createMut = useMutation({
        mutationFn: (body) => createIssue(projectKey, body),
        onSuccess: () => {
            toast.success("Issue created");
            setTitle("");
            setQuickCreate(false);
            onCreated?.();
        },
        onError: (e) => toast.error(e.message),
    });

    if (collapsed) {
        return (
            <div
                ref={setNodeRef}
                className={`rounded-lg p-2 min-h-[60vh] flex flex-col items-center cursor-pointer transition-colors ${
                    isOver ? "bg-slate-200 dark:bg-slate-700 ring-2 ring-slate-400" : "bg-slate-100 dark:bg-slate-800/50"
                }`}
                onClick={onToggleCollapse}
                style={{ maxWidth: "48px" }}
            >
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 [writing-mode:vertical-lr] rotate-180 mt-2">
                    {column.title}
                </span>
                <span className="mt-2 text-xs font-mono text-slate-500 bg-slate-200 dark:bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center">
                    {issues.length}
                </span>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            className={
                "rounded-lg p-3 min-h-[60vh] transition-colors flex flex-col " +
                (overLimit ? "ring-2 ring-red-400 " : "") +
                (isOver ? "bg-slate-200 dark:bg-slate-700 ring-2 ring-slate-400" : "bg-slate-100 dark:bg-slate-800/50")
            }
        >
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onToggleCollapse}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
                        title="Collapse column"
                    >
                        ◀
                    </button>
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${overLimit ? "text-red-600" : "text-slate-600 dark:text-slate-400"}`}>
                        {column.title}
                    </h3>
                </div>
                <span className={`text-xs font-mono ${overLimit ? "text-red-600 font-bold" : "text-slate-500"}`}>
                    {issues.length}{wipLimit ? `/${wipLimit}` : ""}
                </span>
            </div>
            <div className="space-y-2 flex-1">
                {issues.map((issue) => (
                    <DraggableIssue
                        key={issue.id}
                        issue={issue}
                        selectable={selectable}
                        selected={selected?.has(issue.issueKey)}
                        onToggle={onToggle}
                    />
                ))}
            </div>
            {/* Quick create at bottom of column */}
            {quickCreate ? (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (title.trim()) createMut.mutate({ title: title.trim(), status: column.id, issueType: "TASK", priority: "MEDIUM" });
                    }}
                    className="mt-2 space-y-1"
                >
                    <input
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Issue title…"
                        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-2 py-1.5 text-sm"
                        onKeyDown={(e) => { if (e.key === "Escape") { setQuickCreate(false); setTitle(""); } }}
                    />
                    <div className="flex gap-1">
                        <button disabled={createMut.isPending || !title.trim()}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50">
                            Create
                        </button>
                        <button type="button" onClick={() => { setQuickCreate(false); setTitle(""); }}
                            className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <button
                    onClick={() => setQuickCreate(true)}
                    className="mt-2 w-full text-left px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded transition-colors"
                >
                    + Create issue
                </button>
            )}
        </div>
    );
}

function DraggableIssue({ issue, selectable, selected, onToggle }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: issue.issueKey,
    });
    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className={isDragging ? "opacity-0" : ""}
        >
            <IssueCard issue={issue} selectable={selectable} selected={selected} onToggle={onToggle} />
        </div>
    );
}

function BulkActionBar({ count, sprints, assignees, onApply, isPending }) {
    const [action, setAction] = useState("");
    const [value, setValue] = useState("");

    const apply = () => {
        if (!action) return;
        const patch = {};
        if (action === "status") patch.status = value;
        else if (action === "sprint") patch.sprintId = Number(value);
        else if (action === "assignee") patch.assigneeUsername = value;
        onApply(patch);
    };

    return (
        <div className="flex items-center gap-2 mb-4 p-3 bg-slate-900 text-white rounded-lg text-sm">
            <span className="font-semibold">{count} selected</span>
            <select
                value={action}
                onChange={(e) => { setAction(e.target.value); setValue(""); }}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
            >
                <option value="">Choose action…</option>
                <option value="status">Change status</option>
                <option value="sprint">Move to sprint</option>
                <option value="assignee">Assign to</option>
            </select>
            {action === "status" && (
                <select value={value} onChange={(e) => setValue(e.target.value)}
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm">
                    <option value="">Select…</option>
                    <option value="PENDING">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                </select>
            )}
            {action === "sprint" && (
                <select value={value} onChange={(e) => setValue(e.target.value)}
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm">
                    <option value="">Select…</option>
                    <option value="-1">Backlog (no sprint)</option>
                    {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            )}
            {action === "assignee" && (
                <select value={value} onChange={(e) => setValue(e.target.value)}
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm">
                    <option value="">Select…</option>
                    <option value="">Unassign</option>
                    {assignees.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
            )}
            <button
                onClick={apply}
                disabled={!action || !value || isPending}
                className="px-3 py-1 bg-white text-slate-900 rounded text-sm font-medium disabled:opacity-50"
            >
                {isPending ? "Applying…" : "Apply"}
            </button>
        </div>
    );
}

function CreateIssueForm({ projectKey, onDone }) {
    const [form, setForm] = useState({
        title: "",
        description: "",
        issueType: "TASK",
        priority: "MEDIUM",
    });

    const { data: templates = [] } = useQuery({
        queryKey: ["templates", projectKey],
        queryFn: () => listTemplates(projectKey),
    });

    const applyTemplate = (templateId) => {
        const t = templates.find((x) => x.id === Number(templateId));
        if (!t) return;
        setForm((prev) => ({
            ...prev,
            issueType: t.issueType || prev.issueType,
            priority: t.priority || prev.priority,
            description: t.bodyTemplate || prev.description,
        }));
    };

    const mut = useMutation({
        mutationFn: (body) => createIssue(projectKey, body),
        onSuccess: () => { toast.success("Issue created"); onDone(); },
        onError: (e) => toast.error(e.message),
    });
    return (
        <form
            onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-3 mb-4 space-y-2"
        >
            {templates.length > 0 && (
                <select
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) applyTemplate(e.target.value); }}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-2 py-1.5 text-sm"
                >
                    <option value="">Use template…</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            )}
            <input
                required
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm"
            />
            <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm"
                rows={2}
            />
            <div className="flex gap-2 items-center">
                <select
                    value={form.issueType}
                    onChange={(e) => setForm({ ...form, issueType: e.target.value })}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-2 py-1.5 text-sm"
                >
                    {["TASK", "STORY", "BUG", "EPIC"].map((t) => <option key={t}>{t}</option>)}
                </select>
                <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-2 py-1.5 text-sm"
                >
                    {["LOW", "MEDIUM", "HIGH"].map((t) => <option key={t}>{t}</option>)}
                </select>
                <button
                    disabled={mut.isPending}
                    className="ml-auto px-3 py-1.5 bg-slate-900 text-white text-sm rounded hover:bg-slate-800 disabled:opacity-50"
                >
                    {mut.isPending ? "Creating…" : "Create"}
                </button>
            </div>
            {mut.error && <div className="text-sm text-red-600">{mut.error.message}</div>}
        </form>
    );
}
