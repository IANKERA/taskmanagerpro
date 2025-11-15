import { useState } from "react";
import { registerRequest } from "../api/authApi";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);

        try {
            await registerRequest(username, password);
            alert("Registration successful!");
            navigate("/login");
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-6 rounded-lg shadow-md w-80 space-y-4"
            >
                <h2 className="text-xl font-bold">Create Account</h2>

                {error && (
                    <p className="text-red-600 text-sm">{error}</p>
                )}

                <input
                    type="text"
                    placeholder="Username"
                    className="w-full border p-2 rounded"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    className="w-full border p-2 rounded"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    className="w-full bg-slate-900 text-white py-2 rounded hover:bg-slate-800"
                >
                    Register
                </button>
            </form>
        </div>
    );
}
