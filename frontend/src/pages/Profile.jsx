import { useAuth } from "../context/AuthContext";
import ChangePasswordForm from "../components/profile/ChangePasswordForm";
import { Link } from "react-router-dom";

export default function Profile() {
    const { user } = useAuth();

    return (
        <div className="page-container max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>
                <Link
                    to="/profile/settings"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    Profile Settings &rarr;
                </Link>
            </div>

            <div className="app-surface rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
                        {(user?.username || "?")[0].toUpperCase()}
                    </div>
                    <div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">{user?.username}</div>
                        {user?.email && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                        )}
                        <div className="mt-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                (user?.role || "").includes("ADMIN")
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            }`}>
                                {(user?.role || "").replace("ROLE_", "")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <ChangePasswordForm />
        </div>
    );
}
