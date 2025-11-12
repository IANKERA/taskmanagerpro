function Sidebar() {
    return (
        <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
            <div className="h-16 flex items-center px-6 border-b border-slate-700">
        <span className="text-xl font-bold text-emerald-400">
          TaskManagerPro
        </span>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
                <button className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 text-slate-100 font-medium">
                    Dashboard
                </button>
                <button className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-100">
                    My Tasks
                </button>
                <button className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-100">
                    Teams
                </button>
                <button className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-100">
                    Settings
                </button>
            </nav>

            <div className="px-4 py-4 border-t border-slate-700 text-xs text-slate-400">
                Logged in as <span className="font-semibold text-slate-200">Giannis</span>
            </div>
        </aside>
    );
}

export default Sidebar;
