import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ParentSelector, { getValidParentCandidates } from "./ParentSelector";
import * as issuesApi from "../api/issues";

vi.mock("../api/issues", () => ({
    listIssues: vi.fn(),
}));

function renderWithClient(ui) {
    const qc = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });
    return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ParentSelector helper: getValidParentCandidates", () => {
    const sampleIssues = [
        { id: 1, issueKey: "PRJ-1", title: "Epic 1", issueType: "EPIC", parentIssueKey: null },
        { id: 2, issueKey: "PRJ-2", title: "Task 2", issueType: "TASK", parentIssueKey: "PRJ-1" },
        { id: 3, issueKey: "PRJ-3", title: "Subtask 3", issueType: "TASK", parentIssueKey: "PRJ-2" },
        { id: 4, issueKey: "PRJ-4", title: "Subtask 4", issueType: "TASK", parentIssueKey: "PRJ-3" },
        { id: 5, issueKey: "PRJ-5", title: "Independent Task", issueType: "TASK", parentIssueKey: null },
    ];

    it("returns all issues when no currentIssueKey is specified", () => {
        const result = getValidParentCandidates(sampleIssues, null);
        expect(result).toHaveLength(5);
    });

    it("excludes self from valid parent candidates", () => {
        const result = getValidParentCandidates(sampleIssues, "PRJ-5");
        expect(result.map((i) => i.issueKey)).not.toContain("PRJ-5");
        expect(result).toHaveLength(4);
    });

    it("excludes all descendants to prevent circular hierarchies", () => {
        // For PRJ-2, its child is PRJ-3 and grandchild is PRJ-4.
        // Selecting PRJ-3 or PRJ-4 would create a cycle (PRJ-2 -> PRJ-3 -> PRJ-2).
        const result = getValidParentCandidates(sampleIssues, "PRJ-2");
        const validKeys = result.map((i) => i.issueKey);

        expect(validKeys).toContain("PRJ-1"); // Ancestor (valid parent)
        expect(validKeys).toContain("PRJ-5"); // Unrelated issue (valid parent)
        expect(validKeys).not.toContain("PRJ-2"); // Self (excluded)
        expect(validKeys).not.toContain("PRJ-3"); // Direct child (excluded)
        expect(validKeys).not.toContain("PRJ-4"); // Grandchild (excluded)
    });
});

describe("ParentSelector component", () => {
    const sampleIssues = [
        { id: 1, issueKey: "PRJ-1", title: "Main Epic", issueType: "EPIC", parentIssueKey: null },
        { id: 2, issueKey: "PRJ-2", title: "Core Feature", issueType: "STORY", parentIssueKey: "PRJ-1" },
        { id: 3, issueKey: "PRJ-3", title: "Fix bug", issueType: "BUG", parentIssueKey: null },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        issuesApi.listIssues.mockResolvedValue(sampleIssues);
    });

    it("renders placeholder when no parent is selected", () => {
        renderWithClient(
            <ParentSelector
                projectKey="PRJ"
                currentIssueKey="PRJ-2"
                value=""
                onChange={vi.fn()}
                placeholder="Select parent issue…"
            />
        );

        expect(screen.getByRole("button", { name: /select parent issue/i })).toBeInTheDocument();
    });

    it("displays selected parent issue with key, type, and remove button", () => {
        const onChange = vi.fn();
        renderWithClient(
            <ParentSelector
                projectKey="PRJ"
                currentIssueKey="PRJ-2"
                value="PRJ-1"
                onChange={onChange}
            />
        );

        expect(screen.getByText("PRJ-1")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /change parent/i })).toBeInTheDocument();

        const removeBtn = screen.getByRole("button", { name: /remove parent/i });
        fireEvent.click(removeBtn);

        expect(onChange).toHaveBeenCalledWith("");
    });

    it("opens dropdown and filters candidate list on search", async () => {
        const onChange = vi.fn();
        renderWithClient(
            <ParentSelector
                projectKey="PRJ"
                currentIssueKey="PRJ-2"
                value=""
                onChange={onChange}
            />
        );

        const openBtn = screen.getByRole("button", { name: /select parent or epic/i });
        fireEvent.click(openBtn);

        expect(await screen.findByRole("listbox")).toBeInTheDocument();
        // PRJ-1 and PRJ-3 should be candidate options (PRJ-2 is self, so excluded)
        expect(await screen.findByText("Main Epic")).toBeInTheDocument();
        expect(screen.getByText("Fix bug")).toBeInTheDocument();
        expect(screen.queryByText("Core Feature")).toBeNull();

        // Search for "bug"
        const searchInput = screen.getByRole("textbox", { name: /search parent issue/i });
        fireEvent.change(searchInput, { target: { value: "bug" } });

        expect(screen.queryByText("Main Epic")).toBeNull();
        expect(screen.getByText("Fix bug")).toBeInTheDocument();

        // Click option to select
        fireEvent.click(screen.getByText("Fix bug"));
        expect(onChange).toHaveBeenCalledWith("PRJ-3");
    });
});
