import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [user, setUser] = useState(null);

    // Save token in memory + localStorage
    function login(token) {
        localStorage.setItem("token", token);
        setToken(token);
    }

    function logout() {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    }

    // TODO: fetch user info
    useEffect(() => {
        if (!token) return;
        // we can decode token here if needed
    }, [token]);

    return (
        <AuthContext.Provider value={{ token, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
