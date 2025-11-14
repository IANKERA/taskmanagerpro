// src/pages/MyTasks.jsx
import { useEffect, useState } from "react";
import { fetchTasks } from "../api/tasksApi";
import TaskCard from "../components/tasks/TaskCard";

function MyTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                setError("");

                const data = await fetchTasks();

                const normalized = data.content.map((task) => ({
                    id: task.id,
                    title: task.title || "Untitled task",
                    status: task.status || "TODO",
                    assignee: task.userId ? `User #${task.userId}` : "Unassigned",
                    priority: task.priority || "MEDIUM",
                    dueDate: task.dueDate || "N/A",
                }));

                setTasks(normalized);
            } catch (err) {
                console.error("Failed to load tasks", err);
                setError("Failed to load your tasks.");
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    return (
        <div className="space-y-6">
            <section className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-slate-900">My Tasks</h2>
                <p className="text-sm text-slate-600">
                    Tasks assigned to you across all projects.
                </p>
            </section>

            {loading && (
                <p className="text-sm text-slate-500">Loading tasks…</p>
            )}

            {error && !loading && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <>
                    {tasks.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            You don&apos;t have any tasks yet.
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
                </>
            )}
        </div>
    );
}

export default MyTasks;
