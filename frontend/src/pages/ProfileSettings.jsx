import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateEmail, getNotifPrefs, updateNotifPrefs } from "../api/userSettings";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function ProfileSettings() {
    const { user } = useAuth();
    const qc = useQueryClient();

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-bold dark:text-white">Profile Settings</h1>
            <EmailSection user={user} />
            <NotificationPrefsSection />
        </div>
    );
}

function EmailSection({ user }) {
    const qc = useQueryClient();
    const [email, setEmail] = useState(user?.email || "");
    const mut = useMutation({
        mutationFn: (e) => updateEmail(e),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["me"] });
            toast.success("Email updated");
        },
        onError: (e) => toast.error(e.message),
    });

    return (
        <section className="bg-white dark:bg-slate-800 rounded-lg shadow p-5 space-y-3">
            <h2 className="text-lg font-semibold dark:text-white">Email Address</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Used for email notifications. Leave blank to disable email alerts.
            </p>
            <form
                onSubmit={(e) => { e.preventDefault(); mut.mutate(email); }}
                className="flex gap-3 items-end"
            >
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 text-sm"
                />
                <button
                    disabled={mut.isPending}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    Save
                </button>
            </form>
        </section>
    );
}

function NotificationPrefsSection() {
    const { data: prefs, isLoading } = useQuery({
        queryKey: ["notifPrefs"],
        queryFn: getNotifPrefs,
    });

    const qc = useQueryClient();
    const mut = useMutation({
        mutationFn: updateNotifPrefs,
        onSuccess: (data) => {
            qc.setQueryData(["notifPrefs"], data);
            toast.success("Notification preferences saved");
        },
        onError: (e) => toast.error(e.message),
    });

    if (isLoading) return <div className="text-slate-500">Loading…</div>;

    const togglePref = (key) => {
        const updated = { ...prefs, [key]: !prefs[key] };
        mut.mutate(updated);
    };

    const options = [
        { key: "notifyAssigned", label: "When assigned to an issue" },
        { key: "notifyMentioned", label: "When mentioned in a comment" },
        { key: "notifyComment", label: "When someone comments on a watched issue" },
        { key: "notifyWatching", label: "When a watched issue changes status" },
    ];

    return (
        <section className="bg-white dark:bg-slate-800 rounded-lg shadow p-5 space-y-3">
            <h2 className="text-lg font-semibold dark:text-white">Email Notifications</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Choose which events trigger email notifications.
            </p>
            <div className="space-y-2">
                {options.map((o) => (
                    <label key={o.key} className="flex items-center gap-3 py-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={prefs?.[o.key] ?? true}
                            onChange={() => togglePref(o.key)}
                            className="rounded"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{o.label}</span>
                    </label>
                ))}
            </div>
        </section>
    );
}
