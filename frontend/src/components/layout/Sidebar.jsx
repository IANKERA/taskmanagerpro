import { useState, useCallback, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listProjects } from "../../api/projects";
import { unreadCount } from "../../api/notifications";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

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

function Sidebar({ open, onClose }) {
    const { user, logout, isAdmin } = useAuth();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const username = user?.username || "User";
    const { favs, toggle: toggleFav, isFav } = useFavorites();

    const { data: projects = [] } = useQuery({
        queryKey: ["projects"],
        queryFn: listProjects,
        enabled: !!user,
    });

    const { data: notifCount = 0 } = useQuery({
        queryKey: ["unread-notif-count"],
        queryFn: unreadCount,
        enabled: !!user,
        refetchInterval: 30000,
    });

    const activeProjects = projects.filter((p) => !p.archived);
    const favoriteProjects = activeProjects.filter((p) => isFav(p.key));
    const otherProjects = activeProjects.filter((p) => !isFav(p.key));

    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    const linkCls = ({ isActive }) =>
        "flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
        (isActive
            ? "bg-slate-900 text-white shadow-sm dark:bg-blue-600"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700");

    const ProjectItem = ({ p }) => (
        <div className="flex items-center group">
            <NavLink
                to={`/projects/${p.key}/board`}
                className={({ isActive }) =>
                    "flex min-h-11 min-w-0 flex-1 items-center rounded-l-lg px-3 py-2 text-sm transition-colors " +
                    (isActive
                        ? "bg-slate-900 text-white dark:bg-blue-600"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700")
                }
                onClick={onClose}
            >
                <span className="font-mono text-xs mr-2 shrink-0 text-slate-500 dark:text-slate-400">{p.key}</span>
                <span className="truncate">{p.name}</span>
            </NavLink>
            <button
                onClick={(e) => { e.preventDefault(); toggleFav(p.key); }}
                className={`px-1.5 py-1.5 text-xs rounded-r transition-all shrink-0 ${
                    isFav(p.key)
                        ? "text-amber-400 hover:text-amber-500"
                        : "text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 hover:text-amber-400"
                }`}
                title={isFav(p.key) ? "Remove from favorites" : "Add to favorites"}
            >
                {isFav(p.key) ? "★" : "☆"}
            </button>
        </div>
    );

    return (
        <>
            {open && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    className="fixed inset-0 z-40 bg-slate-950/45 md:hidden"
                    onClick={onClose}
                />
            )}
            <aside
                aria-label="Primary navigation"
                className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 dark:border-slate-700 dark:bg-slate-800 md:static md:z-auto md:w-72 md:translate-x-0 md:shadow-none ${
                    open ? "translate-x-0" : "-translate-x-full"
                }`}
            >
            <div className="flex min-h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700">
                <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">TaskManagerPro</span>
                <div className="flex items-center gap-1">
                <button
                    onClick={toggle}
                    className="grid min-h-10 min-w-10 place-items-center rounded-lg text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                    title={dark ? "Light mode" : "Dark mode"}
                    aria-label={dark ? "Use light mode" : "Use dark mode"}
                >
                    {dark ? "☀️" : "🌙"}
                </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid min-h-10 min-w-10 place-items-center rounded-lg text-xl text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-700"
                        aria-label="Close navigation"
                    >
                        ×
                    </button>
                </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                <NavLink to="/my-work" className={linkCls} onClick={onClose}>My Work</NavLink>
                <NavLink to="/notifications" className={({ isActive }) =>
                    "flex min-h-11 items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                    (isActive
                        ? "bg-slate-900 text-white dark:bg-blue-600"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700")
                } onClick={onClose}>
                    <span>Notifications</span>
                    {notifCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {notifCount > 99 ? "99+" : notifCount}
                        </span>
                    )}
                </NavLink>
                <NavLink to="/search" className={linkCls} onClick={onClose}>Search</NavLink>
                <NavLink to="/projects" className={linkCls} onClick={onClose}>Projects</NavLink>
                <NavLink to="/workload" className={linkCls} onClick={onClose}>Workload</NavLink>

                {favoriteProjects.length > 0 && (
                    <>
                        <div className="text-[10px] uppercase font-semibold text-amber-500 tracking-wider mt-4 px-3 flex items-center gap-1">
                            <span>★</span> Favorites
                        </div>
                        {favoriteProjects.map((p) => <ProjectItem key={p.id} p={p} />)}
                    </>
                )}

                {otherProjects.length > 0 && (
                    <>
                        <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mt-4 px-3">
                            {favoriteProjects.length > 0 ? "Other projects" : "Your projects"}
                        </div>
                        {otherProjects.map((p) => <ProjectItem key={p.id} p={p} />)}
                    </>
                )}

                {isAdmin && (
                    <>
                        <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mt-4 px-3">
                            Admin
                        </div>
                        <NavLink to="/admin/users" className={linkCls} onClick={onClose}>Users</NavLink>
                        <NavLink to="/admin/audit-log" className={linkCls} onClick={onClose}>Audit Log</NavLink>
                        <NavLink to="/dashboard" className={linkCls} onClick={onClose}>Dashboard</NavLink>
                        <NavLink to="/settings"  className={linkCls} onClick={onClose}>Settings</NavLink>
                    </>
                )}
            </nav>

            <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <div className="flex items-center gap-2 flex-wrap">
                    <NavLink to="/profile" onClick={onClose} className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600">{username}</NavLink>
                    <NavLink to="/profile/settings" onClick={onClose} className="grid min-h-9 min-w-9 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700" aria-label="Profile settings">⚙</NavLink>
                    {(user?.role === "ADMIN" || user?.role === "ROLE_ADMIN") && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Admin</span>
                    )}
                    <button
                        onClick={() => { logout(); navigate("/login"); }}
                        className="ml-auto min-h-9 rounded px-3 py-1 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                        Log out
                    </button>
                </div>
            </div>
            </aside>
        </>
    );
}

export default Sidebar;
