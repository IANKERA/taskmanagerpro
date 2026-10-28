import { useNavigate, useParams } from "react-router-dom";
import Avatar from "../Avatar";

const TYPE_BADGES = {
    STORY: { bg: "bg-green-100", text: "text-green-700", label: "Story" },
    BUG:   { bg: "bg-red-100",   text: "text-red-700",   label: "Bug" },
    EPIC:  { bg: "bg-purple-100",text: "text-purple-700",label: "Epic" },
    TASK:  { bg: "bg-blue-100",  text: "text-blue-700",  label: "Task" },
};

const PRIORITY_DOT = {
    HIGH:   "bg-red-500",
    MEDIUM: "bg-amber-400",
    LOW:    "bg-slate-300",
};

export default function IssueCard({ issue, selectable, selected, onToggle }) {
    const navigate = useNavigate();
    const { projectKey } = useParams();
    const type = TYPE_BADGES[issue.issueType] || TYPE_BADGES.TASK;

    return (
        <div className="relative group">
            {selectable && (
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => { e.stopPropagation(); onToggle(issue.issueKey); }}
                    className="absolute top-2 left-2 z-10 w-4 h-4 accent-slate-900 cursor-pointer"
                />
            )}
            <button
                onClick={() => navigate(`/projects/${projectKey}/board/${issue.issueKey}`)}
                className={`w-full text-left bg-white dark:bg-slate-800 border rounded-md p-3 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm transition ${
                    selected ? "border-slate-900 ring-1 ring-slate-900 dark:border-slate-400 dark:ring-slate-400" : "border-slate-200 dark:border-slate-700"
                } ${selectable ? "pl-8" : ""}`}
            >
                <div className="flex items-center gap-2 mb-2">
                    <span className={`px-1.5 py-0.5 text-[10px] uppercase font-semibold rounded ${type.bg} ${type.text}`}>
                        {type.label}
                    </span>
                    <span className="font-mono text-xs text-slate-500">{issue.issueKey}</span>
                    <span
                        className={`ml-auto w-2 h-2 rounded-full ${PRIORITY_DOT[issue.priority] || "bg-slate-300"}`}
                        title={`Priority: ${issue.priority}`}
                    />
                </div>
                <div className="text-sm text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">{issue.title}</div>

                {issue.labels?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {issue.labels.map((l) => (
                            <span
                                key={l.id}
                                className="text-[10px] px-1.5 py-0.5 rounded text-white"
                                style={{ backgroundColor: l.color }}
                            >
                                {l.name}
                            </span>
                        ))}
                    </div>
                )}

                {issue.parentIssueKey && (
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono mb-1">
                        Epic: {issue.parentIssueKey}
                    </div>
                )}

                {issue.issueType === "EPIC" && issue.childCount > 0 && (
                    <div className="mb-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                            <span>{issue.childDoneCount}/{issue.childCount} done</span>
                            <span>{Math.round((issue.childDoneCount / issue.childCount) * 100)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full">
                            <div
                                className="h-1.5 bg-purple-500 rounded-full transition-all"
                                style={{ width: `${(issue.childDoneCount / issue.childCount) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                        {issue.assigneeUsername ? (
                            <>
                                <Avatar username={issue.assigneeUsername} size="xs" />
                                <span>{issue.assigneeUsername}</span>
                            </>
                        ) : (
                            <span className="text-slate-400 dark:text-slate-500">Unassigned</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {issue.dueDate && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                issue.status === "DONE" ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                                new Date(issue.dueDate) < new Date() ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                                new Date(issue.dueDate) < new Date(Date.now() + 3 * 86400000) ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                                "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}>
                                {new Date(issue.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                        )}
                        {issue.storyPoints != null && (
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                {issue.storyPoints} SP
                            </span>
                        )}
                    </div>
                </div>
            </button>
        </div>
    );
}
