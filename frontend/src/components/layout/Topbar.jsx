import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchIssues } from "../../api/search";
import { listNotifications, unreadCount, markRead, markAllRead } from "../../api/notifications";

export default function Topbar({ title, subtitle }) {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shadow-sm gap-4">
            <div className="shrink-0">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
                {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>

            <SearchBar />

            <div className="flex items-center gap-3 shrink-0">
                <NotificationBell />
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm hover:bg-slate-800 transition-all"
                >
                    Logout
                </button>
            </div>
        </header>
    );
}

function SearchBar() {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        clearTimeout(timerRef.current);
        if (val.trim().length < 2) { setResults([]); setOpen(false); return; }
        timerRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await searchIssues(val.trim());
                setResults(data.slice(0, 8));
                setOpen(true);
            } catch { setResults([]); }
            setLoading(false);
        }, 300);
    };

    const go = (issue) => {
        setOpen(false);
        setQuery("");
        navigate(`/projects/${issue.projectKey}/board/${issue.issueKey}`);
    };

    return (
        <div ref={ref} className="relative flex-1 max-w-md">
            <input
                type="text"
                value={query}
                onChange={handleChange}
                onFocus={() => results.length > 0 && setOpen(true)}
                placeholder="Search issues… (Ctrl+K)"
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            {open && (
                <div className="absolute top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                    {loading && <div className="px-3 py-2 text-xs text-slate-500">Searching…</div>}
                    {!loading && results.length === 0 && (
                        <div className="px-3 py-2 text-xs text-slate-500">No results</div>
                    )}
                    {results.map((r) => (
                        <button
                            key={r.id}
                            onClick={() => go(r)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm"
                        >
                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0">{r.issueKey}</span>
                            <span className="truncate text-slate-800 dark:text-slate-200">{r.title}</span>
                            <span className="ml-auto text-xs text-slate-400 shrink-0">{r.projectKey}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function NotificationBell() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const { data: count = 0 } = useQuery({
        queryKey: ["notif-count"],
        queryFn: unreadCount,
        refetchInterval: 30000, // poll every 30s
    });

    const { data: notifications = [] } = useQuery({
        queryKey: ["notifications"],
        queryFn: () => listNotifications(20),
        enabled: open,
    });

    const markReadMut = useMutation({
        mutationFn: markRead,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notifications"] });
            qc.invalidateQueries({ queryKey: ["notif-count"] });
        },
    });

    const markAllMut = useMutation({
        mutationFn: markAllRead,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notifications"] });
            qc.invalidateQueries({ queryKey: ["notif-count"] });
        },
    });

    useEffect(() => {
        const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const goToIssue = (n) => {
        if (!n.read) markReadMut.mutate(n.id);
        setOpen(false);
        if (n.projectKey && n.issueKey) {
            navigate(`/projects/${n.projectKey}/board/${n.issueKey}`);
        }
    };

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition"
                title="Notifications"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center min-w-[18px] px-1">
                        {count > 99 ? "99+" : count}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-sm font-semibold text-slate-800 dark:text-white">Notifications</span>
                        {count > 0 && (
                            <button
                                onClick={() => markAllMut.mutate()}
                                className="text-xs text-blue-600 hover:text-blue-800"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-slate-400">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => goToIssue(n)}
                                    className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 ${
                                        n.read ? "" : "bg-blue-50/50 dark:bg-blue-900/20"
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                                        <div className={`flex-1 min-w-0 ${n.read ? "ml-4" : ""}`}>
                                            <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{n.title}</div>
                                            {n.message && (
                                                <div className="text-[11px] text-slate-500 truncate mt-0.5">{n.message}</div>
                                            )}
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                {new Date(n.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
