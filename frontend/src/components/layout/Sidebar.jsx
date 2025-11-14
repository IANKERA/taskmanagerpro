// src/components/layout/Sidebar.jsx
import { NavLink } from "react-router-dom";

function Sidebar() {
    const baseLinkClasses =
        "w-full block text-left px-3 py-2 rounded-lg text-sm transition-colors";

    return (
        <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
            <div className="h-16 flex items-center px-6 border-b border-slate-700">
        <span className="text-xl font-bold text-emerald-400">
          TaskManagerPro
        </span>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                        [
                            baseLinkClasses,
                            isActive
                                ? "bg-slate-800 text-slate-100 font-medium"
                                : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
                        ].join(" ")
                    }
                >
                    Dashboard
                </NavLink>

                <NavLink
                    to="/tasks"
                    className={({ isActive }) =>
                        [
                            baseLinkClasses,
                            isActive
                                ? "bg-slate-800 text-slate-100 font-medium"
                                : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
                        ].join(" ")
                    }
                >
                    My Tasks
                </NavLink>

                <NavLink
                    to="/teams"
                    className={({ isActive }) =>
                        [
                            baseLinkClasses,
                            isActive
                                ? "bg-slate-800 text-slate-100 font-medium"
                                : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
                        ].join(" ")
                    }
                >
                    Teams
                </NavLink>

                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        [
                            baseLinkClasses,
                            isActive
                                ? "bg-slate-800 text-slate-100 font-medium"
                                : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
                        ].join(" ")
                    }
                >
                    Settings
                </NavLink>
            </nav>

            <div className="px-4 py-4 border-t border-slate-700 text-xs text-slate-400">
                Logged in as{" "}
                <span className="font-semibold text-slate-200">Giannis</span>
            </div>
        </aside>
    );
}

export default Sidebar;
