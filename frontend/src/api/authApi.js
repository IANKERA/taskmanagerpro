import { formatApiError } from "./errorMessage";
import { resolveApiBaseUrl } from "./client";

const API_URL = `${resolveApiBaseUrl(import.meta.env.VITE_API_URL)}/api/auth`;

export async function loginRequest(username, password) {
    const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
        throw new Error("Invalid username or password");
    }

    const data = await res.json();

    // Save token
    localStorage.setItem("token", data.token);

    return data;
}

export async function registerRequest(username, password) {
    const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
    });

    const responseText = await response.text();

    if (!response.ok) {
        let data = responseText;
        try {
            data = JSON.parse(responseText);
        } catch {
            // Non-JSON response bodies are handled as plain text.
        }
        if (response.status !== 400 && response.status !== 409) {
            throw new Error("Registration failed. Please try again later.");
        }
        const message = formatApiError({ status: response.status, data });
        throw new Error(/^bad request$/i.test(message)
            ? "Please check your username and password and try again."
            : message);
    }

    return responseText;
}
