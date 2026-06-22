import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import "../styles/Cycle.css";
import { FaPlus } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import Addcycle from "../components/Addcycle";
import BottomSheet from "../components/BottomSheet";
import IconPickerSheet from "../components/IconPickerSheet";
import { useTranslation } from "react-i18next";
import { icons } from "../assets/Iconlist";
import { CalendarDate } from "@internationalized/date";
import AppDateField from "../components/AppDateField";
import { ApiError } from "../lib/api";
import { auth } from "../lib/auth";
import { cycleApi, planApi, transactionApi, type Cycle, type PlanQuota } from "../lib/userService";
import { aggregateTransactionsByCycle } from "../utils/cycleStats";
import {
    gregorianDateKey,
    initialAppDateTime,
    parseTxToGregorianCalendarDate,
    toGregorianCalendarDate,
} from "../utils/formatAppDate";
import { formatCycleDateRange } from "../utils/formatMonthYear";
import dayjs from "dayjs";

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

function isActiveCycle(cycle: Cycle): boolean {
    return (cycle.status ?? "active") === "active";
}

function countActiveCycles(cycles: Cycle[]): number {
    return cycles.filter(isActiveCycle).length;
}

function canCreateFromQuota(quota: PlanQuota | null, activeCount: number): boolean {
    if (!quota) return true;
    if (quota.maxCycles === -1) return true;
    return activeCount < quota.maxCycles;
}

function cycleLengthLabel(c: Cycle, lang: string): string {
    const start = c.startDate ? dayjs(c.startDate).toDate() : null;
    const end = c.endDate ? dayjs(c.endDate).toDate() : null;
    return formatCycleDateRange(start, end, lang);
}

export default function CyclePage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [statsByCycleId, setStatsByCycleId] = useState<
        Record<string, { income: number; expense: number }>
    >({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deletingCycleId, setDeletingCycleId] = useState<string | null>(null);
    const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
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
    const [isStartPickerOpen, setIsStartPickerOpen] = useState(false);
    const [isEndPickerOpen, setIsEndPickerOpen] = useState(false);

    const activeCycleCount = countActiveCycles(cycles);
    const canCreateCycle = canCreateFromQuota(planQuota, activeCycleCount);
    const planDisplayName = planQuota
        ? t(`cycle.planName.${planQuota.planName}`, { defaultValue: planQuota.planName })
        : "";

    const refreshQuota = async () => {
        const quota = await planApi.getQuota();
        setPlanQuota(quota);
    };

    useEffect(() => {
        if (!auth.isAuthed()) {
            navigate("/settings", { replace: true });
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        Promise.all([cycleApi.list(), transactionApi.list(), planApi.getQuota()])
            .then(([cycleRows, txRows, quota]) => {
                if (cancelled) return;
                setCycles(cycleRows ?? []);
                setStatsByCycleId(aggregateTransactionsByCycle(txRows ?? []));
                setPlanQuota(quota);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setCycles([]);
                setStatsByCycleId({});
                setPlanQuota(null);
                setError(err instanceof ApiError ? err.message : (err as Error).message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [navigate]);

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
        setIsStartPickerOpen(false);
        setIsEndPickerOpen(false);
    };

    const openAddSheet = () => {
        if (!canCreateCycle) {
            setError(t("cycle.quotaLimitReached", { plan: planDisplayName }));
            return;
        }
        setEditingCycle(null);
        setError(null);
        setIsSheetOpen(true);
    };

    const openEditSheet = (cycle: Cycle) => {
        setEditingCycle(cycle);
        setTitle(cycle.name);
        setFarmType(cycle.farmType ?? "ทั่วไป");
        setSelectedIcon(isIconName(cycle.icon) ? cycle.icon : "corn");
        setStartDate(apiDateToCalendarDate(cycle.startDate));
        setEndDate(apiDateToCalendarDate(cycle.endDate));
        setBudget("");
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
        if (editingCycle) {
            resetForm();
            setEditingCycle(null);
        }
    };

    const handleDeleteCycle = async (cycle: Cycle) => {
        if (!window.confirm(`ลบรอบ "${cycle.name}" ?\nงบประมาณจะถูกลบด้วย รายการธุรกรรมจะไม่ผูกรอบนี้แล้ว`)) {
            return;
        }
        setDeletingCycleId(cycle.cycleId);
        setError(null);
        try {
            await cycleApi.delete(cycle.cycleId);
            setCycles((prev) => prev.filter((c) => c.cycleId !== cycle.cycleId));
            const txRows = await transactionApi.list();
            setStatsByCycleId(aggregateTransactionsByCycle(txRows ?? []));
            await refreshQuota();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : (err as Error).message);
        } finally {
            setDeletingCycleId(null);
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextTitle = title.trim();
        if (!nextTitle) return;

        setSubmitting(true);
        setError(null);
        try {
            if (editingCycle) {
                const updated = await cycleApi.update({
                    cycleId: editingCycle.cycleId,
                    name: nextTitle,
                    farmType: editingCycle.farmType ?? "ทั่วไป",
                    startDate: calendarDateToApiDate(startDate),
                    endDate: calendarDateToApiDate(endDate),
                    status: editingCycle.status ?? "active",
                    icon: selectedIcon,
                });
                setCycles((prev) =>
                    prev.map((c) => (c.cycleId === updated.cycleId ? updated : c)),
                );
            } else {
                const budgetNumber = budget.trim() === "" ? null : Number(budget);
                if (budgetNumber !== null && (Number.isNaN(budgetNumber) || budgetNumber < 0)) {
                    return;
                }
                const created = await cycleApi.create({
                    name: nextTitle,
                    farmType: farmType.trim() || "ทั่วไป",
                    startDate: calendarDateToApiDate(startDate),
                    endDate: calendarDateToApiDate(endDate),
                    status: "active",
                    icon: selectedIcon,
                    budgetAmount: budgetNumber,
                });
                setCycles((prev) => [created, ...prev]);
                const txRows = await transactionApi.list();
                setStatsByCycleId(aggregateTransactionsByCycle(txRows ?? []));
                await refreshQuota();
            }
            resetForm();
            handleCloseSheet();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : (err as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    const isEditMode = editingCycle !== null;

    return (
        <MainLayout>
            <div className="home-page">
                <div className="home-content-card">
                    <div className="cycle-page">
                <button
                    type="button"
                    onClick={openAddSheet}
                    disabled={loading || !canCreateCycle}
                    className="pill-action-btn"
                >
                    <span className="pill-action-btn-icon" aria-hidden>
                        <FaPlus size={14} />
                    </span>
                    <span className="pill-action-btn-text">{t("cycle.addNew")}</span>
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
                    {cycles.map((cycle) => {
                        const stats = statsByCycleId[cycle.cycleId] ?? { income: 0, expense: 0 };
                        return (
                            <Addcycle
                                key={cycle.cycleId}
                                title={cycle.name}
                                income={stats.income}
                                expense={stats.expense}
                                budget={cycle.budgetAmount}
                                length={cycleLengthLabel(cycle, i18n.language)}
                                icon={isIconName(cycle.icon) ? cycle.icon : "corn"}
                                deleting={deletingCycleId === cycle.cycleId}
                                onEdit={() => openEditSheet(cycle)}
                                onDelete={() => handleDeleteCycle(cycle)}
                            />
                        );
                    })}
                    {!loading && cycles.length === 0 && !error && (
                        <p className="text-center text-sm text-[var(--text-soft)]">
                            ยังไม่มีรอบปลูก กดปุ่ม + เพื่อเริ่มต้น
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
                            <p className="text-base font-bold text-[var(--text)]">
                                {isEditMode ? t("cycle.editFormTitle") : t("cycle.formTitle")}
                            </p>
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
                            className="flex flex-1 flex-col gap-3 overflow-y-auto pb-1"
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

                            {!isEditMode && (
                                <>
                                    <label className="text-sm font-semibold text-[var(--text)]">
                                        ประเภท (farmType)
                                        <input
                                            type="text"
                                            value={farmType}
                                            onChange={(event) => setFarmType(event.target.value)}
                                            placeholder="เช่น พืชไร่ / ประมง / ปศุสัตว์"
                                            className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--primary)]"
                                        />
                                    </label>
                                    <label className="text-sm font-semibold text-[var(--text)]">
                                        {t("cycle.budgetLabel")}
                                        <input
                                            type="number"
                                            min={0}
                                            value={budget}
                                            onChange={(event) => setBudget(event.target.value)}
                                            placeholder={t("cycle.budgetPlaceholder")}
                                            className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--primary)]"
                                        />
                                    </label>
                                </>
                            )}

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

                            <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseSheet}
                                    disabled={submitting}
                                    className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)] disabled:opacity-50"
                                >
                                    {t("cycle.cancel")}
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="rounded-[var(--radius-control)] border border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-2 text-sm font-semibold text-[var(--primary)] transition-all hover:brightness-95 disabled:opacity-50"
                                >
                                    {submitting ? "กำลังบันทึก..." : t("cycle.save")}
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
        </MainLayout>
    );
}
