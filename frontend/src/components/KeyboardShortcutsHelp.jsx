import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const SHORTCUTS = [
    { section: "Global" },
    { keys: "Ctrl+K", desc: "Open command palette" },
    { keys: "?", desc: "Show keyboard shortcuts" },
    { keys: "Esc", desc: "Close modal / dialog" },
    { keys: "C", desc: "Create issue (on board)" },
    { section: "Navigation" },
    { keys: "G then P", desc: "Go to Projects" },
    { keys: "G then M", desc: "Go to My Work" },
    { keys: "G then B", desc: "Go to Board (in project)" },
    { keys: "G then L", desc: "Go to Backlog (in project)" },
    { keys: "G then S", desc: "Go to Sprints (in project)" },
    { keys: "G then T", desc: "Go to Timeline (in project)" },
    { keys: "G then A", desc: "Go to Analytics (in project)" },
];

export default function KeyboardShortcutsHelp() {
    const [open, setOpen] = useState(false);
    const [gPending, setGPending] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const projectMatch = location.pathname.match(/\/projects\/([^/]+)/);
    const projectKey = projectMatch ? projectMatch[1] : null;

    const handler = useCallback((e) => {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) return;

        // ? toggle help
        if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setOpen((v) => !v);
            return;
        }
        if (e.key === "Escape") { setOpen(false); return; }

        // G combos
        if (gPending) {
            setGPending(false);
            const k = e.key.toLowerCase();
            const nav = {
                p: "/projects",
                m: "/my-work",
                b: projectKey && `/projects/${projectKey}/board`,
                l: projectKey && `/projects/${projectKey}/backlog`,
                s: projectKey && `/projects/${projectKey}/sprints`,
                t: projectKey && `/projects/${projectKey}/timeline`,
                a: projectKey && `/projects/${projectKey}/analytics`,
            }[k];
            if (nav) { e.preventDefault(); navigate(nav); }
            return;
        }

        if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
            setGPending(true);
            setTimeout(() => setGPending(false), 1500);
            return;
        }
    }, [gPending, navigate, projectKey]);

    useEffect(() => {
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [handler]);

    return (
        <>
            {/* G pending indicator */}
            {gPending && (
                <div className="fixed bottom-4 right-4 z-[101] bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg animate-pulse">
                    g → waiting for next key…
                </div>
            )}

            {/* Shortcuts modal */}
            {open && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center"
                    onClick={() => setOpen(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-700"
                    >
                        <h2 className="text-lg font-semibold mb-4 dark:text-white">Keyboard Shortcuts</h2>
                        <div className="space-y-2">
                            {SHORTCUTS.map((s, i) =>
                                s.section ? (
                                    <div key={i} className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider pt-2 first:pt-0">
                                        {s.section}
                                    </div>
                                ) : (
                                    <div key={s.keys} className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 dark:text-slate-300">{s.desc}</span>
                                        <kbd className="text-xs font-mono px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                            {s.keys}
                                        </kbd>
                                    </div>
                                )
                            )}
                        </div>
                        <div className="mt-5 text-center">
                            <button
                                onClick={() => setOpen(false)}
                                className="text-xs text-slate-400 hover:text-slate-600"
                            >
                                Press ? or Esc to close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
