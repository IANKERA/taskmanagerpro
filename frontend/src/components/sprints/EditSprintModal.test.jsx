import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditSprintModal from "./EditSprintModal";
import * as sprintsApi from "../../api/sprints";
import toast from "react-hot-toast";

vi.mock("../../api/sprints", () => ({
    updateSprint: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

function renderWithClient(ui) {
    const qc = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("EditSprintModal", () => {
    const mockSprint = {
        id: 10,
        name: "Sprint 1",
        goal: "Deliver MVP functionality",
        startDate: "2026-11-01",
        endDate: "2026-11-15",
        state: "PLANNED",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("does not render when open is false", () => {
        renderWithClient(
            <EditSprintModal
                sprint={mockSprint}
                projectKey="PRJ"
                open={false}
                onClose={vi.fn()}
            />
        );
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("pre-fills form inputs with sprint data", () => {
        renderWithClient(
            <EditSprintModal
                sprint={mockSprint}
                projectKey="PRJ"
                open={true}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByLabelText(/sprint name/i)).toHaveValue("Sprint 1");
        expect(screen.getByLabelText(/sprint goal/i)).toHaveValue("Deliver MVP functionality");
        expect(screen.getByLabelText(/start date/i)).toHaveValue("2026-11-01");
        expect(screen.getByLabelText(/end date/i)).toHaveValue("2026-11-15");
        expect(screen.getByText("PLANNED")).toBeInTheDocument();
    });

    it("shows validation error when sprint name is empty", async () => {
        renderWithClient(
            <EditSprintModal
                sprint={mockSprint}
                projectKey="PRJ"
                open={true}
                onClose={vi.fn()}
            />
        );

        const nameInput = screen.getByLabelText(/sprint name/i);
        fireEvent.change(nameInput, { target: { value: "   " } });

        const submitBtn = screen.getByRole("button", { name: /save changes/i });
        fireEvent.click(submitBtn);

        expect(await screen.findByText("Sprint name is required.")).toBeInTheDocument();
        expect(sprintsApi.updateSprint).not.toHaveBeenCalled();
    });

    it("shows validation error when end date is before start date", async () => {
        renderWithClient(
            <EditSprintModal
                sprint={mockSprint}
                projectKey="PRJ"
                open={true}
                onClose={vi.fn()}
            />
        );

        const startDateInput = screen.getByLabelText(/start date/i);
        const endDateInput = screen.getByLabelText(/end date/i);

        fireEvent.change(startDateInput, { target: { value: "2026-11-15" } });
        fireEvent.change(endDateInput, { target: { value: "2026-11-01" } });

        const submitBtn = screen.getByRole("button", { name: /save changes/i });
        fireEvent.click(submitBtn);

        expect(await screen.findByText("End date must be on or after start date.")).toBeInTheDocument();
        expect(sprintsApi.updateSprint).not.toHaveBeenCalled();
    });

    it("successfully submits updated sprint data and notifies user", async () => {
        const onClose = vi.fn();
        const onSuccess = vi.fn();
        sprintsApi.updateSprint.mockResolvedValueOnce({
            ...mockSprint,
            name: "Sprint 1 — Renamed",
            goal: "Updated goal",
            endDate: "2026-11-20",
        });

        renderWithClient(
            <EditSprintModal
                sprint={mockSprint}
                projectKey="PRJ"
                open={true}
                onClose={onClose}
                onSuccess={onSuccess}
            />
        );

        fireEvent.change(screen.getByLabelText(/sprint name/i), {
            target: { value: "Sprint 1 — Renamed" },
        });
        fireEvent.change(screen.getByLabelText(/sprint goal/i), {
            target: { value: "Updated goal" },
        });
        fireEvent.change(screen.getByLabelText(/end date/i), {
            target: { value: "2026-11-20" },
        });

        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

        await waitFor(() => {
            expect(sprintsApi.updateSprint).toHaveBeenCalledWith(10, {
                name: "Sprint 1 — Renamed",
                goal: "Updated goal",
                startDate: "2026-11-01",
                endDate: "2026-11-20",
            });
        });

        expect(toast.success).toHaveBeenCalledWith("Sprint updated");
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it("displays backend error message when API call fails", async () => {
        sprintsApi.updateSprint.mockRejectedValueOnce({
            response: {
                status: 400,
                data: { message: "endDate must be on or after startDate" },
            },
        });

        renderWithClient(
            <EditSprintModal
                sprint={mockSprint}
                projectKey="PRJ"
                open={true}
                onClose={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent("endDate must be on or after startDate");
        expect(toast.error).toHaveBeenCalledWith("endDate must be on or after startDate");
    });

    it("handles CLOSED sprint lifecycle by disabling editing and warning user", () => {
        const closedSprint = {
            ...mockSprint,
            state: "CLOSED",
            closedAt: "2026-11-15T18:00:00",
        };

        renderWithClient(
            <EditSprintModal
                sprint={closedSprint}
                projectKey="PRJ"
                open={true}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText("Closed sprints are immutable and cannot be modified.")).toBeInTheDocument();
        expect(screen.getByLabelText(/sprint name/i)).toBeDisabled();
        expect(screen.getByLabelText(/sprint goal/i)).toBeDisabled();
        expect(screen.getByLabelText(/start date/i)).toBeDisabled();
        expect(screen.getByLabelText(/end date/i)).toBeDisabled();
        expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    });

    it("displays informational notice for ACTIVE sprint", () => {
        const activeSprint = {
            ...mockSprint,
            state: "ACTIVE",
            startedAt: "2026-11-01T10:00:00",
        };

        renderWithClient(
            <EditSprintModal
                sprint={activeSprint}
                projectKey="PRJ"
                open={true}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText(/this sprint is currently active/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sprint name/i)).not.toBeDisabled();
        expect(screen.getByRole("button", { name: /save changes/i })).not.toBeDisabled();
    });

    it("closes modal on cancel button and escape key", () => {
        const onClose = vi.fn();
        renderWithClient(
            <EditSprintModal
                sprint={mockSprint}
                projectKey="PRJ"
                open={true}
                onClose={onClose}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
        expect(onClose).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(window, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});

