import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DeleteProjectModal from "./DeleteProjectModal";
import * as projectsApi from "../api/projects";
import toast from "react-hot-toast";

vi.mock("react-hot-toast", () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("../api/projects", () => ({
    deleteProject: vi.fn(),
}));

function renderModal(props) {
    const qc = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return render(
        <QueryClientProvider client={qc}>
            <DeleteProjectModal {...props} />
        </QueryClientProvider>
    );
}

describe("DeleteProjectModal", () => {
    const mockProject = {
        id: 1,
        key: "DELPROJ",
        name: "Project To Delete",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders nothing when isOpen is false", () => {
        const { container } = renderModal({
            project: mockProject,
            isOpen: false,
            onClose: vi.fn(),
        });
        expect(container.firstChild).toBeNull();
    });

    it("renders confirmation dialog with project name and key", () => {
        renderModal({
            project: mockProject,
            isOpen: true,
            onClose: vi.fn(),
        });

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Delete Project")).toBeInTheDocument();
        expect(screen.getByText("Project To Delete")).toBeInTheDocument();
        expect(screen.getAllByText("DELPROJ").length).toBeGreaterThanOrEqual(1);

        const deleteBtn = screen.getByRole("button", { name: /delete permanently/i });
        expect(deleteBtn).toBeDisabled();
    });

    it("enables delete button only after typing the exact project key", () => {
        renderModal({
            project: mockProject,
            isOpen: true,
            onClose: vi.fn(),
        });

        const input = screen.getByPlaceholderText("DELPROJ");
        const deleteBtn = screen.getByRole("button", { name: /delete permanently/i });

        expect(deleteBtn).toBeDisabled();

        // Type wrong key
        fireEvent.change(input, { target: { value: "WRONG" } });
        expect(deleteBtn).toBeDisabled();

        // Type correct key
        fireEvent.change(input, { target: { value: "DELPROJ" } });
        expect(deleteBtn).not.toBeDisabled();
    });

    it("calls deleteProject and handles success callback", async () => {
        projectsApi.deleteProject.mockResolvedValue({});
        const onClose = vi.fn();
        const onSuccess = vi.fn();

        renderModal({
            project: mockProject,
            isOpen: true,
            onClose,
            onSuccess,
        });

        const input = screen.getByPlaceholderText("DELPROJ");
        fireEvent.change(input, { target: { value: "DELPROJ" } });

        const deleteBtn = screen.getByRole("button", { name: /delete permanently/i });
        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(projectsApi.deleteProject).toHaveBeenCalledWith("DELPROJ");
            expect(toast.success).toHaveBeenCalledWith("Project DELPROJ deleted successfully");
            expect(onClose).toHaveBeenCalled();
            expect(onSuccess).toHaveBeenCalled();
        });
    });

    it("displays error toast when delete fails", async () => {
        projectsApi.deleteProject.mockRejectedValue(new Error("Cannot delete project"));
        const onClose = vi.fn();

        renderModal({
            project: mockProject,
            isOpen: true,
            onClose,
        });

        const input = screen.getByPlaceholderText("DELPROJ");
        fireEvent.change(input, { target: { value: "DELPROJ" } });

        const deleteBtn = screen.getByRole("button", { name: /delete permanently/i });
        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(projectsApi.deleteProject).toHaveBeenCalledWith("DELPROJ");
            expect(toast.error).toHaveBeenCalledWith("Cannot delete project");
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    it("calls onClose when Cancel is clicked", () => {
        const onClose = vi.fn();
        renderModal({
            project: mockProject,
            isOpen: true,
            onClose,
        });

        const cancelBtn = screen.getByRole("button", { name: /cancel/i });
        fireEvent.click(cancelBtn);

        expect(onClose).toHaveBeenCalled();
    });
});

