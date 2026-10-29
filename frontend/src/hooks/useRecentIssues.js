import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const MAX = 10;

export function useRecentIssues() {
    const { token, user } = useAuth();
    const userId = token && user?.id != null ? String(user.id) : null;
    const storageKey = userId ? `recent-issues:${userId}` : null;
    const [state, setState] = useState({ ownerId: null, items: [] });

    useEffect(() => {
        if (!userId) {
            setState({ ownerId: null, items: [] });
            return;
        }
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
            setState({ ownerId: userId, items: Array.isArray(saved) ? saved : [] });
        } catch {
            setState({ ownerId: userId, items: [] });
        }
    }, [storageKey, userId]);

    const track = useCallback((issue) => {
        if (!userId || !storageKey) return;
        setState((current) => {
            const prev = current.ownerId === userId ? current.items : [];
            const filtered = prev.filter((i) => i.issueKey !== issue.issueKey);
            const next = [
                { issueKey: issue.issueKey, title: issue.title, projectKey: issue.projectKey, status: issue.status, visitedAt: Date.now() },
                ...filtered,
            ].slice(0, MAX);
            localStorage.setItem(storageKey, JSON.stringify(next));
            return { ownerId: userId, items: next };
        });
    }, [storageKey, userId]);

    return { recentIssues: state.ownerId === userId ? state.items : [], trackIssue: track };
}
