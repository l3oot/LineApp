import { useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import SettingActionRow from "../components/SettingActionRow";
import LanguageBottomSheet from "../components/LanguageBottomSheet";
import ConfirmBottomSheet from "../components/ConfirmBottomSheet";
import CategoryCenterModal from "../components/CategoryCenterModal";
import { LuUserRound, LuLogOut } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { ApiError } from "../lib/api";
import { auth } from "../lib/auth";
import { transactionApi } from "../lib/userService";

type SettingItem = {
    key: "category" | "language" | "deleteAll";
    value?: string;
    danger?: boolean;
};

export default function Setting() {
    const { t, i18n } = useTranslation();
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isLanguageSheetOpen, setIsLanguageSheetOpen] = useState(false);
    const [avatarBroken, setAvatarBroken] = useState(false);
    const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
    const [deleteAllBusy, setDeleteAllBusy] = useState(false);
    const [deleteAllError, setDeleteAllError] = useState<string | null>(null);

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
        { key: "language", value: languageValue },
        { key: "deleteAll", danger: true },
    ];

    const handleSelectLanguage = (language: "th" | "en" | "jp") => {
        localStorage.setItem("language", language);
        i18n.changeLanguage(language);
        setIsLanguageSheetOpen(false);
    };

    const handleLogout = () => {
        auth.clear();
        // กลับไปหน้าแรก → RequireAuth จะ redirect ไป LINE login ให้เอง
        window.location.replace("/");
    };

    const handleDeleteAllTransactions = async () => {
        if (!auth.isAuthed()) return;

        setDeleteAllBusy(true);
        setDeleteAllError(null);
        try {
            await transactionApi.deleteAllByUser();
            setIsDeleteAllConfirmOpen(false);
        } catch (err) {
            setDeleteAllError(err instanceof ApiError ? err.message : (err as Error).message);
        } finally {
            setDeleteAllBusy(false);
        }
    };

    const displayName = currentUser?.displayName?.trim() || t("settings.userTitle");
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
                    </div>
                </div>

                {settingItems.map((item) => (
                    <SettingActionRow
                        key={item.key}
                        label={t(`settings.item.${item.key}`)}
                        value={item.value}
                        danger={item.danger}
                        disabled={item.key === "deleteAll" && deleteAllBusy}
                        onClick={
                            item.key === "category"
                                ? () => setIsCategoryModalOpen(true)
                                : item.key === "language"
                                ? () => setIsLanguageSheetOpen(true)
                                    : item.key === "deleteAll"
                                      ? () => setIsDeleteAllConfirmOpen(true)
                                      : undefined
                        }
                    />
                ))}

                {deleteAllError && (
                    <p className="px-2 text-sm text-[var(--danger)]">{deleteAllError}</p>
                )}

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
            <ConfirmBottomSheet
                open={isDeleteAllConfirmOpen}
                title={t("settings.deleteAllConfirmTitle")}
                message={t("settings.deleteAllConfirm")}
                confirmLabel={t("settings.deleteAllConfirmButton")}
                busy={deleteAllBusy}
                danger
                onClose={() => {
                    if (!deleteAllBusy) {
                        setIsDeleteAllConfirmOpen(false);
                    }
                }}
                onConfirm={handleDeleteAllTransactions}
            />
        </MainLayout>
    );
}
