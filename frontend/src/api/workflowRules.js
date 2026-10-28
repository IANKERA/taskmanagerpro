import api from "./client";

export const listWorkflowRules = (projectKey) =>
    api.get(`/api/projects/${projectKey}/workflow-rules`).then((r) => r.data);

export const createWorkflowRule = (projectKey, body) =>
    api.post(`/api/projects/${projectKey}/workflow-rules`, body).then((r) => r.data);

export const toggleWorkflowRule = (projectKey, id) =>
    api.patch(`/api/projects/${projectKey}/workflow-rules/${id}/toggle`).then((r) => r.data);

export const deleteWorkflowRule = (projectKey, id) =>
    api.delete(`/api/projects/${projectKey}/workflow-rules/${id}`).then((r) => r.data);
