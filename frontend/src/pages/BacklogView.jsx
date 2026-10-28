import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    DndContext, PointerSensor, useSensor, useSensors, closestCenter,
    DragOverlay,
} from "@dnd-kit/core";
import {
    SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import toast from "react-hot-toast";
import api from "../api/client";
import { createIssue, bulkUpdateIssues, reorderIssues } from "../api/issues";
import { listSprints } from "../api/sprints";
import IssueCard from "../components/board/IssueCard";
import AssigneeSelect from "../components/AssigneeSelect";

export default function BacklogView() {
    const { projectKey } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [creating, setCreating] = useState(false);
    const [selected, setSelected] = useState(new Set());

    const { data = [], isLoading } = useQuery({
        queryKey: ["backlog", projectKey],
        queryFn: () => api.get(`/api/projects/${projectKey}/backlog`).then((r) => r.data),
    });

    const { data: sprints = [] } = useQuery({
        queryKey: ["sprints", projectKey],
        queryFn: () => listSprints(projectKey),
    });

    const activeSprints = sprints.filter((s) => s.state !== "CLOSED");

    const invalidateAll = () => {
        qc.invalidateQueries({ queryKey: ["backlog", projectKey] });
        qc.invalidateQueries({ queryKey: ["issues", projectKey] });
    };

    const bulkMut = useMutation({
        mutationFn: (body) => bulkUpdateIssues(projectKey, body),
        onSuccess: (_, vars) => {
            invalidateAll();
            setSelected(new Set());
            toast.success(vars.delete ? `Deleted ${vars.issueKeys.length} issue(s)` : `Updated ${vars.issueKeys.length} issue(s)`);
        },
        onError: (e) => toast.error(e.message),
    });

    const toggleSelect = (key) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === data.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(data.map((i) => i.issueKey)));
        }
    };

    const doBulk = (patch) => {
        bulkMut.mutate({ issueKeys: [...selected], ...patch });
    };

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    const [activeId, setActiveId] = useState(null);

    const reorderMut = useMutation({
        mutationFn: (keys) => reorderIssues(projectKey, keys),
        onError: () => toast.error("Reorder failed"),
    });

    const handleDragEnd = useCallback((event) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIdx = data.findIndex((i) => i.issueKey === active.id);
        const newIdx = data.findIndex((i) => i.issueKey === over.id);
        if (oldIdx < 0 || newIdx < 0) return;
        const reordered = arrayMove(data, oldIdx, newIdx);
        // Optimistic update
        qc.setQueryData(["backlog", projectKey], reordered);
        reorderMut.mutate(reordered.map((i) => i.issueKey));
    }, [data, projectKey, qc, reorderMut]);

    if (isLoading) return <div className="text-slate-500">Loading…</div>;

    return (
        <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                    {data.length} issue{data.length === 1 ? "" : "s"} not in any sprint
                </div>
                <button
                    onClick={() => setCreating((v) => !v)}
                    className="px-3 py-1.5 bg-slate-900 dark:bg-blue-600 text-white text-sm rounded hover:bg-slate-800 dark:hover:bg-blue-700"
                >
                    {creating ? "Cancel" : "+ Add to backlog"}
                </button>
            </div>

            {creating && <BacklogCreateForm projectKey={projectKey} onDone={() => {
                qc.invalidateQueries({ queryKey: ["backlog", projectKey] });
                setCreating(false);
            }} />}

            {/* Bulk action toolbar */}
            {selected.size > 0 && (
                <BulkToolbar
                    count={selected.size}
                    activeSprints={activeSprints}
                    onAction={doBulk}
                    onClear={() => setSelected(new Set())}
                    isPending={bulkMut.isPending}
                />
            )}

            {data.length === 0 && !creating ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-8 text-center text-slate-500 dark:text-slate-400">
                    Backlog is empty.
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(e) => setActiveId(e.active.id)}
                    onDragCancel={() => setActiveId(null)}
                    onDragEnd={handleDragEnd}
                >
                    <div className="space-y-1">
                        {/* Select all row */}
                        {data.length > 0 && (
                            <label className="flex items-center gap-2 px-3 py-1 text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded">
                                <input
                                    type="checkbox"
                                    checked={selected.size === data.length && data.length > 0}
                                    onChange={toggleAll}
                                    className="rounded border-slate-300 dark:border-slate-600"
                                />
                                Select all ({data.length}) — drag to reorder
                            </label>
                        )}
                        <SortableContext items={data.map((i) => i.issueKey)} strategy={verticalListSortingStrategy}>
                            {data.map((issue) => (
                                <SortableBacklogItem
                                    key={issue.issueKey}
                                    issue={issue}
                                    selected={selected.has(issue.issueKey)}
                                    onToggle={() => toggleSelect(issue.issueKey)}
                                    onNavigate={() => navigate(`/projects/${projectKey}/board/${issue.issueKey}`)}
                                    activeSprints={activeSprints}
                                    onMoveSprint={(sprintId) => bulkMut.mutate({ issueKeys: [issue.issueKey], sprintId })}
                                />
                            ))}
                        </SortableContext>
                    </div>
                    <DragOverlay>
                        {activeId && data.find((i) => i.issueKey === activeId) && (
                            <div className="opacity-90 rotate-1">
                                <IssueCard issue={data.find((i) => i.issueKey === activeId)} />
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            )}
        </div>
    );
}

/* ─── Sortable Backlog Item ─── */
function SortableBacklogItem({ issue, selected, onToggle, onNavigate, activeSprints, onMoveSprint }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.issueKey });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 rounded transition-colors ${selected ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
        >
            {/* Drag handle */}
            <div
                {...attributes}
                {...listeners}
                className="ml-1 cursor-grab text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 shrink-0 px-0.5"
                title="Drag to reorder"
            >
                ⠿
            </div>
            <input
                type="checkbox"
                checked={selected}
                onChange={onToggle}
                className="rounded border-slate-300 dark:border-slate-600 shrink-0"
            />
            <div className="flex-1 cursor-pointer" onClick={onNavigate}>
                <IssueCard issue={issue} />
            </div>
            {activeSprints.length > 0 && (
                <select
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) { onMoveSprint(Number(e.target.value)); e.target.value = ""; } }}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 shrink-0"
                    title="Move to sprint"
                >
                    <option value="" disabled>Move to…</option>
                    {activeSprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            )}
        </div>
    );
}

/* ─── Bulk Toolbar ─── */
function BulkToolbar({ count, activeSprints, onAction, onClear, isPending }) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    return (
        <div className="sticky top-0 z-20 bg-slate-900 dark:bg-slate-700 text-white rounded-lg px-4 py-2.5 mb-3 flex items-center gap-3 flex-wrap shadow-lg">
            <span className="text-sm font-medium">{count} selected</span>
            <div className="h-4 w-px bg-slate-600" />

            {/* Status */}
            <select
                defaultValue=""
                onChange={(e) => { if (e.target.value) onAction({ status: e.target.value }); e.target.value = ""; }}
                disabled={isPending}
                className="bg-slate-800 dark:bg-slate-600 border border-slate-600 dark:border-slate-500 rounded px-2 py-1 text-xs"
            >
                <option value="" disabled>Set status…</option>
                <option value="PENDING">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
            </select>

            {/* Priority */}
            <select
                defaultValue=""
                onChange={(e) => { if (e.target.value) onAction({ priority: e.target.value }); e.target.value = ""; }}
                disabled={isPending}
                className="bg-slate-800 dark:bg-slate-600 border border-slate-600 dark:border-slate-500 rounded px-2 py-1 text-xs"
            >
                <option value="" disabled>Set priority…</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
            </select>

            {/* Sprint */}
            {activeSprints.length > 0 && (
                <select
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) onAction({ sprintId: Number(e.target.value) }); e.target.value = ""; }}
                    disabled={isPending}
                    className="bg-slate-800 dark:bg-slate-600 border border-slate-600 dark:border-slate-500 rounded px-2 py-1 text-xs"
                >
                    <option value="" disabled>Move to sprint…</option>
                    {activeSprints.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            )}

            {/* Delete */}
            {!confirmDelete ? (
                <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={isPending}
                    className="ml-auto px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                >
                    Delete
                </button>
            ) : (
                <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-xs text-red-300">Delete {count}?</span>
                    <button
                        onClick={() => { onAction({ delete: true }); setConfirmDelete(false); }}
                        disabled={isPending}
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded font-bold"
                    >
                        Confirm
                    </button>
                    <button
                        onClick={() => setConfirmDelete(false)}
                        className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
                    >
                        Cancel
                    </button>
                </div>
            )}

            <button onClick={onClear} className="text-xs text-slate-400 hover:text-white px-1">✕</button>
        </div>
    );
}

function BacklogCreateForm({ projectKey, onDone }) {
    const [form, setForm] = useState({
        title: "",
        issueType: "TASK",
        priority: "MEDIUM",
        assigneeUsername: "",
    });
    const mut = useMutation({
        mutationFn: (body) => createIssue(projectKey, body),
        onSuccess: () => { toast.success("Issue created in backlog"); onDone(); },
        onError: (e) => toast.error(e.message),
    });
    return (
        <form
            onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-3 mb-4 space-y-2"
        >
            <input
                required
                autoFocus
                placeholder="Issue title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm"
            />
            <AssigneeSelect
                projectKey={projectKey}
                value={form.assigneeUsername}
                onChange={(assigneeUsername) => setForm({ ...form, assigneeUsername })}
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
                    className="ml-auto px-3 py-1.5 bg-slate-900 dark:bg-blue-600 text-white text-sm rounded hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50"
                >
                    {mut.isPending ? "Creating…" : "Create"}
                </button>
            </div>
        </form>
    );
}
