import { deleteTask } from "../../api/tasksApi";
import { Link } from "react-router-dom";

function TaskCard({ id, title, status, priority, dueDate, assignee, onDelete, onEdit }) {

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
        <div className="bg-white shadow p-4 rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold">{title}</h3>

            <p className="text-sm text-slate-600 mt-1">
                Status: <strong>{status}</strong>
            </p>

            <p className="text-sm text-slate-600">
                Priority: <strong>{priority}</strong>
            </p>

            <p className="text-sm text-slate-600">
                Due: {dueDate || "No date"}
            </p>

            <div className="flex gap-2 mt-3">
                <button
                    onClick={handleDelete}
                    className="px-4 py-1.5 bg-red-600 text-white text-sm rounded shadow hover:bg-red-700"
                >
                    Delete
                </button>

                <Link
                    to={`/edit-task/${id}`}
                    className="mt-2 px-4 py-1.5 bg-blue-600 text-white text-sm rounded shadow hover:bg-blue-700 inline-block"
                >
                    Edit
                </Link>
            </div>
        </div>
    );
}

export default TaskCard;
