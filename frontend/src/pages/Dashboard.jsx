// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import TaskCard from "../components/tasks/TaskCard";
import { fetchTasks } from "../api/tasksApi";

function Dashboard() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadTasks() {
            try {
                setLoading(true);
                setError("");

                const data = await fetchTasks();

                // 🔧 Adjust this mapping to match your backend's Task DTO shape
                const normalized = data.map((task) => ({
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

        loadTasks();
    }, []);

    return (
        <div className="space-y-6">
            {/* Top section */}
            <section className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-slate-800">
                    Welcome back, Giannis 👋
                </h2>
                <p className="text-sm text-slate-500">
                    Here’s a quick overview of your current work.
                </p>
            </section>

            {/* Status messages */}
            {loading && (
                <div className="text-sm text-slate-500">
                    Loading tasks...
                </div>
            )}

            {error && !loading && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                </div>
            )}

            {/* Tasks grid */}
            {!loading && !error && (
                <section>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                        Your tasks
                    </h3>

                    {tasks.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            No tasks found yet. Create your first task to get started.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tasks.map((task) => (
                                <TaskCard key={task.id} {...task} />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

export default Dashboard;
