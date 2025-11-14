import { useAuth } from "../../context/AuthContext";

export default function Topbar({ title, subtitle }) {
    const { logout } = useAuth();

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
            {/* Left side: Page Title */}
            <div className="flex flex-col justify-center">
                <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                    {title}
                </h1>
                <p className="text-sm text-slate-500">{subtitle}</p>
            </div>

            {/* Right side: Actions */}
            <div className="ml-auto">
                <button
                    onClick={logout}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 transition-colors"
                >
                    Logout
                </button>
            </div>
        </header>
    );
}
