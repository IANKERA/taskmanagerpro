import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedRoute from "./ProtectedRoute";
import { AuthProvider } from "../../context/AuthContext";
import api from "../../api/client";

vi.mock("../../api/client", () => ({
    default: { get: vi.fn() },
    SESSION_EXPIRED_EVENT: "taskmanagerpro:session-expired",
}));

function tokenWithPayload(payload) {
    const encode = (value) => btoa(JSON.stringify(value))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

function renderAdminRoute(role, token = tokenWithPayload({ sub: "user" })) {
    localStorage.setItem("token", token);
    api.get.mockResolvedValue({ data: { username: "user", role } });
    const queryClient = new QueryClient();

    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <MemoryRouter initialEntries={["/admin"]}>
                    <Routes>
                        <Route path="/admin" element={
                            <ProtectedRoute adminOnly><h1>Admin content</h1></ProtectedRoute>
                        } />
                        <Route path="/login" element={<h1>Login page</h1>} />
                        <Route path="/my-work" element={<h1>My work page</h1>} />
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
        </QueryClientProvider>
    );
}

describe("ProtectedRoute", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it("redirects users without a token to login", async () => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <AuthProvider>
                    <MemoryRouter initialEntries={["/admin"]}>
                        <Routes>
                            <Route path="/admin" element={
                                <ProtectedRoute adminOnly><h1>Admin content</h1></ProtectedRoute>
                            } />
                            <Route path="/login" element={<h1>Login page</h1>} />
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            </QueryClientProvider>
        );

        expect(await screen.findByRole("heading", { name: "Login page" })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Admin content" })).not.toBeInTheDocument();
    });

    it("redirects non-admin users away from admin routes", async () => {
        renderAdminRoute("ROLE_USER");

        expect(await screen.findByRole("heading", { name: "My work page" })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Admin content" })).not.toBeInTheDocument();
    });

    it("allows admins to view admin routes after the server profile loads", async () => {
        renderAdminRoute("ROLE_ADMIN");

        expect(await screen.findByRole("heading", { name: "Admin content" })).toBeInTheDocument();
    });
});
