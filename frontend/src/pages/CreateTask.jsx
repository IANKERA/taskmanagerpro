import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listProjects } from "../api/projects";
import { createIssue } from "../api/issues";
import AssigneeSelect from "../components/AssigneeSelect";

function CreateTask() {
    const [form, setForm] = useState({
        projectKey: "",
        title: "",
        description: "",
        status: "PENDING",
        priority: "MEDIUM",
        dueDate: "",
        assigneeUsername: "",
    });
    const navigate = useNavigate();
    const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery({
        queryKey: ["projects"],
        queryFn: listProjects,
    });
    const activeProjects = projects.filter((project) => !project.archived);

    useEffect(() => {
        if (!form.projectKey && activeProjects.length > 0) {
            setForm((current) => ({ ...current, projectKey: activeProjects[0].key }));
        }
    }, [activeProjects, form.projectKey]);

    const createMutation = useMutation({
        mutationFn: () => createIssue(form.projectKey, {
            title: form.title,
            description: form.description,
            status: form.status,
            priority: form.priority,
            dueDate: form.dueDate || undefined,
            assigneeUsername: form.assigneeUsername,
        }),
        onSuccess: (issue) => navigate(`/projects/${form.projectKey}/board/${issue.issueKey}`),
    });

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({
            ...current,
            [name]: value,
            ...(name === "projectKey" ? { assigneeUsername: "" } : {}),
        }));
    };

    return (
        <div className="max-w-lg bg-white dark:bg-slate-800 p-6 rounded-xl shadow">
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Create a New Task</h2>

            {projectsError && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-3">
                    Could not load projects: {projectsError.message}
                </div>
            )}
            {createMutation.error && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-3">
                    {createMutation.error.message}
                </div>
            )}
            {!projectsLoading && !projectsError && activeProjects.length === 0 && (
                <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-3">
                    Join or create a project before creating a task.
                </div>
            )}

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    createMutation.mutate();
                }}
                className="space-y-4"
            >
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                    Project
                    <select
                        name="projectKey"
                        aria-label="Project"
                        value={form.projectKey}
                        onChange={handleChange}
                        disabled={projectsLoading || activeProjects.length === 0}
                        required
                        className="mt-1 w-full border p-2 rounded dark:bg-slate-700 dark:text-white"
                    >
                        {activeProjects.map((project) => (
                            <option key={project.key} value={project.key}>{project.name} ({project.key})</option>
                        ))}
                    </select>
                </label>

                <input
                    type="text"
                    name="title"
                    placeholder="Task title"
                    className="w-full border p-2 rounded dark:bg-slate-700 dark:text-white"
                    value={form.title}
                    onChange={handleChange}
                    required
                />

                <textarea
                    name="description"
                    placeholder="Description"
                    className="w-full border p-2 rounded dark:bg-slate-700 dark:text-white"
                    rows="3"
                    value={form.description}
                    onChange={handleChange}
                />

                <AssigneeSelect
                    projectKey={form.projectKey}
                    value={form.assigneeUsername}
                    onChange={(assigneeUsername) => setForm((current) => ({ ...current, assigneeUsername }))}
                />

                <select
                    name="priority"
                    aria-label="Priority"
                    className="w-full border p-2 rounded dark:bg-slate-700 dark:text-white"
                    value={form.priority}
                    onChange={handleChange}
                >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                </select>

                <select
                    name="status"
                    aria-label="Status"
                    className="w-full border p-2 rounded dark:bg-slate-700 dark:text-white"
                    value={form.status}
                    onChange={handleChange}
                >
                    <option value="PENDING">PENDING</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="DONE">DONE</option>
                </select>

                <input
                    type="date"
                    name="dueDate"
                    aria-label="Due date"
                    className="w-full border p-2 rounded dark:bg-slate-700 dark:text-white"
                    value={form.dueDate}
                    onChange={handleChange}
                />

                <button
                    type="submit"
                    disabled={createMutation.isPending || projectsLoading || !form.projectKey}
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow disabled:opacity-50"
                >
                    {createMutation.isPending ? "Creating…" : "Create Task"}
                </button>
            </form>
        </div>
    );
}

export default CreateTask;
