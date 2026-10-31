import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import CommandPalette from "../CommandPalette";
import KeyboardShortcutsHelp from "../KeyboardShortcutsHelp";
import GlobalQuickCreate from "../GlobalQuickCreate";

function Layout() {
    const location = useLocation();
    const [navigationOpen, setNavigationOpen] = useState(false);

    // For project routes, ProjectLayout renders its own header — keep the top bar minimal.
    const isProjectRoute = location.pathname.startsWith("/projects");
    const headerConfig = isProjectRoute
        ? { title: "", subtitle: "" }
        : ({
              "/my-work":   { title: "My Work", subtitle: "Your issues and activity" },
              "/dashboard": { title: "Dashboard", subtitle: "Overview" },
              "/tasks":     { title: "My Tasks", subtitle: "Tasks assigned to you" },
              "/teams":     { title: "Teams", subtitle: "Collaborate with your teammates" },
              "/settings":  { title: "Settings", subtitle: "Manage your preferences" },
          }[location.pathname] || { title: "TaskManagerPro", subtitle: "Stay organized" });

    return (
        <div className="min-h-[100dvh] flex bg-slate-50 dark:bg-slate-900 dark:text-slate-100">
            <CommandPalette />
            <KeyboardShortcutsHelp />
            <GlobalQuickCreate />
            <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />

            <div className="min-w-0 flex-1 flex flex-col">
                <Topbar
                    title={headerConfig.title}
                    subtitle={headerConfig.subtitle}
                    onOpenNavigation={() => setNavigationOpen(true)}
                />

                <main id="main-content" className="min-w-0 flex-1 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default Layout;
