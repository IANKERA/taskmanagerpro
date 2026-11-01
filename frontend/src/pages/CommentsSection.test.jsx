import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { CommentsSection } from "./IssueModal";
import { renderWithProviders } from "../test/helpers";
import * as issuesApi from "../api/issues";
import * as projectsApi from "../api/projects";

vi.mock("../api/issues", () => ({
    listComments: vi.fn(),
    addComment: vi.fn(),
    editComment: vi.fn(),
    deleteComment: vi.fn(),
}));

vi.mock("../api/projects", () => ({
    listMembers: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({ user: { username: "currentuser" } }),
}));

describe("CommentsSection", () => {
    it("renders comment body with readable dark theme text, whitespace-pre-wrap, and word break", async () => {
        const commentText = "First line\nSecond line   with spaces";
        issuesApi.listComments.mockResolvedValueOnce([
            {
                id: 1,
                authorUsername: "alice",
                createdAt: "2026-11-01T10:00:00Z",
                body: commentText,
            },
        ]);
        projectsApi.listMembers.mockResolvedValueOnce([]);

        renderWithProviders(<CommentsSection issueKey="PROJ-1" projectKey="PROJ" />);

        const author = await screen.findByText("alice");
        expect(author).toBeInTheDocument();
        expect(author).toHaveClass("text-slate-700", "dark:text-slate-200");

        const bodyElement = screen.getByText(/First line/, { collapseWhitespace: false });
        expect(bodyElement).toBeInTheDocument();
        expect(bodyElement.textContent).toContain("First line\nSecond line   with spaces");
        expect(bodyElement).toHaveClass("dark:text-slate-100", "whitespace-pre-wrap", "break-words");
    });

    it("distinguishes @mentions with highlighted styling while preserving regular text", async () => {
        issuesApi.listComments.mockResolvedValueOnce([
            {
                id: 2,
                authorUsername: "bob",
                createdAt: "2026-11-01T10:00:00Z",
                body: "Hello @alice and @charlie-dev, please review this!",
            },
        ]);
        projectsApi.listMembers.mockResolvedValueOnce([]);

        renderWithProviders(<CommentsSection issueKey="PROJ-1" projectKey="PROJ" />);

        const mentionAlice = await screen.findByText("@alice");
        expect(mentionAlice).toBeInTheDocument();
        expect(mentionAlice.tagName).toBe("SPAN");
        expect(mentionAlice).toHaveClass("text-blue-600", "dark:text-blue-400");

        const mentionCharlie = screen.getByText("@charlie-dev");
        expect(mentionCharlie).toBeInTheDocument();
        expect(mentionCharlie).toHaveClass("text-blue-600", "dark:text-blue-400");
    });

    it("renders comment card with improved contrast background and border", async () => {
        issuesApi.listComments.mockResolvedValueOnce([
            {
                id: 3,
                authorUsername: "alice",
                createdAt: "2026-11-01T10:00:00Z",
                body: "Checking card contrast",
            },
        ]);
        projectsApi.listMembers.mockResolvedValueOnce([]);

        renderWithProviders(<CommentsSection issueKey="PROJ-1" projectKey="PROJ" />);

        const author = await screen.findByText("alice");
        const card = author.closest(".group");
        expect(card).toHaveClass("border", "border-slate-200", "dark:border-slate-600", "dark:bg-slate-700/60");
    });

    it("applies accessible text and placeholder colors to the comment input", async () => {
        issuesApi.listComments.mockResolvedValueOnce([]);
        projectsApi.listMembers.mockResolvedValueOnce([]);

        renderWithProviders(<CommentsSection issueKey="PROJ-1" projectKey="PROJ" />);

        const textarea = await screen.findByPlaceholderText("Add a comment… (type @ to mention)");
        expect(textarea).toBeInTheDocument();
        expect(textarea).toHaveClass(
            "dark:text-slate-100",
            "placeholder:text-slate-400",
            "dark:placeholder:text-slate-500",
            "dark:border-slate-600"
        );
    });
});
