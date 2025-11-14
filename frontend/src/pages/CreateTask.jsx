import { useState } from "react";

function CreateTask() {
    const [form, setForm] = useState({
        title: "",
        description: "",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: "",
    });

    const [error, setError] = useState("");

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const token = localStorage.getItem("token");

            const response = await fetch("http://localhost:8080/api/tasks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            if (!response.ok) {
                throw new Error("Failed to create task");
            }

            window.location.href = "/";
        } catch (err) {
            console.error("Error creating task:", err);
            setError("Could not create task. Check your fields or try again.");
        }
    };

    return (
        <div className="max-w-lg bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-bold mb-4">Create a New Task</h2>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-3">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    name="title"
                    placeholder="Task title"
                    className="w-full border p-2 rounded"
                    value={form.title}
                    onChange={handleChange}
                    required
                />

                <textarea
                    name="description"
                    placeholder="Description"
                    className="w-full border p-2 rounded"
                    rows="3"
                    value={form.description}
                    onChange={handleChange}
                />

                <select
                    name="priority"
                    className="w-full border p-2 rounded"
                    value={form.priority}
                    onChange={handleChange}
                >
                    <option>LOW</option>
                    <option>MEDIUM</option>
                    <option>HIGH</option>
                </select>

                <select
                    name="status"
                    className="w-full border p-2 rounded"
                    value={form.status}
                    onChange={handleChange}
                >
                    <option>PENDING</option>
                    <option>IN_PROGRESS</option>
                    <option>DONE</option>
                </select>

                <input
                    type="date"
                    name="dueDate"
                    className="w-full border p-2 rounded"
                    value={form.dueDate}
                    onChange={handleChange}
                />

                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow"
                >
                    Create Task
                </button>
            </form>
        </div>
    );
}

export default CreateTask;
