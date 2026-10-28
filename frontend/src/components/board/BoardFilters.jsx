import { useMemo } from "react";

/**
 * Pure-client board filters. Keeps the search box and select dropdowns next to
 * the data so callers just pass {issues, filters, onChange} and get a working bar.
 *
 * Why client-side? The current /api/projects/{key}/issues endpoint already returns
 * the full list and our boards are small. If we ever scale past ~500 issues per
 * project we'll move filtering server-side via query params.
 */
export default function BoardFilters({ issues, filters, onChange }) {
    const { assignees, labels, types } = useMemo(() => {
        const a = new Set(), l = new Map(), t = new Set();
        for (const i of issues) {
            if (i.assigneeUsername) a.add(i.assigneeUsername);
            if (i.issueType) t.add(i.issueType);
            for (const lab of i.labels || []) l.set(lab.id, lab);
        }
        return {
            assignees: [...a].sort(),
            labels: [...l.values()].sort((x, y) => x.name.localeCompare(y.name)),
            types: [...t].sort(),
        };
    }, [issues]);

    const set = (patch) => onChange({ ...filters, ...patch });
    const active =
        filters.q || filters.assignee || filters.labelId || filters.type || filters.priority;

    return (
        <div className="flex flex-wrap gap-2 items-center mb-4">
            <input
                value={filters.q || ""}
                onChange={(e) => set({ q: e.target.value })}
                placeholder="Search title…"
                className="border border-slate-300 rounded px-3 py-1.5 text-sm w-48"
            />
            <select
                value={filters.assignee || ""}
                onChange={(e) => set({ assignee: e.target.value || null })}
                className="border border-slate-300 rounded px-2 py-1.5 text-sm"
            >
                <option value="">Any assignee</option>
                <option value="__unassigned__">Unassigned</option>
                {assignees.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <select
                value={filters.labelId || ""}
                onChange={(e) => set({ labelId: e.target.value || null })}
                className="border border-slate-300 rounded px-2 py-1.5 text-sm"
            >
                <option value="">Any label</option>
                {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select
                value={filters.type || ""}
                onChange={(e) => set({ type: e.target.value || null })}
                className="border border-slate-300 rounded px-2 py-1.5 text-sm"
            >
                <option value="">Any type</option>
                {types.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select
                value={filters.priority || ""}
                onChange={(e) => set({ priority: e.target.value || null })}
                className="border border-slate-300 rounded px-2 py-1.5 text-sm"
            >
                <option value="">Any priority</option>
                {["HIGH", "MEDIUM", "LOW"].map((p) => <option key={p}>{p}</option>)}
            </select>
            {active && (
                <button
                    onClick={() => onChange({})}
                    className="text-xs text-slate-500 hover:text-slate-900 underline"
                >
                    Clear
                </button>
            )}
        </div>
    );
}

/** Pure filter — keep close to the bar so behaviour stays in one file. */
export function applyFilters(issues, filters) {
    return issues.filter((i) => {
        if (filters.q) {
            const q = filters.q.toLowerCase();
            const hay = `${i.title} ${i.issueKey}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        if (filters.assignee === "__unassigned__") {
            if (i.assigneeUsername) return false;
        } else if (filters.assignee) {
            if (i.assigneeUsername !== filters.assignee) return false;
        }
        if (filters.labelId) {
            const id = Number(filters.labelId);
            if (!(i.labels || []).some((l) => l.id === id)) return false;
        }
        if (filters.type && i.issueType !== filters.type) return false;
        if (filters.priority && i.priority !== filters.priority) return false;
        return true;
    });
}
