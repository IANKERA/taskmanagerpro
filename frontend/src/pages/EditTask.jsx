import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchTaskById, updateTask } from "../api/tasksApi";

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

    const handleUpdate = async (e) => {
        e.preventDefault();

        try {
            await updateTask(id, task);
            navigate("/dashboard");
        } catch (err) {
            console.error("Failed to update", err);
            alert("Update failed");
        }
    };

    if (loading) return <p>Loading task…</p>;
    if (error) return <p className="text-red-600">{error}</p>;
    if (!task) return <p>Task not found</p>;

    return (
        <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Edit Task</h2>

            <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                        type="text"
                        className="w-full border rounded p-2"
                        value={task.title}
                        onChange={(e) =>
                            setTask({ ...task, title: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        className="w-full border rounded p-2"
                        value={task.description || ""}
                        onChange={(e) =>
                            setTask({ ...task, description: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                        className="w-full border rounded p-2"
                        value={task.status}
                        onChange={(e) =>
                            setTask({ ...task, status: e.target.value })
                        }
                    >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                    </select>
                </div>

                <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                    Save Changes
                </button>
            </form>
        </div>
    );
}

export default EditTask;
