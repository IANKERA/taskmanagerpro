import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fetchAdminUsers, updateAdminUser, deleteAdminUser, resetAdminUserPassword } from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../api/errorMessage";

export default function UserAdmin() {
    const qc = useQueryClient();
    const { user: currentUser } = useAuth();

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [editingUserId, setEditingUserId] = useState(null);
    const [editRole, setEditRole] = useState("");

    // Modal state for password reset
    const [passwordModal, setPasswordModal] = useState({ open: false, user: null, password: "", error: "" });
    // Confirmation dialog state for deletion
    const [deleteModal, setDeleteModal] = useState({ open: false, user: null });

    const {
        data: users = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ["admin-users"],
        queryFn: fetchAdminUsers,
    });

    const updateRoleMut = useMutation({
        mutationFn: ({ id, role }) => updateAdminUser(id, { role }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-users"] });
            setEditingUserId(null);
            toast.success("User role updated successfully");
        },
        onError: (e) => toast.error(formatApiError(e)),
    });

    const resetPwMut = useMutation({
        mutationFn: ({ id, newPassword }) => resetAdminUserPassword(id, newPassword),
        onSuccess: () => {
            setPasswordModal({ open: false, user: null, password: "", error: "" });
            toast.success("Password reset successfully");
        },
        onError: (e) => {
            setPasswordModal((prev) => ({ ...prev, error: formatApiError(e) }));
        },
    });

    const deleteMut = useMutation({
        mutationFn: (id) => deleteAdminUser(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-users"] });
            setDeleteModal({ open: false, user: null });
            toast.success("User deleted successfully");
        },
        onError: (e) => toast.error(formatApiError(e)),
    });

    // Client-side filtering
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const matchesSearch =
                !search ||
                u.username?.toLowerCase().includes(search.toLowerCase()) ||
                u.email?.toLowerCase().includes(search.toLowerCase());

            const isRoleAdmin = u.role === "ROLE_ADMIN" || u.role === "ADMIN";
            let matchesRole = true;
            if (roleFilter === "ADMIN") matchesRole = isRoleAdmin;
            if (roleFilter === "USER") matchesRole = !isRoleAdmin;

            return matchesSearch && matchesRole;
        });
    }, [users, search, roleFilter]);

    const totalUsers = users.length;
    const adminCount = users.filter((u) => u.role === "ROLE_ADMIN" || u.role === "ADMIN").length;
    const standardCount = totalUsers - adminCount;

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        const pwd = passwordModal.password;
        if (!pwd || pwd.length < 8) {
            setPasswordModal((prev) => ({ ...prev, error: "Password must be at least 8 characters long." }));
            return;
        }
        if (!/[A-Z]/.test(pwd)) {
            setPasswordModal((prev) => ({ ...prev, error: "Password must contain at least one uppercase letter." }));
            return;
        }
        if (!/[a-z]/.test(pwd)) {
            setPasswordModal((prev) => ({ ...prev, error: "Password must contain at least one lowercase letter." }));
            return;
        }
        if (!/\d/.test(pwd)) {
            setPasswordModal((prev) => ({ ...prev, error: "Password must contain at least one number." }));
            return;
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
            setPasswordModal((prev) => ({ ...prev, error: "Password must contain at least one special character." }));
            return;
        }
        resetPwMut.mutate({ id: passwordModal.user.id, newPassword: pwd });
    };

    return (
        <div className="space-y-6">
            {/* Header & Stats Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="app-surface p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Accounts</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalUsers}</div>
                    </div>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                        All
                    </span>
                </div>
                <div className="app-surface p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Administrators</div>
                        <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{adminCount}</div>
                    </div>
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded text-amber-700 dark:text-amber-300 font-semibold">
                        ROLE_ADMIN
                    </span>
                </div>
                <div className="app-surface p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Standard Users</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{standardCount}</div>
                    </div>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded text-blue-700 dark:text-blue-300 font-semibold">
                        ROLE_USER
                    </span>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div role="alert" className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                    Failed to load users: {formatApiError(error)}
                </div>
            )}

            {/* Controls: Search and Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="Search by username or email…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        aria-label="Search users"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                            title="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="role-filter" className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        Filter Role:
                    </label>
                    <select
                        id="role-filter"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 text-sm"
                    >
                        <option value="ALL">All Roles ({totalUsers})</option>
                        <option value="ADMIN">Admins ({adminCount})</option>
                        <option value="USER">Standard Users ({standardCount})</option>
                    </select>
                </div>
            </div>

            {/* User List Table */}
            <div className="app-surface rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                {isLoading ? (
                    <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Loading directory users…
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        {search || roleFilter !== "ALL"
                            ? "No users match the search and filter criteria."
                            : "No user accounts registered in the system."}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm" aria-label="Users table">
                            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-xs uppercase font-semibold text-slate-600 dark:text-slate-300 tracking-wider">
                                <tr>
                                    <th scope="col" className="px-4 py-3.5">User</th>
                                    <th scope="col" className="px-4 py-3.5">Email</th>
                                    <th scope="col" className="px-4 py-3.5">Role</th>
                                    <th scope="col" className="px-4 py-3.5 text-center">Assigned Issues</th>
                                    <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredUsers.map((u) => {
                                    const isSelf = currentUser?.username === u.username || currentUser?.id === u.id;
                                    const isAdmin = u.role === "ROLE_ADMIN" || u.role === "ADMIN";

                                    return (
                                        <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors">
                                            {/* Username & Avatar */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs uppercase">
                                                        {u.username?.charAt(0) || "U"}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                                                            <span>{u.username}</span>
                                                            {isSelf && (
                                                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                                                            ID: {u.id}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {u.email || <span className="text-slate-400 italic">Not set</span>}
                                            </td>

                                            {/* Role & Role Editor */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                {editingUserId === u.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={editRole}
                                                            onChange={(e) => setEditRole(e.target.value)}
                                                            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-2 py-1 text-xs"
                                                            aria-label={`Change role for ${u.username}`}
                                                        >
                                                            <option value="ROLE_USER">USER</option>
                                                            <option value="ROLE_ADMIN">ADMIN</option>
                                                        </select>
                                                        <button
                                                            onClick={() => updateRoleMut.mutate({ id: u.id, role: editRole })}
                                                            disabled={updateRoleMut.isPending}
                                                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                                                        >
                                                            {updateRoleMut.isPending ? "…" : "Save"}
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingUserId(null)}
                                                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                            isAdmin
                                                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                                                : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                                        }`}
                                                    >
                                                        {isAdmin ? "🛡️ ADMIN" : "👤 USER"}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Assigned Tasks */}
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                <span className="inline-block px-2 py-0.5 text-xs font-mono font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                    {u.taskIds?.length || 0}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Role edit button */}
                                                    {editingUserId !== u.id && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingUserId(u.id);
                                                                setEditRole(u.role || "ROLE_USER");
                                                            }}
                                                            disabled={isSelf}
                                                            title={isSelf ? "Cannot change your own role" : "Edit user role"}
                                                            className="text-xs text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            Edit role
                                                        </button>
                                                    )}

                                                    {/* Password reset button */}
                                                    <button
                                                        onClick={() =>
                                                            setPasswordModal({
                                                                open: true,
                                                                user: u,
                                                                password: "",
                                                                error: "",
                                                            })
                                                        }
                                                        className="text-xs text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400"
                                                    >
                                                        Reset pw
                                                    </button>

                                                    {/* Delete button */}
                                                    <button
                                                        onClick={() => setDeleteModal({ open: true, user: u })}
                                                        disabled={isSelf}
                                                        title={isSelf ? "Cannot delete your own account" : "Delete user"}
                                                        className="text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Password Reset Modal */}
            {passwordModal.open && passwordModal.user && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reset-modal-title"
                >
                    <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl border border-slate-200 dark:border-slate-700">
                        <h3 id="reset-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                            Reset Password for &ldquo;{passwordModal.user.username}&rdquo;
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Set a new password. The user will be required to log in with this credential.
                        </p>

                        <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={passwordModal.password}
                                    onChange={(e) =>
                                        setPasswordModal((prev) => ({
                                            ...prev,
                                            password: e.target.value,
                                            error: "",
                                        }))
                                    }
                                    placeholder="Enter secure password"
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
                                    autoFocus
                                    required
                                />
                                <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                                    <p>Must be at least 8 characters and include:</p>
                                    <ul className="list-disc pl-4 space-y-0.5">
                                        <li>At least 1 uppercase letter</li>
                                        <li>At least 1 lowercase letter</li>
                                        <li>At least 1 number</li>
                                        <li>At least 1 special character (!@#$%^&*...)</li>
                                    </ul>
                                </div>
                            </div>

                            {passwordModal.error && (
                                <div role="alert" className="rounded bg-red-50 dark:bg-red-900/30 p-2 text-xs text-red-600 dark:text-red-300">
                                    {passwordModal.error}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setPasswordModal({ open: false, user: null, password: "", error: "" })}
                                    className="rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={resetPwMut.isPending}
                                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {resetPwMut.isPending ? "Setting…" : "Set Password"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deletion Confirmation Modal */}
            {deleteModal.open && deleteModal.user && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="delete-modal-title"
                >
                    <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl border border-slate-200 dark:border-slate-700">
                        <h3 id="delete-modal-title" className="text-lg font-semibold text-red-600 dark:text-red-400">
                            Delete User &ldquo;{deleteModal.user.username}&rdquo;?
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            Are you sure you want to delete this user? This action cannot be undone.
                            Any issues currently assigned to this user will become unassigned.
                        </p>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteModal({ open: false, user: null })}
                                className="rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => deleteMut.mutate(deleteModal.user.id)}
                                disabled={deleteMut.isPending}
                                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleteMut.isPending ? "Deleting…" : "Confirm Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
