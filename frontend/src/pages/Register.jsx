import { useState } from "react";
import { registerRequest } from "../api/authApi";
import { useNavigate } from "react-router-dom";

export function getPasswordValidationMessage(password) {
    if (!password) return null;
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
    if (!/\d/.test(password)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password must contain at least one special character.";
    return null;
}

export default function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);

        const passwordError = getPasswordValidationMessage(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        try {
            await registerRequest(username, password);
            alert("Registration successful!");
            navigate("/login");
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 p-4 dark:bg-slate-900 sm:p-6">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-800 sm:p-8"
            >
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">TaskManagerPro</p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create your account</h2>

                {error && (
                    <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                )}

                <input
                    type="text"
                    placeholder="Username"
                    required
                    autoComplete="username"
                    aria-label="Username"
                    className="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    aria-label="Password"
                    className="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={Boolean(getPasswordValidationMessage(password))}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Use at least 8 characters, including uppercase and lowercase letters, a number, and a special character.
                </p>
                {getPasswordValidationMessage(password) && (
                    <p role="status" className="text-red-600 dark:text-red-400 text-xs">
                        {getPasswordValidationMessage(password)}
                    </p>
                )}

                <button
                    className="min-h-12 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                    Register
                </button>
            </form>
        </main>
    );
}
