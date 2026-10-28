import api from "./client";

export const listNotifications = (limit = 50) =>
    api.get("/api/notifications", { params: { limit } }).then((r) => r.data);

export const unreadCount = () =>
    api.get("/api/notifications/unread-count").then((r) => r.data.count);

export const markRead = (id) =>
    api.post(`/api/notifications/${id}/read`).then(() => true);

export const markAllRead = () =>
    api.post("/api/notifications/read-all").then(() => true);
