import api from "./client";

export const login = (username, password) =>
    api.post("/api/auth/login", { username, password }).then((r) => r.data);

export const register = (username, password) =>
    api.post("/api/auth/register", { username, password }).then((r) => r.data);
