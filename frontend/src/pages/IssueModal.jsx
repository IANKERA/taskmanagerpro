import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getIssue, updateIssue, deleteIssue, createIssue, listComments, addComment, editComment, deleteComment,
    listActivity, setLabels, toggleWatch, moveIssue,
    listLinks, createLink, deleteLinkApi,
    getTimeLogs, logTime, deleteTimeLog,
} from "../api/issues";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { listAttachments, uploadAttachment, downloadAttachment, deleteAttachment } from "../api/attachments";
import { listSprints } from "../api/sprints";
import { subtasks } from "../api/search";
import { listLabels, listMembers } from "../api/projects";
import Markdown from "../components/Markdown";
import MentionTextarea from "../components/MentionTextarea";
import AssigneeSelect from "../components/AssigneeSelect";
import { getFieldValues, setFieldValues } from "../api/customFields";
import { useRecentIssues } from "../hooks/useRecentIssues";

const STATUS = ["PENDING", "IN_PROGRESS", "DONE"];
const PRIO   = ["LOW", "MEDIUM", "HIGH"];
const TYPES  = ["TASK", "STORY", "BUG", "EPIC"];

export default function IssueModal() {
    const { projectKey, issueKey } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const close = () => navigate(`/projects/${projectKey}/board`);

    const { trackIssue } = useRecentIssues();
    const { data: issue, isLoading } = useQuery({
        queryKey: ["issue", issueKey],
        queryFn: () => getIssue(issueKey),
    });

    // Track recently viewed
    useEffect(() => {
        if (issue) trackIssue(issue);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [issue?.issueKey]);

    const updateMut = useMutation({
        mutationFn: (body) => updateIssue(issueKey, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["issue", issueKey] });
            qc.invalidateQueries({ queryKey: ["issues", projectKey] });
            qc.invalidateQueries({ queryKey: ["activity", issueKey] });
        },
        onError: (e) => toast.error(e.message),
    });

    const deleteMut = useMutation({
        mutationFn: () => deleteIssue(issueKey),
        onSuccess: () => {
            toast.success("Issue deleted");
            qc.invalidateQueries({ queryKey: ["issues", projectKey] });
            qc.invalidateQueries({ queryKey: ["backlog", projectKey] });
            close();
        },
        onError: (e) => toast.error(e.message),
    });

    const cloneMut = useMutation({
        mutationFn: () => createIssue(projectKey, {
            title: `[Clone] ${issue.title}`,
            description: issue.description,
            issueType: issue.issueType,
            priority: issue.priority,
            assigneeUsername: issue.assigneeUsername || undefined,
            dueDate: issue.dueDate || undefined,
            storyPoints: issue.storyPoints || undefined,
        }),
        onSuccess: (newIssue) => {
            toast.success(`Cloned as ${newIssue.issueKey}`);
            qc.invalidateQueries({ queryKey: ["issues", projectKey] });
            qc.invalidateQueries({ queryKey: ["backlog", projectKey] });
            navigate(`/projects/${projectKey}/board/${newIssue.issueKey}`);
        },
        onError: (e) => toast.error(e.message),
    });

    const [moveTarget, setMoveTarget] = useState("");
    const [showMove, setShowMove] = useState(false);
    const moveMut = useMutation({
        mutationFn: (targetKey) => moveIssue(issueKey, targetKey),
        onSuccess: (moved) => {
            toast.success(`Moved to ${moved.issueKey}`);
            qc.invalidateQueries({ queryKey: ["issues"] });
            navigate(`/projects/${moved.projectKey}/board/${moved.issueKey}`);
        },
        onError: (e) => toast.error(e.message),
    });

    // Close on Esc.
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && close();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            onClick={close}
            className="fixed inset-0 bg-slate-900/50 z-50 flex items-start justify-center p-6 overflow-y-auto"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full my-8"
            >
                {isLoading || !issue ? (
                    <div className="p-8 text-slate-500">Loading…</div>
                ) : (
                    <>
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-3">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded">
                                    {issue.issueKey}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{issue.issueType}</span>
                            </div>
                            <button onClick={close} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-2xl leading-none">
                                ×
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5">
                            <div className="md:col-span-2 space-y-4">
                                <EditableTitle issue={issue} onSave={(v) => updateMut.mutate({ title: v })} />
                                <EditableDescription issue={issue} onSave={(v) => updateMut.mutate({ description: v })} />
                                <SubtasksSection issueKey={issueKey} projectKey={projectKey} />
                                <LinksSection issueKey={issueKey} projectKey={projectKey} />
                                <AttachmentsSection issueKey={issueKey} />
                                <CommentsSection issueKey={issueKey} projectKey={projectKey} />
                                <ActivitySection issueKey={issueKey} />
                            </div>
                            <aside className="space-y-4">
                                <SidebarField label="Status">
                                    <select
                                        value={issue.status}
                                        onChange={(e) => updateMut.mutate({ status: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1.5 text-sm"
                                    >
                                        {STATUS.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                </SidebarField>
                                <SidebarField label="Priority">
                                    <select
                                        value={issue.priority}
                                        onChange={(e) => updateMut.mutate({ priority: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1.5 text-sm"
                                    >
                                        {PRIO.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                </SidebarField>
                                <SidebarField label="Type">
                                    <select
                                        value={issue.issueType}
                                        onChange={(e) => updateMut.mutate({ issueType: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1.5 text-sm"
                                    >
                                        {TYPES.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                </SidebarField>
                                <AssigneeSelect
                                    projectKey={projectKey}
                                    value={issue.assigneeUsername || ""}
                                    onChange={(assigneeUsername) => {
                                        if ((issue.assigneeUsername || "") !== assigneeUsername) {
                                            updateMut.mutate({ assigneeUsername });
                                        }
                                    }}
                                />
                                <SidebarField label="Reporter">
                                    <div className="text-sm text-slate-700 dark:text-slate-300">{issue.reporterUsername}</div>
                                </SidebarField>
                                <SidebarField label="Story points">
                                    <input
                                        type="number"
                                        min={0}
                                        defaultValue={issue.storyPoints ?? ""}
                                        onBlur={(e) => {
                                            const v = e.target.value === "" ? 0 : Number(e.target.value);
                                            if (v === (issue.storyPoints ?? 0)) return;
                                            updateMut.mutate({ storyPoints: v });
                                        }}
                                        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1.5 text-sm"
                                    />
                                </SidebarField>
                                <SidebarField label="Time tracking">
                                    <TimeTrackingSection issueKey={issueKey} issue={issue} onUpdateEstimate={(v) => updateMut.mutate({ estimateMinutes: v })} />
                                </SidebarField>
                                <SidebarField label="Labels">
                                    <LabelPicker issue={issue} projectKey={projectKey} />
                                </SidebarField>
                                <SidebarField label="Watchers">
                                    <WatchToggle issueKey={issueKey} />
                                </SidebarField>
                                <SidebarField label="Due date">
                                    <input
                                        type="date"
                                        defaultValue={issue.dueDate || ""}
                                        onChange={(e) => {
                                            if (e.target.value !== (issue.dueDate || "")) {
                                                updateMut.mutate({ dueDate: e.target.value || null });
                                            }
                                        }}
                                        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1.5 text-sm"
                                    />
                                </SidebarField>
                                <SidebarField label="Sprint">
                                    <SprintPicker issue={issue} projectKey={projectKey} onUpdate={(sprintId) => updateMut.mutate({ sprintId })} />
                                </SidebarField>
                                <CustomFieldsSection issueKey={issueKey} projectKey={projectKey} />
                                {issue.parentIssueKey && (
                                    <SidebarField label="Parent">
                                        <button
                                            onClick={() => navigate(`/projects/${projectKey}/board/${issue.parentIssueKey}`)}
                                            className="text-sm text-blue-600 hover:underline font-mono"
                                        >
                                            {issue.parentIssueKey}
                                        </button>
                                    </SidebarField>
                                )}
                                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                    <button
                                        onClick={() => cloneMut.mutate()}
                                        disabled={cloneMut.isPending}
                                        className="w-full px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                                    >
                                        {cloneMut.isPending ? "Cloning…" : "Clone issue"}
                                    </button>
                                    {!showMove ? (
                                        <button
                                            onClick={() => setShowMove(true)}
                                            className="w-full px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                                        >
                                            Move to project
                                        </button>
                                    ) : (
                                        <form onSubmit={(e) => { e.preventDefault(); if (moveTarget.trim()) moveMut.mutate(moveTarget.trim().toUpperCase()); }} className="flex gap-1">
                                            <input
                                                autoFocus
                                                placeholder="Project key"
                                                value={moveTarget}
                                                onChange={(e) => setMoveTarget(e.target.value.toUpperCase())}
                                                className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1 text-xs font-mono"
                                            />
                                            <button disabled={moveMut.isPending} className="px-2 py-1 bg-slate-900 dark:bg-slate-600 text-white text-xs rounded">Go</button>
                                            <button type="button" onClick={() => setShowMove(false)} className="px-2 py-1 text-xs text-slate-500">✕</button>
                                        </form>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (confirm(`Delete ${issue.issueKey}? This cannot be undone.`)) {
                                                deleteMut.mutate();
                                            }
                                        }}
                                        disabled={deleteMut.isPending}
                                        className="w-full px-3 py-1.5 text-sm text-red-600 border border-red-200 dark:border-red-900 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        {deleteMut.isPending ? "Deleting…" : "Delete issue"}
                                    </button>
                                </div>
                                {updateMut.error && (
                                    <div className="text-xs text-red-600">{updateMut.error.message}</div>
                                )}
                            </aside>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function SidebarField({ label, children }) {
    return (
        <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                {label}
            </div>
            {children}
        </div>
    );
}

function EditableTitle({ issue, onSave }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(issue.title);
    return editing ? (
        <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => { setEditing(false); if (val !== issue.title) onSave(val); }}
            onKeyDown={(e) => {
                if (e.key === "Enter") { e.target.blur(); }
                if (e.key === "Escape") { setVal(issue.title); setEditing(false); }
            }}
            className="w-full text-xl font-semibold border-b-2 border-slate-300 dark:border-slate-600 focus:border-slate-900 dark:focus:border-slate-400 outline-none dark:bg-slate-800 dark:text-white"
        />
    ) : (
        <h2
            onClick={() => setEditing(true)}
            className="text-xl font-semibold text-slate-900 dark:text-white cursor-text hover:bg-slate-50 dark:hover:bg-slate-700 -mx-2 px-2 py-1 rounded"
        >
            {issue.title}
        </h2>
    );
}

function EditableDescription({ issue, onSave }) {
    const [val, setVal] = useState(issue.description || "");
    const [editing, setEditing] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    return (
        <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Description
            </div>
            {editing ? (
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <button
                            onClick={() => setShowPreview((p) => !p)}
                            className={`text-[10px] px-2 py-0.5 rounded ${showPreview ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}
                        >
                            {showPreview ? "Hide preview" : "Show preview"}
                        </button>
                        <span className="text-[10px] text-slate-400">Supports Markdown</span>
                    </div>
                    <div className={showPreview ? "grid grid-cols-2 gap-2" : ""}>
                        <textarea
                            autoFocus
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded p-2 text-sm font-mono"
                            rows={8}
                        />
                        {showPreview && (
                            <div className="border border-slate-200 dark:border-slate-600 rounded p-2 text-sm text-slate-700 dark:text-slate-300 overflow-y-auto max-h-[200px] bg-slate-50 dark:bg-slate-700/50">
                                {val.trim() ? <Markdown>{val}</Markdown> : <span className="text-slate-400 italic">Preview will appear here…</span>}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 mt-1">
                        <button
                            onClick={() => { setEditing(false); if (val !== (issue.description || "")) onSave(val); }}
                            className="px-3 py-1 bg-slate-900 dark:bg-slate-600 text-white text-xs rounded hover:bg-slate-800 dark:hover:bg-slate-500"
                        >
                            Save
                        </button>
                        <button
                            onClick={() => { setVal(issue.description || ""); setEditing(false); }}
                            className="px-3 py-1 bg-slate-100 text-slate-700 text-xs rounded hover:bg-slate-200"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => setEditing(true)}
                    className="text-sm text-slate-700 dark:text-slate-300 cursor-text hover:bg-slate-50 dark:hover:bg-slate-700 -mx-2 px-2 py-2 rounded min-h-[3em]"
                >
                    {issue.description ? <Markdown>{issue.description}</Markdown> : <span className="text-slate-400">Add a description…</span>}
                </div>
            )}
        </div>
    );
}

function SubtasksSection({ issueKey, projectKey }) {
    const navigate = useNavigate();
    const { data: children = [] } = useQuery({
        queryKey: ["subtasks", issueKey],
        queryFn: () => subtasks(issueKey),
    });
    if (children.length === 0) return null;

    const STATUS_DOT = { PENDING: "bg-slate-400", IN_PROGRESS: "bg-blue-500", DONE: "bg-green-500" };

    return (
        <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Subtasks ({children.length})
            </div>
            <div className="space-y-1">
                {children.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => navigate(`/projects/${projectKey}/board/${c.issueKey}`)}
                        className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
                    >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[c.status] || "bg-slate-400"}`} />
                        <span className="font-mono text-xs text-slate-500">{c.issueKey}</span>
                        <span className="truncate text-slate-800">{c.title}</span>
                        <span className="ml-auto text-xs text-slate-400">{c.assigneeUsername || "Unassigned"}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

const LINK_TYPES = [
    { value: "BLOCKS", label: "blocks" },
    { value: "IS_BLOCKED_BY", label: "is blocked by" },
    { value: "RELATES_TO", label: "relates to" },
    { value: "DUPLICATES", label: "duplicates" },
    { value: "IS_DUPLICATED_BY", label: "is duplicated by" },
];

const LINK_STATUS_DOT = { PENDING: "bg-slate-400", IN_PROGRESS: "bg-blue-500", DONE: "bg-green-500" };

function LinksSection({ issueKey, projectKey }) {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState({ targetIssueKey: "", linkType: "RELATES_TO" });

    const { data: links = [] } = useQuery({
        queryKey: ["links", issueKey],
        queryFn: () => listLinks(issueKey),
    });

    const addMut = useMutation({
        mutationFn: (body) => createLink(issueKey, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["links", issueKey] });
            setAdding(false);
            setForm({ targetIssueKey: "", linkType: "RELATES_TO" });
            toast.success("Link added");
        },
        onError: (e) => toast.error(e.message),
    });

    const delMut = useMutation({
        mutationFn: (id) => deleteLinkApi(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["links", issueKey] });
            toast.success("Link removed");
        },
        onError: (e) => toast.error(e.message),
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Links ({links.length})
                </div>
                <button
                    onClick={() => setAdding((v) => !v)}
                    className="text-xs text-slate-500 hover:text-slate-900"
                >
                    {adding ? "Cancel" : "+ Link"}
                </button>
            </div>

            {adding && (
                <form
                    onSubmit={(e) => { e.preventDefault(); addMut.mutate(form); }}
                    className="flex gap-2 items-center mb-3"
                >
                    <select
                        value={form.linkType}
                        onChange={(e) => setForm({ ...form, linkType: e.target.value })}
                        className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1 text-xs"
                    >
                        {LINK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input
                        required
                        placeholder="Issue key (e.g. DEMO-3)"
                        value={form.targetIssueKey}
                        onChange={(e) => setForm({ ...form, targetIssueKey: e.target.value.toUpperCase() })}
                        className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1 text-xs flex-1"
                    />
                    <button
                        disabled={addMut.isPending}
                        className="px-2 py-1 bg-slate-900 text-white text-xs rounded hover:bg-slate-800 disabled:opacity-50"
                    >
                        Add
                    </button>
                </form>
            )}

            {links.length > 0 && (
                <div className="space-y-1">
                    {links.map((l) => (
                        <div key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-sm group">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${LINK_STATUS_DOT[l.status] || "bg-slate-400"}`} />
                            <span className="text-xs text-slate-500 italic shrink-0">{l.linkLabel}</span>
                            <button
                                onClick={() => navigate(`/projects/${projectKey}/board/${l.issueKey}`)}
                                className="font-mono text-xs text-blue-600 hover:underline shrink-0"
                            >
                                {l.issueKey}
                            </button>
                            <span className="truncate text-slate-700">{l.title}</span>
                            <button
                                onClick={() => delMut.mutate(l.id)}
                                className="ml-auto text-slate-400 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AttachmentsSection({ issueKey }) {
    const qc = useQueryClient();
    const { data: attachments = [] } = useQuery({
        queryKey: ["attachments", issueKey],
        queryFn: () => listAttachments(issueKey),
    });
    const uploadMut = useMutation({
        mutationFn: (file) => uploadAttachment(issueKey, file),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["attachments", issueKey] }); toast.success("File attached"); },
        onError: (e) => toast.error(e.message),
    });
    const deleteMut = useMutation({
        mutationFn: (id) => deleteAttachment(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["attachments", issueKey] }); toast.success("Attachment deleted"); },
        onError: (e) => toast.error(e.message),
    });

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    return (
        <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Attachments ({attachments.length})
            </div>
            {attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                    {attachments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded p-2 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-slate-400 text-base">📎</span>
                                <button
                                    onClick={() => downloadAttachment(a.id, a.filename)}
                                    className="text-slate-800 hover:text-blue-600 hover:underline truncate"
                                    title={a.filename}
                                >
                                    {a.filename}
                                </button>
                                <span className="text-xs text-slate-400 shrink-0">{formatSize(a.sizeBytes)}</span>
                            </div>
                            <button
                                onClick={() => deleteMut.mutate(a.id)}
                                className="text-slate-400 hover:text-red-600 text-xs ml-2 shrink-0"
                                title="Delete"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer">
                {uploadMut.isPending ? "Uploading…" : "Attach file"}
                <input
                    type="file"
                    className="hidden"
                    disabled={uploadMut.isPending}
                    onChange={(e) => {
                        if (e.target.files[0]) {
                            uploadMut.mutate(e.target.files[0]);
                            e.target.value = "";
                        }
                    }}
                />
            </label>
            {uploadMut.error && (
                <div className="text-xs text-red-600 mt-1">{uploadMut.error.message}</div>
            )}
        </div>
    );
}

function CommentsSection({ issueKey, projectKey }) {
    const qc = useQueryClient();
    const { user } = useAuth();
    const [draft, setDraft] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editDraft, setEditDraft] = useState("");

    const { data: members = [] } = useQuery({
        queryKey: ["members", projectKey],
        queryFn: () => listMembers(projectKey),
        enabled: !!projectKey,
    });
    const memberUsernames = members.map((m) => m.username);

    const { data: comments = [] } = useQuery({
        queryKey: ["comments", issueKey],
        queryFn: () => listComments(issueKey),
    });

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ["comments", issueKey] });
        qc.invalidateQueries({ queryKey: ["activity", issueKey] });
    };

    const addMut = useMutation({
        mutationFn: (body) => addComment(issueKey, body),
        onSuccess: () => { setDraft(""); invalidate(); },
        onError: (e) => toast.error(e.message),
    });
    const editMut = useMutation({
        mutationFn: ({ id, body }) => editComment(issueKey, id, body),
        onSuccess: () => { setEditingId(null); invalidate(); toast.success("Comment updated"); },
        onError: (e) => toast.error(e.message),
    });
    const deleteMut = useMutation({
        mutationFn: (id) => deleteComment(issueKey, id),
        onSuccess: () => { invalidate(); toast.success("Comment deleted"); },
        onError: (e) => toast.error(e.message),
    });

    return (
        <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Comments ({comments.length})
            </div>
            <div className="space-y-3 mb-3">
                {comments.map((c) => (
                    <div key={c.id} className="bg-slate-50 dark:bg-slate-700/50 rounded p-3 group">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <div>
                                <span className="font-medium text-slate-700">{c.authorUsername}</span>
                                {" · "}
                                {new Date(c.createdAt).toLocaleString()}
                            </div>
                            {user?.username === c.authorUsername && editingId !== c.id && (
                                <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                                    <button
                                        onClick={() => { setEditingId(c.id); setEditDraft(c.body); }}
                                        className="text-slate-400 hover:text-blue-600"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => { if (confirm("Delete this comment?")) deleteMut.mutate(c.id); }}
                                        className="text-slate-400 hover:text-red-600"
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                        {editingId === c.id ? (
                            <form onSubmit={(e) => { e.preventDefault(); editMut.mutate({ id: c.id, body: editDraft }); }}>
                                <textarea
                                    value={editDraft}
                                    onChange={(e) => setEditDraft(e.target.value)}
                                    className="w-full border border-slate-300 rounded p-2 text-sm mb-2"
                                    rows={3}
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        disabled={editMut.isPending || !editDraft.trim()}
                                        className="px-3 py-1 bg-slate-900 dark:bg-slate-600 text-white text-xs rounded hover:bg-slate-800 dark:hover:bg-slate-500 disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                        className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <Markdown>{c.body}</Markdown>
                        )}
                    </div>
                ))}
            </div>
            <form
                onSubmit={(e) => { e.preventDefault(); if (draft.trim()) addMut.mutate(draft); }}
                className="space-y-2"
            >
                <MentionTextarea
                    value={draft}
                    onChange={setDraft}
                    users={memberUsernames}
                    placeholder="Add a comment… (type @ to mention)"
                    className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded p-2 text-sm"
                    rows={3}
                />
                <button
                    disabled={addMut.isPending || !draft.trim()}
                    className="px-3 py-1.5 bg-slate-900 dark:bg-slate-600 text-white text-sm rounded hover:bg-slate-800 dark:hover:bg-slate-500 disabled:opacity-50"
                >
                    {addMut.isPending ? "Posting…" : "Comment"}
                </button>
            </form>
        </div>
    );
}

function ActivitySection({ issueKey }) {
    const { data: activity = [] } = useQuery({
        queryKey: ["activity", issueKey],
        queryFn: () => listActivity(issueKey),
    });
    if (activity.length === 0) return null;
    return (
        <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Activity
            </div>
            <ul className="text-xs text-slate-600 space-y-1">
                {activity.slice().reverse().map((a) => (
                    <li key={a.id}>
                        <span className="font-medium text-slate-800">{a.actorUsername || "system"}</span>
                        {" "}
                        {renderActivity(a)}
                        <span className="text-slate-400"> · {new Date(a.at).toLocaleString()}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function SprintPicker({ issue, projectKey, onUpdate }) {
    const { data: sprints = [] } = useQuery({
        queryKey: ["sprints", projectKey],
        queryFn: () => listSprints(projectKey),
    });
    const activeSprints = sprints.filter((s) => s.state !== "CLOSED");
    return (
        <select
            value={issue.sprintId ?? -1}
            onChange={(e) => onUpdate(Number(e.target.value))}
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1.5 text-sm"
        >
            <option value={-1}>Backlog (no sprint)</option>
            {activeSprints.map((s) => (
                <option key={s.id} value={s.id}>
                    {s.name} ({s.state})
                </option>
            ))}
        </select>
    );
}

function LabelPicker({ issue, projectKey }) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const { data: available = [] } = useQuery({
        queryKey: ["labels", projectKey],
        queryFn: () => listLabels(projectKey),
        enabled: open,
    });
    const mut = useMutation({
        mutationFn: (ids) => setLabels(issue.issueKey, ids),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["issue", issue.issueKey] });
            qc.invalidateQueries({ queryKey: ["issues", projectKey] });
            qc.invalidateQueries({ queryKey: ["activity", issue.issueKey] });
        },
    });
    const selectedIds = new Set((issue.labels || []).map((l) => l.id));
    const toggle = (id) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        mut.mutate([...next]);
    };
    return (
        <div>
            <div className="flex flex-wrap gap-1 mb-2 min-h-[1.5rem]">
                {(issue.labels || []).length === 0 ? (
                    <span className="text-xs text-slate-400">None</span>
                ) : (
                    issue.labels.map((l) => (
                        <span
                            key={l.id}
                            className="text-[10px] px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: l.color }}
                        >
                            {l.name}
                        </span>
                    ))
                )}
            </div>
            <button
                onClick={() => setOpen((v) => !v)}
                className="text-xs text-slate-600 hover:text-slate-900 underline"
            >
                {open ? "Done" : "Edit"}
            </button>
            {open && (
                <div className="mt-2 border border-slate-200 dark:border-slate-600 rounded p-2 max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-700">
                    {available.length === 0 ? (
                        <div className="text-xs text-slate-500">
                            No labels yet. Create them via the API for now.
                        </div>
                    ) : (
                        available.map((l) => (
                            <label key={l.id} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(l.id)}
                                    onChange={() => toggle(l.id)}
                                />
                                <span
                                    className="px-1.5 py-0.5 rounded text-white text-[10px]"
                                    style={{ backgroundColor: l.color }}
                                >
                                    {l.name}
                                </span>
                            </label>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

function WatchToggle({ issueKey }) {
    const qc = useQueryClient();
    const { user } = useAuth();
    const { data: issue } = useQuery({ queryKey: ["issue", issueKey], queryFn: () => getIssue(issueKey) });
    const watchers = issue?.watcherUsernames || [];
    const watching = watchers.includes(user?.username);
    const mut = useMutation({
        mutationFn: () => toggleWatch(issueKey),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["issue", issueKey] });
        },
    });
    return (
        <div>
            <button
                onClick={() => mut.mutate()}
                disabled={mut.isPending}
                className={
                    "px-3 py-1.5 text-sm rounded w-full " +
                    (watching
                        ? "bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500"
                        : "bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700")
                }
            >
                {watching ? "★ Watching" : "☆ Watch"}
            </button>
            {watchers.length > 0 && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    {watchers.length} watcher{watchers.length === 1 ? "" : "s"}:{" "}
                    {watchers.join(", ")}
                </div>
            )}
        </div>
    );
}

function CustomFieldsSection({ issueKey }) {
    const qc = useQueryClient();
    const { data: fields = [] } = useQuery({
        queryKey: ["customFields", issueKey],
        queryFn: () => getFieldValues(issueKey),
    });

    const saveMut = useMutation({
        mutationFn: (vals) => setFieldValues(issueKey, vals),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["customFields", issueKey] }),
    });

    if (fields.length === 0) return null;

    const handleChange = (fieldId, value) => {
        saveMut.mutate([{ fieldId, value: value || null }]);
    };

    return (
        <>
            {fields.map((f) => (
                <SidebarField key={f.fieldId} label={f.name}>
                    {f.fieldType === "SELECT" ? (
                        <select
                            value={f.value || ""}
                            onChange={(e) => handleChange(f.fieldId, e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1.5 text-sm"
                        >
                            <option value="">—</option>
                            {(JSON.parse(f.options || "[]")).map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : f.fieldType === "NUMBER" ? (
                        <input
                            type="number"
                            defaultValue={f.value || ""}
                            onBlur={(e) => {
                                if (e.target.value !== (f.value || ""))
                                    handleChange(f.fieldId, e.target.value);
                            }}
                            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1.5 text-sm"
                        />
                    ) : f.fieldType === "DATE" ? (
                        <input
                            type="date"
                            defaultValue={f.value || ""}
                            onChange={(e) => handleChange(f.fieldId, e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1.5 text-sm"
                        />
                    ) : (
                        <input
                            type="text"
                            defaultValue={f.value || ""}
                            placeholder={`Enter ${f.name}…`}
                            onBlur={(e) => {
                                if (e.target.value !== (f.value || ""))
                                    handleChange(f.fieldId, e.target.value);
                            }}
                            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1.5 text-sm"
                        />
                    )}
                </SidebarField>
            ))}
        </>
    );
}

function formatMinutes(m) {
    if (!m) return "0m";
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? (min > 0 ? `${h}h ${min}m` : `${h}h`) : `${min}m`;
}

function TimeTrackingSection({ issueKey, issue, onUpdateEstimate }) {
    const qc = useQueryClient();
    const [logging, setLogging] = useState(false);
    const [form, setForm] = useState({ hours: "", mins: "", description: "" });

    const { data: timeData } = useQuery({
        queryKey: ["timeLogs", issueKey],
        queryFn: () => getTimeLogs(issueKey),
    });

    const totalMinutes = timeData?.totalMinutes || 0;
    const estimate = issue.estimateMinutes || 0;
    const logs = timeData?.logs || [];
    const pct = estimate > 0 ? Math.min(100, Math.round((totalMinutes / estimate) * 100)) : 0;

    const logMut = useMutation({
        mutationFn: (body) => logTime(issueKey, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["timeLogs", issueKey] });
            setLogging(false);
            setForm({ hours: "", mins: "", description: "" });
            toast.success("Time logged");
        },
        onError: (e) => toast.error(e.message),
    });

    const delMut = useMutation({
        mutationFn: (id) => deleteTimeLog(issueKey, id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["timeLogs", issueKey] });
            toast.success("Log removed");
        },
    });

    const handleLog = (e) => {
        e.preventDefault();
        const totalMins = (Number(form.hours) || 0) * 60 + (Number(form.mins) || 0);
        if (totalMins <= 0) { toast.error("Enter a positive time"); return; }
        logMut.mutate({ minutes: totalMins, description: form.description || null });
    };

    return (
        <div className="space-y-2">
            {/* Progress bar */}
            {estimate > 0 && (
                <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>{formatMinutes(totalMinutes)} logged</span>
                        <span>{formatMinutes(estimate)} est.</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                        <div
                            className={`h-1.5 rounded-full transition-all ${pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-blue-500"}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                    </div>
                </div>
            )}
            {estimate === 0 && totalMinutes > 0 && (
                <div className="text-xs text-slate-600">{formatMinutes(totalMinutes)} logged</div>
            )}

            {/* Estimate input */}
            <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500">Est:</span>
                <input
                    type="number"
                    min={0}
                    placeholder="min"
                    defaultValue={estimate || ""}
                    onBlur={(e) => {
                        const v = e.target.value === "" ? 0 : Number(e.target.value);
                        if (v !== estimate) onUpdateEstimate(v);
                    }}
                    className="w-16 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-1.5 py-0.5 text-xs"
                />
                <span className="text-[10px] text-slate-400">min</span>
            </div>

            {/* Log time */}
            {logging ? (
                <form onSubmit={handleLog} className="space-y-1">
                    <div className="flex gap-1">
                        <input type="number" min={0} placeholder="h" value={form.hours}
                            onChange={(e) => setForm({ ...form, hours: e.target.value })}
                            className="w-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-1.5 py-0.5 text-xs" />
                        <span className="text-xs text-slate-400 self-center">h</span>
                        <input type="number" min={0} max={59} placeholder="m" value={form.mins}
                            onChange={(e) => setForm({ ...form, mins: e.target.value })}
                            className="w-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-1.5 py-0.5 text-xs" />
                        <span className="text-xs text-slate-400 self-center">m</span>
                    </div>
                    <input placeholder="What did you work on?" value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-1.5 py-0.5 text-xs" />
                    <div className="flex gap-1">
                        <button disabled={logMut.isPending}
                            className="px-2 py-0.5 bg-slate-900 dark:bg-slate-600 text-white text-xs rounded hover:bg-slate-800 dark:hover:bg-slate-500 disabled:opacity-50">
                            Log
                        </button>
                        <button type="button" onClick={() => setLogging(false)}
                            className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 rounded">
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <button onClick={() => setLogging(true)}
                    className="text-xs text-slate-600 hover:text-slate-900 underline">
                    + Log time
                </button>
            )}

            {/* Recent logs */}
            {logs.length > 0 && (
                <div className="space-y-0.5 max-h-24 overflow-y-auto">
                    {logs.slice(0, 5).map((l) => (
                        <div key={l.id} className="flex items-center text-[10px] text-slate-500 group gap-1">
                            <span className="font-medium text-slate-700">{formatMinutes(l.minutes)}</span>
                            <span className="truncate">{l.description || l.username}</span>
                            <button onClick={() => delMut.mutate(l.id)}
                                className="ml-auto opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 shrink-0">
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function renderActivity(a) {
    switch (a.activityType) {
        case "CREATED":       return "created this issue";
        case "COMMENTED":     return "commented";
        case "ASSIGNED":      return <span>assigned to <strong className="text-slate-900 dark:text-white">{a.newValue}</strong></span>;
        case "UNASSIGNED":    return "unassigned";
        case "FIELD_CHANGED": return (
            <span className="inline-flex items-center gap-1 flex-wrap">
                <span>changed <strong className="text-slate-700 dark:text-slate-300">{a.field}</strong></span>
                <span className="inline-flex items-center gap-1">
                    {a.oldValue && (
                        <span className="line-through text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded text-[11px]">
                            {a.oldValue}
                        </span>
                    )}
                    <span className="text-slate-400">→</span>
                    <span className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded text-[11px] font-medium">
                        {a.newValue ?? "—"}
                    </span>
                </span>
            </span>
        );
        case "DELETED": return <span className="text-red-600">deleted this issue</span>;
        default:              return a.activityType;
    }
}
