import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
    const { token, isAdmin, authLoading } = useAuth();

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (authLoading) {
        return <div role="status" className="p-6 text-slate-500">Loading session…</div>;
    }

    if (adminOnly && !isAdmin) {
        return <Navigate to="/my-work" replace />;
    }

    return children;
}
