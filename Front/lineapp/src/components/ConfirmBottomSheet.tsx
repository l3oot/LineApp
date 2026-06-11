import { FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";

type ConfirmBottomSheetProps = {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    busy?: boolean;
    danger?: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

export default function ConfirmBottomSheet({
    open,
    title,
    message,
    confirmLabel,
    busy = false,
    danger = false,
    onClose,
    onConfirm,
}: ConfirmBottomSheetProps) {
    const { t } = useTranslation();

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/35" onClick={busy ? undefined : onClose}>
            <div
                className="language-sheet-enter absolute inset-x-0 bottom-0 rounded-t-[16px] bg-[var(--surface)] px-4 pb-4 pt-2 shadow-[0_-10px_22px_rgba(0,0,0,0.12)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-[var(--border)]" />
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-bold text-[var(--text)]">{title}</h3>
                    <button
                        type="button"
                        aria-label={t("common.close")}
                        disabled={busy}
                        onClick={onClose}
                        className="rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)] disabled:opacity-50"
                    >
                        <FiX size={20} />
                    </button>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-[var(--text-soft)]">{message}</p>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onClose}
                        className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2.5 text-sm font-semibold text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)] disabled:opacity-50"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onConfirm}
                        className={`rounded-[var(--radius-control)] border px-3 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                            danger
                                ? "border-[var(--danger)] bg-red-50 text-[var(--danger)] hover:bg-red-100"
                                : "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)] hover:brightness-95"
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
