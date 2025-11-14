import { NavLink } from "react-router-dom";

function Sidebar() {
    const baseClasses =
        "block px-3 py-2 rounded-lg text-sm font-medium transition-colors";

    return (
        <aside className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col">
            {/* Logo / Title */}
            <div className="h-16 flex items-center px-6 border-b border-slate-200">
                <span className="text-lg font-semibold text-slate-900 tracking-tight">
                    TaskManagerPro
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1">
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                        [
                            baseClasses,
                            isActive
                                ? "bg-slate-900 text-white"
                                : "text-slate-700 hover:bg-slate-100",
                        ].join(" ")
                    }
                >
                    Dashboard
                </NavLink>

                <NavLink
                    to="/tasks"
                    className={({ isActive }) =>
                        [
                            baseClasses,
                            isActive
                                ? "bg-slate-900 text-white"
                                : "text-slate-700 hover:bg-slate-100",
                        ].join(" ")
                    }
                >
                    My Tasks
                </NavLink>

                <NavLink
                    to="/teams"
                    className={({ isActive }) =>
                        [
                            baseClasses,
                            isActive
                                ? "bg-slate-900 text-white"
                                : "text-slate-700 hover:bg-slate-100",
                        ].join(" ")
                    }
                >
                    Teams
                </NavLink>

                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        [
                            baseClasses,
                            isActive
                                ? "bg-slate-900 text-white"
                                : "text-slate-700 hover:bg-slate-100",
                        ].join(" ")
                    }
                >
                    Settings
                </NavLink>
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-slate-200 text-xs text-slate-500">
                Logged in as{" "}
                <span className="font-semibold text-slate-800">Giannis</span>
            </div>
        </aside>
    );
}

export default Sidebar;
