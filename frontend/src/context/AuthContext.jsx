import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api/client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [user, setUser] = useState(null);

    // LOGIN → save token and decode
    function login(token) {
        localStorage.setItem("token", token);
        setToken(token);
    }

    // LOGOUT → clear
    function logout() {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    }

    // When token changes → fetch full user profile
    useEffect(() => {
        if (token) {
            const decoded = jwtDecode(token);
            // Set basic info immediately from JWT
            setUser({ username: decoded.sub, role: null, id: null });
            // Then fetch full profile
            api.get("/api/users/me")
                .then((r) => setUser(r.data))
                .catch(() => {
                    // Fallback to JWT-only data
                    setUser({ username: decoded.sub, role: null, id: null });
                });
        } else {
            setUser(null);
        }
    }, [token]);

    const isAdmin = user?.role === "ADMIN" || user?.role === "ROLE_ADMIN";

    return (
        <AuthContext.Provider value={{ token, user, login, logout, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
