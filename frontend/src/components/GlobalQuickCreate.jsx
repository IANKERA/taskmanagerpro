import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { listProjects } from "../api/projects";
import { createIssue } from "../api/issues";

export default function GlobalQuickCreate() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "n" && !e.shiftKey) {
                e.preventDefault();
                setOpen(true);
            }
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    if (!open) return null;

    return <QuickCreateModal onClose={() => setOpen(false)} navigate={navigate} />;
}

function QuickCreateModal({ onClose, navigate }) {
    const { data: projects = [] } = useQuery({
        queryKey: ["projects"],
        queryFn: listProjects,
    });

    const activeProjects = projects.filter((p) => !p.archived);
    const [form, setForm] = useState({
        projectKey: "",
        title: "",
        issueType: "TASK",
        priority: "MEDIUM",
    });

    // Auto-select first project
    useEffect(() => {
        if (activeProjects.length > 0 && !form.projectKey) {
            setForm((f) => ({ ...f, projectKey: activeProjects[0].key }));
        }
    }, [activeProjects, form.projectKey]);

    const mut = useMutation({
        mutationFn: () => createIssue(form.projectKey, {
            title: form.title,
            issueType: form.issueType,
            priority: form.priority,
        }),
        onSuccess: (issue) => {
            toast.success(`Created ${issue.issueKey}`);
            onClose();
            navigate(`/projects/${form.projectKey}/board/${issue.issueKey}`);
        },
        onError: (e) => toast.error(e.message),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-[480px] p-5"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Create Issue</h3>
                <form onSubmit={(e) => { e.preventDefault(); if (form.title && form.projectKey) mut.mutate(); }} className="space-y-3">
                    <div className="flex gap-2">
                        <select
                            value={form.projectKey}
                            onChange={(e) => setForm({ ...form, projectKey: e.target.value })}
                            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm font-mono"
                        >
                            {activeProjects.map((p) => (
                                <option key={p.key} value={p.key}>{p.key}</option>
                            ))}
                        </select>
                        <select
                            value={form.issueType}
                            onChange={(e) => setForm({ ...form, issueType: e.target.value })}
                            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-2 py-2 text-sm"
                        >
                            {["TASK", "STORY", "BUG", "EPIC"].map((t) => <option key={t}>{t}</option>)}
                        </select>
                        <select
                            value={form.priority}
                            onChange={(e) => setForm({ ...form, priority: e.target.value })}
                            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-2 py-2 text-sm"
                        >
                            {["LOW", "MEDIUM", "HIGH"].map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <input
                        autoFocus
                        required
                        placeholder="Issue title"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2.5 text-sm"
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Ctrl+N to open · Esc to close</span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={mut.isPending || !form.title}
                                className="px-4 py-1.5 bg-slate-900 dark:bg-blue-600 text-white text-sm rounded hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50"
                            >
                                {mut.isPending ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
