import { deleteTask } from "../../api/tasksApi";

function TaskCard({ id, title, status, priority, dueDate, assignee, onDelete }) {
    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this task?")) return;

        try {
            await deleteTask(id);
            onDelete(id); // ενημερώνει το parent component ότι διαγράφηκε
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

            <button
                onClick={handleDelete}
                className="mt-3 px-4 py-1.5 bg-red-600 text-white text-sm rounded shadow hover:bg-red-700"
            >
                Delete
            </button>
        </div>
    );
}

export default TaskCard;
