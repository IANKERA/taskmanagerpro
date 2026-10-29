import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { registerRequest, navigate } = vi.hoisted(() => ({
    registerRequest: vi.fn(),
    navigate: vi.fn(),
}));
vi.mock("../api/authApi", () => ({ registerRequest }));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));

import Register from "./Register";

describe("Register", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(window, "alert").mockImplementation(() => {});
    });

    it("shows password policy feedback immediately and prevents invalid submission", () => {
        render(<Register />);
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "weakpassword!" } });

        expect(screen.getByRole("status")).toHaveTextContent("Password must contain at least one uppercase letter.");
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "new-user" } });
        fireEvent.click(screen.getByRole("button", { name: "Register" }));
        expect(registerRequest).not.toHaveBeenCalled();
    });

    it("shows server validation messages, and valid passwords still register", async () => {
        registerRequest.mockRejectedValueOnce(new Error("The server rejected registration."));
        const { unmount } = render(<Register />);
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "new-user" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password123!" } });
        fireEvent.submit(screen.getByRole("button", { name: "Register" }).closest("form"));
        expect(await screen.findByText("The server rejected registration.")).toBeInTheDocument();
        unmount();
    });

    it("registers successfully with a password that meets the policy", async () => {
        registerRequest.mockResolvedValueOnce("User registered successfully");
        render(<Register />);
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "new-user" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password123!" } });
        fireEvent.submit(screen.getByRole("button", { name: "Register" }).closest("form"));
        await waitFor(() => expect(registerRequest).toHaveBeenCalledWith("new-user", "Password123!"));
        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/login"));
    });
});
