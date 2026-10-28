import api from "./client";

export const getIssueActivity = (projectKey, issueKey) =>
    api.get(`/api/projects/${projectKey}/issues/${issueKey}/activity`).then((r) => r.data);

export const getProjectActivity = (projectKey) =>
    api.get(`/api/projects/${projectKey}/activity`).then((r) => r.data);
