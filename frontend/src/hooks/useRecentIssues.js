import { useState, useCallback } from "react";

const KEY = "recent-issues";
const MAX = 10;

export function useRecentIssues() {
    const [items, setItems] = useState(() => {
        try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
    });

    const track = useCallback((issue) => {
        setItems((prev) => {
            const filtered = prev.filter((i) => i.issueKey !== issue.issueKey);
            const next = [
                { issueKey: issue.issueKey, title: issue.title, projectKey: issue.projectKey, status: issue.status, visitedAt: Date.now() },
                ...filtered,
            ].slice(0, MAX);
            localStorage.setItem(KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    return { recentIssues: items, trackIssue: track };
}
