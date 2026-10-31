import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loginRequest, login, navigate } = vi.hoisted(() => ({
    loginRequest: vi.fn(),
    login: vi.fn(),
    navigate: vi.fn(),
}));

vi.mock("../api/authApi", () => ({ loginRequest }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ login }) }));
vi.mock("react-router-dom", async (importOriginal) => ({
    ...(await importOriginal()),
    useNavigate: () => navigate,
}));

import Login from "./Login";

function renderLogin() {
    return render(<MemoryRouter><Login /></MemoryRouter>);
}

function submitLogin() {
    fireEvent.change(document.querySelector('input[type="text"]'), { target: { value: "user" } });
    fireEvent.change(document.querySelector('input[type="password"]'), { target: { value: "Password123!" } });
    fireEvent.submit(screen.getByRole("button", { name: "Login" }).closest("form"));
}

describe("Login", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows a disabled signing-in state while the request is pending", () => {
        loginRequest.mockReturnValue(new Promise(() => {}));
        renderLogin();

        submitLogin();

        expect(screen.getByText("Signing in…").closest("button")).toBeDisabled();
        expect(screen.getByRole("status", { name: "Signing in" })).toBeInTheDocument();
        expect(loginRequest).toHaveBeenCalledWith("user", "Password123!");
    });

    it("logs in and navigates to projects after a successful request", async () => {
        loginRequest.mockResolvedValue({ token: "test-token" });
        renderLogin();

        submitLogin();

        await waitFor(() => expect(login).toHaveBeenCalledWith("test-token"));
        expect(navigate).toHaveBeenCalledWith("/projects");
    });

    it("restores the button and displays the existing error message after a failed request", async () => {
        loginRequest.mockRejectedValue(new Error("Request failed"));
        renderLogin();

        submitLogin();

        expect(await screen.findByText("Invalid username or password")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Login" })).toBeEnabled();
        expect(screen.queryByRole("status", { name: "Signing in" })).not.toBeInTheDocument();
    });
});
