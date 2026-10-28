import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
    listMembers, addMember, listLabels, createLabel, deleteLabel,
    getProject, updateProject,
} from "../api/projects";
import { formatApiError } from "../api/errorMessage";
import { listFieldDefs, createFieldDef, deleteFieldDef } from "../api/customFields";
import { listTemplates, createTemplate, deleteTemplate } from "../api/templates";
import { listRules, createRule, toggleRule, deleteRule } from "../api/recurringRules";
import { listWorkflowRules, createWorkflowRule, toggleWorkflowRule, deleteWorkflowRule } from "../api/workflowRules";

const ROLES = ["VIEWER", "MEMBER", "ADMIN"];
const ROLE_STYLES = {
    ADMIN:  "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
    MEMBER: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
    VIEWER: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
};

export default function ProjectSettings() {
    const { projectKey } = useParams();

    return (
        <div className="max-w-3xl space-y-8">
            <ProjectDetailsSection projectKey={projectKey} />
            <MembersSection projectKey={projectKey} />
            <LabelsSection projectKey={projectKey} />
            <CustomFieldsSection projectKey={projectKey} />
            <TemplatesSection projectKey={projectKey} />
            <RecurringRulesSection projectKey={projectKey} />
            <WorkflowRulesSection projectKey={projectKey} />
            <ImportExportSection projectKey={projectKey} />
        </div>
    );
}

function ProjectDetailsSection({ projectKey }) {
    const qc = useQueryClient();
    const { data: project } = useQuery({
        queryKey: ["project", projectKey],
        queryFn: () => getProject(projectKey),
    });
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: "", description: "" });

    const startEdit = () => {
        setForm({ name: project?.name || "", description: project?.description || "" });
        setEditing(true);
    };

    const updateMut = useMutation({
        mutationFn: (body) => updateProject(projectKey, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["project", projectKey] });
            qc.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Project updated");
            setEditing(false);
        },
        onError: (e) => toast.error(e.message),
    });

    if (!project) return null;

    return (
        <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Project Details</h2>
            {editing ? (
                <form
                    onSubmit={(e) => { e.preventDefault(); updateMut.mutate(form); }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3"
                >
                    <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Name</label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm"
                            rows={3}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={updateMut.isPending}
                            className="px-3 py-1.5 bg-slate-900 dark:bg-blue-600 text-white text-sm rounded hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50"
                        >
                            {updateMut.isPending ? "Saving..." : "Save"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 rounded">{project.key}</span>
                            <span className="font-medium text-slate-900 dark:text-white">{project.name}</span>
                        </div>
                        <button
                            onClick={startEdit}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800"
                        >
                            Edit
                        </button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {project.description || "No description"}
                    </p>
                    {project.leadUsername && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            Lead: {project.leadUsername}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

function MembersSection({ projectKey }) {
    const qc = useQueryClient();
    const { data: members = [], isLoading } = useQuery({
        queryKey: ["members", projectKey],
        queryFn: () => listMembers(projectKey),
    });

    const [form, setForm] = useState({ username: "", projectRole: "MEMBER" });
    const addMut = useMutation({
        mutationFn: (body) => addMember(projectKey, body),
        onSuccess: () => {
            setForm({ username: "", projectRole: "MEMBER" });
            qc.invalidateQueries({ queryKey: ["members", projectKey] });
            toast.success("Member added");
        },
        onError: (e) => toast.error(formatApiError(e)),
    });

    return (
        <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Members</h2>

            <form
                onSubmit={(e) => { e.preventDefault(); if (form.username) addMut.mutate(form); }}
                className="flex gap-2 mb-4"
            >
                <input
                    placeholder="username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm"
                />
                <select
                    value={form.projectRole}
                    onChange={(e) => setForm({ ...form, projectRole: e.target.value })}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm"
                >
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
                <button
                    disabled={addMut.isPending || !form.username}
                    className="px-3 py-2 bg-slate-900 dark:bg-blue-600 text-white text-sm rounded hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50"
                >
                    {addMut.isPending ? "Adding…" : "Add / update"}
                </button>
            </form>
            {addMut.error && <div className="text-sm text-red-600 mb-3">{formatApiError(addMut.error)}</div>}

            {isLoading ? (
                <div className="text-slate-500">Loading…</div>
            ) : (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700">
                    {members.map((m) => (
                        <div key={m.userId} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900 dark:text-white">{m.username}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-500">
                                    Joined {new Date(m.joinedAt).toLocaleDateString()}
                                </div>
                            </div>
                            <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${ROLE_STYLES[m.projectRole]}`}>
                                {m.projectRole}
                            </span>
                        </div>
                    ))}
                    {members.length === 0 && (
                        <div className="p-4 text-sm text-slate-500">No members.</div>
                    )}
                </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
                Re-adding an existing member updates their role.
            </p>
        </section>
    );
}

function LabelsSection({ projectKey }) {
    const qc = useQueryClient();
    const { data: labels = [], isLoading } = useQuery({
        queryKey: ["labels", projectKey],
        queryFn: () => listLabels(projectKey),
    });

    const [form, setForm] = useState({ name: "", color: "#2563eb" });
    const createMut = useMutation({
        mutationFn: (body) => createLabel(projectKey, body),
        onSuccess: () => {
            setForm({ name: "", color: "#2563eb" });
            qc.invalidateQueries({ queryKey: ["labels", projectKey] });
            toast.success("Label created");
        },
        onError: (e) => toast.error(e.message),
    });
    const deleteMut = useMutation({
        mutationFn: (id) => deleteLabel(projectKey, id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["labels", projectKey] }); toast.success("Label deleted"); },
        onError: (e) => toast.error(e.message),
    });

    return (
        <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Labels</h2>

            <form
                onSubmit={(e) => { e.preventDefault(); if (form.name) createMut.mutate(form); }}
                className="flex gap-2 mb-4"
            >
                <input
                    placeholder="label name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
                />
                <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-12 h-10 border border-slate-300 rounded cursor-pointer"
                    title="Color"
                />
                <button
                    disabled={createMut.isPending || !form.name}
                    className="px-3 py-2 bg-slate-900 text-white text-sm rounded hover:bg-slate-800 disabled:opacity-50"
                >
                    {createMut.isPending ? "Creating…" : "Create"}
                </button>
            </form>
            {createMut.error && <div className="text-sm text-red-600 mb-3">{createMut.error.message}</div>}

            {isLoading ? (
                <div className="text-slate-500">Loading…</div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {labels.map((l) => (
                        <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                            <span
                                className="text-xs px-2 py-0.5 rounded text-white font-medium"
                                style={{ backgroundColor: l.color }}
                            >
                                {l.name}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{l.color}</span>
                            <button
                                onClick={() => {
                                    if (confirm(`Delete label "${l.name}"? It will be removed from all issues.`)) {
                                        deleteMut.mutate(l.id);
                                    }
                                }}
                                className="ml-auto text-xs text-slate-500 hover:text-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                    {labels.length === 0 && (
                        <div className="p-4 text-sm text-slate-500">No labels yet.</div>
                    )}
                </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
                Only project ADMINs can delete labels.
            </p>
        </section>
    );
}

const FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "SELECT"];

function CustomFieldsSection({ projectKey }) {
    const qc = useQueryClient();
    const { data: fields = [], isLoading } = useQuery({
        queryKey: ["customFieldDefs", projectKey],
        queryFn: () => listFieldDefs(projectKey),
    });

    const [form, setForm] = useState({ name: "", fieldType: "TEXT", options: "", required: false });
    const createMut = useMutation({
        mutationFn: (body) => createFieldDef(projectKey, {
            ...body,
            options: body.fieldType === "SELECT" && body.options
                ? JSON.stringify(body.options.split(",").map((s) => s.trim()).filter(Boolean))
                : null,
        }),
        onSuccess: () => {
            setForm({ name: "", fieldType: "TEXT", options: "", required: false });
            qc.invalidateQueries({ queryKey: ["customFieldDefs", projectKey] });
            toast.success("Custom field created");
        },
        onError: (e) => toast.error(e.message),
    });
    const deleteMut = useMutation({
        mutationFn: (id) => deleteFieldDef(projectKey, id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["customFieldDefs", projectKey] });
            toast.success("Field deleted");
        },
        onError: (e) => toast.error(e.message),
    });

    return (
        <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Custom Fields</h2>

            <form
                onSubmit={(e) => { e.preventDefault(); if (form.name) createMut.mutate(form); }}
                className="space-y-2 mb-4"
            >
                <div className="flex gap-2">
                    <input
                        placeholder="Field name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                    <select
                        value={form.fieldType}
                        onChange={(e) => setForm({ ...form, fieldType: e.target.value })}
                        className="border border-slate-300 rounded px-3 py-2 text-sm"
                    >
                        {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={form.required}
                            onChange={(e) => setForm({ ...form, required: e.target.checked })}
                        />
                        Required
                    </label>
                    <button
                        disabled={createMut.isPending || !form.name}
                        className="px-3 py-2 bg-slate-900 text-white text-sm rounded hover:bg-slate-800 disabled:opacity-50"
                    >
                        Add
                    </button>
                </div>
                {form.fieldType === "SELECT" && (
                    <input
                        placeholder="Options (comma-separated, e.g. S, M, L, XL)"
                        value={form.options}
                        onChange={(e) => setForm({ ...form, options: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                )}
            </form>

            {isLoading ? (
                <div className="text-slate-500">Loading…</div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {fields.map((f) => (
                        <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="text-sm font-medium text-slate-900">{f.name}</span>
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {f.fieldType}
                            </span>
                            {f.required && (
                                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                    Required
                                </span>
                            )}
                            {f.options && (
                                <span className="text-xs text-slate-400 truncate max-w-[200px]">
                                    {JSON.parse(f.options).join(", ")}
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    if (confirm(`Delete field "${f.name}"? All values will be lost.`)) {
                                        deleteMut.mutate(f.id);
                                    }
                                }}
                                className="ml-auto text-xs text-slate-500 hover:text-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                    {fields.length === 0 && (
                        <div className="p-4 text-sm text-slate-500">No custom fields yet. Add one above.</div>
                    )}
                </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
                Custom fields appear on all issues in this project. Only project ADMINs can manage them.
            </p>
        </section>
    );
}

const ISSUE_TYPES = ["TASK", "STORY", "BUG", "EPIC"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

function TemplatesSection({ projectKey }) {
    const qc = useQueryClient();
    const { data: templates = [], isLoading } = useQuery({
        queryKey: ["templates", projectKey],
        queryFn: () => listTemplates(projectKey),
    });

    const [form, setForm] = useState({
        name: "", description: "", issueType: "TASK", priority: "MEDIUM", bodyTemplate: "", sortOrder: 0,
    });
    const createMut = useMutation({
        mutationFn: (body) => createTemplate(projectKey, body),
        onSuccess: () => {
            setForm({ name: "", description: "", issueType: "TASK", priority: "MEDIUM", bodyTemplate: "", sortOrder: 0 });
            qc.invalidateQueries({ queryKey: ["templates", projectKey] });
            toast.success("Template created");
        },
        onError: (e) => toast.error(e.message),
    });
    const deleteMut = useMutation({
        mutationFn: (id) => deleteTemplate(projectKey, id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["templates", projectKey] });
            toast.success("Template deleted");
        },
        onError: (e) => toast.error(e.message),
    });

    return (
        <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Issue Templates</h2>

            <form
                onSubmit={(e) => { e.preventDefault(); if (form.name) createMut.mutate(form); }}
                className="space-y-2 mb-4"
            >
                <div className="flex gap-2">
                    <input
                        placeholder="Template name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                    <select
                        value={form.issueType}
                        onChange={(e) => setForm({ ...form, issueType: e.target.value })}
                        className="border border-slate-300 rounded px-3 py-2 text-sm"
                    >
                        {ISSUE_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <select
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                        className="border border-slate-300 rounded px-3 py-2 text-sm"
                    >
                        {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                    <button
                        disabled={createMut.isPending || !form.name}
                        className="px-3 py-2 bg-slate-900 text-white text-sm rounded hover:bg-slate-800 disabled:opacity-50"
                    >
                        Add
                    </button>
                </div>
                <input
                    placeholder="Short description (optional)"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
                <textarea
                    placeholder="Body template (Markdown) — this will pre-fill the issue description"
                    value={form.bodyTemplate}
                    onChange={(e) => setForm({ ...form, bodyTemplate: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    rows={3}
                />
            </form>
            {createMut.error && <div className="text-sm text-red-600 mb-3">{createMut.error.message}</div>}

            {isLoading ? (
                <div className="text-slate-500">Loading…</div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {templates.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900">{t.name}</div>
                                {t.description && <div className="text-xs text-slate-400">{t.description}</div>}
                            </div>
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {t.issueType}
                            </span>
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                {t.priority}
                            </span>
                            <button
                                onClick={() => {
                                    if (confirm(`Delete template "${t.name}"?`)) deleteMut.mutate(t.id);
                                }}
                                className="text-xs text-slate-500 hover:text-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                    {templates.length === 0 && (
                        <div className="p-4 text-sm text-slate-500">No templates yet. Create one above to speed up issue creation.</div>
                    )}
                </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
                Templates pre-fill issue fields when creating new issues. Only ADMINs can manage them.
            </p>
        </section>
    );
}

const CRON_PRESETS = [
    { label: "Every day at 9 AM", value: "0 0 9 * * MON-FRI" },
    { label: "Every Monday", value: "0 0 9 * * MON" },
    { label: "1st of every month", value: "0 0 9 1 * *" },
    { label: "Every Friday", value: "0 0 9 * * FRI" },
];

function RecurringRulesSection({ projectKey }) {
    const qc = useQueryClient();
    const { data: rules = [], isLoading } = useQuery({
        queryKey: ["recurringRules", projectKey],
        queryFn: () => listRules(projectKey),
    });

    const [form, setForm] = useState({
        name: "", titleTemplate: "", description: "", issueType: "TASK",
        priority: "MEDIUM", assigneeUsername: "", cronExpression: "0 0 9 * * MON-FRI",
    });
    const createMut = useMutation({
        mutationFn: (body) => createRule(projectKey, {
            ...body,
            assigneeUsername: body.assigneeUsername || null,
        }),
        onSuccess: () => {
            setForm({ name: "", titleTemplate: "", description: "", issueType: "TASK",
                priority: "MEDIUM", assigneeUsername: "", cronExpression: "0 0 9 * * MON-FRI" });
            qc.invalidateQueries({ queryKey: ["recurringRules", projectKey] });
            toast.success("Recurring rule created");
        },
        onError: (e) => toast.error(e.message),
    });
    const toggleMut = useMutation({
        mutationFn: (id) => toggleRule(projectKey, id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["recurringRules", projectKey] });
        },
        onError: (e) => toast.error(e.message),
    });
    const deleteMut = useMutation({
        mutationFn: (id) => deleteRule(projectKey, id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["recurringRules", projectKey] });
            toast.success("Rule deleted");
        },
        onError: (e) => toast.error(e.message),
    });

    return (
        <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Recurring Issues</h2>

            <form
                onSubmit={(e) => { e.preventDefault(); if (form.name && form.titleTemplate) createMut.mutate(form); }}
                className="space-y-2 mb-4"
            >
                <div className="flex gap-2">
                    <input
                        placeholder="Rule name (e.g. Daily standup)"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                    <select
                        value={form.issueType}
                        onChange={(e) => setForm({ ...form, issueType: e.target.value })}
                        className="border border-slate-300 rounded px-3 py-2 text-sm"
                    >
                        {["TASK", "STORY", "BUG"].map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <select
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                        className="border border-slate-300 rounded px-3 py-2 text-sm"
                    >
                        {["LOW", "MEDIUM", "HIGH"].map((p) => <option key={p}>{p}</option>)}
                    </select>
                </div>
                <input
                    placeholder="Issue title template (use {{date}} for current date)"
                    value={form.titleTemplate}
                    onChange={(e) => setForm({ ...form, titleTemplate: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
                <textarea
                    placeholder="Issue description (optional)"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    rows={2}
                />
                <div className="flex gap-2">
                    <input
                        placeholder="Assignee username (optional)"
                        value={form.assigneeUsername}
                        onChange={(e) => setForm({ ...form, assigneeUsername: e.target.value })}
                        className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                    <select
                        value={form.cronExpression}
                        onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
                        className="border border-slate-300 rounded px-3 py-2 text-sm"
                    >
                        {CRON_PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                    <button
                        disabled={createMut.isPending || !form.name || !form.titleTemplate}
                        className="px-3 py-2 bg-slate-900 text-white text-sm rounded hover:bg-slate-800 disabled:opacity-50"
                    >
                        Add
                    </button>
                </div>
            </form>
            {createMut.error && <div className="text-sm text-red-600 mb-3">{createMut.error.message}</div>}

            {isLoading ? (
                <div className="text-slate-500">Loading…</div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {rules.map((r) => (
                        <div key={r.id} className="px-4 py-3">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => toggleMut.mutate(r.id)}
                                    className={`w-8 h-5 rounded-full relative transition-colors ${r.enabled ? "bg-green-500" : "bg-slate-300"}`}
                                    title={r.enabled ? "Enabled – click to disable" : "Disabled – click to enable"}
                                >
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${r.enabled ? "left-3.5" : "left-0.5"}`} />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-900">{r.name}</div>
                                    <div className="text-xs text-slate-500">
                                        <span className="font-mono">{r.titleTemplate}</span>
                                    </div>
                                </div>
                                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {r.issueType}
                                </span>
                                <button
                                    onClick={() => { if (confirm(`Delete rule "${r.name}"?`)) deleteMut.mutate(r.id); }}
                                    className="text-xs text-slate-500 hover:text-red-600"
                                >
                                    Delete
                                </button>
                            </div>
                            <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-400">
                                <span>Cron: <span className="font-mono">{r.cronExpression}</span></span>
                                {r.nextRunAt && <span>Next: {new Date(r.nextRunAt).toLocaleString()}</span>}
                                {r.lastRunAt && <span>Last: {new Date(r.lastRunAt).toLocaleString()}</span>}
                                {r.assigneeUsername && <span>→ {r.assigneeUsername}</span>}
                            </div>
                        </div>
                    ))}
                    {rules.length === 0 && (
                        <div className="p-4 text-sm text-slate-500">No recurring rules. Create one to auto-generate issues on a schedule.</div>
                    )}
                </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
                Recurring rules automatically create issues on a cron schedule. Use {"{{date}}"} in the title template for the current date. Only ADMINs can manage rules.
            </p>
        </section>
    );
}

const TRIGGER_FIELDS = [
    { value: "status", label: "Status changes to" },
    { value: "priority", label: "Priority changes to" },
    { value: "issueType", label: "Type changes to" },
];
const TRIGGER_VALUES = {
    status: ["PENDING", "IN_PROGRESS", "DONE"],
    priority: ["LOW", "MEDIUM", "HIGH"],
    issueType: ["TASK", "STORY", "BUG", "EPIC"],
};
const ACTION_TYPES = [
    { value: "SET_FIELD", label: "Set field" },
    { value: "ASSIGN", label: "Assign to user" },
];
const SETTABLE_FIELDS = [
    { value: "priority", label: "Priority" },
    { value: "status", label: "Status" },
];

function WorkflowRulesSection({ projectKey }) {
    const qc = useQueryClient();
    const { data: rules = [], isLoading } = useQuery({
        queryKey: ["workflowRules", projectKey],
        queryFn: () => listWorkflowRules(projectKey),
    });

    const [form, setForm] = useState({
        name: "", triggerField: "status", triggerValue: "DONE",
        actionType: "ASSIGN", actionField: "priority", actionValue: "",
    });
    const createMut = useMutation({
        mutationFn: (body) => createWorkflowRule(projectKey, body),
        onSuccess: () => {
            setForm({ name: "", triggerField: "status", triggerValue: "DONE",
                actionType: "ASSIGN", actionField: "priority", actionValue: "" });
            qc.invalidateQueries({ queryKey: ["workflowRules", projectKey] });
            toast.success("Workflow rule created");
        },
        onError: (e) => toast.error(e.message),
    });
    const toggleMut = useMutation({
        mutationFn: (id) => toggleWorkflowRule(projectKey, id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["workflowRules", projectKey] }),
        onError: (e) => toast.error(e.message),
    });
    const deleteMut = useMutation({
        mutationFn: (id) => deleteWorkflowRule(projectKey, id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["workflowRules", projectKey] });
            toast.success("Rule deleted");
        },
        onError: (e) => toast.error(e.message),
    });

    const triggerOpts = TRIGGER_VALUES[form.triggerField] || [];

    return (
        <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Workflow Automations</h2>

            <form
                onSubmit={(e) => { e.preventDefault(); if (form.name && form.actionValue) createMut.mutate(form); }}
                className="space-y-2 mb-4"
            >
                <input
                    placeholder="Rule name (e.g. Auto-assign on Done)"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
                <div className="flex gap-2 items-center">
                    <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">WHEN</span>
                    <select
                        value={form.triggerField}
                        onChange={(e) => setForm({ ...form, triggerField: e.target.value, triggerValue: TRIGGER_VALUES[e.target.value]?.[0] || "" })}
                        className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                    >
                        {TRIGGER_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <select
                        value={form.triggerValue}
                        onChange={(e) => setForm({ ...form, triggerValue: e.target.value })}
                        className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                    >
                        {triggerOpts.map((v) => <option key={v}>{v}</option>)}
                    </select>
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">THEN</span>
                    <select
                        value={form.actionType}
                        onChange={(e) => setForm({ ...form, actionType: e.target.value, actionValue: "" })}
                        className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                    >
                        {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                    {form.actionType === "SET_FIELD" && (
                        <select
                            value={form.actionField}
                            onChange={(e) => setForm({ ...form, actionField: e.target.value })}
                            className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                        >
                            {SETTABLE_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                    )}
                    <input
                        placeholder={form.actionType === "ASSIGN" ? "username" : "value (e.g. HIGH)"}
                        value={form.actionValue}
                        onChange={(e) => setForm({ ...form, actionValue: e.target.value })}
                        className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm"
                    />
                    <button
                        disabled={createMut.isPending || !form.name || !form.actionValue}
                        className="px-3 py-2 bg-slate-900 text-white text-sm rounded hover:bg-slate-800 disabled:opacity-50"
                    >
                        Add
                    </button>
                </div>
            </form>
            {createMut.error && <div className="text-sm text-red-600 mb-3">{createMut.error.message}</div>}

            {isLoading ? (
                <div className="text-slate-500">Loading…</div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {rules.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                            <button
                                onClick={() => toggleMut.mutate(r.id)}
                                className={`w-8 h-5 rounded-full relative transition-colors ${r.enabled ? "bg-green-500" : "bg-slate-300"}`}
                            >
                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${r.enabled ? "left-3.5" : "left-0.5"}`} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900">{r.name}</div>
                                <div className="text-xs text-slate-500">
                                    When <span className="font-semibold">{r.triggerField}</span> = <span className="font-mono">{r.triggerValue}</span>
                                    {" → "}
                                    {r.actionType === "ASSIGN"
                                        ? <span>assign to <span className="font-semibold">{r.actionValue}</span></span>
                                        : <span>set <span className="font-semibold">{r.actionField}</span> to <span className="font-mono">{r.actionValue}</span></span>
                                    }
                                </div>
                            </div>
                            <button
                                onClick={() => { if (confirm(`Delete rule "${r.name}"?`)) deleteMut.mutate(r.id); }}
                                className="text-xs text-slate-500 hover:text-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                    {rules.length === 0 && (
                        <div className="p-4 text-sm text-slate-500">No workflow rules. Create one to automate actions when issue fields change.</div>
                    )}
                </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
                Workflow rules fire automatically when an issue field changes. For example: auto-assign a reviewer when status changes to DONE. Only ADMINs can manage rules.
            </p>
        </section>
    );
}

function ImportExportSection({ projectKey }) {
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);
    const qc = useQueryClient();

    const handleExport = () => {
        const token = localStorage.getItem("token");
        fetch(`/api/projects/${projectKey}/issues/export`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.blob())
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${projectKey}-issues.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("CSV exported");
            })
            .catch(() => toast.error("Export failed"));
    };

    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        setResult(null);
        try {
            const token = localStorage.getItem("token");
            const form = new FormData();
            form.append("file", file);
            const r = await fetch(`/api/projects/${projectKey}/issues/import`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.message || "Import failed");
            setResult(data);
            if (data.created > 0) {
                toast.success(`Imported ${data.created} issue(s)`);
                qc.invalidateQueries({ queryKey: ["issues", projectKey] });
                qc.invalidateQueries({ queryKey: ["backlog", projectKey] });
            }
        } catch (err) {
            toast.error(err.message);
        }
        setImporting(false);
        e.target.value = "";
    };

    return (
        <section>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Import / Export</h3>
            <div className="flex gap-3 flex-wrap">
                <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white text-sm rounded hover:bg-slate-800 dark:hover:bg-blue-700"
                >
                    Export CSV
                </button>
                <label className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-sm rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200">
                    {importing ? "Importing…" : "Import CSV"}
                    <input type="file" accept=".csv" onChange={handleImport} className="hidden" disabled={importing} />
                </label>
            </div>
            {result && (
                <div className="mt-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm">
                    <div className="text-green-600 font-medium">{result.created} issue(s) created</div>
                    {result.errors?.length > 0 && (
                        <div className="mt-2">
                            <div className="text-red-600 font-medium">{result.errors.length} error(s):</div>
                            <ul className="text-xs text-red-500 mt-1 list-disc pl-4 space-y-0.5">
                                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                CSV format: Title, Description, Type, Priority, Assignee, Due Date (YYYY-MM-DD). First row must be headers.
            </p>
        </section>
    );
}
