import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../api/client";

const fetchUsers = () => api.get("/api/users").then((r) => r.data);

export default function UserAdmin() {
    const qc = useQueryClient();
    const { data: users = [], isLoading } = useQuery({
        queryKey: ["admin-users"],
        queryFn: fetchUsers,
    });

    const [editingId, setEditingId] = useState(null);
    const [editRole, setEditRole] = useState("");
    const [resetPw, setResetPw] = useState({ userId: null, password: "" });

    const updateRoleMut = useMutation({
        mutationFn: ({ id, role }) => api.put(`/api/users/${id}`, { role }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-users"] });
            setEditingId(null);
            toast.success("Role updated");
        },
        onError: (e) => toast.error(e.message),
    });

    const resetPwMut = useMutation({
        mutationFn: ({ id, newPassword }) =>
            api.post(`/api/users/${id}/reset-password`, { newPassword }),
        onSuccess: () => {
            setResetPw({ userId: null, password: "" });
            toast.success("Password reset");
        },
        onError: (e) => toast.error(e.message),
    });

    const deleteMut = useMutation({
        mutationFn: (id) => api.delete(`/api/users/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-users"] });
            toast.success("User deleted");
        },
        onError: (e) => toast.error(e.message),
    });

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold text-slate-900 mb-6">User Management</h1>

            {isLoading ? (
                <div className="text-slate-500">Loading...</div>
            ) : users.length === 0 ? (
                <div className="text-slate-500">No users found.</div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-4 py-3 font-semibold text-slate-700">ID</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700">Username</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700">Role</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.id}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{u.username}</td>
                                    <td className="px-4 py-3">
                                        {editingId === u.id ? (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={editRole}
                                                    onChange={(e) => setEditRole(e.target.value)}
                                                    className="border border-slate-300 rounded px-2 py-1 text-xs"
                                                >
                                                    <option value="ROLE_USER">USER</option>
                                                    <option value="ROLE_ADMIN">ADMIN</option>
                                                </select>
                                                <button
                                                    onClick={() => updateRoleMut.mutate({ id: u.id, role: editRole })}
                                                    className="text-xs text-blue-600 hover:text-blue-800"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="text-xs text-slate-400 hover:text-slate-600"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                                u.role === "ROLE_ADMIN" || u.role === "ADMIN"
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-slate-100 text-slate-600"
                                            }`}>
                                                {(u.role || "").replace("ROLE_", "")}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {editingId !== u.id && (
                                                <button
                                                    onClick={() => { setEditingId(u.id); setEditRole(u.role); }}
                                                    className="text-xs text-slate-500 hover:text-blue-600"
                                                >
                                                    Edit role
                                                </button>
                                            )}
                                            {resetPw.userId === u.id ? (
                                                <form
                                                    onSubmit={(e) => {
                                                        e.preventDefault();
                                                        resetPwMut.mutate({ id: u.id, newPassword: resetPw.password });
                                                    }}
                                                    className="flex items-center gap-1"
                                                >
                                                    <input
                                                        type="password"
                                                        value={resetPw.password}
                                                        onChange={(e) => setResetPw({ ...resetPw, password: e.target.value })}
                                                        placeholder="New password"
                                                        className="border border-slate-300 rounded px-2 py-1 text-xs w-28"
                                                        required
                                                        minLength={6}
                                                    />
                                                    <button className="text-xs text-blue-600">Set</button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setResetPw({ userId: null, password: "" })}
                                                        className="text-xs text-slate-400"
                                                    >
                                                        Cancel
                                                    </button>
                                                </form>
                                            ) : (
                                                <button
                                                    onClick={() => setResetPw({ userId: u.id, password: "" })}
                                                    className="text-xs text-slate-500 hover:text-amber-600"
                                                >
                                                    Reset pw
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Delete user "${u.username}"? This cannot be undone.`)) {
                                                        deleteMut.mutate(u.id);
                                                    }
                                                }}
                                                className="text-xs text-slate-400 hover:text-red-600"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
