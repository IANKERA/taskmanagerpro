import api from "./client";

export async function fetchTasks() {
    const response = await api.get("/api/tasks");
    return response.data;
}

export async function fetchTaskById(id) {
    const response = await api.get(`/api/tasks/${id}`);
    return response.data;
}

export async function deleteTask(id) {
    await api.delete(`/api/tasks/${id}`);
    return true;
}

export async function updateTask(id, taskData) {
    const response = await api.put(`/api/tasks/${id}`, taskData);
    return response.data;
}
