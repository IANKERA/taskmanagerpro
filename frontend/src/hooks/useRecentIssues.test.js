import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: { token: null, user: null } }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));

import { useRecentIssues } from "./useRecentIssues";

const issueA = { issueKey: "A-1", title: "Alice issue", projectKey: "A", status: "PENDING" };
const issueB = { issueKey: "B-1", title: "Bob issue", projectKey: "B", status: "DONE" };

describe("useRecentIssues user isolation", () => {
    beforeEach(() => {
        localStorage.clear();
        auth.token = "token-a";
        auth.user = { id: 1, username: "alice" };
    });

    it("keeps recently viewed items private across logout and account switching", async () => {
        const { result, rerender } = renderHook(() => useRecentIssues());
        await waitFor(() => expect(result.current.recentIssues).toEqual([]));

        act(() => result.current.trackIssue(issueA));
        expect(result.current.recentIssues.map((item) => item.issueKey)).toEqual(["A-1"]);
        expect(localStorage.getItem("recent-issues:1")).toContain("A-1");

        auth.token = null;
        auth.user = null;
        rerender();
        expect(result.current.recentIssues).toEqual([]);
        act(() => result.current.trackIssue(issueB));
        expect(localStorage.getItem("recent-issues:1")).toContain("A-1");
        expect(localStorage.getItem("recent-issues:2")).toBeNull();

        auth.token = "token-b";
        auth.user = { id: 2, username: "bob" };
        rerender();
        await waitFor(() => expect(result.current.recentIssues).toEqual([]));
        act(() => result.current.trackIssue(issueB));
        expect(result.current.recentIssues.map((item) => item.issueKey)).toEqual(["B-1"]);

        auth.token = "token-a";
        auth.user = { id: 1, username: "alice" };
        rerender();
        await waitFor(() => expect(result.current.recentIssues.map((item) => item.issueKey)).toEqual(["A-1"]));
    });

    it("hides stored items while the authenticated profile ID is loading", async () => {
        localStorage.setItem("recent-issues:1", JSON.stringify([issueA]));
        localStorage.setItem("recent-issues:2", JSON.stringify([issueB]));
        auth.token = "token-b";
        auth.user = null;

        const { result, rerender } = renderHook(() => useRecentIssues());
        expect(result.current.recentIssues).toEqual([]);

        auth.user = { id: 2, username: "bob" };
        rerender();

        await waitFor(() => {
            expect(result.current.recentIssues.map((item) => item.issueKey)).toEqual(["B-1"]);
        });
    });
});
