import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { changePassword } from "../../api/userSettings";
import { getPasswordValidationMessage } from "../../pages/Register";

export default function ChangePasswordForm() {
    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [validationError, setValidationError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const mut = useMutation({
        mutationFn: ({ currentPassword, newPassword, confirmPassword }) =>
            changePassword({ currentPassword, newPassword, confirmPassword }),
        onSuccess: (data) => {
            const msg = data?.message || "Password updated successfully.";
            setSuccessMessage(msg);
            toast.success(msg);
            setValidationError("");
            // Clear fields ONLY upon confirmed success
            setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setShowCurrent(false);
            setShowNew(false);
            setShowConfirm(false);

            if (data?.token) {
                localStorage.setItem("token", data.token);
            }
        },
        onError: (err) => {
            setSuccessMessage("");
            const msg = err.message || "Failed to update password.";
            setValidationError(msg);
            toast.error(msg);
            // DO NOT clear form fields on error
        },
    });

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (validationError) setValidationError("");
        if (successMessage) setSuccessMessage("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setValidationError("");
        setSuccessMessage("");

        if (!form.currentPassword) {
            setValidationError("Current password is required.");
            return;
        }

        if (!form.newPassword) {
            setValidationError("New password is required.");
            return;
        }

        const policyError = getPasswordValidationMessage(form.newPassword);
        if (policyError) {
            setValidationError(policyError);
            return;
        }

        if (form.newPassword !== form.confirmPassword) {
            setValidationError("New passwords do not match.");
            return;
        }

        if (form.currentPassword === form.newPassword) {
            setValidationError("New password must be different from current password.");
            return;
        }

        mut.mutate({
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
            confirmPassword: form.confirmPassword,
        });
    };

    return (
        <section aria-labelledby="change-password-heading" className="app-surface space-y-4 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
                <h2 id="change-password-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
                    Change Password
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Ensure your account is using a long, random password to stay secure.
                </p>
            </div>

            {successMessage && (
                <div role="status" className="rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300">
                    {successMessage}
                </div>
            )}

            {validationError && (
                <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                    {validationError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Current Password */}
                <div>
                    <label
                        htmlFor="currentPassword"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                        Current Password
                    </label>
                    <div className="relative">
                        <input
                            id="currentPassword"
                            name="currentPassword"
                            type={showCurrent ? "text" : "password"}
                            required
                            autoComplete="current-password"
                            disabled={mut.isPending}
                            placeholder="Enter current password"
                            value={form.currentPassword}
                            onChange={handleChange("currentPassword")}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 pr-16 text-sm text-slate-900 dark:text-white dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrent((prev) => !prev)}
                            disabled={mut.isPending}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
                            aria-label={showCurrent ? "Hide current password" : "Show current password"}
                        >
                            {showCurrent ? "Hide" : "Show"}
                        </button>
                    </div>
                </div>

                {/* New Password */}
                <div>
                    <label
                        htmlFor="newPassword"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                        New Password
                    </label>
                    <div className="relative">
                        <input
                            id="newPassword"
                            name="newPassword"
                            type={showNew ? "text" : "password"}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            disabled={mut.isPending}
                            placeholder="Enter new password"
                            value={form.newPassword}
                            onChange={handleChange("newPassword")}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 pr-16 text-sm text-slate-900 dark:text-white dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNew((prev) => !prev)}
                            disabled={mut.isPending}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
                            aria-label={showNew ? "Hide new password" : "Show new password"}
                        >
                            {showNew ? "Hide" : "Show"}
                        </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        At least 8 characters, including uppercase, lowercase, a number, and a special character.
                    </p>
                </div>

                {/* Confirm New Password */}
                <div>
                    <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                        Confirm New Password
                    </label>
                    <div className="relative">
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirm ? "text" : "password"}
                            required
                            autoComplete="new-password"
                            disabled={mut.isPending}
                            placeholder="Confirm new password"
                            value={form.confirmPassword}
                            onChange={handleChange("confirmPassword")}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 pr-16 text-sm text-slate-900 dark:text-white dark:placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm((prev) => !prev)}
                            disabled={mut.isPending}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
                            aria-label={showConfirm ? "Hide confirm new password" : "Show confirm new password"}
                        >
                            {showConfirm ? "Hide" : "Show"}
                        </button>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={mut.isPending}
                        className="min-h-10 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                        {mut.isPending ? "Updating Password..." : "Update Password"}
                    </button>
                </div>
            </form>
        </section>
    );
}

