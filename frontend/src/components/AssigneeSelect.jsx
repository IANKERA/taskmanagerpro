import { useQuery } from "@tanstack/react-query";
import { listAssignableUsers } from "../api/projects";

export default function AssigneeSelect({ projectKey, value = "", onChange, disabled = false }) {
    const { data: users = [], isLoading, error } = useQuery({
        queryKey: ["assignable-users", projectKey],
        queryFn: () => listAssignableUsers(projectKey),
        enabled: Boolean(projectKey),
    });

    return (
        <label className="block text-sm text-slate-700 dark:text-slate-300">
            Assignee
            <select
                aria-label="Assignee"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled || isLoading || !projectKey}
                className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-2 py-1.5 text-sm disabled:opacity-60"
            >
                <option value="">{isLoading ? "Loading project members…" : "Unassigned"}</option>
                {users.map((user) => (
                    <option key={user.id} value={user.username}>{user.username}</option>
                ))}
            </select>
            {error && (
                <span role="alert" className="mt-1 block text-xs text-red-600">
                    Could not load assignable users: {error.message}
                </span>
            )}
        </label>
    );
}
