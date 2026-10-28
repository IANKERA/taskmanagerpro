import { NavLink, Outlet, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProject } from "../api/projects";

/**
 * Wraps every /projects/:key/* route with a header showing project context
 * and a tab nav. The board/backlog children render through <Outlet />.
 */
export default function ProjectLayout() {
    const { projectKey } = useParams();
    const { data: project, isLoading, error } = useQuery({
        queryKey: ["project", projectKey],
        queryFn: () => getProject(projectKey),
    });

    if (isLoading) return <div className="p-6 text-slate-500">Loading project…</div>;
    if (error) return <div className="p-6 text-red-600">Project not found: {projectKey}</div>;

    const tab = ({ isActive }) =>
        "px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap " +
        (isActive
            ? "border-slate-900 dark:border-white text-slate-900 dark:text-white"
            : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300");

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-4">
                <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded">{project.key}</span>
                    <h1 className="text-xl font-semibold text-slate-900">{project.name}</h1>
                </div>
                {project.description && (
                    <p className="text-sm text-slate-500 mt-1">{project.description}</p>
                )}
            </div>

            <nav className="border-b border-slate-200 mb-6 flex gap-1">
                <NavLink to={`/projects/${projectKey}/board`} className={tab}>Board</NavLink>
                <NavLink to={`/projects/${projectKey}/backlog`} className={tab}>Backlog</NavLink>
                <NavLink to={`/projects/${projectKey}/sprints`} className={tab}>Sprints</NavLink>
                <NavLink to={`/projects/${projectKey}/calendar`} className={tab}>Calendar</NavLink>
                <NavLink to={`/projects/${projectKey}/analytics`} className={tab}>Analytics</NavLink>
                <NavLink to={`/projects/${projectKey}/time-report`} className={tab}>Time</NavLink>
                <NavLink to={`/projects/${projectKey}/timeline`} className={tab}>Timeline</NavLink>
                <NavLink to={`/projects/${projectKey}/activity`} className={tab}>Activity</NavLink>
                <NavLink to={`/projects/${projectKey}/settings`} className={tab}>Settings</NavLink>
            </nav>

            <Outlet context={{ project }} />
        </div>
    );
}
