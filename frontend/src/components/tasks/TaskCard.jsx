// src/components/tasks/TaskCard.jsx
function TaskCard({ title, status, assignee, priority, dueDate }) {
    const statusColors = {
        "To Do": "bg-slate-100 text-slate-700",
        "In Progress": "bg-blue-100 text-blue-700",
        Done: "bg-emerald-100 text-emerald-700",
    };

    const priorityColors = {
        Low: "text-slate-500",
        Medium: "text-amber-600",
        High: "text-red-600",
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColors[status]}`}
                >
          {status}
        </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
          <span className={`font-semibold ${priorityColors[priority]}`}>
            {priority} priority
          </span>
                </div>
                <span>Due: {dueDate}</span>
            </div>

            <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                        {assignee?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="text-xs text-slate-600">{assignee}</span>
                </div>
            </div>
        </div>
    );
}

export default TaskCard;
