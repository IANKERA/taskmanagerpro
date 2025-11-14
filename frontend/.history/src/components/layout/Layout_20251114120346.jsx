import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function Layout() {
    const location = useLocation();

    const headerConfig = {
        "/": {
            title: "Dashboard",
            subtitle: "Overview of your projects and tasks",
        },
        "/tasks": {
            title: "My Tasks",
            subtitle: "Tasks assigned to you",
        },
        "/teams": {
            title: "Teams",
            subtitle: "Collaborate with your teammates",
        },
        "/settings": {
            title: "Settings",
            subtitle: "Manage your preferences",
        },
    }[location.pathname] || {
        title: "TaskManagerPro",
        subtitle: "Stay organized",
    };

    return (
        <div className="min-h-screen flex bg-slate-100">
            <Sidebar />

            <div className="flex-1 flex flex-col">
                <Topbar title={headerConfig.title} subtitle={headerConfig.subtitle} />

                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default Layout;
