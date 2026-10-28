import api from "./client";

export const listTemplates = (projectKey) =>
    api.get(`/api/projects/${projectKey}/templates`).then((r) => r.data);

export const createTemplate = (projectKey, body) =>
    api.post(`/api/projects/${projectKey}/templates`, body).then((r) => r.data);

export const deleteTemplate = (projectKey, id) =>
    api.delete(`/api/projects/${projectKey}/templates/${id}`).then((r) => r.data);
