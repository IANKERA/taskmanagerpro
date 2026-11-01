import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateSprint } from "../../api/sprints";
import { formatApiError } from "../../api/errorMessage";

const STATE_BADGES = {
    PLANNED: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    CLOSED: "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

export default function EditSprintModal({ sprint, projectKey, open, onClose, onSuccess }) {
    const qc = useQueryClient();

    const [name, setName] = useState(sprint?.name || "");
    const [goal, setGoal] = useState(sprint?.goal || "");
    const [startDate, setStartDate] = useState(sprint?.startDate || "");
    const [endDate, setEndDate] = useState(sprint?.endDate || "");
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const isClosed = sprint?.state === "CLOSED";
    const isActive = sprint?.state === "ACTIVE";

    useEffect(() => {
        if (sprint) {
            setName(sprint.name || "");
            setGoal(sprint.goal || "");
            setStartDate(sprint.startDate || "");
            setEndDate(sprint.endDate || "");
            setError("");
            setFieldErrors({});
        }
    }, [sprint, open]);

    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    const updateMut = useMutation({
        mutationFn: (body) => updateSprint(sprint.id, body),
        onSuccess: (data) => {
            toast.success("Sprint updated");
            if (projectKey) {
                qc.invalidateQueries({ queryKey: ["sprints", projectKey] });
            }
            if (sprint?.id) {
                qc.invalidateQueries({ queryKey: ["sprint-issues", sprint.id] });
                qc.invalidateQueries({ queryKey: ["burndown", sprint.id] });
            }
            onSuccess?.(data);
            onClose();
        },
        onError: (err) => {
            const msg = formatApiError(err, "Failed to update sprint.");
            setError(msg);
            toast.error(msg);
        },
    });

    if (!open || !sprint) return null;

    function validate() {
        const errors = {};
        const trimmedName = name.trim();
        if (!trimmedName) {
            errors.name = "Sprint name is required.";
        } else if (trimmedName.length > 128) {
            errors.name = "Sprint name cannot exceed 128 characters.";
        }

        if (startDate && endDate && endDate < startDate) {
            errors.endDate = "End date must be on or after start date.";
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isClosed) return;
        setError("");
        if (!validate()) return;

        updateMut.mutate({
            name: name.trim(),
            goal: goal.trim(),
            startDate: startDate || null,
            endDate: endDate || null,
        });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-sprint-title"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <h3 id="edit-sprint-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                            Edit Sprint
                        </h3>
                        <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${STATE_BADGES[sprint.state] || ""}`}>
                            {sprint.state}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                        aria-label="Close dialog"
                    >
                        ✕
                    </button>
                </div>

                {isClosed && (
                    <div role="alert" className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
                        Closed sprints are immutable and cannot be modified.
                    </div>
                )}

                {isActive && (
                    <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300">
                        This sprint is currently active. Modifying dates or goal affects live burndown metrics.
                    </div>
                )}

                {error && (
                    <div role="alert" className="mb-4 rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2.5 text-xs text-red-600 dark:text-red-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="edit-sprint-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Sprint Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="edit-sprint-name"
                            type="text"
                            required
                            disabled={isClosed}
                            maxLength={128}
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (fieldErrors.name) {
                                    setFieldErrors((prev) => ({ ...prev, name: undefined }));
                                }
                            }}
                            placeholder="e.g. Sprint 1"
                            className={`w-full rounded-lg border ${
                                fieldErrors.name
                                    ? "border-red-500 focus:ring-red-500"
                                    : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                            } bg-white dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-900`}
                            autoFocus
                        />
                        {fieldErrors.name && (
                            <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {fieldErrors.name}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="edit-sprint-goal" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Sprint Goal
                        </label>
                        <textarea
                            id="edit-sprint-goal"
                            rows={3}
                            disabled={isClosed}
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            placeholder="What should this sprint achieve?"
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-900"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="edit-sprint-start-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Start Date
                            </label>
                            <input
                                id="edit-sprint-start-date"
                                type="date"
                                disabled={isClosed}
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    if (fieldErrors.endDate) {
                                        setFieldErrors((prev) => ({ ...prev, endDate: undefined }));
                                    }
                                }}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-900"
                            />
                        </div>

                        <div>
                            <label htmlFor="edit-sprint-end-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                End Date
                            </label>
                            <input
                                id="edit-sprint-end-date"
                                type="date"
                                disabled={isClosed}
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    if (fieldErrors.endDate) {
                                        setFieldErrors((prev) => ({ ...prev, endDate: undefined }));
                                    }
                                }}
                                className={`w-full rounded-lg border ${
                                    fieldErrors.endDate
                                        ? "border-red-500 focus:ring-red-500"
                                        : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                                } bg-white dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-900`}
                            />
                            {fieldErrors.endDate && (
                                <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                                    {fieldErrors.endDate}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updateMut.isPending || isClosed}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {updateMut.isPending ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

