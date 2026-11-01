import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ProjectAdmin from "./ProjectAdmin";

vi.mock("../../api/projects", () => ({
    listProjects: vi.fn(),
    listMembers: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    updateProject: vi.fn(),
    archiveProject: vi.fn(),
    unarchiveProject: vi.fn(),
    deleteProject: vi.fn(),
}));

vi.mock("../../api/admin", () => ({
    fetchAdminUsers: vi.fn().mockResolvedValue([]),
}));

import { listProjects, listMembers, deleteProject } from "../../api/projects";

function renderProjectAdmin() {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    return render(
        <QueryClientProvider client={qc}>
            <ProjectAdmin />
        </QueryClientProvider>
    );
}

describe("ProjectAdmin", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders projects list and filters by project key or name", async () => {
        listProjects.mockResolvedValue([
            {
                id: 1,
                key: "ALPHA",
                name: "Alpha Workspace",
                leadUsername: "leadAlice",
                archived: false,
                openCount: 3,
                inProgressCount: 1,
                doneCount: 4,
            },
            {
                id: 2,
                key: "BETA",
                name: "Beta Workspace",
                leadUsername: "leadBob",
                archived: true,
                openCount: 0,
                inProgressCount: 0,
                doneCount: 0,
            },
        ]);

        renderProjectAdmin();

        expect(await screen.findByText("ALPHA")).toBeInTheDocument();
        expect(screen.getByText("Alpha Workspace")).toBeInTheDocument();
        expect(screen.getByText("leadAlice")).toBeInTheDocument();
        expect(screen.getByText("BETA")).toBeInTheDocument();

        // Search filter
        const searchInput = screen.getByLabelText("Search projects");
        fireEvent.change(searchInput, { target: { value: "BETA" } });

        expect(screen.getByText("BETA")).toBeInTheDocument();
        expect(screen.queryByText("Alpha Workspace")).not.toBeInTheDocument();
    });

    it("opens project membership modal and protects project lead from removal", async () => {
        listProjects.mockResolvedValue([
            {
                id: 1,
                key: "ALPHA",
                name: "Alpha Workspace",
                leadUsername: "leadAlice",
                archived: false,
            },
        ]);

        listMembers.mockResolvedValue([
            { userId: 10, username: "leadAlice", projectRole: "ADMIN", joinedAt: "2026-11-01" },
            { userId: 20, username: "devBob", projectRole: "MEMBER", joinedAt: "2026-11-01" },
        ]);

        renderProjectAdmin();

        expect(await screen.findByText("ALPHA")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Manage Members & Lead" }));

        // Modal should open
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(await screen.findByText("Current Members (2)")).toBeInTheDocument();

        // Project lead should have a disabled remove button
        const removeLeadBtn = screen.getByRole("button", { name: "Remove member leadAlice" });
        expect(removeLeadBtn).toBeDisabled();

        // Non-lead member should have an enabled remove button
        const removeDevBtn = screen.getByRole("button", { name: "Remove member devBob" });
        expect(removeDevBtn).not.toBeDisabled();
    });

    it("opens delete project confirmation modal and allows deletion", async () => {
        listProjects.mockResolvedValue([
            {
                id: 1,
                key: "ALPHA",
                name: "Alpha Workspace",
                leadUsername: "leadAlice",
                archived: false,
            },
        ]);
        deleteProject.mockResolvedValue({});

        renderProjectAdmin();

        expect(await screen.findByText("ALPHA")).toBeInTheDocument();

        // Click Delete button in table
        const deleteRowBtn = screen.getByRole("button", { name: "Delete" });
        fireEvent.click(deleteRowBtn);

        // DeleteProjectModal should open
        expect(screen.getByText("Delete Project")).toBeInTheDocument();
        const deletePermanentlyBtn = screen.getByRole("button", { name: /delete permanently/i });
        expect(deletePermanentlyBtn).toBeDisabled();

        // Type project key
        const input = screen.getByPlaceholderText("ALPHA");
        fireEvent.change(input, { target: { value: "ALPHA" } });
        expect(deletePermanentlyBtn).not.toBeDisabled();

        fireEvent.click(deletePermanentlyBtn);
        await waitFor(() => {
            expect(deleteProject).toHaveBeenCalledWith("ALPHA");
        });
    });
});

