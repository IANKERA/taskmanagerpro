import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function Profile() {
    const { user } = useAuth();
    const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirm: "" });

    const mut = useMutation({
        mutationFn: ({ oldPassword, newPassword }) =>
            api.post("/api/users/me/reset-password", { oldPassword, newPassword }),
        onSuccess: () => {
            toast.success("Password updated");
            setForm({ oldPassword: "", newPassword: "", confirm: "" });
        },
        onError: (e) => toast.error(e.message),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (form.newPassword !== form.confirm) {
            toast.error("Passwords don't match");
            return;
        }
        if (form.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        mut.mutate({ oldPassword: form.oldPassword, newPassword: form.newPassword });
    };

    return (
        <div className="max-w-lg mx-auto">
            <h1 className="text-2xl font-semibold text-slate-900 mb-6">Profile</h1>

            <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-bold">
                        {(user?.username || "?")[0].toUpperCase()}
                    </div>
                    <div>
                        <div className="text-lg font-semibold text-slate-900">{user?.username}</div>
                        <div className="text-sm text-slate-500">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                (user?.role || "").includes("ADMIN")
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                            }`}>
                                {(user?.role || "").replace("ROLE_", "")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-4">Change Password</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="password"
                        required
                        placeholder="Current password"
                        value={form.oldPassword}
                        onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                    <input
                        type="password"
                        required
                        placeholder="New password"
                        value={form.newPassword}
                        onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                    <input
                        type="password"
                        required
                        placeholder="Confirm new password"
                        value={form.confirm}
                        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                    <button
                        disabled={mut.isPending}
                        className="px-4 py-2 bg-slate-900 text-white text-sm rounded hover:bg-slate-800 disabled:opacity-50"
                    >
                        {mut.isPending ? "Updating..." : "Update Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}
