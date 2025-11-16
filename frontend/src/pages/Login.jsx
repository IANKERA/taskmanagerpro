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

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);

        try {
            const data = await loginRequest(username, password);
            login(data.token);
            navigate("/dashboard");
        } catch (e) {
            setError("Invalid username or password");
        }
    }

    return (
        <div className="flex items-center justify-center h-screen bg-slate-100">
            <div className="bg-white shadow-lg p-8 rounded-lg w-96">
                <h1 className="text-2xl font-bold text-center mb-6">Login</h1>

                {error && (
                    <p className="text-red-600 mb-4 text-center">{error}</p>
                )}

                <form onSubmit={handleSubmit}>
                    <label className="block mb-2">Username</label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded mb-4"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <label className="block mb-2">Password</label>
                    <input
                        type="password"
                        className="w-full p-2 border rounded mb-4"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                    >
                        Login
                    </button>
                </form>
                <div className="text-center mt-4">
                    <p className="text-sm text-slate-600">
                        New user?{" "}
                        <Link
                            to="/register"
                            className="text-indigo-600 font-medium hover:underline"
                        >
                            Create an account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
