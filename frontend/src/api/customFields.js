import api from "./client";

export const listFieldDefs = (projectKey) =>
    api.get(`/api/projects/${projectKey}/custom-fields`).then((r) => r.data);

export const createFieldDef = (projectKey, body) =>
    api.post(`/api/projects/${projectKey}/custom-fields`, body).then((r) => r.data);

export const deleteFieldDef = (projectKey, fieldId) =>
    api.delete(`/api/projects/${projectKey}/custom-fields/${fieldId}`).then(() => true);

export const getFieldValues = (issueKey) =>
    api.get(`/api/issues/${issueKey}/custom-fields`).then((r) => r.data);

export const setFieldValues = (issueKey, values) =>
    api.put(`/api/issues/${issueKey}/custom-fields`, values).then((r) => r.data);
