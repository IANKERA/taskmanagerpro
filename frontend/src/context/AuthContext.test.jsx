import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import api from "../api/client";

vi.mock("../api/client", () => ({
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

function AuthProbe() {
    const { token, user, isAdmin, authLoading, logout } = useAuth();
    return (
        <div>
            <span>{authLoading ? "loading" : token ? user?.username || "authenticated" : "signed out"}</span>
            <span>{isAdmin ? "admin" : "not admin"}</span>
            <button onClick={logout}>Logout</button>
        </div>
    );
}

function renderAuthProvider(queryClient = new QueryClient()) {
    return {
        queryClient,
        ...render(
            <QueryClientProvider client={queryClient}>
                <AuthProvider><AuthProbe /></AuthProvider>
            </QueryClientProvider>
        ),
    };
}

describe("AuthProvider", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it("clears malformed stored tokens instead of crashing while decoding them", async () => {
        localStorage.setItem("token", "not-a-jwt");
        renderAuthProvider();

        await waitFor(() => expect(screen.getByText("signed out")).toBeInTheDocument());
        expect(localStorage.getItem("token")).toBeNull();
    });

    it("loads the server profile before exposing role state", async () => {
        localStorage.setItem("token", tokenWithPayload({ sub: "admin-user" }));
        api.get.mockResolvedValue({ data: { username: "admin-user", role: "ROLE_ADMIN" } });

        renderAuthProvider();

        expect(screen.getByText("loading")).toBeInTheDocument();
        expect(await screen.findByText("admin-user")).toBeInTheDocument();
        expect(screen.getByText("admin")).toBeInTheDocument();
    });

    it("clears query data and the stored token on logout", async () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(["notifications"], [{ message: "private" }]);
        renderAuthProvider(queryClient);

        fireEvent.click(screen.getByRole("button", { name: "Logout" }));

        expect(await screen.findByText("signed out")).toBeInTheDocument();
        expect(localStorage.getItem("token")).toBeNull();
        expect(queryClient.getQueryData(["notifications"])).toBeUndefined();
    });

    it("clears auth state and query data when profile loading returns 401", async () => {
        localStorage.setItem("token", tokenWithPayload({ sub: "expired-user" }));
        const queryClient = new QueryClient();
        queryClient.setQueryData(["notifications"], [{ message: "private" }]);
        api.get.mockRejectedValue({ status: 401 });

        renderAuthProvider(queryClient);

        await waitFor(() => expect(screen.getByText("signed out")).toBeInTheDocument());
        expect(localStorage.getItem("token")).toBeNull();
        expect(queryClient.getQueryData(["notifications"])).toBeUndefined();
    });
});
