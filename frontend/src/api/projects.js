import api from "./client";

export const listProjects = () => api.get("/api/projects").then((r) => r.data);

export const getProject = (key) =>
    api.get(`/api/projects/${key}`).then((r) => r.data);

export const createProject = (body) =>
    api.post("/api/projects", body).then((r) => r.data);

export const updateProject = (key, body) =>
    api.patch(`/api/projects/${key}`, body).then((r) => r.data);

export const listMembers = (key) =>
    api.get(`/api/projects/${key}/members`).then((r) => r.data);

export const listAssignableUsers = (key) =>
    api.get(`/api/projects/${key}/assignable-users`).then((r) => r.data);

export const listLabels = (key) =>
    api.get(`/api/projects/${key}/labels`).then((r) => r.data);

export const createLabel = (key, body) =>
    api.post(`/api/projects/${key}/labels`, body).then((r) => r.data);

export const deleteLabel = (key, labelId) =>
    api.delete(`/api/projects/${key}/labels/${labelId}`).then(() => true);

export const addMember = (key, body) =>
    api.post(`/api/projects/${key}/members`, body).then((r) => r.data);

export const archiveProject = (key) =>
    api.post(`/api/projects/${key}/archive`).then((r) => r.data);

export const unarchiveProject = (key) =>
    api.post(`/api/projects/${key}/unarchive`).then((r) => r.data);

export const deleteProject = (key) =>
    api.delete(`/api/projects/${key}`).then(() => true);
