// src/pages/Dashboard.jsx
import TaskCard from "../components/tasks/TaskCard";

const mockTasks = [
    {
        id: 1,
        title: "Implement user authentication (backend + frontend)",
        status: "In Progress",
        assignee: "Giannis",
        priority: "High",
        dueDate: "2025-11-20",
    },
    {
        id: 2,
        title: "Design database schema for projects & tasks",
        status: "To Do",
        assignee: "Giannis",
        priority: "Medium",
        dueDate: "2025-11-25",
    },
    {
        id: 3,
        title: "Create React layout for Task board",
        status: "Done",
        assignee: "Giannis",
        priority: "Low",
        dueDate: "2025-11-10",
    },
];

function Dashboard() {
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

            {/* Task grid */}
            <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Your tasks
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mockTasks.map((task) => (
                        <TaskCard key={task.id} {...task} />
                    ))}
                </div>
            </section>
        </div>
    );
}

export default Dashboard;
