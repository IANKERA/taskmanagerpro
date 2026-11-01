import api from "./client";

export const getAnalytics = (projectKey) =>
    api.get(`/api/projects/${projectKey}/analytics`).then((r) => r.data);

export const getCfd = (projectKey, days = 30) =>
    api.get(`/api/projects/${projectKey}/analytics/cfd`, { params: { days } }).then((r) => r.data);
