import { createPortal } from "react-dom";
import { useMemo } from "react";
import { FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { icons } from "../assets/Iconlist";
import { iconLabelForLanguage, iconMatchesSearch } from "../data/iconLabels";

export type IconName = keyof typeof icons;

type IconPickerSheetProps = {
    open: boolean;
    title: string;
    searchPlaceholder: string;
    query: string;
    onQueryChange: (query: string) => void;
    selectedIcon: string;
    onSelect: (icon: IconName) => void;
    onClose: () => void;
};

const iconOptions = Object.entries(icons) as [IconName, string][];

export default function IconPickerSheet({
    open,
    title,
    searchPlaceholder,
    query,
    onQueryChange,
    selectedIcon,
    onSelect,
    onClose,
}: IconPickerSheetProps) {
    const { i18n } = useTranslation();

    const filteredIcons = useMemo(
        () => iconOptions.filter(([key]) => iconMatchesSearch(key, query)),
        [query],
    );

    if (!open) {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 px-4 py-6"
            onClick={onClose}
        >
            <div
                className="flex max-h-[min(420px,85dvh)] w-full max-w-[400px] flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-soft)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mb-2 flex shrink-0 items-center justify-between">
                    <p className="text-sm font-bold text-[var(--text)]">{title}</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
                    >
                        <FiX size={16} />
                    </button>
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full shrink-0 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text)] outline-none transition-all focus:border-[var(--primary)]"
                />
                <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                    <div className="grid grid-cols-8 gap-1.5">
                        {filteredIcons.map(([key, emoji]) => {
                            const isSelected = selectedIcon === key;
                            const label = iconLabelForLanguage(key, i18n.language);
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    aria-label={label}
                                    title={label}
                                    onClick={() => onSelect(key)}
                                    className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-[22px] transition-all ${
                                        isSelected
                                            ? "bg-[var(--primary-soft)] ring-1 ring-[var(--primary)]"
                                            : "bg-[var(--surface-soft)] hover:bg-[var(--surface)]"
                                    }`}
                                >
                                    {emoji}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
