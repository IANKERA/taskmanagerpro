import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [user, setUser] = useState(null);

    // LOGIN → save token
    function login(token) {
        localStorage.setItem("token", token);
        setToken(token);

        // For now: set dummy user
        setUser({ username: "admin" });
    }

    // LOGOUT → remove token + user
    function logout() {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    }

    // On app load: if token exists → setUser
    useEffect(() => {
        if (token) {
            // later we will decode JWT
            setUser({ username: "admin" });
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
