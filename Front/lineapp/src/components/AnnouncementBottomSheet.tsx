import { FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import BottomSheet from "./BottomSheet";

const ANNOUNCEMENT_KEYS = ["welcome", "cycleFeature"] as const;

type AnnouncementBottomSheetProps = {
    open: boolean;
    onClose: () => void;
};

export default function AnnouncementBottomSheet({ open, onClose }: AnnouncementBottomSheetProps) {
    const { t } = useTranslation();

    return (
        <BottomSheet
            open={open}
            onClose={onClose}
            panelClassName="mx-auto flex max-h-[70vh] w-full max-w-[420px] flex-col rounded-t-[22px] p-4"
        >
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[var(--text)]">
                    {t("notificationSheet.title")}
                </h3>
                <button
                    type="button"
                    aria-label={t("common.close")}
                    onClick={onClose}
                    className="rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
                >
                    <FiX size={20} />
                </button>
            </div>

            <div className="bottom-sheet-scroll flex flex-1 flex-col gap-3 overflow-y-auto pb-1">
                {ANNOUNCEMENT_KEYS.map((key) => (
                    <article
                        key={key}
                        className="rounded-[var(--radius-card)] bg-[var(--surface-soft)] px-4 py-3"
                    >
                        <p className="text-sm font-bold text-[var(--text)]">
                            {t(`notificationSheet.items.${key}.title`)}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--text-soft)]">
                            {t(`notificationSheet.items.${key}.body`)}
                        </p>
                    </article>
                ))}
            </div>
        </BottomSheet>
    );
}
