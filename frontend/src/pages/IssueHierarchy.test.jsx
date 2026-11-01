import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import IssueModal from "./IssueModal";
import * as issuesApi from "../api/issues";
import * as searchApi from "../api/search";
import * as projectsApi from "../api/projects";
import toast from "react-hot-toast";

vi.mock("react-router-dom", () => ({
    useParams: () => ({ projectKey: "ALPHA", issueKey: "ALPHA-10" }),
    useNavigate: () => vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({ user: { username: "alice" } }),
}));

vi.mock("react-hot-toast", () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("../api/issues", () => ({
    getIssue: vi.fn(),
    updateIssue: vi.fn(),
    createIssue: vi.fn(),
    deleteIssue: vi.fn(),
    listComments: vi.fn().mockResolvedValue([]),
    addComment: vi.fn(),
    editComment: vi.fn(),
    deleteComment: vi.fn(),
    listActivity: vi.fn().mockResolvedValue([]),
    setLabels: vi.fn(),
    toggleWatch: vi.fn(),
    moveIssue: vi.fn(),
    listLinks: vi.fn().mockResolvedValue([]),
    createLink: vi.fn(),
    deleteLinkApi: vi.fn(),
    getTimeLogs: vi.fn().mockResolvedValue({ logs: [], totalMinutes: 0 }),
    logTime: vi.fn(),
    deleteTimeLog: vi.fn(),
    listIssues: vi.fn(),
}));

vi.mock("../api/search", () => ({
    subtasks: vi.fn(),
}));

vi.mock("../api/attachments", () => ({
    listAttachments: vi.fn().mockResolvedValue([]),
    uploadAttachment: vi.fn(),
    downloadAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
}));

vi.mock("../api/sprints", () => ({
    listSprints: vi.fn().mockResolvedValue([]),
}));

vi.mock("../api/projects", () => ({
    listLabels: vi.fn().mockResolvedValue([]),
    listMembers: vi.fn().mockResolvedValue([]),
    listIssues: vi.fn(),
}));

vi.mock("../api/customFields", () => ({
    getFieldValues: vi.fn().mockResolvedValue([]),
    setFieldValues: vi.fn(),
}));

function renderIssueModal() {
    const qc = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return render(
        <QueryClientProvider client={qc}>
            <IssueModal />
        </QueryClientProvider>
    );
}

describe("IssueModal Hierarchy & Subtasks", () => {
    const mockIssue = {
        id: 10,
        issueKey: "ALPHA-10",
        title: "Main Feature Issue",
        description: "Parent issue description",
        status: "IN_PROGRESS",
        priority: "HIGH",
        issueType: "STORY",
        assigneeUsername: "bob",
        reporterUsername: "alice",
        parentIssueKey: "ALPHA-1",
    };

    const mockProjectIssues = [
        { id: 1, issueKey: "ALPHA-1", title: "Project Epic", issueType: "EPIC", parentIssueKey: null },
        { id: 2, issueKey: "ALPHA-2", title: "Another Epic", issueType: "EPIC", parentIssueKey: null },
        mockIssue,
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        issuesApi.getIssue.mockResolvedValue(mockIssue);
        issuesApi.listIssues.mockResolvedValue(mockProjectIssues);
        projectsApi.listIssues.mockResolvedValue(mockProjectIssues);
        searchApi.subtasks.mockResolvedValue([]);
    });

    it("renders existing parent relationship and allows removing it", async () => {
        issuesApi.updateIssue.mockResolvedValue({ ...mockIssue, parentIssueKey: null });

        renderIssueModal();

        expect(await screen.findByText("ALPHA-10")).toBeInTheDocument();
        expect(screen.getByText("ALPHA-1")).toBeInTheDocument();

        // Click Remove parent button (✕)
        const removeBtn = screen.getByRole("button", { name: /remove parent/i });
        fireEvent.click(removeBtn);

        await waitFor(() => {
            expect(issuesApi.updateIssue).toHaveBeenCalledWith("ALPHA-10", {
                parentIssueKey: "",
            });
        });
    });

    it("allows changing parent issue to another candidate", async () => {
        issuesApi.updateIssue.mockResolvedValue({ ...mockIssue, parentIssueKey: "ALPHA-2" });

        renderIssueModal();

        expect(await screen.findByText("ALPHA-10")).toBeInTheDocument();

        const changeBtn = screen.getByRole("button", { name: /change parent/i });
        fireEvent.click(changeBtn);

        expect(await screen.findByRole("listbox")).toBeInTheDocument();
        expect(screen.getByText("Another Epic")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Another Epic"));

        await waitFor(() => {
            expect(issuesApi.updateIssue).toHaveBeenCalledWith("ALPHA-10", {
                parentIssueKey: "ALPHA-2",
            });
        });
    });

    it("renders Subtasks section even with zero subtasks and shows Create subtask button", async () => {
        renderIssueModal();

        expect(await screen.findByText("ALPHA-10")).toBeInTheDocument();
        expect(screen.getByText(/subtasks \(0\)/i)).toBeInTheDocument();
        expect(screen.getByText("No subtasks yet.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /\+ create subtask/i })).toBeInTheDocument();
    });

    it("creates a subtask with automatically prefilled parentIssueKey", async () => {
        issuesApi.createIssue.mockResolvedValue({
            id: 25,
            issueKey: "ALPHA-25",
            title: "Unit tests for feature",
            issueType: "TASK",
            priority: "MEDIUM",
            parentIssueKey: "ALPHA-10",
        });

        renderIssueModal();

        expect(await screen.findByText("ALPHA-10")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /\+ create subtask/i }));

        const titleInput = screen.getByPlaceholderText(/what needs to be done\?/i);
        fireEvent.change(titleInput, { target: { value: "Unit tests for feature" } });

        const submitBtn = screen.getByRole("button", { name: /create subtask/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(issuesApi.createIssue).toHaveBeenCalledWith("ALPHA", {
                title: "Unit tests for feature",
                issueType: "TASK",
                priority: "MEDIUM",
                assigneeUsername: undefined,
                parentIssueKey: "ALPHA-10",
            });
        });

        expect(toast.success).toHaveBeenCalledWith("Subtask created: ALPHA-25");
    });

    it("renders existing subtasks and allows unlinking a subtask from parent", async () => {
        searchApi.subtasks.mockResolvedValue([
            {
                id: 11,
                issueKey: "ALPHA-11",
                title: "Existing subtask 1",
                status: "DONE",
                assigneeUsername: "bob",
                parentIssueKey: "ALPHA-10",
            },
        ]);
        issuesApi.updateIssue.mockResolvedValue({
            id: 11,
            issueKey: "ALPHA-11",
            parentIssueKey: null,
        });

        renderIssueModal();

        expect(await screen.findByText("ALPHA-11")).toBeInTheDocument();
        expect(screen.getByText("Existing subtask 1")).toBeInTheDocument();

        const unlinkBtn = screen.getByRole("button", { name: /unlink subtask alpha-11/i });
        fireEvent.click(unlinkBtn);

        await waitFor(() => {
            expect(issuesApi.updateIssue).toHaveBeenCalledWith("ALPHA-11", {
                parentIssueKey: "",
            });
        });
    });
});
