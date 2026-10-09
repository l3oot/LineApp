import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import "../styles/Cycle.css";
import { FaPlus } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import Addcycle from "../components/Addcycle";
import BottomSheet from "../components/BottomSheet";
import ConfirmBottomSheet from "../components/ConfirmBottomSheet";
import CycleSummaryModal from "../components/CycleSummaryModal";
import IconPickerSheet from "../components/IconPickerSheet";
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components";
import { FiCalendar } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { icons } from "../assets/Iconlist";
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
import { statsForCropRound } from "../utils/cycleStats";
import { formatAppMonth } from "../utils/formatAppDate";
import { formatCycleMonthRange, formatMonthRange } from "../utils/formatMonthYear";

function currentMonth(): number {
    return new Date().getMonth() + 1;
}

function monthAfter(month: number): number {
    return month === 12 ? 1 : month + 1;
}

function pad2(value: number): string {
    return String(value).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

/** ช่วงวันที่จริงของรอบ จากเดือนที่เลือก ครอบคลุมทั้งเดือน และข้ามปีได้ */
function seasonApiDates(startMonth: number, endMonth: number, startYear: number) {
    const endYear = endMonth >= startMonth ? startYear : startYear + 1;
    return {
        startDate: `${startYear}-${pad2(startMonth)}-01`,
        endDate: `${endYear}-${pad2(endMonth)}-${pad2(lastDayOfMonth(endYear, endMonth))}`,
    };
}

function monthFromApiDate(value: string | null | undefined, fallback: number): number {
    if (!value) return fallback;
    const month = Number(value.slice(5, 7));
    return month >= 1 && month <= 12 ? month : fallback;
}

function yearFromApiDate(value: string | null | undefined): number {
    if (!value) return new Date().getFullYear();
    const year = Number(value.slice(0, 4));
    return Number.isFinite(year) && year > 1900 ? year : new Date().getFullYear();
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

function MonthField({
    value,
    onChange,
    ariaLabel,
    isOpen,
    onOpenChange,
}: {
    value: number;
    onChange: (month: number) => void;
    ariaLabel: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { i18n } = useTranslation();
    return (
        <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
            <Button
                aria-label={ariaLabel}
                className="relative mt-2 flex w-full items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left outline-none transition-all data-[focus-visible]:border-[var(--primary)] data-[pressed]:border-[var(--primary)]"
            >
                <span className="min-w-0 flex-1 whitespace-nowrap text-sm font-semibold text-[var(--text)]">
                    {formatAppMonth(value, i18n.language)}
                </span>
                <FiCalendar size={18} className="shrink-0 text-[var(--text-soft)]" aria-hidden />
            </Button>
            <Popover placement="bottom" offset={8} className="date-picker-popover month-picker-popover">
                <Dialog aria-label={ariaLabel} className="outline-none">
                    <div className="month-picker-grid">
                        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                            <button
                                key={month}
                                type="button"
                                className="month-picker-cell"
                                data-selected={month === value ? "true" : undefined}
                                onClick={() => {
                                    onChange(month);
                                    onOpenChange(false);
                                }}
                            >
                                {formatAppMonth(month, i18n.language)}
                            </button>
                        ))}
                    </div>
                </Dialog>
            </Popover>
        </DialogTrigger>
    );
}

type SheetMode = "addCrop" | "editCrop";

export default function CyclePage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [crops, setCrops] = useState<Crop[]>([]);
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deletingCropId, setDeletingCropId] = useState<string | null>(null);
    const [cropToDelete, setCropToDelete] = useState<Crop | null>(null);
    const [seasonToSummarize, setSeasonToSummarize] = useState<Cycle | null>(null);
    const [sheetMode, setSheetMode] = useState<SheetMode>("addCrop");
    const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
    const [planQuota, setPlanQuota] = useState<PlanQuota | null>(null);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [farmType, setFarmType] = useState("");
    const [selectedIcon, setSelectedIcon] = useState<IconName>("corn");
    const [iconQuery, setIconQuery] = useState("");
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [startMonth, setStartMonth] = useState(currentMonth);
    const [endMonth, setEndMonth] = useState(() => monthAfter(currentMonth()));
    const [seasonYear, setSeasonYear] = useState(() => new Date().getFullYear());
    const [note, setNote] = useState("");
    const [openMonthField, setOpenMonthField] = useState<"start" | "end" | null>(null);

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
        const [cropRows, cycleRows, txRows] = await Promise.all([
            cropApi.list(),
            cycleApi.list(),
            transactionApi.list(),
        ]);
        setCrops(cropRows ?? []);
        setCycles(cycleRows ?? []);
        setTransactions(txRows ?? []);
    };

    const cycleIdsByCrop = useMemo(() => {
        const map = new Map<string, string[]>();
        for (const cycle of cycles) {
            const ids = map.get(cycle.cropId) ?? [];
            ids.push(cycle.cycleId);
            map.set(cycle.cropId, ids);
        }
        return map;
    }, [cycles]);

    useEffect(() => {
        if (!auth.isAuthed()) {
            navigate("/app/settings", { replace: true });
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        Promise.all([cropApi.list(), cycleApi.list(), transactionApi.list(), planApi.getQuota()])
            .then(([cropRows, cycleRows, txRows, quota]) => {
                if (cancelled) return;
                setCrops(cropRows ?? []);
                setCycles(cycleRows ?? []);
                setTransactions(txRows ?? []);
                setPlanQuota(quota);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setCrops([]);
                setCycles([]);
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

    const resetForm = () => {
        setTitle("");
        setFarmType("");
        setSelectedIcon("corn");
        setIconQuery("");
        setIsIconPickerOpen(false);
        const month = currentMonth();
        setStartMonth(month);
        setEndMonth(monthAfter(month));
        setSeasonYear(new Date().getFullYear());
        setNote("");
        setOpenMonthField(null);
    };

    const openAddCropSheet = () => {
        if (!canCreateCrop) {
            setError(t("cycle.quotaLimitReached", { plan: planDisplayName }));
            return;
        }
        setSheetMode("addCrop");
        setEditingCrop(null);
        resetForm();
        setError(null);
        setIsSheetOpen(true);
    };

    const openEditCropSheet = (crop: Crop) => {
        const season = crop.currentSeason;
        setSheetMode("editCrop");
        setEditingCrop(crop);
        setTitle(crop.name);
        setFarmType(crop.farmType ?? "ทั่วไป");
        setSelectedIcon(isIconName(crop.icon) ? crop.icon : "corn");
        const fallbackMonth = currentMonth();
        setStartMonth(crop.startMonth ?? monthFromApiDate(season?.startDate, fallbackMonth));
        setEndMonth(crop.endMonth ?? monthFromApiDate(season?.endDate, fallbackMonth));
        setSeasonYear(yearFromApiDate(season?.startDate));
        setNote(season?.note ?? crop.note ?? "");
        setIconQuery("");
        setIsIconPickerOpen(false);
        setError(null);
        setIsSheetOpen(true);
    };

    const handleCloseSheet = () => {
        setIsSheetOpen(false);
        setEditingCrop(null);
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
                const seasonDates = seasonApiDates(startMonth, endMonth, seasonYear);
                await cropApi.update({
                    cropId: editingCrop.cropId,
                    name: nextTitle,
                    note: (editingCrop.note ?? "").slice(0, 50),
                    farmType: farmType.trim() || editingCrop.farmType || "ทั่วไป",
                    icon: selectedIcon,
                    status: editingCrop.status ?? "active",
                    startMonth,
                    endMonth,
                });
                if (editingCrop.currentSeason) {
                    await cycleApi.update({
                        cycleId: editingCrop.currentSeason.cycleId,
                        note: note.trim().slice(0, 50),
                        startDate: seasonDates.startDate,
                        endDate: seasonDates.endDate,
                        status: editingCrop.currentSeason.status ?? "active",
                    });
                }
                await reloadCrops();
            } else {
                const nextTitle = title.trim();
                if (!nextTitle) return;
                const seasonDates = seasonApiDates(startMonth, endMonth, seasonYear);
                await cropApi.create({
                    name: nextTitle,
                    note: note.trim().slice(0, 50),
                    farmType: farmType.trim() || "ทั่วไป",
                    icon: selectedIcon,
                    status: "active",
                    startMonth,
                    endMonth,
                    startDate: seasonDates.startDate,
                    endDate: seasonDates.endDate,
                    seasonNote: note.trim().slice(0, 50),
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
        sheetMode === "editCrop" ? t("cycle.editFormTitle") : t("cycle.formTitle");

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
                                const round = statsForCropRound(
                                    crop,
                                    transactions,
                                    cycleIdsByCrop.get(crop.cropId) ?? [],
                                );
                                const iconName = isIconName(crop.icon) ? crop.icon : "corn";
                                return (
                                    <Addcycle
                                        key={crop.cropId}
                                        title={crop.name}
                                        income={round.income}
                                        expense={round.expense}
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

                    {(sheetMode === "addCrop" ||
                        (sheetMode === "editCrop" && editingCrop?.currentSeason)) && (
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-sm font-bold text-[var(--text)]">
                                {t("cycle.startLabel")}
                                <MonthField
                                    value={startMonth}
                                    onChange={setStartMonth}
                                    ariaLabel={t("cycle.startLabel")}
                                    isOpen={openMonthField === "start"}
                                    onOpenChange={(open) => setOpenMonthField(open ? "start" : null)}
                                />
                            </label>
                            <label className="text-sm font-bold text-[var(--text)]">
                                {t("cycle.endLabel")}
                                <MonthField
                                    value={endMonth}
                                    onChange={setEndMonth}
                                    ariaLabel={t("cycle.endLabel")}
                                    isOpen={openMonthField === "end"}
                                    onOpenChange={(open) => setOpenMonthField(open ? "end" : null)}
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
