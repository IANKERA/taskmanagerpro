const API_URL = "http://localhost:8080/api/auth";

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
