// src/api/tasksApi.js
const API_BASE_URL = "http://localhost:8080";

export async function fetchTasks() {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
    }

    return response.json();
}

export async function fetchTaskById(id) {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });

    if (!response.ok) {
        throw new Error("Failed to load task");
    }

    return response.json();
}


export async function deleteTask(id) {
    const token = localStorage.getItem("token");

    const response = await fetch(`http://localhost:8080/api/tasks/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status}`);
    }

    return true;
}

export async function updateTask(id, taskData) {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(taskData),
    });

    if (!response.ok) {
        throw new Error("Failed to update task");
    }

    return response.json();
}


