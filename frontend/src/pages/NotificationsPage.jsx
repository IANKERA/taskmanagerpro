import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markRead, markAllRead } from "../api/notifications";

export default function NotificationsPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: () => listNotifications(100),
    });

    const readMut = useMutation({
        mutationFn: markRead,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notifications"] });
            qc.invalidateQueries({ queryKey: ["unread-notif-count"] });
        },
    });

    const readAllMut = useMutation({
        mutationFn: markAllRead,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notifications"] });
            qc.invalidateQueries({ queryKey: ["unread-notif-count"] });
        },
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    Notifications
                    {unreadCount > 0 && (
                        <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                            ({unreadCount} unread)
                        </span>
                    )}
                </h1>
                {unreadCount > 0 && (
                    <button
                        onClick={() => readAllMut.mutate()}
                        disabled={readAllMut.isPending}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="text-slate-500">Loading...</div>
            ) : notifications.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 text-center">
                    <div className="text-4xl mb-3">🔔</div>
                    <div className="text-slate-700 dark:text-slate-200 font-medium">No notifications</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">You're all caught up!</div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700">
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                n.read
                                    ? "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                    : "bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            }`}
                            onClick={() => {
                                if (!n.read) readMut.mutate(n.id);
                                if (n.issueKey && n.projectKey) {
                                    navigate(`/projects/${n.projectKey}/board/${n.issueKey}`);
                                }
                            }}
                        >
                            {!n.read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900 dark:text-white">
                                    {n.title}
                                </div>
                                {n.message && (
                                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                                        {n.message}
                                    </div>
                                )}
                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2">
                                    {n.issueKey && (
                                        <span className="font-mono">{n.issueKey}</span>
                                    )}
                                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
