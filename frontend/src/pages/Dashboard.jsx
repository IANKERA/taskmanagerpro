import { useEffect, useState } from "react";
import TaskCard from "../components/tasks/TaskCard";
import { fetchTasks } from "../api/tasksApi";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


function Dashboard() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { user } = useAuth();
    const username = user?.username;
    const [taskToEdit, setTaskToEdit] = useState(null);



    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                setError("");

                const data = await fetchTasks();

                const normalized = data.content.map((task) => ({
                    id: task.id,
                    title: task.title || task.name || "Untitled task",
                    status: task.status || "To Do",
                    assignee: task.assignee?.username || task.assignee || "Unassigned",
                    priority: task.priority || "Medium",
                    dueDate: task.dueDate || "N/A",
                }));

                setTasks(normalized);
            } catch (err) {
                console.error("Failed to load tasks", err);
                setError("Failed to load tasks. Please try again.");
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    return (
        <div className="space-y-8">

            {/* Header section */}
            <section className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-slate-900">
                    Welcome back{username ? `, ${username}` : ""} 👋
                </h2>
                <p className="text-sm text-slate-600">
                    Here’s a quick overview of your ongoing work.
                </p>
            </section>

            {/* Create Task button */}
            <div className="flex justify-end">
                <Link
                    to="/create-task"
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 transition-colors"
                >
                    + Create Task
                </Link>
            </div>

            {/* Loading */}
            {loading && (
                <div className="text-sm text-slate-500">Loading tasks…</div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Tasks section */}
            {!loading && !error && (
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700">
                        Your tasks
                    </h3>

                    {tasks.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            No tasks found yet. Create your first task to get started.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    {...task}
                                    onDelete={(deletedId) =>
                                        setTasks((prev) => prev.filter((t) => t.id !== deletedId))
                                    }
                                />
                            ))}

                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

export default Dashboard;
