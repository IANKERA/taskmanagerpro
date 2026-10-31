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
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
            <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
            <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-slate-800 sm:p-6">
                <h3 id="confirm-dialog-title" className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
                {message && <p className="text-sm text-slate-600 mb-5">{message}</p>}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <button
                        autoFocus
                        onClick={onCancel}
                        className="min-h-11 rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-white ${
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
