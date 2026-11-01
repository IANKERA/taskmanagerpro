import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
    listProjects,
    listMembers,
    addMember,
    removeMember,
    updateProject,
    archiveProject,
    unarchiveProject,
} from "../../api/projects";
import { fetchAdminUsers } from "../../api/admin";
import { formatApiError } from "../../api/errorMessage";

export default function ProjectAdmin() {
    const qc = useQueryClient();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [selectedProjectKey, setSelectedProjectKey] = useState(null);

    const {
        data: projects = [],
        isLoading: projectsLoading,
        error: projectsError,
    } = useQuery({
        queryKey: ["projects"],
        queryFn: listProjects,
    });

    const archiveMut = useMutation({
        mutationFn: (key) => archiveProject(key),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Project archived successfully");
        },
        onError: (e) => toast.error(formatApiError(e)),
    });

    const unarchiveMut = useMutation({
        mutationFn: (key) => unarchiveProject(key),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Project unarchived successfully");
        },
        onError: (e) => toast.error(formatApiError(e)),
    });

    const filteredProjects = useMemo(() => {
        return projects.filter((p) => {
            const matchesSearch =
                !search ||
                p.key?.toLowerCase().includes(search.toLowerCase()) ||
                p.name?.toLowerCase().includes(search.toLowerCase()) ||
                p.leadUsername?.toLowerCase().includes(search.toLowerCase());

            let matchesStatus = true;
            if (statusFilter === "ACTIVE") matchesStatus = !p.archived;
            if (statusFilter === "ARCHIVED") matchesStatus = p.archived;

            return matchesSearch && matchesStatus;
        });
    }, [projects, search, statusFilter]);

    const totalProjects = projects.length;
    const activeCount = projects.filter((p) => !p.archived).length;
    const archivedCount = projects.filter((p) => p.archived).length;

    const selectedProject = projects.find((p) => p.key === selectedProjectKey);

    return (
        <div className="space-y-6">
            {/* Stats Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="app-surface p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Projects</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalProjects}</div>
                    </div>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                        Workspaces
                    </span>
                </div>
                <div className="app-surface p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Projects</div>
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{activeCount}</div>
                    </div>
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded text-emerald-700 dark:text-emerald-300 font-semibold">
                        In Flight
                    </span>
                </div>
                <div className="app-surface p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Archived Projects</div>
                        <div className="text-xl font-bold text-slate-600 dark:text-slate-400 mt-0.5">{archivedCount}</div>
                    </div>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                        Archived
                    </span>
                </div>
            </div>

            {/* Error Banner */}
            {projectsError && (
                <div role="alert" className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                    Failed to load projects: {formatApiError(projectsError)}
                </div>
            )}

            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="Search by key, name, or lead…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        aria-label="Search projects"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                            title="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="project-status-filter" className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        Status:
                    </label>
                    <select
                        id="project-status-filter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 text-sm"
                    >
                        <option value="ALL">All Projects ({totalProjects})</option>
                        <option value="ACTIVE">Active ({activeCount})</option>
                        <option value="ARCHIVED">Archived ({archivedCount})</option>
                    </select>
                </div>
            </div>

            {/* Projects Table */}
            <div className="app-surface rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                {projectsLoading ? (
                    <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Loading organization projects…
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        {search || statusFilter !== "ALL"
                            ? "No projects match the search and filter criteria."
                            : "No projects exist in the organization."}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm" aria-label="Projects management table">
                            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-xs uppercase font-semibold text-slate-600 dark:text-slate-300 tracking-wider">
                                <tr>
                                    <th scope="col" className="px-4 py-3.5">Key & Name</th>
                                    <th scope="col" className="px-4 py-3.5">Project Lead</th>
                                    <th scope="col" className="px-4 py-3.5">Status</th>
                                    <th scope="col" className="px-4 py-3.5">Issues</th>
                                    <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredProjects.map((p) => {
                                    const totalProjectIssues = (p.openCount || 0) + (p.inProgressCount || 0) + (p.doneCount || 0);

                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors">
                                            {/* Key & Name */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                        {p.key}
                                                    </span>
                                                    <div>
                                                        <div className="font-medium text-slate-900 dark:text-white">
                                                            {p.name}
                                                        </div>
                                                        {p.description && (
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                                                {p.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Project Lead */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                {p.leadUsername ? (
                                                    <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                                                        <span className="text-xs text-amber-500">★</span>
                                                        <span className="font-medium">{p.leadUsername}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No lead assigned</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                                        p.archived
                                                            ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                    }`}
                                                >
                                                    {p.archived ? "Archived" : "Active"}
                                                </span>
                                            </td>

                                            {/* Issues Count Breakdown */}
                                            <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <span title="Total issues">{totalProjectIssues} total</span>
                                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                                    <span className="text-amber-600 dark:text-amber-400" title="Open issues">
                                                        {p.openCount || 0} open
                                                    </span>
                                                    <span className="text-blue-600 dark:text-blue-400" title="In progress issues">
                                                        {p.inProgressCount || 0} in progress
                                                    </span>
                                                    <span className="text-emerald-600 dark:text-emerald-400" title="Done issues">
                                                        {p.doneCount || 0} done
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedProjectKey(p.key)}
                                                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        Manage Members & Lead
                                                    </button>

                                                    {p.archived ? (
                                                        <button
                                                            onClick={() => unarchiveMut.mutate(p.key)}
                                                            disabled={unarchiveMut.isPending}
                                                            className="text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                                                        >
                                                            Unarchive
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => archiveMut.mutate(p.key)}
                                                            disabled={archiveMut.isPending}
                                                            className="text-xs text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
                                                        >
                                                            Archive
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Project Management Modal */}
            {selectedProject && (
                <ProjectMemberModal
                    project={selectedProject}
                    onClose={() => setSelectedProjectKey(null)}
                />
            )}
        </div>
    );
}

function ProjectMemberModal({ project, onClose }) {
    const qc = useQueryClient();

    const [newMemberUsername, setNewMemberUsername] = useState("");
    const [newMemberRole, setNewMemberRole] = useState("MEMBER");
    const [newLeadUsername, setNewLeadUsername] = useState("");
    const [isChangingLead, setIsChangingLead] = useState(false);

    // Load members of this project
    const {
        data: members = [],
        isLoading: membersLoading,
        error: membersError,
    } = useQuery({
        queryKey: ["members", project.key],
        queryFn: () => listMembers(project.key),
    });

    // Load all users to populate username autocomplete / selection
    const { data: allUsers = [] } = useQuery({
        queryKey: ["admin-users"],
        queryFn: fetchAdminUsers,
    });

    const addMemberMut = useMutation({
        mutationFn: (body) => addMember(project.key, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["members", project.key] });
            setNewMemberUsername("");
            toast.success("Project membership updated");
        },
        onError: (e) => toast.error(formatApiError(e)),
    });

    const removeMemberMut = useMutation({
        mutationFn: (username) => removeMember(project.key, username),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["members", project.key] });
            toast.success("Member removed from project");
        },
        onError: (e) => toast.error(formatApiError(e)),
    });

    const updateLeadMut = useMutation({
        mutationFn: (leadUsername) => updateProject(project.key, { leadUsername }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["projects"] });
            qc.invalidateQueries({ queryKey: ["members", project.key] });
            setIsChangingLead(false);
            toast.success("Project lead updated successfully");
        },
        onError: (e) => toast.error(formatApiError(e)),
    });

    const handleAddMember = (e) => {
        e.preventDefault();
        if (!newMemberUsername.trim()) return;
        addMemberMut.mutate({
            username: newMemberUsername.trim(),
            projectRole: newMemberRole,
        });
    };

    const handleChangeLead = (e) => {
        e.preventDefault();
        if (!newLeadUsername.trim()) return;
        updateLeadMut.mutate(newLeadUsername.trim());
    };

    const ROLE_BADGES = {
        ADMIN: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
        MEMBER: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
        VIEWER: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-project-title"
        >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                                {project.key}
                            </span>
                            <h3 id="modal-project-title" className="text-lg font-bold text-slate-900 dark:text-white">
                                {project.name}
                            </h3>
                        </div>
                        {project.description && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {project.description}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
                        aria-label="Close modal"
                    >
                        ✕
                    </button>
                </div>

                {/* Project Lead Management */}
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Project Lead
                        </span>
                        {!isChangingLead && (
                            <button
                                onClick={() => {
                                    setNewLeadUsername(project.leadUsername || "");
                                    setIsChangingLead(true);
                                }}
                                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                Change Lead
                            </button>
                        )}
                    </div>

                    {!isChangingLead ? (
                        <div className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                            <span className="text-amber-500">★</span>
                            <span className="font-medium">{project.leadUsername || "None assigned"}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                (Governs project settings and membership)
                            </span>
                        </div>
                    ) : (
                        <form onSubmit={handleChangeLead} className="mt-2 space-y-2">
                            <div className="flex gap-2">
                                <select
                                    value={newLeadUsername}
                                    onChange={(e) => setNewLeadUsername(e.target.value)}
                                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-1.5 text-xs"
                                    aria-label="Select new project lead"
                                >
                                    <option value="">Select user to assign as lead…</option>
                                    {allUsers.map((u) => (
                                        <option key={u.id} value={u.username}>
                                            {u.username} ({u.email || "no email"})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="submit"
                                    disabled={updateLeadMut.isPending || !newLeadUsername}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {updateLeadMut.isPending ? "Saving…" : "Save Lead"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsChangingLead(false)}
                                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Changing the lead will assign this user project administrator permissions.
                            </p>
                        </form>
                    )}
                </div>

                {/* Add Member Form */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Add or Update Project Member
                    </h4>
                    <form onSubmit={handleAddMember} className="flex flex-wrap gap-2">
                        <input
                            type="text"
                            placeholder="Enter username"
                            list="available-users-datalist"
                            value={newMemberUsername}
                            onChange={(e) => setNewMemberUsername(e.target.value)}
                            className="flex-1 min-w-[160px] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-xs"
                            aria-label="New member username"
                        />
                        <datalist id="available-users-datalist">
                            {allUsers.map((u) => (
                                <option key={u.id} value={u.username} />
                            ))}
                        </datalist>

                        <select
                            value={newMemberRole}
                            onChange={(e) => setNewMemberRole(e.target.value)}
                            className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-xs"
                            aria-label="Member role"
                        >
                            <option value="VIEWER">VIEWER (Read-only)</option>
                            <option value="MEMBER">MEMBER (Issues & Tasks)</option>
                            <option value="ADMIN">ADMIN (Full Project Admin)</option>
                        </select>

                        <button
                            type="submit"
                            disabled={addMemberMut.isPending || !newMemberUsername.trim()}
                            className="rounded-lg bg-slate-900 dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50"
                        >
                            {addMemberMut.isPending ? "Saving…" : "Add / Update"}
                        </button>
                    </form>
                </div>

                {/* Members List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Current Members ({members.length})
                        </h4>
                    </div>

                    {membersError && (
                        <div role="alert" className="text-xs text-red-600 dark:text-red-300">
                            Failed to load members: {formatApiError(membersError)}
                        </div>
                    )}

                    {membersLoading ? (
                        <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400">
                            Loading project members…
                        </div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                            No members found in this project.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            {members.map((m) => {
                                const isLead = project.leadUsername === m.username;

                                return (
                                    <div
                                        key={m.userId}
                                        className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[10px] uppercase">
                                                {m.username?.charAt(0) || "U"}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                                                    <span>{m.username}</span>
                                                    {isLead && (
                                                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                            Lead
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                                    Joined {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "Active"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Role select / update */}
                                            <select
                                                value={m.projectRole}
                                                onChange={(e) =>
                                                    addMemberMut.mutate({
                                                        username: m.username,
                                                        projectRole: e.target.value,
                                                    })
                                                }
                                                className={`text-xs rounded font-semibold px-2 py-1 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 ${
                                                    ROLE_BADGES[m.projectRole] || "bg-slate-100 text-slate-700"
                                                }`}
                                                aria-label={`Change role for member ${m.username}`}
                                            >
                                                <option value="VIEWER">VIEWER</option>
                                                <option value="MEMBER">MEMBER</option>
                                                <option value="ADMIN">ADMIN</option>
                                            </select>

                                            {/* Remove member button */}
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Remove member "${m.username}" from project ${project.key}?`)) {
                                                        removeMemberMut.mutate(m.username);
                                                    }
                                                }}
                                                disabled={isLead || removeMemberMut.isPending}
                                                title={isLead ? "Cannot remove project lead. Reassign lead first." : "Remove member"}
                                                className="text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                                aria-label={`Remove member ${m.username}`}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-slate-100 dark:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

