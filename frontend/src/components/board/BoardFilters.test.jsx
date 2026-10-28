import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardFilters, { applyFilters } from "./BoardFilters";
import { renderWithProviders } from "../../test/helpers";

const issues = [
    { id: 1, issueKey: "D-1", title: "Alpha", assigneeUsername: "alice", issueType: "BUG", priority: "HIGH", status: "PENDING", labels: [{ id: 1, name: "ui" }] },
    { id: 2, issueKey: "D-2", title: "Beta",  assigneeUsername: "bob",   issueType: "TASK", priority: "LOW",  status: "DONE",    labels: [] },
    { id: 3, issueKey: "D-3", title: "Gamma", assigneeUsername: null,    issueType: "BUG",  priority: "HIGH", status: "PENDING", labels: [] },
];

describe("applyFilters", () => {
    it("returns all issues with empty filters", () => {
        expect(applyFilters(issues, {})).toHaveLength(3);
    });

    it("filters by title search", () => {
        expect(applyFilters(issues, { q: "alpha" })).toHaveLength(1);
        expect(applyFilters(issues, { q: "alpha" })[0].issueKey).toBe("D-1");
    });

    it("filters by issue key", () => {
        expect(applyFilters(issues, { q: "D-2" })).toHaveLength(1);
    });

    it("filters by assignee", () => {
        expect(applyFilters(issues, { assignee: "alice" })).toHaveLength(1);
    });

    it("filters unassigned", () => {
        expect(applyFilters(issues, { assignee: "__unassigned__" })).toHaveLength(1);
        expect(applyFilters(issues, { assignee: "__unassigned__" })[0].issueKey).toBe("D-3");
    });

    it("filters by type", () => {
        expect(applyFilters(issues, { type: "BUG" })).toHaveLength(2);
    });

    it("filters by priority", () => {
        expect(applyFilters(issues, { priority: "LOW" })).toHaveLength(1);
    });

    it("combines multiple filters", () => {
        expect(applyFilters(issues, { type: "BUG", priority: "HIGH" })).toHaveLength(2);
        expect(applyFilters(issues, { type: "BUG", assignee: "alice" })).toHaveLength(1);
    });

    it("filters by label id", () => {
        expect(applyFilters(issues, { labelId: "1" })).toHaveLength(1);
    });
});

describe("BoardFilters component", () => {
    it("renders search and filter dropdowns", () => {
        renderWithProviders(
            <BoardFilters issues={issues} filters={{}} onChange={() => {}} />
        );
        expect(screen.getByPlaceholderText("Search title…")).toBeInTheDocument();
        expect(screen.getByText("Any assignee")).toBeInTheDocument();
        expect(screen.getByText("Any type")).toBeInTheDocument();
        expect(screen.getByText("Any priority")).toBeInTheDocument();
    });

    it("shows clear button when filters active", () => {
        renderWithProviders(
            <BoardFilters issues={issues} filters={{ q: "test" }} onChange={() => {}} />
        );
        expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("calls onChange on search input", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithProviders(
            <BoardFilters issues={issues} filters={{}} onChange={onChange} />
        );
        await user.type(screen.getByPlaceholderText("Search title…"), "hello");
        expect(onChange).toHaveBeenCalled();
    });
});
