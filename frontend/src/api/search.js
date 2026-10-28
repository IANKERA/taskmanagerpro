import api from "./client";

export const searchIssues = (q) =>
    api.get("/api/search", { params: { q } }).then((r) => r.data);

export const myIssues = (onlyOpen = true) =>
    api.get("/api/my-issues", { params: { onlyOpen } }).then((r) => r.data);

export const dashboardStats = () =>
    api.get("/api/dashboard/stats").then((r) => r.data);

export const recentActivity = (limit = 50) =>
    api.get("/api/activity/feed").then((r) => r.data);

export const subtasks = (issueKey) =>
    api.get(`/api/issues/${issueKey}/subtasks`).then((r) => r.data);
