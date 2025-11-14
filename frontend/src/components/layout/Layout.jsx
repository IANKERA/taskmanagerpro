// src/components/layout/Layout.jsx
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function Layout({ children }) {
    const location = useLocation();

    const getHeaderConfig = () => {
        switch (location.pathname) {
            case "/":
                return {
                    title: "Dashboard",
                    subtitle: "Overview of your projects and tasks",
                };
            case "/tasks":
                return {
                    title: "My Tasks",
                    subtitle: "Tasks assigned to you across all projects",
                };
            case "/teams":
                return {
                    title: "Teams",
                    subtitle: "Collaborate with your team members",
                };
            case "/settings":
                return {
                    title: "Settings",
                    subtitle: "Manage your account and app preferences",
                };
            default:
                return {
                    title: "TaskManagerPro",
                    subtitle: "Stay organized and in control",
                };
        }
    };

    const headerConfig = getHeaderConfig();

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar */}
            <Sidebar />

            {/* Main area */}
            <div className="flex-1 flex flex-col">
                <Topbar title={headerConfig.title} subtitle={headerConfig.subtitle} />

                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default Layout;
