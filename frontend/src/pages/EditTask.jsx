import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchTaskById } from "../api/tasksApi";
import { updateIssue } from "../api/issues";
import AssigneeSelect from "../components/AssigneeSelect";

function EditTask() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadTask() {
            try {
                setLoading(true);
                const data = await fetchTaskById(id);
                setTask(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load task");
            } finally {
                setLoading(false);
            }
        }

        loadTask();
    }, [id]);

    const handleUpdate = async (event) => {
        event.preventDefault();
        setError("");

        try {
            await updateIssue(task.issueKey, {
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                assigneeUsername: task.assigneeUsername || "",
            });
            navigate("/dashboard");
        } catch (err) {
            console.error("Failed to update", err);
            setError(err.message || "Update failed");
        }
    };

    if (loading) return <p>Loading task…</p>;
    if (error && !task) return <p role="alert" className="text-red-600">{error}</p>;
    if (!task) return <p>Task not found</p>;

    return (
        <div className="app-surface mx-auto w-full max-w-lg p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Edit Task</h2>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Title</label>
                    <input
                        type="text"
                        className="w-full border rounded p-2 dark:bg-slate-700 dark:text-white"
                        value={task.title || ""}
                        onChange={(event) => setTask({ ...task, title: event.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Description</label>
                    <textarea
                        className="w-full border rounded p-2 dark:bg-slate-700 dark:text-white"
                        value={task.description || ""}
                        onChange={(event) => setTask({ ...task, description: event.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Status</label>
                    <select
                        className="w-full border rounded p-2 dark:bg-slate-700 dark:text-white"
                        value={task.status}
                        onChange={(event) => setTask({ ...task, status: event.target.value })}
                    >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                    </select>
                </div>

                <AssigneeSelect
                    projectKey={task.projectKey}
                    value={task.assigneeUsername || ""}
                    onChange={(assigneeUsername) => setTask({ ...task, assigneeUsername })}
                />

                <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                    Save Changes
                </button>
            </form>
        </div>
    );
}

export default EditTask;
