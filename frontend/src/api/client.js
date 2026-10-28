import axios from "axios";
import { formatApiError } from "./errorMessage";

/**
 * Single axios instance for the whole app.
 * - Auto-attaches the JWT from localStorage.
 * - On 401 (token expired/invalid) clears the token and redirects to /login.
 * - 4xx errors surface to React Query as Error objects with .status + .data.
 */
const api = axios.create({
    baseURL: (
        import.meta.env.VITE_API_URL ||
        "https://taskmanagerpro-7m9s.onrender.com"
    ).replace(/\/+$/, ""),
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem("token");

            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }

        const wrapped = new Error(formatApiError(err));

        wrapped.status = err.response?.status;
        wrapped.data = err.response?.data;

        return Promise.reject(wrapped);
    }
);

export default api;
