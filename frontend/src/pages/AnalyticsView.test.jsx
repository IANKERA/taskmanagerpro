import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AnalyticsView from "./AnalyticsView";
import * as analyticsApi from "../api/analytics";

vi.mock("react-router-dom", () => ({
    useParams: () => ({ projectKey: "ALPHA" }),
    useNavigate: () => vi.fn(),
}));

vi.mock("recharts", () => ({
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    PieChart: ({ children }) => <div>{children}</div>,
    Pie: ({ children }) => <div>{children}</div>,
    Cell: () => <div />,
    BarChart: ({ children }) => <div>{children}</div>,
    Bar: () => <div />,
    AreaChart: ({ children }) => <div>{children}</div>,
    Area: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
}));

vi.mock("../api/analytics", () => ({
    getAnalytics: vi.fn(),
    getCfd: vi.fn(),
}));

const mockAnalytics = {
    totalIssues: 12,
    openIssues: 5,
    doneIssues: 7,
    unassignedCount: 1,
    overdueCount: 0,
    healthScore: 90,
    avgVelocity: 15.5,
    risks: [],
    statusBreakdown: { PENDING: 2, IN_PROGRESS: 3, DONE: 7 },
    priorityBreakdown: { LOW: 2, MEDIUM: 8, HIGH: 2 },
    typeBreakdown: { TASK: 8, STORY: 4 },
    assigneeWorkload: [{ username: "alice", total: 4, open: 1, done: 3 }],
    sprintVelocity: [{ sprintName: "Sprint 1", committed: 20, completed: 18 }],
    staleIssues: [],
};

const mockCfd30 = [
    { date: "2026-10-02", PENDING: 10, IN_PROGRESS: 0, DONE: 0 },
    { date: "2026-11-01", PENDING: 2, IN_PROGRESS: 3, DONE: 7 },
];

const mockCfd14 = [
    { date: "2026-10-18", PENDING: 6, IN_PROGRESS: 2, DONE: 4 },
    { date: "2026-11-01", PENDING: 2, IN_PROGRESS: 3, DONE: 7 },
];

function renderWithClient(ui) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });
    return {
        queryClient,
        ...render(
            <QueryClientProvider client={queryClient}>
                {ui}
            </QueryClientProvider>
        ),
    };
}

describe("AnalyticsView", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders loading state when initial analytics data is loading", () => {
        analyticsApi.getAnalytics.mockReturnValue(new Promise(() => {}));
        analyticsApi.getCfd.mockReturnValue(new Promise(() => {}));

        renderWithClient(<AnalyticsView />);
        expect(screen.getByText("Loading analytics…")).toBeInTheDocument();
    });

    it("renders page error state with retry button when analytics fetch fails", async () => {
        analyticsApi.getAnalytics.mockRejectedValue(new Error("Network connection lost"));
        analyticsApi.getCfd.mockResolvedValue([]);

        renderWithClient(<AnalyticsView />);

        expect(await screen.findByText("Failed to load project analytics.")).toBeInTheDocument();
        expect(screen.getByText("Network connection lost")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("renders analytics data and CFD with default 30 days time range", async () => {
        analyticsApi.getAnalytics.mockResolvedValue(mockAnalytics);
        analyticsApi.getCfd.mockResolvedValue(mockCfd30);

        renderWithClient(<AnalyticsView />);

        // Summary metrics
        expect(await screen.findByText("12")).toBeInTheDocument(); // total issues
        expect(screen.getByText("Healthy")).toBeInTheDocument();
        expect(screen.getByText("90")).toBeInTheDocument(); // health score

        // CFD card and time-range selector
        expect(screen.getByText("Cumulative Flow Diagram (30 days)")).toBeInTheDocument();
        const selector = screen.getByRole("combobox", { name: /time range/i });
        expect(selector).toBeInTheDocument();
        expect(selector).toHaveValue("30");

        expect(analyticsApi.getCfd).toHaveBeenCalledWith("ALPHA", 30);
    });

    it("updates CFD query with selected range and refreshes diagram without reload", async () => {
        analyticsApi.getAnalytics.mockResolvedValue(mockAnalytics);
        analyticsApi.getCfd.mockImplementation((proj, days) => {
            if (days === 14) return Promise.resolve(mockCfd14);
            return Promise.resolve(mockCfd30);
        });

        renderWithClient(<AnalyticsView />);

        expect(await screen.findByText("Cumulative Flow Diagram (30 days)")).toBeInTheDocument();
        expect(analyticsApi.getCfd).toHaveBeenCalledWith("ALPHA", 30);

        const selector = screen.getByRole("combobox", { name: /time range/i });
        fireEvent.change(selector, { target: { value: "14" } });

        await waitFor(() => {
            expect(screen.getByText("Cumulative Flow Diagram (14 days)")).toBeInTheDocument();
        });
        expect(analyticsApi.getCfd).toHaveBeenCalledWith("ALPHA", 14);
    });

    it("isolates React Query cache between different time ranges", async () => {
        analyticsApi.getAnalytics.mockResolvedValue(mockAnalytics);
        analyticsApi.getCfd.mockImplementation((proj, days) => {
            if (days === 7) return Promise.resolve([{ date: "2026-10-25", PENDING: 1, IN_PROGRESS: 1, DONE: 1 }]);
            return Promise.resolve(mockCfd30);
        });

        const { queryClient } = renderWithClient(<AnalyticsView />);
        expect(await screen.findByText("Cumulative Flow Diagram (30 days)")).toBeInTheDocument();

        // Switch to 7 days
        const selector = screen.getByRole("combobox", { name: /time range/i });
        fireEvent.change(selector, { target: { value: "7" } });

        await waitFor(() => {
            expect(screen.getByText("Cumulative Flow Diagram (7 days)")).toBeInTheDocument();
        });

        // Verify separate query cache entries exist
        const cache30 = queryClient.getQueryData(["cfd", "ALPHA", 30]);
        const cache7 = queryClient.getQueryData(["cfd", "ALPHA", 7]);

        expect(cache30).toEqual(mockCfd30);
        expect(cache7).toEqual([{ date: "2026-10-25", PENDING: 1, IN_PROGRESS: 1, DONE: 1 }]);
    });

    it("renders CFD error state with retry button when CFD fetch fails", async () => {
        analyticsApi.getAnalytics.mockResolvedValue(mockAnalytics);
        analyticsApi.getCfd.mockRejectedValue(new Error("CFD service timeout"));

        renderWithClient(<AnalyticsView />);

        expect(await screen.findByText("Failed to load Cumulative Flow Diagram.")).toBeInTheDocument();
        expect(screen.getByText("CFD service timeout")).toBeInTheDocument();

        const retryBtn = screen.getByRole("button", { name: /retry/i });
        expect(retryBtn).toBeInTheDocument();

        // Resolving on retry
        analyticsApi.getCfd.mockResolvedValue(mockCfd30);
        fireEvent.click(retryBtn);

        await waitFor(() => {
            expect(screen.queryByText("Failed to load Cumulative Flow Diagram.")).not.toBeInTheDocument();
        });
    });

    it("renders empty data state when CFD returns no points for selected range", async () => {
        analyticsApi.getAnalytics.mockResolvedValue(mockAnalytics);
        analyticsApi.getCfd.mockResolvedValue([]);

        renderWithClient(<AnalyticsView />);

        expect(
            await screen.findByText("No data available for the selected time range (30 days).")
        ).toBeInTheDocument();
    });
});
