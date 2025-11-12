
function Topbar() {
    return (
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6">
            <div>
                <h1 className="text-lg font-semibold text-slate-800">
                    Dashboard
                </h1>
                <p className="text-xs text-slate-500">
                    Overview of your projects and tasks
                </p>
            </div>

            <div className="flex items-center gap-4">
                <button className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                    New Task
                </button>
                <div className="w-8 h-8 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center text-sm font-bold">
                    G
                </div>
            </div>
        </header>
    );
}

export default Topbar;
