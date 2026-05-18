import { useMemo } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";

type LanguageOption = {
    code: "th" | "en" | "jp";
    label: string;
};

type LanguageBottomSheetProps = {
    open: boolean;
    currentLanguage: "th" | "en" | "jp";
    onClose: () => void;
    onSelectLanguage: (language: "th" | "en" | "jp") => void;
};

export default function LanguageBottomSheet({
    open,
    currentLanguage,
    onClose,
    onSelectLanguage,
}: LanguageBottomSheetProps) {
    const { t } = useTranslation();

    const options: LanguageOption[] = useMemo(
        () => [
            { code: "th", label: t("settings.languageName.th") },
            { code: "en", label: t("settings.languageName.en") },
            { code: "jp", label: t("settings.languageName.jp") },
        ],
        [t],
    );

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/35" onClick={onClose}>
            <div
                className="language-sheet-enter absolute inset-x-0 bottom-0 rounded-t-[16px] bg-[var(--surface)] px-4 pb-4 pt-2 shadow-[0_-10px_22px_rgba(0,0,0,0.12)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-[var(--border)]" />
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-bold text-[var(--text)]">{t("settings.languageSheet.title")}</h3>
                    <button
                        type="button"
                        aria-label={t("common.close")}
                        onClick={onClose}
                        className="rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <p className="mb-2 text-sm font-semibold text-[var(--text)]">{t("settings.languageSheet.chooseLabel")}</p>
                <div className="flex flex-col gap-0.5">
                    {options.map((option) => {
                        const selected = currentLanguage === option.code;
                        return (
                            <button
                                key={option.code}
                                type="button"
                                onClick={() => onSelectLanguage(option.code)}
                                className={`flex items-center justify-between rounded-[var(--radius-control)] px-3 py-2 text-left text-sm font-medium transition-all ${
                                    selected ? "bg-[#f2ebf0] text-[var(--text)]" : "text-[var(--text)] hover:bg-[var(--surface-soft)]"
                                }`}
                            >
                                <span>{option.label}</span>
                                {selected && <FiCheck size={16} />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
