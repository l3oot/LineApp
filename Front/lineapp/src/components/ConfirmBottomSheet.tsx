import { FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import BottomSheet from "./BottomSheet";

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

    return (
        <BottomSheet
            open={open}
            onClose={onClose}
            dragDisabled={busy}
            closeOnBackdrop={!busy}
            panelClassName="px-4 pb-4"
        >
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
                    className="pill-action-btn pill-action-btn--compact pill-action-btn--cancel"
                >
                    {t("common.cancel")}
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={onConfirm}
                    className={
                        danger
                            ? "danger-action-btn rounded-full px-3 py-2.5 text-sm font-semibold disabled:opacity-50"
                            : "rounded-full border border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-2.5 text-sm font-semibold text-[var(--primary)] transition-all hover:brightness-95 disabled:opacity-50"
                    }
                >
                    {confirmLabel}
                </button>
            </div>
        </BottomSheet>
    );
}
