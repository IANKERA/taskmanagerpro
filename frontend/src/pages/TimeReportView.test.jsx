import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TimeReportView from "./TimeReportView";
import * as timeReportApi from "../api/timeReport";
import api from "../api/client";
import toast from "react-hot-toast";

vi.mock("react-router-dom", () => ({
    useParams: () => ({ projectKey: "PROJ" }),
}));

vi.mock("react-hot-toast", () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("../api/timeReport", () => ({
    getTimeReport: vi.fn(),
}));

vi.mock("../api/client", () => ({
    default: {
        get: vi.fn(),
    },
}));

vi.mock("recharts", () => ({
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ data, label }) => (
        <div data-testid="pie">
            {data?.map((d, i) => (
                <div key={i} data-testid="pie-slice">
                    {typeof label === "function" ? label(d) : d.username}
                </div>
            ))}
        </div>
    ),
    Cell: () => <div />,
    BarChart: ({ data, children }) => (
        <div data-testid="bar-chart">
            {children}
            {data?.map((d, i) => (
                <div key={i} data-testid="bar-item">
                    {d.issueKey || d.date}: {d.hours}h
                </div>
            ))}
        </div>
    ),
    Bar: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
}));

const mockReportData = {
    totalMinutes: 135,
    totalEntries: 2,
    entries: [
        {
            id: 1,
            issueKey: "PROJ-101",
            issueTitle: "Implement API",
            username: "timemember",
            minutes: 90,
            description: "Worked on backend feature",
            loggedAt: "2026-11-01",
        },
        {
            id: 2,
            issueKey: "PROJ-102",
            issueTitle: "UI components",
            username: "owner",
            minutes: 45,
            description: "Reviewed backend code",
            loggedAt: "2026-11-01",
        },
    ],
    byUser: [
        { username: "timemember", minutes: 90 },
        { username: "owner", minutes: 45 },
    ],
    byIssue: [
        { issueKey: "PROJ-101", minutes: 90 },
        { issueKey: "PROJ-102", minutes: 45 },
    ],
    byDay: [
        { date: "2026-11-01", minutes: 135 },
    ],
};

function renderWithClient(ui) {
    const qc = new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
        },
    });
    return render(
        <QueryClientProvider client={qc}>
            {ui}
        </QueryClientProvider>
    );
}

describe("TimeReportView", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders loading state when query is loading", () => {
        timeReportApi.getTimeReport.mockReturnValue(new Promise(() => {}));
        renderWithClient(<TimeReportView />);
        expect(screen.getByText("Loading…")).toBeInTheDocument();
    });

    it("renders summary cards, charts, and table with logged time entries", async () => {
        timeReportApi.getTimeReport.mockResolvedValue(mockReportData);
        renderWithClient(<TimeReportView />);

        // Header check
        await waitFor(() => {
            expect(screen.getByText("Time Report")).toBeInTheDocument();
        });
        expect(screen.getByText("2h 15m logged across 2 entries")).toBeInTheDocument();

        // Summary cards
        expect(screen.getByText("Total Time")).toBeInTheDocument();
        expect(screen.getByText("2h 15m")).toBeInTheDocument();

        expect(screen.getByText("Hours")).toBeInTheDocument();
        expect(screen.getByText("2.3")).toBeInTheDocument(); // 135 / 60 = 2.25 -> 2.3

        expect(screen.getByText("Contributors")).toBeInTheDocument();
        expect(screen.getByText("Issues Tracked")).toBeInTheDocument();
        const statTwos = screen.getAllByText("2");
        expect(statTwos.length).toBeGreaterThanOrEqual(2);

        // Charts: User pie and Top Issues
        expect(screen.getByText("Time by User")).toBeInTheDocument();
        expect(screen.getByText("timemember (1.5h)")).toBeInTheDocument();
        expect(screen.getByText("owner (0.8h)")).toBeInTheDocument();

        expect(screen.getByText("Top Issues (hours)")).toBeInTheDocument();
        expect(screen.getByText("PROJ-101: 1.5h")).toBeInTheDocument();
        expect(screen.getByText("PROJ-102: 0.8h")).toBeInTheDocument();

        // Daily trend
        expect(screen.getByText("Daily Time (last 30 days)")).toBeInTheDocument();
        expect(screen.getByText("2026-11-01: 2.3h")).toBeInTheDocument();

        // Table: All Entries
        expect(screen.getByText("All Entries")).toBeInTheDocument();
        expect(screen.getByText("PROJ-101")).toBeInTheDocument();
        expect(screen.getByText("Implement API")).toBeInTheDocument();
        expect(screen.getByText("timemember")).toBeInTheDocument();
        expect(screen.getByText("1h 30m")).toBeInTheDocument();
        expect(screen.getByText("Worked on backend feature")).toBeInTheDocument();

        expect(screen.getByText("PROJ-102")).toBeInTheDocument();
        expect(screen.getByText("UI components")).toBeInTheDocument();
        expect(screen.getByText("owner")).toBeInTheDocument();
        expect(screen.getByText("45m")).toBeInTheDocument();
        expect(screen.getByText("Reviewed backend code")).toBeInTheDocument();
    });

    it("filters entries in table when typing in search input", async () => {
        timeReportApi.getTimeReport.mockResolvedValue(mockReportData);
        renderWithClient(<TimeReportView />);

        await waitFor(() => {
            expect(screen.getByText("PROJ-101")).toBeInTheDocument();
        });

        const filterInput = screen.getByPlaceholderText("Filter by user, issue, or description…");

        // Filter by text matching second entry description
        fireEvent.change(filterInput, { target: { value: "review" } });

        expect(screen.queryByText("Worked on backend feature")).not.toBeInTheDocument();
        expect(screen.getByText("Reviewed backend code")).toBeInTheDocument();

        // Filter by non-matching string
        fireEvent.change(filterInput, { target: { value: "nonexistent" } });
        expect(screen.getByText("No time entries found.")).toBeInTheDocument();
    });

    it("exports CSV when export button is clicked", async () => {
        timeReportApi.getTimeReport.mockResolvedValue(mockReportData);
        api.get.mockResolvedValue({ data: new Blob(["test csv"]) });

        // Mock window.URL
        const mockCreateObjectURL = vi.fn().mockReturnValue("blob:mock-url");
        const mockRevokeObjectURL = vi.fn();
        window.URL.createObjectURL = mockCreateObjectURL;
        window.URL.revokeObjectURL = mockRevokeObjectURL;

        renderWithClient(<TimeReportView />);

        await waitFor(() => {
            expect(screen.getByText("Export CSV")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Export CSV"));

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith("/api/projects/PROJ/time-report/export", { responseType: "blob" });
        });
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("CSV exported");
    });

    it("renders empty state when there are no time entries", async () => {
        timeReportApi.getTimeReport.mockResolvedValue({
            totalMinutes: 0,
            totalEntries: 0,
            entries: [],
            byUser: [],
            byIssue: [],
            byDay: [],
        });

        renderWithClient(<TimeReportView />);

        await waitFor(() => {
            expect(screen.getByText("0m logged across 0 entries")).toBeInTheDocument();
        });

        expect(screen.getByText("0m")).toBeInTheDocument();
        expect(screen.getByText("0.0")).toBeInTheDocument();
        const zeros = screen.getAllByText("0");
        expect(zeros.length).toBeGreaterThanOrEqual(2); // Contributors & Issues Tracked

        const noTimeMessages = screen.getAllByText("No time logged.");
        expect(noTimeMessages.length).toBe(2); // In user pie and top issues

        expect(screen.getByText("No time entries found.")).toBeInTheDocument();
    });
});
