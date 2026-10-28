import api from "./client";

export const listIssues = (projectKey) =>
    api.get(`/api/projects/${projectKey}/issues`).then((r) => r.data);

export const getIssue = (issueKey) =>
    api.get(`/api/issues/${issueKey}`).then((r) => r.data);

export const createIssue = (projectKey, body) =>
    api.post(`/api/projects/${projectKey}/issues`, body).then((r) => r.data);

export const updateIssue = (issueKey, body) =>
    api.patch(`/api/issues/${issueKey}`, body).then((r) => r.data);

export const deleteIssue = (issueKey) =>
    api.delete(`/api/issues/${issueKey}`).then(() => true);

export const listComments = (issueKey) =>
    api.get(`/api/issues/${issueKey}/comments`).then((r) => r.data);

export const addComment = (issueKey, body) =>
    api.post(`/api/issues/${issueKey}/comments`, { body }).then((r) => r.data);

export const editComment = (issueKey, commentId, body) =>
    api.patch(`/api/issues/${issueKey}/comments/${commentId}`, { body }).then((r) => r.data);

export const deleteComment = (issueKey, commentId) =>
    api.delete(`/api/issues/${issueKey}/comments/${commentId}`).then(() => true);

export const listActivity = (issueKey) =>
    api.get(`/api/issues/${issueKey}/activity`).then((r) => r.data);

export const setLabels = (issueKey, labelIds) =>
    api.put(`/api/issues/${issueKey}/labels`, { labelIds }).then((r) => r.data);

export const toggleWatch = (issueKey) =>
    api.post(`/api/issues/${issueKey}/watch`).then((r) => r.data);

// M65: Move issue between projects
export const moveIssue = (issueKey, targetProjectKey) =>
    api.post(`/api/issues/${issueKey}/move`, { targetProjectKey }).then((r) => r.data);

// M18: Issue links
export const listLinks = (issueKey) =>
    api.get(`/api/issues/${issueKey}/links`).then((r) => r.data);

export const createLink = (issueKey, body) =>
    api.post(`/api/issues/${issueKey}/links`, body).then((r) => r.data);

export const deleteLinkApi = (linkId) =>
    api.delete(`/api/issues/links/${linkId}`).then(() => true);

// M19: Time tracking
export const getTimeLogs = (issueKey) =>
    api.get(`/api/issues/${issueKey}/time-logs`).then((r) => r.data);

export const logTime = (issueKey, body) =>
    api.post(`/api/issues/${issueKey}/time-logs`, body).then((r) => r.data);

export const deleteTimeLog = (issueKey, logId) =>
    api.delete(`/api/issues/${issueKey}/time-logs/${logId}`).then(() => true);

// M18: Bulk update
export const bulkUpdateIssues = (projectKey, body) =>
    api.post(`/api/projects/${projectKey}/issues/bulk-update`, body).then((r) => r.data);

// M42: Reorder
export const reorderIssues = (projectKey, issueKeys) =>
    api.post(`/api/projects/${projectKey}/issues/reorder`, issueKeys).then((r) => r.data);
