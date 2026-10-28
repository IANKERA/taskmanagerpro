/**
 * Lightweight confirm modal. Renders as a centered overlay.
 *
 * Props:
 *   open       – boolean
 *   title      – string
 *   message    – string
 *   confirmLabel – string (default "Confirm")
 *   danger     – boolean  (red confirm button if true)
 *   onConfirm  – () => void
 *   onCancel   – () => void
 */
export default function ConfirmDialog({
    open,
    title = "Are you sure?",
    message,
    confirmLabel = "Confirm",
    danger = false,
    onConfirm,
    onCancel,
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
                {message && <p className="text-sm text-slate-600 mb-5">{message}</p>}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm text-white rounded ${
                            danger
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-slate-900 hover:bg-slate-800"
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
