import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Topbar({ title, subtitle }) {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();          // clears token + user
        navigate("/login"); // redirect
    };

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">

            <div>
                <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
                <p className="text-sm text-slate-500">{subtitle}</p>
            </div>

            <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm hover:bg-slate-800 transition-all"
            >
                Logout
            </button>
        </header>
    );
}
