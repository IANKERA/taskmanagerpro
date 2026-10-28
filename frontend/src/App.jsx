import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import CreateTask from "./pages/CreateTask";
import MyTasks from "./pages/MyTasks";
import Teams from "./pages/Teams";
import Settings from "./pages/Settings";
import EditTask from "./pages/EditTask";

// M6 — new Jira-style routes
import Projects from "./pages/Projects";
import ProjectLayout from "./pages/ProjectLayout";
import BoardView from "./pages/BoardView";
import BacklogView from "./pages/BacklogView";
import SprintsView from "./pages/SprintsView";
import ProjectSettings from "./pages/ProjectSettings";
import IssueModal from "./pages/IssueModal";
import MyWork from "./pages/MyWork";
import UserAdmin from "./pages/UserAdmin";
import Profile from "./pages/Profile";
import ProfileSettings from "./pages/ProfileSettings";
import CalendarView from "./pages/CalendarView";
import ActivityFeed from "./pages/ActivityFeed";
import AnalyticsView from "./pages/AnalyticsView";
import TimeReportView from "./pages/TimeReportView";
import SearchPage from "./pages/SearchPage";
import TimelineView from "./pages/TimelineView";
import NotificationsPage from "./pages/NotificationsPage";
import WorkloadPage from "./pages/WorkloadPage";
import AuditLogPage from "./pages/AuditLogPage";

function App() {
    return (
        <Routes>
            {/* Root → /projects if logged in (handled by ProtectedRoute), else /login */}
            <Route path="/" element={<Navigate to="/my-work" replace />} />

            {/* Public */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected app shell */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                {/* M8 — dashboard */}
                <Route path="/my-work" element={<MyWork />} />
                {/* M6 routes */}
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/workload" element={<WorkloadPage />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:projectKey" element={<ProjectLayout />}>
                    <Route index element={<Navigate to="board" replace />} />
                    <Route path="board" element={<BoardView />}>
                        {/* nested modal route */}
                        <Route path=":issueKey" element={<IssueModal />} />
                    </Route>
                    <Route path="backlog" element={<BacklogView />} />
                    <Route path="sprints"  element={<SprintsView />} />
                    <Route path="calendar" element={<CalendarView />} />
                    <Route path="analytics" element={<AnalyticsView />} />
                    <Route path="time-report" element={<TimeReportView />} />
                    <Route path="timeline" element={<TimelineView />} />
                    <Route path="activity" element={<ActivityFeed />} />
                    <Route path="settings" element={<ProjectSettings />} />
                </Route>

                {/* Profile + Admin */}
                <Route path="/profile"          element={<Profile />} />
                <Route path="/profile/settings" element={<ProfileSettings />} />
                <Route path="/admin/users"    element={<UserAdmin />} />
                <Route path="/admin/audit-log" element={<AuditLogPage />} />
                {/* Legacy pages — kept available but no longer linked prominently */}
                <Route path="/dashboard"      element={<Dashboard />} />
                <Route path="/tasks"          element={<MyTasks />} />
                <Route path="/create-task"    element={<CreateTask />} />
                <Route path="/edit-task/:id"  element={<EditTask />} />
                <Route path="/teams"          element={<Teams />} />
                <Route path="/settings"       element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

export default App;
