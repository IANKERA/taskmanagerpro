import { useState, useCallback } from "react";
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

function Sidebar() {
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

    const linkCls = ({ isActive }) =>
        "block px-3 py-1.5 rounded text-sm transition-all " +
        (isActive
            ? "bg-slate-900 text-white dark:bg-slate-600"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700");

    const ProjectItem = ({ p }) => (
        <div className="flex items-center group">
            <NavLink
                to={`/projects/${p.key}/board`}
                className={({ isActive }) =>
                    "flex-1 block px-3 py-1.5 rounded-l text-sm transition-all " +
                    (isActive
                        ? "bg-slate-900 text-white dark:bg-slate-600"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700")
                }
            >
                <span className="font-mono text-xs mr-2 text-slate-500 dark:text-slate-400">{p.key}</span>
                {p.name}
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
        <aside className="w-64 h-screen bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-sm">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                    TaskManagerPro
                </span>
                <button
                    onClick={toggle}
                    className="text-lg leading-none text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    title={dark ? "Light mode" : "Dark mode"}
                >
                    {dark ? "☀️" : "🌙"}
                </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <NavLink to="/my-work" className={linkCls}>My Work</NavLink>
                <NavLink to="/notifications" className={({ isActive }) =>
                    "flex items-center justify-between px-3 py-1.5 rounded text-sm transition-all " +
                    (isActive
                        ? "bg-slate-900 text-white dark:bg-slate-600"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700")
                }>
                    <span>Notifications</span>
                    {notifCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {notifCount > 99 ? "99+" : notifCount}
                        </span>
                    )}
                </NavLink>
                <NavLink to="/search" className={linkCls}>Search</NavLink>
                <NavLink to="/projects" className={linkCls}>Projects</NavLink>
                <NavLink to="/workload" className={linkCls}>Workload</NavLink>

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
                        <NavLink to="/admin/users" className={linkCls}>Users</NavLink>
                        <NavLink to="/admin/audit-log" className={linkCls}>Audit Log</NavLink>
                        <NavLink to="/dashboard" className={linkCls}>Dashboard</NavLink>
                        <NavLink to="/settings"  className={linkCls}>Settings</NavLink>
                    </>
                )}
            </nav>

            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2 flex-wrap">
                    <NavLink to="/profile" className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600">{username}</NavLink>
                    <NavLink to="/profile/settings" className="text-slate-400 hover:text-blue-600">⚙</NavLink>
                    {(user?.role === "ADMIN" || user?.role === "ROLE_ADMIN") && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Admin</span>
                    )}
                    <button
                        onClick={() => { logout(); navigate("/login"); }}
                        className="ml-auto px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
