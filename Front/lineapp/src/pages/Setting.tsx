import { useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import SettingActionRow from "../components/SettingActionRow";
import LanguageBottomSheet from "../components/LanguageBottomSheet";
import TimezoneBottomSheet from "../components/TimezoneBottomSheet";
import CategoryCenterModal from "../components/CategoryCenterModal";
import { LuUserRound, LuLogOut } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { auth } from "../lib/auth";

type SettingItem = {
    key: "category" | "timezone" | "language" | "deleteAll";
    value?: string;
    danger?: boolean;
};

export default function Setting() {
    const { t, i18n } = useTranslation();
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isLanguageSheetOpen, setIsLanguageSheetOpen] = useState(false);
    const [isTimezoneSheetOpen, setIsTimezoneSheetOpen] = useState(false);
    const [activeTimezone, setActiveTimezone] = useState<string>(() => localStorage.getItem("timezone") ?? "Asia/Bangkok");
    const [avatarBroken, setAvatarBroken] = useState(false);

    const currentUser = useMemo(() => auth.getUser(), []);

    const activeLanguage = useMemo(() => {
        const current = i18n.resolvedLanguage ?? "th";
        return current.startsWith("en") ? "en" : current.startsWith("jp") ? "jp" : "th";
    }, [i18n.resolvedLanguage]);

    const languageValue = useMemo(() => {
        if (activeLanguage === "en") {
            return "English";
        }
        if (activeLanguage === "jp") {
            return "日本語";
        }
        return "ไทย";
    }, [activeLanguage]);

    const settingItems: SettingItem[] = [
        { key: "category" },
        { key: "timezone", value: activeTimezone.split("/")[1].replace("_", " ") },
        { key: "language", value: languageValue },
        { key: "deleteAll", danger: true },
    ];

    const handleSelectLanguage = (language: "th" | "en" | "jp") => {
        localStorage.setItem("language", language);
        i18n.changeLanguage(language);
        setIsLanguageSheetOpen(false);
    };

    const handleSelectTimezone = (timezone: string) => {
        localStorage.setItem("timezone", timezone);
        setActiveTimezone(timezone);
        setIsTimezoneSheetOpen(false);
    };

    const handleLogout = () => {
        auth.clear();
        // กลับไปหน้าแรก → RequireAuth จะ redirect ไป LINE login ให้เอง
        window.location.replace("/");
    };

    const displayName = currentUser?.displayName?.trim() || t("settings.userTitle");
    const subtitle = currentUser ? t("settings.loggedInAs") : t("settings.userSubtitle");
    const canShowAvatar = Boolean(currentUser?.pictureUrl) && !avatarBroken;

    return (
        <MainLayout>
            <div className="flex flex-col gap-1.5 px-5">
                <div className="mb-1 flex w-full items-center gap-3.5 px-2 py-2">
                    {canShowAvatar ? (
                        <img
                            src={currentUser!.pictureUrl!}
                            alt={displayName}
                            className="h-10 w-10 rounded-full object-cover"
                            onError={() => setAvatarBroken(true)}
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                            <LuUserRound size={20} />
                        </div>
                    )}
                    <div className="leading-tight">
                        <p className="text-base font-semibold text-[var(--text)]">{displayName}</p>
                        <p className="text-xs text-[var(--text-soft)]">{subtitle}</p>
                    </div>
                </div>

                {settingItems.map((item) => (
                    <SettingActionRow
                        key={item.key}
                        label={t(`settings.item.${item.key}`)}
                        value={item.value}
                        danger={item.danger}
                        onClick={
                            item.key === "category"
                                ? () => setIsCategoryModalOpen(true)
                                : item.key === "language"
                                ? () => setIsLanguageSheetOpen(true)
                                : item.key === "timezone"
                                    ? () => setIsTimezoneSheetOpen(true)
                                    : undefined
                        }
                    />
                ))}

                {currentUser && (
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-2 flex w-full min-h-[48px] items-center justify-center gap-2.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] font-semibold text-[var(--text-soft)] transition-colors hover:bg-[var(--surface-soft)] active:bg-[var(--surface-soft)]"
                    >
                        <LuLogOut size={18} className="shrink-0" aria-hidden />
                        {t("settings.logout")}
                    </button>
                )}
            </div>

            <LanguageBottomSheet
                open={isLanguageSheetOpen}
                currentLanguage={activeLanguage}
                onClose={() => setIsLanguageSheetOpen(false)}
                onSelectLanguage={handleSelectLanguage}
            />
            <CategoryCenterModal
                open={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
            />
            <TimezoneBottomSheet
                open={isTimezoneSheetOpen}
                currentTimezone={activeTimezone}
                onClose={() => setIsTimezoneSheetOpen(false)}
                onSelectTimezone={handleSelectTimezone}
            />
        </MainLayout>
    );
}
