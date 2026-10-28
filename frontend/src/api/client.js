import axios from "axios";

/**
 * Single axios instance for the whole app.
 *  - Auto-attaches the JWT from localStorage.
 *  - On 401 (token expired/invalid) clears the token and redirects to /login.
 *  - 4xx errors surface to React Query as Error objects with .status + .data
 *    so callers can render server-side messages (e.g. 409 "sprint already active").
 */
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
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
        const wrapped = new Error(
            err.response?.data?.message ||
            err.response?.data ||
            err.message ||
            "Request failed"
        );
        wrapped.status = err.response?.status;
        wrapped.data = err.response?.data;
        return Promise.reject(wrapped);
    }
);

export default api;
