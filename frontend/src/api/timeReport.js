import api from "./client";

export const getTimeReport = (projectKey) =>
    api.get(`/api/projects/${projectKey}/time-report`).then((r) => r.data);
