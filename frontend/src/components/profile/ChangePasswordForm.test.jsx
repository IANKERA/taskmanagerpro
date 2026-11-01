import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/helpers";
import toast from "react-hot-toast";

const { changePassword } = vi.hoisted(() => ({
    changePassword: vi.fn(),
}));

vi.mock("../../api/userSettings", () => ({
    changePassword,
}));

vi.mock("react-hot-toast", () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import ChangePasswordForm from "./ChangePasswordForm";

describe("ChangePasswordForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it("renders all form fields, labels, instructions, and toggle buttons", () => {
        renderWithProviders(<ChangePasswordForm />);

        expect(screen.getByRole("heading", { name: "Change Password" })).toBeInTheDocument();
        expect(screen.getByLabelText("Current Password")).toHaveAttribute("type", "password");
        expect(screen.getByLabelText("New Password")).toHaveAttribute("type", "password");
        expect(screen.getByLabelText("Confirm New Password")).toHaveAttribute("type", "password");

        expect(screen.getByRole("button", { name: "Show current password" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Show new password" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Show confirm new password" })).toBeInTheDocument();

        expect(screen.getByRole("button", { name: "Update Password" })).toBeInTheDocument();
    });

    it("toggles password visibility between password and text for each field", () => {
        renderWithProviders(<ChangePasswordForm />);

        const currentInput = screen.getByLabelText("Current Password");
        const toggleCurrentBtn = screen.getByRole("button", { name: "Show current password" });

        expect(currentInput).toHaveAttribute("type", "password");
        fireEvent.click(toggleCurrentBtn);
        expect(currentInput).toHaveAttribute("type", "text");
        expect(screen.getByRole("button", { name: "Hide current password" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Hide current password" }));
        expect(currentInput).toHaveAttribute("type", "password");

        // Same for new password
        const newInput = screen.getByLabelText("New Password");
        const toggleNewBtn = screen.getByRole("button", { name: "Show new password" });
        fireEvent.click(toggleNewBtn);
        expect(newInput).toHaveAttribute("type", "text");

        // Same for confirm password
        const confirmInput = screen.getByLabelText("Confirm New Password");
        const toggleConfirmBtn = screen.getByRole("button", { name: "Show confirm new password" });
        fireEvent.click(toggleConfirmBtn);
        expect(confirmInput).toHaveAttribute("type", "text");
    });

    it("validates missing fields without submitting to the API", () => {
        renderWithProviders(<ChangePasswordForm />);

        fireEvent.submit(screen.getByRole("button", { name: "Update Password" }).closest("form"));

        expect(screen.getByRole("alert")).toHaveTextContent("Current password is required.");
        expect(changePassword).not.toHaveBeenCalled();
    });

    it("validates password policy and displays specific policy error", () => {
        renderWithProviders(<ChangePasswordForm />);

        fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "OldPass123!" } });

        // Too short (< 8 chars)
        fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "Short1!" } });
        fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "Short1!" } });
        fireEvent.submit(screen.getByRole("button", { name: "Update Password" }).closest("form"));

        expect(screen.getByRole("alert")).toHaveTextContent("Password must be at least 8 characters long.");
        expect(changePassword).not.toHaveBeenCalled();

        // Missing uppercase
        fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "lowercase123!" } });
        fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "lowercase123!" } });
        fireEvent.submit(screen.getByRole("button", { name: "Update Password" }).closest("form"));

        expect(screen.getByRole("alert")).toHaveTextContent("Password must contain at least one uppercase letter.");
        expect(changePassword).not.toHaveBeenCalled();

        // Missing number
        fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "NoNumberPass!" } });
        fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "NoNumberPass!" } });
        fireEvent.submit(screen.getByRole("button", { name: "Update Password" }).closest("form"));

        expect(screen.getByRole("alert")).toHaveTextContent("Password must contain at least one number.");
        expect(changePassword).not.toHaveBeenCalled();

        // Missing special character
        fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "NoSpecial123" } });
        fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "NoSpecial123" } });
        fireEvent.submit(screen.getByRole("button", { name: "Update Password" }).closest("form"));

        expect(screen.getByRole("alert")).toHaveTextContent("Password must contain at least one special character.");
        expect(changePassword).not.toHaveBeenCalled();
    });

    it("validates password confirmation mismatch", () => {
        renderWithProviders(<ChangePasswordForm />);

        fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "OldPass123!" } });
        fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "ValidNewPass123!" } });
        fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "DifferentPass123!" } });
        fireEvent.submit(screen.getByRole("button", { name: "Update Password" }).closest("form"));

        expect(screen.getByRole("alert")).toHaveTextContent("New passwords do not match.");
        expect(changePassword).not.toHaveBeenCalled();
    });

    it("validates that new password cannot be the same as current password", () => {
        renderWithProviders(<ChangePasswordForm />);

        fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "SamePassword123!" } });
        fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "SamePassword123!" } });
        fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "SamePassword123!" } });
        fireEvent.submit(screen.getByRole("button", { name: "Update Password" }).closest("form"));

        expect(screen.getByRole("alert")).toHaveTextContent("New password must be different from current password.");
        expect(changePassword).not.toHaveBeenCalled();
    });

    it("handles API error and preserves entered field values without clearing them", async () => {
        changePassword.mockRejectedValueOnce(new Error("Incorrect current password."));
        renderWithProviders(<ChangePasswordForm />);

        fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "WrongOld123!" } });
        fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "ValidNewPass123!" } });
        fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "ValidNewPass123!" } });
        fireEvent.submit(screen.getByRole("button", { name: "Update Password" }).closest("form"));

        await waitFor(() => {
            expect(screen.getByRole("alert")).toHaveTextContent("Incorrect current password.");
        });
        expect(toast.error).toHaveBeenCalledWith("Incorrect current password.");

        // Form fields must NOT be cleared on error
        expect(screen.getByLabelText("Current Password")).toHaveValue("WrongOld123!");
        expect(screen.getByLabelText("New Password")).toHaveValue("ValidNewPass123!");
        expect(screen.getByLabelText("Confirm New Password")).toHaveValue("ValidNewPass123!");
    });

    it("shows loading state and disables inputs while request is pending", async () => {
        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
            resolvePromise = resolve;
        });
        changePassword.mockReturnValueOnce(pendingPromise);

        renderWithProviders(<ChangePasswordForm />);

        fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "OldPass123!" } });
        fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "ValidNewPass123!" } });
        fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "ValidNewPass123!" } });
        fireEvent.submit(screen.getByRole("button", { name: "Update Password" }).closest("form"));

        // During in-flight request
        const submitBtn = screen.getByRole("button", { name: "Updating Password..." });
        expect(submitBtn).toBeDisabled();
        expect(screen.getByLabelText("Current Password")).toBeDisabled();
        expect(screen.getByLabelText("New Password")).toBeDisabled();
        expect(screen.getByLabelText("Confirm New Password")).toBeDisabled();

        resolvePromise({ message: "Password updated successfully." });

        await waitFor(() => {
            expect(screen.getByRole("status")).toHaveTextContent("Password updated successfully.");
        });
    });

    it("handles API success: displays success message, calls toast, clears form fields, and stores new token", async () => {
        changePassword.mockResolvedValueOnce({
            message: "Password updated successfully.",
            token: "renewed-jwt-token-xyz",
        });

        renderWithProviders(<ChangePasswordForm />);

        fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "OldPass123!" } });
        fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "ValidNewPass123!" } });
        fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "ValidNewPass123!" } });
        fireEvent.submit(screen.getByRole("button", { name: "Update Password" }).closest("form"));

        await waitFor(() => {
            expect(screen.getByRole("status")).toHaveTextContent("Password updated successfully.");
        });

        expect(toast.success).toHaveBeenCalledWith("Password updated successfully.");
        expect(localStorage.getItem("token")).toBe("renewed-jwt-token-xyz");

        // Form fields MUST be cleared upon success
        expect(screen.getByLabelText("Current Password")).toHaveValue("");
        expect(screen.getByLabelText("New Password")).toHaveValue("");
        expect(screen.getByLabelText("Confirm New Password")).toHaveValue("");
    });
});

