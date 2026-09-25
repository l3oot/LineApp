import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import "../styles/Cycle.css";
import { FaPlus } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import Addcycle from "../components/Addcycle";
import BottomSheet from "../components/BottomSheet";
import ConfirmBottomSheet from "../components/ConfirmBottomSheet";
import CycleSummaryModal from "../components/CycleSummaryModal";
import IconPickerSheet from "../components/IconPickerSheet";
import { useTranslation } from "react-i18next";
import { icons } from "../assets/Iconlist";
import { CalendarDate } from "@internationalized/date";
import AppDateField from "../components/AppDateField";
import FormattedNumberInput from "../components/FormattedNumberInput";
import { auth } from "../lib/auth";
import {
    cropApi,
    cycleApi,
    planApi,
    transactionApi,
    type Crop,
    type Cycle,
    type PlanQuota,
    type Transaction,
} from "../lib/userService";
import { getFriendlyApiErrorMessage } from "../utils/friendlyApiError";
import { statsForSeason } from "../utils/cycleStats";
import {
    gregorianDateKey,
    initialAppDateTime,
    parseTxToGregorianCalendarDate,
    toGregorianCalendarDate,
} from "../utils/formatAppDate";
import { formatCycleMonthRange, formatMonthRange } from "../utils/formatMonthYear";

function calendarDateToApiDate(value: CalendarDate): string {
    const gregorian = toGregorianCalendarDate(value);
    return gregorianDateKey(gregorian.year, gregorian.month, gregorian.day);
}

function apiDateToCalendarDate(value: string | null | undefined): CalendarDate {
    if (!value) return initialAppDateTime().date;
    return parseTxToGregorianCalendarDate(`${value}T12:00:00`);
}

function defaultCycleStartDate(lang?: string): CalendarDate {
    return initialAppDateTime(lang).date;
}

function defaultCycleEndDate(lang?: string): CalendarDate {
    return defaultCycleStartDate(lang).add({ days: 30 });
}

type IconName = keyof typeof icons;

function isIconName(value: string | null | undefined): value is IconName {
    return Boolean(value && Object.prototype.hasOwnProperty.call(icons, value));
}

function isActiveCrop(crop: Crop): boolean {
    return (crop.status ?? "active") === "active";
}

function countActiveCrops(crops: Crop[]): number {
    return crops.filter(isActiveCrop).length;
}

function canCreateFromQuota(quota: PlanQuota | null, activeCount: number): boolean {
    if (!quota) return true;
    if (quota.maxCycles === -1) return true;
    return activeCount < quota.maxCycles;
}

function cropSeasonLabel(crop: Crop, lang: string): string {
    if (crop.startMonth != null && crop.endMonth != null) {
        return formatMonthRange(crop.startMonth, crop.endMonth, lang);
    }
    const season = crop.currentSeason;
    if (!season) return "";
    return formatCycleMonthRange(season.startDate, season.endDate, lang);
}

function needsNewSeason(season: Cycle | null): boolean {
    if (!season) return true;
    if ((season.status ?? "active") !== "active") return true;
    return typeof season.dateComeIn === "number" && season.dateComeIn < 0;
}

type SheetMode = "addCrop" | "editCrop" | "addSeason";

export default function CyclePage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [crops, setCrops] = useState<Crop[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deletingCropId, setDeletingCropId] = useState<string | null>(null);
    const [cropToDelete, setCropToDelete] = useState<Crop | null>(null);
    const [seasonToSummarize, setSeasonToSummarize] = useState<Cycle | null>(null);
    const [sheetMode, setSheetMode] = useState<SheetMode>("addCrop");
    const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
    const [seasonCrop, setSeasonCrop] = useState<Crop | null>(null);
    const [planQuota, setPlanQuota] = useState<PlanQuota | null>(null);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [farmType, setFarmType] = useState("");
    const [selectedIcon, setSelectedIcon] = useState<IconName>("corn");
    const [iconQuery, setIconQuery] = useState("");
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [startDate, setStartDate] = useState<CalendarDate>(() => defaultCycleStartDate());
    const [endDate, setEndDate] = useState<CalendarDate>(() => defaultCycleEndDate());
    const [budget, setBudget] = useState("");
    const [note, setNote] = useState("");
    const [isStartPickerOpen, setIsStartPickerOpen] = useState(false);
    const [isEndPickerOpen, setIsEndPickerOpen] = useState(false);

    const activeCropCount = countActiveCrops(crops);
    const canCreateCrop = canCreateFromQuota(planQuota, activeCropCount);
    const planDisplayName = planQuota
        ? t(`cycle.planName.${planQuota.planName}`, { defaultValue: planQuota.planName })
        : "";

    const refreshQuota = async () => {
        const quota = await planApi.getQuota();
        setPlanQuota(quota);
    };

    const reloadCrops = async () => {
        const [cropRows, txRows] = await Promise.all([cropApi.list(), transactionApi.list()]);
        setCrops(cropRows ?? []);
        setTransactions(txRows ?? []);
    };

    useEffect(() => {
        if (!auth.isAuthed()) {
            navigate("/app/settings", { replace: true });
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        Promise.all([cropApi.list(), transactionApi.list(), planApi.getQuota()])
            .then(([cropRows, txRows, quota]) => {
                if (cancelled) return;
                setCrops(cropRows ?? []);
                setTransactions(txRows ?? []);
                setPlanQuota(quota);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setCrops([]);
                setTransactions([]);
                setPlanQuota(null);
                setError(getFriendlyApiErrorMessage(err, t));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [navigate, t]);

    useEffect(() => {
        const newSeasonCropId = searchParams.get("newSeason");
        if (!newSeasonCropId || loading || crops.length === 0) return;
        const crop = crops.find((c) => c.cropId === newSeasonCropId);
        if (!crop) return;
        openAddSeasonSheet(crop);
        const next = new URLSearchParams(searchParams);
        next.delete("newSeason");
        setSearchParams(next, { replace: true });
        // openAddSeasonSheet is stable enough for this one-shot deep link
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [crops, loading, searchParams, setSearchParams]);

    const resetForm = () => {
        setTitle("");
        setFarmType("");
        setSelectedIcon("corn");
        setIconQuery("");
        setIsIconPickerOpen(false);
        const today = defaultCycleStartDate(i18n.language);
        setStartDate(today);
        setEndDate(defaultCycleEndDate(i18n.language));
        setBudget("");
        setNote("");
        setIsStartPickerOpen(false);
        setIsEndPickerOpen(false);
    };

    const openAddCropSheet = () => {
        if (!canCreateCrop) {
            setError(t("cycle.quotaLimitReached", { plan: planDisplayName }));
            return;
        }
        setSheetMode("addCrop");
        setEditingCrop(null);
        setSeasonCrop(null);
        resetForm();
        setError(null);
        setIsSheetOpen(true);
    };

    const openEditCropSheet = (crop: Crop) => {
        const season = crop.currentSeason;
        setSheetMode("editCrop");
        setEditingCrop(crop);
        setSeasonCrop(null);
        setTitle(crop.name);
        setFarmType(crop.farmType ?? "ทั่วไป");
        setSelectedIcon(isIconName(crop.icon) ? crop.icon : "corn");
        setStartDate(apiDateToCalendarDate(season?.startDate));
        setEndDate(apiDateToCalendarDate(season?.endDate));
        setBudget("");
        setNote(season?.note ?? crop.note ?? "");
        setIconQuery("");
        setIsIconPickerOpen(false);
        setIsStartPickerOpen(false);
        setIsEndPickerOpen(false);
        setError(null);
        setIsSheetOpen(true);
    };

    const openAddSeasonSheet = (crop: Crop) => {
        setSheetMode("addSeason");
        setEditingCrop(null);
        setSeasonCrop(crop);
        setTitle(crop.name);
        setFarmType(crop.farmType ?? "");
        setSelectedIcon(isIconName(crop.icon) ? crop.icon : "corn");
        const base = defaultCycleStartDate(i18n.language);
        const startMonth = crop.startMonth ?? base.month;
        const endMonth = crop.endMonth ?? base.month;
        let year = base.year;
        // ถ้าเลยเดือนจบของปีนี้แล้ว เลื่อนไปปีถัดไป
        if (endMonth >= startMonth && base.month > endMonth) {
            year += 1;
        }
        const start = new CalendarDate(year, startMonth, 1);
        const endYear = endMonth >= startMonth ? year : year + 1;
        const end = new CalendarDate(endYear, endMonth, 1).add({
            months: 1,
            days: -1,
        });
        setStartDate(start);
        setEndDate(end);
        setBudget("");
        setNote("");
        setIconQuery("");
        setIsIconPickerOpen(false);
        setIsStartPickerOpen(false);
        setIsEndPickerOpen(false);
        setError(null);
        setIsSheetOpen(true);
    };

    const handleCloseSheet = () => {
        setIsSheetOpen(false);
        setIsStartPickerOpen(false);
        setIsEndPickerOpen(false);
        setEditingCrop(null);
        setSeasonCrop(null);
        resetForm();
    };

    const confirmDeleteCrop = async () => {
        if (!cropToDelete) return;
        const crop = cropToDelete;
        setDeletingCropId(crop.cropId);
        setError(null);
        try {
            await cropApi.delete(crop.cropId);
            setCrops((prev) => prev.filter((c) => c.cropId !== crop.cropId));
            const txRows = await transactionApi.list();
            setTransactions(txRows ?? []);
            await refreshQuota();
            setCropToDelete(null);
        } catch (err) {
            setError(getFriendlyApiErrorMessage(err, t));
        } finally {
            setDeletingCropId(null);
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            if (sheetMode === "editCrop" && editingCrop) {
                const nextTitle = title.trim();
                if (!nextTitle) return;
                await cropApi.update({
                    cropId: editingCrop.cropId,
                    name: nextTitle,
                    note: (editingCrop.note ?? "").slice(0, 50),
                    farmType: farmType.trim() || editingCrop.farmType || "ทั่วไป",
                    icon: selectedIcon,
                    status: editingCrop.status ?? "active",
                    startMonth: startDate.month,
                    endMonth: endDate.month,
                });
                if (editingCrop.currentSeason) {
                    await cycleApi.update({
                        cycleId: editingCrop.currentSeason.cycleId,
                        note: note.trim().slice(0, 50),
                        startDate: calendarDateToApiDate(startDate),
                        endDate: calendarDateToApiDate(endDate),
                        status: editingCrop.currentSeason.status ?? "active",
                    });
                }
                await reloadCrops();
            } else if (sheetMode === "addSeason" && seasonCrop) {
                const budgetNumber = budget.trim() === "" ? null : Number(budget);
                if (budgetNumber !== null && (Number.isNaN(budgetNumber) || budgetNumber < 0)) {
                    return;
                }
                await cycleApi.create({
                    cropId: seasonCrop.cropId,
                    note: note.trim().slice(0, 50),
                    startDate: calendarDateToApiDate(startDate),
                    endDate: calendarDateToApiDate(endDate),
                    status: "active",
                    budgetAmount: budgetNumber,
                });
                await cropApi.update({
                    cropId: seasonCrop.cropId,
                    name: seasonCrop.name,
                    note: seasonCrop.note,
                    farmType: seasonCrop.farmType ?? "ทั่วไป",
                    icon: isIconName(seasonCrop.icon) ? seasonCrop.icon : "corn",
                    status: seasonCrop.status ?? "active",
                    startMonth: startDate.month,
                    endMonth: endDate.month,
                });
                await reloadCrops();
            } else {
                const nextTitle = title.trim();
                if (!nextTitle) return;
                const budgetNumber = budget.trim() === "" ? null : Number(budget);
                if (budgetNumber !== null && (Number.isNaN(budgetNumber) || budgetNumber < 0)) {
                    return;
                }
                await cropApi.create({
                    name: nextTitle,
                    note: note.trim().slice(0, 50),
                    farmType: farmType.trim() || "ทั่วไป",
                    icon: selectedIcon,
                    status: "active",
                    startMonth: startDate.month,
                    endMonth: endDate.month,
                    startDate: calendarDateToApiDate(startDate),
                    endDate: calendarDateToApiDate(endDate),
                    seasonNote: note.trim().slice(0, 50),
                    budgetAmount: budgetNumber,
                });
                await reloadCrops();
                await refreshQuota();
            }
            handleCloseSheet();
        } catch (err) {
            setError(getFriendlyApiErrorMessage(err, t));
        } finally {
            setSubmitting(false);
        }
    };

    const sheetTitle =
        sheetMode === "editCrop"
            ? t("cycle.editFormTitle")
            : sheetMode === "addSeason"
              ? t("cycle.newSeasonTitle")
              : t("cycle.formTitle");

    return (
        <MainLayout>
            <div className="home-page">
                <div className="home-content-card">
                    <div className="cycle-page">
                        <button
                            type="button"
                            onClick={openAddCropSheet}
                            disabled={loading || !canCreateCrop}
                            className="pill-action-btn"
                        >
                            <span className="pill-action-btn-icon" aria-hidden>
                                <FaPlus size={14} />
                            </span>
                            <span className="pill-action-btn-text">{t("cycle.addCrop")}</span>
                        </button>

                        {error && (
                            <p className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                                {error}
                            </p>
                        )}

                        {loading && (
                            <p className="text-center text-sm text-[var(--text-soft)]">กำลังโหลด...</p>
                        )}

                        <div className="flex flex-col gap-3">
                            {crops.map((crop) => {
                                const season = crop.currentSeason;
                                // รายรับ/รายจ่าย/คงเหลือ คิดเฉพาะรอบปีปัจจุบัน (currentSeason)
                                const stats = statsForSeason(transactions, season);
                                const iconName = isIconName(crop.icon) ? crop.icon : "corn";
                                return (
                                    <Addcycle
                                        key={crop.cropId}
                                        title={crop.name}
                                        income={stats.income}
                                        expense={stats.expense}
                                        budget={season?.budgetAmount}
                                        dateComeIn={season?.dateComeIn}
                                        length={cropSeasonLabel(crop, i18n.language) || t("cycle.noSeason")}
                                        icon={iconName}
                                        deleting={deletingCropId === crop.cropId}
                                        onEdit={() => openEditCropSheet(crop)}
                                        onDelete={() => setCropToDelete(crop)}
                                        onSummarize={
                                            season
                                                ? () => setSeasonToSummarize(season)
                                                : undefined
                                        }
                                        onMore={() => navigate(`/app/cycle/crop/${crop.cropId}`)}
                                        onNewSeason={
                                            needsNewSeason(season)
                                                ? () => openAddSeasonSheet(crop)
                                                : undefined
                                        }
                                    />
                                );
                            })}
                            {!loading && crops.length === 0 && !error && (
                                <p className="text-center text-sm text-[var(--text-soft)]">
                                    {t("cycle.emptyCrops")}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <BottomSheet
                open={isSheetOpen}
                onClose={handleCloseSheet}
                dragDisabled={submitting}
                panelClassName="mx-auto flex h-[62vh] w-full max-w-[420px] flex-col rounded-t-[22px] border border-[var(--border)] p-4 shadow-[var(--shadow-soft)]"
            >
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-base font-bold text-[var(--text)]">{sheetTitle}</p>
                    <button
                        type="button"
                        aria-label={t("common.close")}
                        onClick={handleCloseSheet}
                        className="rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <form
                    className="bottom-sheet-scroll flex flex-1 flex-col gap-3 overflow-y-auto pb-1"
                    onSubmit={handleSubmit}
                >
                    {sheetMode !== "addSeason" && (
                        <div className="flex items-end gap-2">
                            <label className="flex-1 text-sm font-semibold text-[var(--text)]">
                                {t("cycle.nameLabel")}
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    placeholder={t("cycle.namePlaceholder")}
                                    className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--primary)]"
                                />
                            </label>
                            <button
                                type="button"
                                aria-label={t("cycle.iconLabel")}
                                title={`${t("cycle.iconLabel")} (${selectedIcon})`}
                                onClick={() => setIsIconPickerOpen((prev) => !prev)}
                                className="mt-1.5 flex h-[38px] w-[46px] items-center justify-center gap-0.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] transition-all hover:border-[var(--primary)]"
                            >
                                <span className="text-[20px] leading-none">{icons[selectedIcon]}</span>
                            </button>
                        </div>
                    )}

                    {sheetMode === "addSeason" && (
                        <p className="text-sm font-semibold text-[var(--text)]">
                            {t("cycle.newSeasonFor", { name: seasonCrop?.name ?? title })}
                        </p>
                    )}

                    {sheetMode === "addCrop" && (
                        <label className="text-sm font-semibold text-[var(--text)]">
                            {t("cycle.farmTypeLabel")}
                            <input
                                type="text"
                                value={farmType}
                                onChange={(event) => setFarmType(event.target.value)}
                                placeholder={t("cycle.farmTypePlaceholder")}
                                className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--primary)]"
                            />
                        </label>
                    )}

                    {(sheetMode === "addCrop" || sheetMode === "addSeason") && (
                        <label className="text-sm font-semibold text-[var(--text)]">
                            {t("cycle.budgetLabel")}
                            <FormattedNumberInput
                                value={budget}
                                onChange={setBudget}
                                placeholder={t("cycle.budgetPlaceholder")}
                                className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--primary)]"
                            />
                        </label>
                    )}

                    {(sheetMode === "addCrop" ||
                        sheetMode === "addSeason" ||
                        (sheetMode === "editCrop" && editingCrop?.currentSeason)) && (
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-sm font-bold text-[var(--text)]">
                                {t("cycle.startLabel")}
                                <AppDateField
                                    value={startDate}
                                    onChange={setStartDate}
                                    ariaLabel={t("cycle.startLabel")}
                                    isOpen={isStartPickerOpen}
                                    onOpenChange={(open) => {
                                        setIsStartPickerOpen(open);
                                        if (open) setIsEndPickerOpen(false);
                                    }}
                                />
                            </label>
                            <label className="text-sm font-bold text-[var(--text)]">
                                {t("cycle.endLabel")}
                                <AppDateField
                                    value={endDate}
                                    onChange={setEndDate}
                                    ariaLabel={t("cycle.endLabel")}
                                    isOpen={isEndPickerOpen}
                                    onOpenChange={(open) => {
                                        setIsEndPickerOpen(open);
                                        if (open) setIsStartPickerOpen(false);
                                    }}
                                />
                            </label>
                        </div>
                    )}

                    <label className="text-sm font-semibold text-[var(--text)]">
                        {t("cycle.noteLabel")}
                        <textarea
                            value={note}
                            onChange={(event) => setNote(event.target.value.slice(0, 50))}
                            maxLength={50}
                            rows={3}
                            placeholder={t("cycle.notePlaceholder")}
                            className="mt-1.5 w-full resize-none rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--primary)]"
                        />
                    </label>

                    <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleCloseSheet}
                            disabled={submitting}
                            className="pill-action-btn pill-action-btn--compact pill-action-btn--cancel"
                        >
                            {t("cycle.cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="pill-action-btn pill-action-btn--compact"
                        >
                            <span className="pill-action-btn-text">
                                {submitting ? t("cycle.saving") : t("cycle.save")}
                            </span>
                        </button>
                    </div>
                </form>

                <IconPickerSheet
                    open={isIconPickerOpen}
                    title={t("cycle.iconLabel")}
                    searchPlaceholder={t("cycle.iconSearchPlaceholder")}
                    query={iconQuery}
                    onQueryChange={setIconQuery}
                    selectedIcon={selectedIcon}
                    onSelect={(icon) => {
                        setSelectedIcon(icon);
                        setIsIconPickerOpen(false);
                    }}
                    onClose={() => setIsIconPickerOpen(false)}
                />
            </BottomSheet>

            {seasonToSummarize && (
                <CycleSummaryModal
                    key={seasonToSummarize.cycleId}
                    open
                    cycleId={seasonToSummarize.cycleId}
                    cycleName={seasonToSummarize.name}
                    onClose={() => setSeasonToSummarize(null)}
                />
            )}

            <ConfirmBottomSheet
                open={cropToDelete !== null}
                title={t("cycle.deleteConfirmTitle")}
                message={
                    cropToDelete
                        ? t("cycle.deleteConfirmMessage", { name: cropToDelete.name })
                        : ""
                }
                confirmLabel={t("cycle.deleteConfirmButton")}
                busy={deletingCropId !== null}
                danger
                onClose={() => {
                    if (deletingCropId === null) {
                        setCropToDelete(null);
                    }
                }}
                onConfirm={confirmDeleteCrop}
            />
        </MainLayout>
    );
}
