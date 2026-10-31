import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { logout, toggle } = vi.hoisted(() => ({
    logout: vi.fn(),
    toggle: vi.fn(),
}));

vi.mock("../../api/projects", () => ({ listProjects: vi.fn().mockResolvedValue([]) }));
vi.mock("../../api/notifications", () => ({ unreadCount: vi.fn().mockResolvedValue(0) }));
vi.mock("../../context/AuthContext", () => ({
    useAuth: () => ({ user: { username: "user", role: "ROLE_USER" }, logout, isAdmin: false }),
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
});
