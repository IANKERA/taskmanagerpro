import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteProject } from "../api/projects";
import { formatApiError } from "../api/errorMessage";

export default function DeleteProjectModal({ project, isOpen, onClose, onSuccess }) {
    const qc = useQueryClient();
    const [confirmInput, setConfirmInput] = useState("");

    useEffect(() => {
        if (isOpen) {
            setConfirmInput("");
        }
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    const deleteMut = useMutation({
        mutationFn: () => deleteProject(project.key),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["projects"] });
            qc.invalidateQueries({ queryKey: ["project", project.key] });
            toast.success(`Project ${project.key} deleted successfully`);
            onClose();
            if (onSuccess) onSuccess();
        },
        onError: (err) => {
            toast.error(formatApiError(err, "Failed to delete project"));
        },
    });

    if (!isOpen || !project) return null;

    const isMatch = confirmInput.trim() === project.key;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
        >
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 id="delete-project-title" className="text-lg font-semibold text-red-600 dark:text-red-400">
                            Delete Project
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            This action cannot be undone
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded"
                        aria-label="Close dialog"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-slate-700 dark:text-slate-300 space-y-1.5">
                    <p>
                        You are about to permanently delete <strong>{project.name}</strong> (<span className="font-mono text-red-600 dark:text-red-400 font-semibold">{project.key}</span>).
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        All associated issues, sprints, comments, attachments, time entries, and configurations will be permanently removed.
                    </p>
                </div>

                <div>
                    <label htmlFor="confirm-project-key" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        To confirm, please type the project key <span className="font-mono font-semibold text-slate-900 dark:text-white select-all">{project.key}</span>:
                    </label>
                    <input
                        id="confirm-project-key"
                        type="text"
                        autoFocus
                        value={confirmInput}
                        onChange={(e) => setConfirmInput(e.target.value)}
                        placeholder={project.key}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={deleteMut.isPending}
                        className="px-3.5 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => deleteMut.mutate()}
                        disabled={!isMatch || deleteMut.isPending}
                        className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {deleteMut.isPending ? "Deleting…" : "Delete permanently"}
                    </button>
                </div>
            </div>
        </div>
    );
}

