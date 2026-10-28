const API_URL = `${(
    import.meta.env.VITE_API_URL ||
    "https://taskmanagerpro-7m9s.onrender.com"
).replace(/\/+$/, "")}/api/auth`;

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

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.text();
}