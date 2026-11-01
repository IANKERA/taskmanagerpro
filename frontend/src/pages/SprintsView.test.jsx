import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SprintsView from "./SprintsView";
import * as sprintsApi from "../api/sprints";

vi.mock("react-router-dom", () => ({
    useParams: () => ({ projectKey: "ALPHA" }),
    useNavigate: () => vi.fn(),
}));

vi.mock("recharts", () => ({
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    LineChart: ({ children }) => <div>{children}</div>,
    Line: () => <div />,
    BarChart: ({ children }) => <div>{children}</div>,
    Bar: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
}));

vi.mock("../api/sprints", () => ({
    listSprints: vi.fn(),
    createSprint: vi.fn(),
    startSprint: vi.fn(),
    closeSprint: vi.fn(),
    listSprintIssues: vi.fn().mockResolvedValue([]),
    sprintBurndown: vi.fn().mockResolvedValue([]),
    updateSprint: vi.fn(),
}));

function renderSprintsView() {
    const qc = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return render(
        <QueryClientProvider client={qc}>
            <SprintsView />
        </QueryClientProvider>
    );
}

describe("SprintsView", () => {
    const sampleSprints = [
        {
            id: 101,
            name: "Planned Sprint",
            goal: "Plan next deliverables",
            state: "PLANNED",
            startDate: "2026-11-10",
            endDate: "2026-11-24",
            issueCount: 2,
            doneCount: 0,
            totalPoints: 5,
            donePoints: 0,
        },
        {
            id: 102,
            name: "Active Sprint",
            goal: "Currently active work",
            state: "ACTIVE",
            startDate: "2026-11-01",
            endDate: "2026-11-15",
            startedAt: "2026-11-01T09:00:00",
            issueCount: 4,
            doneCount: 2,
            totalPoints: 10,
            donePoints: 5,
        },
        {
            id: 103,
            name: "Closed Sprint",
            goal: "Historical work",
            state: "CLOSED",
            startDate: "2026-10-15",
            endDate: "2026-10-29",
            startedAt: "2026-10-15T09:00:00",
            closedAt: "2026-10-29T17:00:00",
            issueCount: 5,
            doneCount: 5,
            totalPoints: 12,
            donePoints: 12,
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        sprintsApi.listSprints.mockResolvedValue(sampleSprints);
    });

    it("renders sprint list and provides Edit action only for non-closed sprints", async () => {
        renderSprintsView();

        expect(await screen.findByText("Planned Sprint")).toBeInTheDocument();
        expect(screen.getAllByText("Active Sprint").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Closed Sprint")).toBeInTheDocument();

        // There should be 2 "Edit" buttons: one for Planned Sprint, one for Active Sprint.
        // Closed Sprint must NOT have an Edit button.
        const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
        expect(editButtons).toHaveLength(2);
    });

    it("opens edit modal when clicking Edit on a sprint and pre-fills its data", async () => {
        renderSprintsView();

        expect(await screen.findByText("Planned Sprint")).toBeInTheDocument();

        const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
        fireEvent.click(editButtons[0]);

        // Modal should open with sprint 101 data
        expect(await screen.findByRole("dialog")).toBeInTheDocument();
        expect(screen.getByLabelText(/sprint name/i)).toHaveValue("Planned Sprint");
        expect(screen.getByLabelText(/sprint goal/i)).toHaveValue("Plan next deliverables");
    });

    it("updates sprint and closes modal on successful save", async () => {
        sprintsApi.updateSprint.mockResolvedValueOnce({
            ...sampleSprints[0],
            name: "Renamed Planned Sprint",
        });

        renderSprintsView();

        expect(await screen.findByText("Planned Sprint")).toBeInTheDocument();

        const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
        fireEvent.click(editButtons[0]);

        expect(await screen.findByRole("dialog")).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/sprint name/i), {
            target: { value: "Renamed Planned Sprint" },
        });

        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

        await waitFor(() => {
            expect(sprintsApi.updateSprint).toHaveBeenCalledWith(101, expect.objectContaining({
                name: "Renamed Planned Sprint",
            }));
        });

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).toBeNull();
        });
    });
});
