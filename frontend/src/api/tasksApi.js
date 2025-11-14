// src/api/tasksApi.js

const API_BASE_URL = "http://localhost:8080";

export async function fetchTasks() {
    const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
    }

    return response.json();
}
