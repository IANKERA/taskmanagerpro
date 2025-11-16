import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [user, setUser] = useState(null);

    // LOGIN → save token and decode
    function login(token) {
        localStorage.setItem("token", token);
        setToken(token);

        const decoded = jwtDecode(token);
        setUser({
            username: decoded.sub,
            role: decoded.role
        });
    }

    // LOGOUT → clear
    function logout() {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    }

    // When token changes → decode user
    useEffect(() => {
        if (token) {
            const decoded = jwtDecode(token);
            setUser({
                username: decoded.sub,
                role: decoded.role
            });
        } else {
            setUser(null);
        }
    }, [token]);

    return (
        <AuthContext.Provider value={{ token, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
