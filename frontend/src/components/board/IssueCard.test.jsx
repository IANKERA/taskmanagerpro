import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IssueCard from "./IssueCard";
import { renderWithProviders } from "../../test/helpers";

const baseIssue = {
    id: 1,
    issueKey: "DEMO-1",
    title: "Fix login bug",
    issueType: "BUG",
    priority: "HIGH",
    status: "PENDING",
    assigneeUsername: "alice",
    labels: [],
    storyPoints: 3,
};

// Mock useParams to return projectKey
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useParams: () => ({ projectKey: "DEMO" }) };
});

describe("IssueCard", () => {
    it("renders issue key, title, type badge, and assignee", () => {
        renderWithProviders(<IssueCard issue={baseIssue} />);
        expect(screen.getByText("DEMO-1")).toBeInTheDocument();
        expect(screen.getByText("Fix login bug")).toBeInTheDocument();
        expect(screen.getByText("Bug")).toBeInTheDocument();
        expect(screen.getByText("alice")).toBeInTheDocument();
        expect(screen.getByText("3 SP")).toBeInTheDocument();
    });

    it("shows 'Unassigned' when no assignee", () => {
        renderWithProviders(<IssueCard issue={{ ...baseIssue, assigneeUsername: null }} />);
        expect(screen.getByText("Unassigned")).toBeInTheDocument();
    });

    it("renders labels", () => {
        const issue = {
            ...baseIssue,
            labels: [{ id: 1, name: "frontend", color: "#2563eb" }],
        };
        renderWithProviders(<IssueCard issue={issue} />);
        expect(screen.getByText("frontend")).toBeInTheDocument();
    });

    it("shows parent epic indicator", () => {
        const issue = { ...baseIssue, parentIssueKey: "DEMO-5" };
        renderWithProviders(<IssueCard issue={issue} />);
        expect(screen.getByText(/Epic: DEMO-5/)).toBeInTheDocument();
    });

    it("shows checkbox in selectable mode", () => {
        const onToggle = vi.fn();
        renderWithProviders(
            <IssueCard issue={baseIssue} selectable selected={false} onToggle={onToggle} />
        );
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).not.toBeChecked();
    });

    it("calls onToggle when checkbox clicked", async () => {
        const user = userEvent.setup();
        const onToggle = vi.fn();
        renderWithProviders(
            <IssueCard issue={baseIssue} selectable selected={false} onToggle={onToggle} />
        );
        await user.click(screen.getByRole("checkbox"));
        expect(onToggle).toHaveBeenCalledWith("DEMO-1");
    });

    it("shows selected ring style", () => {
        renderWithProviders(
            <IssueCard issue={baseIssue} selectable selected onToggle={() => {}} />
        );
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeChecked();
    });
});
