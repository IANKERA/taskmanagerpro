import { useState } from "react";
import { loginRequest } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link} from "react-router-dom";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (isLoading) return;
        setError(null);
        setIsLoading(true);

        try {
            const data = await loginRequest(username, password);
            login(data.token);
            navigate("/projects");
        } catch (e) {
            setError("Invalid username or password");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 p-4 dark:bg-slate-900 sm:p-6">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-800 sm:p-8">
                <p className="mb-2 text-center text-sm font-medium text-blue-600 dark:text-blue-400">TaskManagerPro</p>
                <h1 className="mb-6 text-center text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h1>

                {error && (
                    <p className="text-red-600 dark:text-red-400 mb-4 text-center">{error}</p>
                )}

                <form onSubmit={handleSubmit}>
                    <label htmlFor="login-username" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Username</label>
                    <input
                        id="login-username"
                        type="text"
                        autoComplete="username"
                        required
                        className="mb-4 min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
                    <input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="mb-5 min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex min-h-12 w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span
                                    role="status"
                                    aria-label="Signing in"
                                    className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
                                />
                                Signing in…
                            </span>
                        ) : "Login"}
                    </button>
                </form>
                <div className="text-center mt-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        New user?{" "}
                        <Link
                            to="/register"
                            className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                        >
                            Create an account
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
