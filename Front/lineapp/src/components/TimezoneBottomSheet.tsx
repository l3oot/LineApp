import { useEffect, useMemo, useState } from "react";
import { FiCheck, FiSearch, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";

type TimezoneOption = {
    id: string;
    currentOffsetLabel: string;
};

type TimezoneApiResponse = {
    id: string;
    currentOffset: number;
    currentOffsetLabel: string;
};

type TzInfoResponse = {
    updatedAt: number;
    zones: TimezoneApiResponse[];
};

type TimezoneBottomSheetProps = {
    open: boolean;
    currentTimezone: string;
    onClose: () => void;
    onSelectTimezone: (timezone: string) => void;
};

export default function TimezoneBottomSheet({
    open,
    currentTimezone,
    onClose,
    onSelectTimezone,
}: TimezoneBottomSheetProps) {
    const { t } = useTranslation();
    const [timezoneOptions, setTimezoneOptions] = useState<TimezoneOption[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (!open || timezoneOptions.length > 0) {
            return;
        }

        let active = true;
        setIsLoading(true);
        setHasError(false);

        fetch("https://api.tzinfo.org/v1")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to fetch timezone");
                }
                return response.json() as Promise<TzInfoResponse | TimezoneApiResponse[]>;
            })
            .then((payload) => {
                if (!active) {
                    return;
                }
                const entries = Array.isArray(payload) ? payload : payload.zones;
                if (!Array.isArray(entries)) {
                    throw new Error("Invalid timezone response");
                }
                setTimezoneOptions(
                    entries
                        .filter((item) => item.id && item.currentOffsetLabel)
                        .map((item) => ({
                            id: item.id,
                            currentOffsetLabel: item.currentOffsetLabel,
                        }))
                        .sort((a, b) => a.id.localeCompare(b.id)),
                );
            })
            .catch(() => {
                if (!active) {
                    return;
                }
                setHasError(true);
            })
            .finally(() => {
                if (active) {
                    setIsLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [open, timezoneOptions]);

    const visibleOptions = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) {
            return timezoneOptions;
        }
        return timezoneOptions.filter(
            (option) =>
                option.id.toLowerCase().includes(keyword) ||
                option.currentOffsetLabel.toLowerCase().includes(keyword),
        );
    }, [search, timezoneOptions]);

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
                    <h3 className="text-base font-bold text-[var(--text)]">{t("settings.timezoneSheet.title")}</h3>
                    <button
                        type="button"
                        aria-label={t("common.close")}
                        onClick={onClose}
                        className="rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <p className="mb-2 text-sm font-semibold text-[var(--text)]">{t("settings.timezoneSheet.chooseLabel")}</p>
                <div className="mb-2 flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1.5">
                    <FiSearch size={14} className="text-[var(--text-soft)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t("settings.timezoneSheet.searchPlaceholder")}
                        className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-soft)]"
                    />
                </div>
                <div className="flex max-h-[260px] flex-col gap-0.5 overflow-auto">
                    {visibleOptions.map((option) => {
                        const selected = currentTimezone === option.id;

                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => onSelectTimezone(option.id)}
                                className={`flex items-center justify-between rounded-[var(--radius-control)] px-3 py-2 text-left transition-all ${
                                    selected ? "bg-[#f2ebf0] text-[var(--text)]" : "text-[var(--text)] hover:bg-[var(--surface-soft)]"
                                }`}
                            >
                                <div className="flex min-w-0 flex-col">
                                    <span className="text-sm font-medium">{option.id}</span>
                                    <span className="text-xs text-[var(--text-soft)]">{option.currentOffsetLabel}</span>
                                </div>
                                {selected && <FiCheck size={16} className="shrink-0" />}
                            </button>
                        );
                    })}
                </div>
                {isLoading && <p className="mt-2 text-xs text-[var(--text-soft)]">{t("settings.timezoneSheet.loading")}</p>}
                {!isLoading && visibleOptions.length === 0 && !hasError && (
                    <p className="mt-2 text-xs text-[var(--text-soft)]">{t("settings.timezoneSheet.noData")}</p>
                )}
                {hasError && (
                    <p className="mt-2 text-xs text-[var(--danger)]">{t("settings.timezoneSheet.fetchError")}</p>
                )}
            </div>
        </div>
    );
}
