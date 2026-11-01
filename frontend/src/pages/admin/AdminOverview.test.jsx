import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminOverview from "./AdminOverview";

vi.mock("../../api/admin", () => ({
    fetchAdminUsers: vi.fn(),
    fetchAdminAuditLog: vi.fn(),
}));

vi.mock("../../api/projects", () => ({
    listProjects: vi.fn(),
}));

import { fetchAdminUsers, fetchAdminAuditLog } from "../../api/admin";
import { listProjects } from "../../api/projects";

function renderOverview() {
    const qc = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });

    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter>
                <AdminOverview />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

describe("AdminOverview", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders real statistics cards and modules from API data", async () => {
        fetchAdminUsers.mockResolvedValue([
            { id: 1, username: "admin", role: "ROLE_ADMIN" },
            { id: 2, username: "alice", role: "ROLE_USER" },
            { id: 3, username: "bob", role: "ROLE_USER" },
        ]);

        listProjects.mockResolvedValue([
            {
                id: 10,
                key: "ALPHA",
                name: "Alpha Project",
                archived: false,
                openCount: 5,
                inProgressCount: 2,
                doneCount: 3,
            },
            {
                id: 20,
                key: "BETA",
                name: "Beta Project",
                archived: true,
                openCount: 0,
                inProgressCount: 0,
                doneCount: 1,
            },
        ]);

        fetchAdminAuditLog.mockResolvedValue([
            {
                id: 100,
                activityType: "CREATED",
                actorUsername: "admin",
                issueKey: "ALPHA-1",
                message: "Created issue ALPHA-1",
                at: "2026-11-01T12:00:00",
            },
        ]);

        renderOverview();

        // Wait until queries have finished rendering
        expect(await screen.findByText("Created issue ALPHA-1")).toBeInTheDocument();
        expect(screen.getByText("[ALPHA-1]")).toBeInTheDocument();

        // Check user stats
        expect(screen.getByText("Total Users")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument(); // total users
        expect(screen.getByText(/Admins:/)).toBeInTheDocument();
        expect(screen.getByText(/Standard Users:/)).toBeInTheDocument();

        // Check project stats
        expect(screen.getByText("Total Projects")).toBeInTheDocument();
        expect(screen.getByText(/Active:/)).toBeInTheDocument();
        expect(screen.getByText(/Archived:/)).toBeInTheDocument();

        // Check issue stats: 5 + 2 + 3 + 1 = 11 issues
        expect(screen.getByText("11")).toBeInTheDocument();
        expect(screen.getByText("Total Issues Tracked")).toBeInTheDocument();

        // Check navigation modules
        expect(screen.getByRole("link", { name: /User Management/ })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Project Management/ })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Audit Log/ })).toBeInTheDocument();
    });
});
