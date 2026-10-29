import axios from "axios";
import { formatApiError } from "./errorMessage";

export const SESSION_EXPIRED_EVENT = "taskmanagerpro:session-expired";

export function resolveApiBaseUrl(configuredUrl) {
    return typeof configuredUrl === "string"
        ? configuredUrl.trim().replace(/\/+$/, "")
        : "";
}

/**
 * Single axios instance for the whole app.
 * - Auto-attaches the JWT from localStorage.
 * - On 401 (token expired/invalid) clears the token and redirects to /login.
 * - 4xx errors surface to React Query as Error objects with .status + .data.
 */
const api = axios.create({
    baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_URL),
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
            window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));

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
