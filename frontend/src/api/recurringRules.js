import api from "./client";

export const listRules = (projectKey) =>
    api.get(`/api/projects/${projectKey}/recurring-rules`).then((r) => r.data);

export const createRule = (projectKey, body) =>
    api.post(`/api/projects/${projectKey}/recurring-rules`, body).then((r) => r.data);

export const toggleRule = (projectKey, id) =>
    api.patch(`/api/projects/${projectKey}/recurring-rules/${id}/toggle`).then((r) => r.data);

export const deleteRule = (projectKey, id) =>
    api.delete(`/api/projects/${projectKey}/recurring-rules/${id}`).then((r) => r.data);
