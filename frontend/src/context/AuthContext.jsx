import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";
import api, { SESSION_EXPIRED_EVENT } from "../api/client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const queryClient = useQueryClient();
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(() => Boolean(localStorage.getItem("token")));

    function login(token) {
        queryClient.clear();
        localStorage.setItem("token", token);
        setUser(null);
        setAuthLoading(true);
        setToken(token);
    }

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        queryClient.clear();
        setToken(null);
        setUser(null);
        setAuthLoading(false);
    }, [queryClient]);

    useEffect(() => {
        window.addEventListener(SESSION_EXPIRED_EVENT, logout);
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, logout);
    }, [logout]);

    useEffect(() => {
        if (!token) {
            setUser(null);
            setAuthLoading(false);
            return undefined;
        }

        let active = true;
        let decoded;
        try {
            decoded = jwtDecode(token);
            if (typeof decoded.sub !== "string" || !decoded.sub) {
                throw new Error("JWT subject is missing");
            }
        } catch {
            logout();
            return () => {
                active = false;
            };
        }

        setAuthLoading(true);
        setUser({ username: decoded.sub, role: null, id: null });
        api.get("/api/users/me")
            .then((response) => {
                if (active) setUser(response.data);
            })
            .catch((error) => {
                if (!active) return;
                if (error.status === 401) {
                    logout();
                    return;
                }
                setUser({ username: decoded.sub, role: null, id: null });
            })
            .finally(() => {
                if (active) setAuthLoading(false);
            });

        return () => {
            active = false;
        };
    }, [token, logout]);

    const isAdmin = user?.role === "ADMIN" || user?.role === "ROLE_ADMIN";

    return (
        <AuthContext.Provider value={{ token, user, login, logout, isAdmin, authLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
