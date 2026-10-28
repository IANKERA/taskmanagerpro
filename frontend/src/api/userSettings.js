import api from "./client";

export const updateEmail = (email) =>
    api.patch("/api/users/me/email", { email }).then((r) => r.data);

export const getNotifPrefs = () =>
    api.get("/api/users/me/notification-preferences").then((r) => r.data);

export const updateNotifPrefs = (prefs) =>
    api.put("/api/users/me/notification-preferences", prefs).then((r) => r.data);
