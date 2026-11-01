import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
    const tabCls = ({ isActive }) =>
        "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors " +
        (isActive
            ? "border-slate-900 text-slate-900 dark:border-blue-500 dark:text-blue-400 font-semibold"
            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200");

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="border-b border-slate-200 dark:border-slate-700 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Administration
                            </h1>
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                Admin Area
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            System governance, platform overview, user access controls, and organization projects
                        </p>
                    </div>
                </div>

                <nav aria-label="Admin navigation" className="mt-6 flex gap-2 border-b border-slate-200 dark:border-slate-700 -mb-4">
                    <NavLink to="/admin" end className={tabCls}>
                        Overview
                    </NavLink>
                    <NavLink to="/admin/users" className={tabCls}>
                        Users
                    </NavLink>
                    <NavLink to="/admin/projects" className={tabCls}>
                        Projects
                    </NavLink>
                    <NavLink to="/admin/audit-log" className={tabCls}>
                        Audit Log
                    </NavLink>
                </nav>
            </header>

            <main>
                <Outlet />
            </main>
        </div>
    );
}

