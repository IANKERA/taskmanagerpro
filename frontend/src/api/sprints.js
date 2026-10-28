import api from "./client";

export const listSprints = (projectKey) =>
    api.get(`/api/projects/${projectKey}/sprints`).then((r) => r.data);

export const createSprint = (projectKey, body) =>
    api.post(`/api/projects/${projectKey}/sprints`, body).then((r) => r.data);

export const startSprint = (id) =>
    api.post(`/api/sprints/${id}/start`).then((r) => r.data);

export const closeSprint = (id) =>
    api.post(`/api/sprints/${id}/close`).then((r) => r.data);

export const listSprintIssues = (id) =>
    api.get(`/api/sprints/${id}/issues`).then((r) => r.data);

export const sprintBurndown = (id) =>
    api.get(`/api/sprints/${id}/burndown`).then((r) => r.data);
