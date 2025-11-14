import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import MyTasks from "./pages/MyTasks";
import Teams from "./pages/Teams";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import CreateTask from "./pages/CreateTask";
import ProtectedRoute from "./components/auth/ProtectedRoute";

function App() {
    return (
        <Routes>

            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Protected pages wrapped by Layout */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                {/* Default route => Dashboard */}
                <Route index element={<Dashboard />} />

                <Route path="tasks" element={<MyTasks />} />
                <Route path="create-task" element={<CreateTask />} />
                <Route path="teams" element={<Teams />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    );
}

export default App;
