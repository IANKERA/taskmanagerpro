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

function App() {
    return (
        <Routes>
            {/* Redirect root → login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/edit-task/:id" element={<EditTask />} />
                <Route path="/tasks" element={<MyTasks />} />
                <Route path="/create-task" element={<CreateTask />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

export default App;
