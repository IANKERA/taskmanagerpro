import api from "./client";

export const fetchAdminUsers = () => api.get("/api/users").then((r) => r.data);

export const updateAdminUser = (id, data) =>
    api.put(`/api/users/${id}`, data).then((r) => r.data);

export const deleteAdminUser = (id) =>
    api.delete(`/api/users/${id}`).then(() => true);

export const resetAdminUserPassword = (id, newPassword) =>
    api.post(`/api/users/${id}/reset-password`, { newPassword }).then((r) => r.data);

export const fetchAdminAuditLog = (limit = 100) =>
    api.get("/api/admin/audit-log", { params: { limit } }).then((r) => r.data);

