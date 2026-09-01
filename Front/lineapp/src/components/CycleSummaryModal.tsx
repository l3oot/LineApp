import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import grannyLogo from "../assets/logosum.png";
import { cycleApi } from "../lib/userService";
import { getFriendlyApiErrorMessage } from "../utils/friendlyApiError";

type CycleSummaryModalProps = {
    open: boolean;
    cycleId: string | null;
    cycleName: string;
    onClose: () => void;
};

export default function CycleSummaryModal({
    open,
    cycleId,
    cycleName,
    onClose,
}: CycleSummaryModalProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !cycleId) {
            return;
        }
        let cancelled = false;
        setLoading(true);
        setSummary(null);
        setError(null);
        cycleApi
            .summarize(cycleId)
            .then((data) => {
                if (cancelled) return;
                setSummary(data?.summary?.trim() || t("addcycle.summaryEmpty"));
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setError(getFriendlyApiErrorMessage(err, t));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open, cycleId, t]);

    if (!open) {
        return null;
    }

    return createPortal(
        <div className="cycle-summary-overlay" onClick={onClose}>
            <div
                className="cycle-summary-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cycle-summary-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="cycle-summary-hero">
                    <button
                        type="button"
                        aria-label={t("common.close")}
                        onClick={onClose}
                        className="cycle-summary-close"
                    >
                        <FiX size={18} />
                    </button>
                    <div className="cycle-summary-avatar" aria-hidden>
                        <img className="cycle-summary-avatar-face" src={grannyLogo} alt="" />
                    </div>
                    <p className="cycle-summary-eyebrow">{t("addcycle.summaryEyebrow")}</p>
                    <h2 id="cycle-summary-title" className="cycle-summary-title">
                        {t("addcycle.summaryHeading")}
                    </h2>
                    <span className="cycle-summary-cycle-chip">{cycleName}</span>
                </div>

                <div className="cycle-summary-body">
                    {loading && (
                        <div className="cycle-summary-loading" aria-live="polite">
                            <span className="cycle-summary-book" aria-hidden>
                                📒
                            </span>
                            <p>{t("addcycle.summaryLoading")}</p>
                            <span className="cycle-summary-dots" aria-hidden>
                                <i /><i /><i />
                            </span>
                        </div>
                    )}

                    {!loading && error && (
                        <p className="cycle-summary-error">{error}</p>
                    )}

                    {!loading && !error && summary && (
                        <blockquote className="cycle-summary-bubble">
                            <p className="cycle-summary-text">{summary}</p>
                        </blockquote>
                    )}

                    <button
                        type="button"
                        className="cycle-summary-done"
                        onClick={onClose}
                    >
                        {t("addcycle.summaryGotIt")}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
