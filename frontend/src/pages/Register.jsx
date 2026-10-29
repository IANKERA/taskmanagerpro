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
        <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
            <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md w-80 space-y-4"
            >
                <h2 className="text-xl font-bold dark:text-white">Create Account</h2>

                {error && (
                    <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                )}

                <input
                    type="text"
                    placeholder="Username"
                    required
                    className="w-full border p-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    required
                    minLength={8}
                    className="w-full border p-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
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
                    className="w-full bg-slate-900 dark:bg-blue-600 text-white py-2 rounded hover:bg-slate-800 dark:hover:bg-blue-700"
                >
                    Register
                </button>
            </form>
        </div>
    );
}
