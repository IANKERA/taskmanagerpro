import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import UserAdmin from "./UserAdmin";

vi.mock("../api/admin", () => ({
    fetchAdminUsers: vi.fn(),
    updateAdminUser: vi.fn(),
    deleteAdminUser: vi.fn(),
    resetAdminUserPassword: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        user: { id: 1, username: "adminUser", role: "ROLE_ADMIN" },
        isAdmin: true,
    }),
}));

import { fetchAdminUsers } from "../api/admin";

function renderUserAdmin() {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    return render(
        <QueryClientProvider client={qc}>
            <UserAdmin />
        </QueryClientProvider>
    );
}

describe("UserAdmin", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders user list, enforces self-protection, and filters by search", async () => {
        fetchAdminUsers.mockResolvedValue([
            { id: 1, username: "adminUser", email: "admin@example.com", role: "ROLE_ADMIN", taskIds: [10, 11] },
            { id: 2, username: "alice", email: "alice@example.com", role: "ROLE_USER", taskIds: [12] },
            { id: 3, username: "bob", email: "bob@example.com", role: "ROLE_USER", taskIds: [] },
        ]);

        renderUserAdmin();

        // Check usernames rendered
        expect(await screen.findByText("adminUser")).toBeInTheDocument();
        expect(screen.getByText("alice")).toBeInTheDocument();
        expect(screen.getByText("bob")).toBeInTheDocument();

        // Check "You" badge on adminUser
        expect(screen.getByText("You")).toBeInTheDocument();

        // Check that Delete button for current user (adminUser) is disabled
        const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
        expect(deleteButtons[0]).toBeDisabled(); // adminUser
        expect(deleteButtons[1]).not.toBeDisabled(); // alice
        expect(deleteButtons[2]).not.toBeDisabled(); // bob

        // Check search filter
        const searchInput = screen.getByLabelText("Search users");
        fireEvent.change(searchInput, { target: { value: "alice" } });

        expect(screen.getByText("alice")).toBeInTheDocument();
        expect(screen.queryByText("bob")).not.toBeInTheDocument();
        expect(screen.queryByText("adminUser")).not.toBeInTheDocument();
    });

    it("opens password reset modal with requirements", async () => {
        fetchAdminUsers.mockResolvedValue([
            { id: 2, username: "alice", email: "alice@example.com", role: "ROLE_USER", taskIds: [] },
        ]);

        renderUserAdmin();

        expect(await screen.findByText("alice")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Reset pw" }));

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText(/Reset Password for “alice”/)).toBeInTheDocument();
        expect(screen.getByText(/At least 1 uppercase letter/)).toBeInTheDocument();
    });
});

