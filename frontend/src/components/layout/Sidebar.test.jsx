import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { logout, toggle } = vi.hoisted(() => ({
    logout: vi.fn(),
    toggle: vi.fn(),
}));

let mockAuthState = { user: { username: "user", role: "ROLE_USER" }, logout, isAdmin: false };

vi.mock("../../api/projects", () => ({ listProjects: vi.fn().mockResolvedValue([]) }));
vi.mock("../../api/notifications", () => ({ unreadCount: vi.fn().mockResolvedValue(0) }));
vi.mock("../../context/AuthContext", () => ({
    useAuth: () => mockAuthState,
}));
vi.mock("../../context/ThemeContext", () => ({
    useTheme: () => ({ dark: false, toggle }),
}));

import Sidebar from "./Sidebar";

function renderSidebar(onClose = vi.fn()) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter>
                <Sidebar open onClose={onClose} />
            </MemoryRouter>
        </QueryClientProvider>
    );
    return onClose;
}

describe("Sidebar mobile drawer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthState = { user: { username: "user", role: "ROLE_USER" }, logout, isAdmin: false };
    });

    it("closes after selecting a navigation destination", () => {
        const onClose = renderSidebar();

        fireEvent.click(screen.getByRole("link", { name: "My Work" }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes when Escape is pressed", () => {
        const onClose = renderSidebar();

        fireEvent.keyDown(window, { key: "Escape" });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes when the backdrop is pressed", () => {
        const onClose = renderSidebar();

        fireEvent.click(screen.getAllByRole("button", { name: "Close navigation" })[0]);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not render admin navigation section for regular users", () => {
        renderSidebar();

        expect(screen.queryByText("Administration")).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();
        expect(screen.getAllByRole("link", { name: "Projects" })).toHaveLength(1);
    });

    it("renders administration section and links for admin users", () => {
        mockAuthState = { user: { username: "admin", role: "ROLE_ADMIN" }, logout, isAdmin: true };
        renderSidebar();

        expect(screen.getByText("Administration")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Audit Log" })).toBeInTheDocument();
        // One link is main /projects, second is /admin/projects
        expect(screen.getAllByRole("link", { name: "Projects" })).toHaveLength(2);
    });
});
