import api from "./client";

export const getAnalytics = (projectKey) =>
    api.get(`/api/projects/${projectKey}/analytics`).then((r) => r.data);
