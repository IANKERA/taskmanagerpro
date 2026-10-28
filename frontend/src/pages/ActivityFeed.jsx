import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProjectActivity } from "../api/activity";

const TYPE_ICON = {
    CREATED: "🆕",
    FIELD_CHANGED: "✏️",
    COMMENTED: "💬",
    ASSIGNED: "👤",
    UNASSIGNED: "👤",
};

const TYPE_LABEL = {
    CREATED: "created",
    FIELD_CHANGED: "changed",
    COMMENTED: "commented on",
    ASSIGNED: "assigned",
    UNASSIGNED: "unassigned",
};

function formatValue(field, val) {
    if (val == null) return "none";
    if (field === "description") return "(updated)";
    return val;
}

export default function ActivityFeed() {
    const { projectKey } = useParams();
    const navigate = useNavigate();

    const { data: activity = [], isLoading } = useQuery({
        queryKey: ["projectActivity", projectKey],
        queryFn: () => getProjectActivity(projectKey),
        refetchInterval: 30000,
    });

    if (isLoading) return <div className="text-slate-500">Loading…</div>;

    // Group by date
    const grouped = {};
    for (const a of activity) {
        const date = new Date(a.at).toLocaleDateString("en-US", {
            weekday: "long", month: "short", day: "numeric",
        });
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(a);
    }

    return (
        <div className="max-w-3xl">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Activity Feed</h2>

            {activity.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">No activity yet.</div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([date, items]) => (
                        <div key={date}>
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 sticky top-0 bg-white dark:bg-slate-900 py-1">
                                {date}
                            </div>
                            <div className="space-y-1">
                                {items.map((a) => (
                                    <div
                                        key={a.id}
                                        className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <span className="text-sm mt-0.5">{TYPE_ICON[a.activityType] || "📝"}</span>
                                        <div className="flex-1 min-w-0 text-sm">
                                            <span className="font-medium text-slate-900 dark:text-white">
                                                {a.actorUsername || "system"}
                                            </span>{" "}
                                            <span className="text-slate-600 dark:text-slate-400">
                                                {TYPE_LABEL[a.activityType] || a.activityType}
                                            </span>{" "}
                                            {a.issueKey && (
                                                <button
                                                    onClick={() => navigate(`/projects/${projectKey}/board/${a.issueKey}`)}
                                                    className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    {a.issueKey}
                                                </button>
                                            )}
                                            {a.field && a.activityType === "FIELD_CHANGED" && (
                                                <span className="text-slate-500 dark:text-slate-400">
                                                    {" "}— {a.field}:{" "}
                                                    <span className="line-through text-slate-400">{formatValue(a.field, a.oldValue)}</span>
                                                    {" → "}
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatValue(a.field, a.newValue)}</span>
                                                </span>
                                            )}
                                            {a.activityType === "ASSIGNED" && (
                                                <span className="text-slate-500 dark:text-slate-400">
                                                    {" → "}<span className="font-medium text-slate-700 dark:text-slate-300">{a.newValue}</span>
                                                </span>
                                            )}
                                            {a.message && !["CREATED"].includes(a.activityType) && (
                                                <span className="text-slate-400 dark:text-slate-500"> — {a.message}</span>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                            {new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
