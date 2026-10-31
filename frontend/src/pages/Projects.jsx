import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { listProjects, createProject, archiveProject, unarchiveProject, deleteProject } from "../api/projects";

function useFavorites() {
    const [favs, setFavs] = useState(() => {
        try { return JSON.parse(localStorage.getItem("fav-projects") || "[]"); } catch { return []; }
    });
    const toggle = useCallback((key) => {
        setFavs((prev) => {
            const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
            localStorage.setItem("fav-projects", JSON.stringify(next));
            return next;
        });
    }, []);
    return { favs, toggle, isFav: (key) => favs.includes(key) };
}

export default function Projects() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const { toggle: toggleFav, isFav } = useFavorites();

    const { data: projects = [], isLoading, error } = useQuery({
        queryKey: ["projects"],
        queryFn: listProjects,
    });

    const [confirmDelete, setConfirmDelete] = useState(null);

    const deleteMut = useMutation({
        mutationFn: deleteProject,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Project deleted");
            setConfirmDelete(null);
        },
        onError: (e) => toast.error(e.message),
    });

    const archiveMut = useMutation({
        mutationFn: ({ key, archive }) => archive ? archiveProject(key) : unarchiveProject(key),
        onSuccess: (_, { archive }) => {
            qc.invalidateQueries({ queryKey: ["projects"] });
            toast.success(archive ? "Project archived" : "Project restored");
        },
        onError: (e) => toast.error(e.message),
    });

    const activeProjects = projects.filter((p) => !p.archived);
    const archivedProjects = projects.filter((p) => p.archived);
    const favoriteProjects = activeProjects.filter((p) => isFav(p.key));
    const otherProjects = activeProjects.filter((p) => !isFav(p.key));

    const ProjectCard = ({ p }) => (
        <div className="relative group">
            <button
                onClick={() => navigate(`/projects/${p.key}/board`)}
                className="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm transition"
            >
                <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 rounded">
                        {p.key}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">{p.name}</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                    {p.description || "No description"}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>Lead: {p.leadUsername || "—"}</span>
                    {(p.openCount != null) && (
                        <span className="flex gap-2">
                            <span title="To Do">{p.openCount} open</span>
                            <span title="In Progress" className="text-blue-500">{p.inProgressCount} active</span>
                            <span title="Done" className="text-green-500">{p.doneCount} done</span>
                        </span>
                    )}
                </div>
            </button>
            <div className="absolute top-3 right-3 flex items-center gap-1">
                <button
                    onClick={() => toggleFav(p.key)}
                    className={`text-sm transition-all ${
                        isFav(p.key)
                            ? "text-amber-400 hover:text-amber-500"
                            : "text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 hover:text-amber-400"
                    }`}
                    title={isFav(p.key) ? "Remove from favorites" : "Add to favorites"}
                >
                    {isFav(p.key) ? "★" : "☆"}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); archiveMut.mutate({ key: p.key, archive: !p.archived }); }}
                    className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 hover:text-slate-500 dark:hover:text-slate-400 text-xs transition-all"
                    title={p.archived ? "Restore project" : "Archive project"}
                >
                    {p.archived ? "↩" : "📦"}
                </button>
                {p.archived && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.key); }}
                        className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 hover:text-red-500 text-xs transition-all"
                        title="Delete project permanently"
                    >
                        🗑
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="page-container">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Projects</h1>
                <button
                    onClick={() => setShowForm((v) => !v)}
                    className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                    {showForm ? "Cancel" : "+ New project"}
                </button>
            </div>

            {showForm && (
                <CreateProjectForm
                    onCreated={(p) => {
                        qc.invalidateQueries({ queryKey: ["projects"] });
                        setShowForm(false);
                        navigate(`/projects/${p.key}/board`);
                    }}
                />
            )}

            {isLoading && <div className="text-slate-500">Loading…</div>}
            {error && <div className="text-red-600">Failed to load: {error.message}</div>}

            {!isLoading && projects.length === 0 && !showForm && (
                <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 text-center">
                    <div className="text-4xl mb-3">📋</div>
                    <div className="text-slate-700 dark:text-slate-200 font-medium mb-1">No projects yet</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Create your first project to start tracking issues.</div>
                </div>
            )}

            {favoriteProjects.length > 0 && (
                <>
                    <div className="text-xs uppercase font-semibold text-amber-500 tracking-wider mb-3 flex items-center gap-1">
                        <span>★</span> Favorites
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {favoriteProjects.map((p) => <ProjectCard key={p.id} p={p} />)}
                    </div>
                </>
            )}

            {otherProjects.length > 0 && (
                <>
                    {favoriteProjects.length > 0 && (
                        <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-3">
                            All projects
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {otherProjects.map((p) => <ProjectCard key={p.id} p={p} />)}
                    </div>
                </>
            )}

            {archivedProjects.length > 0 && (
                <div className="mt-8">
                    <button
                        onClick={() => setShowArchived((v) => !v)}
                        className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-3 flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                        <span>{showArchived ? "▼" : "▶"}</span>
                        Archived ({archivedProjects.length})
                    </button>
                    {showArchived && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                            {archivedProjects.map((p) => <ProjectCard key={p.id} p={p} />)}
                        </div>
                    )}
                </div>
            )}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="mx-4 w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-slate-800 sm:p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Delete project?</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            This will permanently delete <strong>{confirmDelete}</strong> and all its issues, comments, and data. This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteMut.mutate(confirmDelete)}
                                disabled={deleteMut.isPending}
                                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleteMut.isPending ? "Deleting…" : "Delete permanently"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CreateProjectForm({ onCreated }) {
    const [form, setForm] = useState({ key: "", name: "", description: "" });
    const mut = useMutation({
        mutationFn: createProject,
        onSuccess: (p) => { toast.success("Project created"); onCreated(p); },
        onError: (e) => toast.error(e.message),
    });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                mut.mutate(form);
            }}
            className="app-surface mb-6 space-y-3 p-4"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                    required
                    placeholder="Key (e.g. PROJ)"
                    value={form.key}
                    onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm font-mono"
                    pattern="[A-Z][A-Z0-9]{1,15}"
                    title="2-16 chars, uppercase letters/digits, starts with a letter"
                />
                <input
                    required
                    placeholder="Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm md:col-span-2"
                />
            </div>
            <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm"
                rows={2}
            />
            <div className="flex items-center gap-3">
                <button
                    disabled={mut.isPending}
                    className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white text-sm font-medium rounded hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50"
                >
                    {mut.isPending ? "Creating…" : "Create"}
                </button>
                {mut.error && (
                    <span className="text-sm text-red-600">{mut.error.message}</span>
                )}
            </div>
        </form>
    );
}
