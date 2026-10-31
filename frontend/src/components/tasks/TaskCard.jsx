import { deleteTask } from "../../api/tasksApi";
import { Link } from "react-router-dom";

function TaskCard({ id, title, status, priority, dueDate, assignee, assigneeUsername, username, onDelete, onEdit }) {
    const assignedTo = assigneeUsername || username || assignee?.username || "";

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this task?")) return;

        try {
            await deleteTask(id);
            onDelete(id);
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Could not delete task.");
        }
    };

    return (
        <article className="app-surface flex min-w-0 flex-col p-4 sm:p-5">
            <h3 className="break-words text-base font-semibold text-slate-900 dark:text-white">{title}</h3>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div><dt className="text-xs text-slate-400">Status</dt><dd className="truncate font-medium">{status}</dd></div>
                <div><dt className="text-xs text-slate-400">Priority</dt><dd className="truncate font-medium">{priority}</dd></div>
                <div><dt className="text-xs text-slate-400">Due</dt><dd className="truncate">{dueDate || "No date"}</dd></div>
                <div><dt className="text-xs text-slate-400">Assignee</dt><dd className="truncate">{assignedTo || "Unassigned"}</dd></div>
            </dl>

            <div className="mt-4 flex gap-2">
                <button
                    onClick={handleDelete}
                    className="min-h-11 flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                    Delete
                </button>

                <Link
                    to={`/edit-task/${id}`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Edit
                </Link>
            </div>
        </article>
    );
}

export default TaskCard;
