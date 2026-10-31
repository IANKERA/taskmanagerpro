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
        <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
            <div className="bg-white dark:bg-slate-800 shadow-lg p-8 rounded-lg w-96">
                <h1 className="text-2xl font-bold text-center mb-6 dark:text-white">Login</h1>

                {error && (
                    <p className="text-red-600 dark:text-red-400 mb-4 text-center">{error}</p>
                )}

                <form onSubmit={handleSubmit}>
                    <label className="block mb-2 dark:text-slate-200">Username</label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded mb-4 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <label className="block mb-2 dark:text-slate-200">Password</label>
                    <input
                        type="password"
                        className="w-full p-2 border rounded mb-4 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
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
        </div>
    );
}
