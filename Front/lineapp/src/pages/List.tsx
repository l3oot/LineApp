import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import {
    Button,
    CalendarCell,
    CalendarGrid,
    CalendarGridBody,
    CalendarGridHeader,
    CalendarHeaderCell,
    DateInput,
    DateRangePicker,
    DateSegment,
    Dialog,
    Group,
    Heading,
    Popover,
    RangeCalendar,
} from "react-aria-components";
import MainLayout from "../layouts/MainLayout";
import TransactionCard, { type TransactionProps } from "../components/TransactionCard";
import FilterChipButton from "../components/FilterChipButton";
import { icons } from "../assets/Iconlist";
import { FiCalendar, FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import { FaPlus } from "react-icons/fa";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useTranslation } from "react-i18next";
import type { GroupedTransaction } from "../data/listMockData";
import { ApiError } from "../lib/api";
import { categoryApi, cycleApi, transactionApi, type Category, type Cycle, type Transaction } from "../lib/userService";
import { auth } from "../lib/auth";

const getDateTimeLocalValue = (date: Date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
};

function isIconName(value: string | null | undefined): value is keyof typeof icons {
    return Boolean(value && Object.prototype.hasOwnProperty.call(icons, value));
}

/** datetime-local → LocalDateTime สำหรับ Spring (yyyy-MM-ddTHH:mm:ss) */
function formatTxDateForApi(datetimeLocal: string): string {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(datetimeLocal)) {
        return `${datetimeLocal}:00`;
    }
    return datetimeLocal;
}

function calendarDateStart(cd: CalendarDate): Date {
    return new Date(cd.year, cd.month - 1, cd.day, 0, 0, 0, 0);
}

function calendarDateEnd(cd: CalendarDate): Date {
    return new Date(cd.year, cd.month - 1, cd.day, 23, 59, 59, 999);
}

function isTxInDateRange(txDate: string, start: CalendarDate, end: CalendarDate): boolean {
    const d = new Date(txDate);
    if (Number.isNaN(d.getTime())) return false;
    return d >= calendarDateStart(start) && d <= calendarDateEnd(end);
}

function toDisplayTransaction(
    tx: Transaction,
    categoryById: Record<string, string>,
    fallbackCategory: string,
): TransactionProps {
    const txDate = new Date(tx.txDate);
    return {
        title: tx.note?.trim() || "—",
        type: tx.txType,
        category: tx.categoryId ? (categoryById[tx.categoryId] ?? fallbackCategory) : fallbackCategory,
        amount: Number(tx.amount),
        time: txDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        icon: icons.bill,
    };
}

function categoryNameForTx(
    tx: Transaction,
    categoryById: Record<string, string>,
    fallbackCategory: string,
): string {
    return tx.categoryId ? (categoryById[tx.categoryId] ?? fallbackCategory) : fallbackCategory;
}

function groupTransactionsByDate(rows: Transaction[]): GroupedTransaction[] {
    const sorted = [...rows].sort(
        (a, b) => new Date(b.txDate).getTime() - new Date(a.txDate).getTime(),
    );
    const groups: GroupedTransaction[] = [];
    let currentDate = "";
    let currentItems: Transaction[] = [];

    for (const tx of sorted) {
        const txDate = new Date(tx.txDate);
        const dateLabel = txDate.toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
        if (dateLabel !== currentDate) {
            if (currentItems.length > 0) {
                groups.push({ date: currentDate, transactions: currentItems });
            }
            currentDate = dateLabel;
            currentItems = [tx];
        } else {
            currentItems.push(tx);
        }
    }
    if (currentItems.length > 0) {
        groups.push({ date: currentDate, transactions: currentItems });
    }
    return groups;
}

export default function List() {
    const { t } = useTranslation();
    const [activeFilter, setActiveFilter] = useState<"all" | "expense" | "income">("all");
    const [activeCategories, setActiveCategories] = useState<string[]>([]);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);
    const localTimeZone = getLocalTimeZone();
    const initialEnd = today(localTimeZone);
    const initialStart = initialEnd.add({ days: -29 });
    const [dateRange, setDateRange] = useState<{ start: CalendarDate; end: CalendarDate }>({
        start: initialStart,
        end: initialEnd,
    });

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categoryById, setCategoryById] = useState<Record<string, string>>({});
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState<string | null>(null);
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [newType, setNewType] = useState<"income" | "expense">("expense");
    const [formCategories, setFormCategories] = useState<Category[]>([]);
    const [newCategoryId, setNewCategoryId] = useState("");
    const [newCycleId, setNewCycleId] = useState<string>("");
    const [newAmount, setNewAmount] = useState("0");
    const [newDateTime, setNewDateTime] = useState(getDateTimeLocalValue(new Date()));
    const [newIcon, setNewIcon] = useState<keyof typeof icons>("bill");
    const [iconQuery, setIconQuery] = useState("");
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [isAddCycleOpen, setIsAddCycleOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const fallbackCategory = t("list.quickAddCategory");

    const loadTransactions = useCallback(async () => {
        if (!auth.isAuthed()) {
            setTransactions([]);
            setCategoryById({});
            setListLoading(false);
            return;
        }
        setListLoading(true);
        setListError(null);
        try {
            const [txRows, categories] = await Promise.all([
                transactionApi.list(),
                categoryApi.list(),
            ]);
            setCategoryById(
                Object.fromEntries((categories ?? []).map((c) => [c.categoryId, c.name])),
            );
            setTransactions(txRows ?? []);
        } catch (err) {
            setTransactions([]);
            setListError(err instanceof ApiError ? err.message : (err as Error).message);
        } finally {
            setListLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    const groupedTransactions = useMemo(() => {
        const inRange = transactions.filter((tx) =>
            isTxInDateRange(tx.txDate, dateRange.start, dateRange.end),
        );
        return groupTransactionsByDate(inRange);
    }, [transactions, dateRange]);

    const categoryOptions = useMemo(() => {
        const fromList = transactions.map((tx) =>
            categoryNameForTx(tx, categoryById, fallbackCategory),
        );
        return Array.from(new Set([...Object.values(categoryById), ...fromList]));
    }, [transactions, categoryById, fallbackCategory]);
    const selectedFormCategory = formCategories.find((c) => c.categoryId === newCategoryId) ?? null;
    const iconOptions = Object.entries(icons) as [keyof typeof icons, string][];
    const filteredIcons = iconOptions.filter(([key]) => key.toLowerCase().includes(iconQuery.trim().toLowerCase()));

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!categoryDropdownRef.current?.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
        }

        if (isCategoryDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isCategoryDropdownOpen]);

    useEffect(() => {
        if (!auth.isAuthed()) return;
        let cancelled = false;
        cycleApi
            .list()
            .then((data) => {
                if (!cancelled) setCycles(data ?? []);
            })
            .catch(() => {
                if (!cancelled) setCycles([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!isAddSheetOpen || !auth.isAuthed()) return;
        let cancelled = false;
        categoryApi
            .list(newType)
            .then((data) => {
                if (cancelled) return;
                const list = data ?? [];
                setFormCategories(list);
                setNewCategoryId((prev) =>
                    prev && list.some((c) => c.categoryId === prev) ? prev : (list[0]?.categoryId ?? ""),
                );
            })
            .catch(() => {
                if (!cancelled) {
                    setFormCategories([]);
                    setNewCategoryId("");
                }
            });
        return () => {
            cancelled = true;
        };
    }, [isAddSheetOpen, newType]);

    const selectedCycle = cycles.find((c) => c.cycleId === newCycleId) ?? null;

    const filteredGroups = useMemo(() => {
        return groupedTransactions
            .map((group) => ({
                ...group,
                transactions: group.transactions.filter((tx) => {
                    const isTypeMatch = activeFilter === "all" || tx.txType === activeFilter;
                    const name = categoryNameForTx(tx, categoryById, fallbackCategory);
                    const isCategoryMatch =
                        activeCategories.length === 0 || activeCategories.includes(name);
                    return isTypeMatch && isCategoryMatch;
                }),
            }))
            .filter((group) => group.transactions.length > 0);
    }, [activeCategories, activeFilter, groupedTransactions, categoryById, fallbackCategory]);

    const filterButtons = [
        { key: "all", label: t("list.all") },
        { key: "expense", label: t("list.expense") },
        { key: "income", label: t("list.income") },
    ] as const;

    const resetAddForm = () => {
        setEditingTxId(null);
        setNewTitle("");
        setNewType("expense");
        setFormCategories([]);
        setNewCategoryId("");
        setNewCycleId("");
        setNewAmount("0");
        setNewDateTime(getDateTimeLocalValue(new Date()));
        setNewIcon("bill");
        setIconQuery("");
        setIsIconPickerOpen(false);
        setIsAddCategoryOpen(false);
        setIsAddCycleOpen(false);
    };

    const openAddSheet = () => {
        resetAddForm();
        setAddError(null);
        setIsAddSheetOpen(true);
    };

    const openEditSheet = (tx: Transaction) => {
        setEditingTxId(tx.txId);
        setNewTitle(tx.note?.trim() ?? "");
        setNewType(tx.txType);
        setNewCategoryId(tx.categoryId ?? "");
        setNewCycleId(tx.cycleId ?? "");
        setNewAmount(String(tx.amount));
        setNewDateTime(getDateTimeLocalValue(new Date(tx.txDate)));
        setNewIcon("bill");
        setAddError(null);
        setIsAddSheetOpen(true);
    };

    const handleDeleteTransaction = async () => {
        if (!editingTxId) return;
        if (!window.confirm(t("list.deleteConfirm"))) return;

        setSubmitting(true);
        setAddError(null);
        try {
            await transactionApi.delete(editingTxId);
            await loadTransactions();
            resetAddForm();
            setIsAddSheetOpen(false);
        } catch (err) {
            setAddError(err instanceof ApiError ? err.message : (err as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveTransaction = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const selectedDate = newDateTime ? new Date(newDateTime) : new Date();
        if (Number.isNaN(selectedDate.getTime())) {
            return;
        }
        const amountNumber = Number(newAmount);
        const title = newTitle.trim();
        const categoryName = selectedFormCategory?.name?.trim() ?? "";

        if (!title || !newCategoryId || !categoryName || Number.isNaN(amountNumber) || amountNumber <= 0) {
            return;
        }

        setSubmitting(true);
        setAddError(null);
        try {
            const payload = {
                txType: newType,
                amount: amountNumber,
                note: title,
                txDate: formatTxDateForApi(newDateTime),
                cycleId: newCycleId || null,
                categoryId: newCategoryId,
            };

            if (editingTxId) {
                await transactionApi.update({ txId: editingTxId, ...payload });
            } else {
                await transactionApi.create(payload);
            }

            await loadTransactions();
            resetAddForm();
            setIsAddSheetOpen(false);
        } catch (err) {
            setAddError(err instanceof ApiError ? err.message : (err as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <MainLayout>
            <div className="flex flex-col p-5 gap-4 pb-3">
                <DateRangePicker
                    aria-label={t("list.dateRangeAria")}
                    value={dateRange}
                    onChange={(newRange) => {
                        if (!newRange) return;
                        setDateRange({
                            start: newRange.start as CalendarDate,
                            end: newRange.end as CalendarDate,
                        });
                    }}
                    className="w-full"
                >
                    <Group className="relative w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)] transition-all focus-within:border-[var(--primary)] hover:bg-[var(--surface-soft)]">
                        <Button
                            aria-label={t("list.dateRangeAria")}
                            className="absolute inset-0 z-10 rounded-[var(--radius-card)]"
                        />
                        <div className="pointer-events-none flex items-center justify-center gap-3">
                            <DateInput
                                slot="start"
                                className="inline-flex flex-nowrap items-center whitespace-nowrap text-base font-semibold text-[var(--text)] data-[placeholder]:text-[var(--text-soft)]"
                            >
                                {(segment) => <DateSegment segment={segment} className="rounded-sm px-0 outline-none focus:bg-[var(--primary-soft)]" />}
                            </DateInput>
                            <span className="text-base font-semibold text-[var(--text)]">-</span>
                            <DateInput
                                slot="end"
                                className="inline-flex flex-nowrap items-center whitespace-nowrap text-base font-semibold text-[var(--text)] data-[placeholder]:text-[var(--text-soft)]"
                            >
                                {(segment) => <DateSegment segment={segment} className="rounded-sm px-0 outline-none focus:bg-[var(--primary-soft)]" />}
                            </DateInput>
                            <FiCalendar className="text-xl text-[var(--text-soft)]" />
                        </div>
                    </Group>
                    <Popover className="z-30 mt-2 w-[var(--trigger-width)] min-w-[280px] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-soft)]">
                        <Dialog className="outline-none">
                            <RangeCalendar className="w-full">
                                <header className="mb-2 flex items-center justify-between">
                                    <Button slot="previous" className="rounded-full px-2 py-1 text-sm text-[var(--text-soft)] hover:bg-[var(--surface-soft)]">
                                        ‹
                                    </Button>
                                    <Heading className="text-sm font-bold text-[var(--text)]" />
                                    <Button slot="next" className="rounded-full px-2 py-1 text-sm text-[var(--text-soft)] hover:bg-[var(--surface-soft)]">
                                        ›
                                    </Button>
                                </header>
                                <CalendarGrid className="w-full border-separate border-spacing-1">
                                    <CalendarGridHeader>
                                        {(day) => <CalendarHeaderCell className="pb-1 text-xs font-semibold text-[var(--text-soft)]">{day}</CalendarHeaderCell>}
                                    </CalendarGridHeader>
                                    <CalendarGridBody>
                                        {(date) => (
                                            <CalendarCell
                                                date={date}
                                                className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-[var(--text)] outline-none hover:bg-[var(--surface-soft)] data-[disabled]:text-gray-300 data-[outside-month]:text-gray-300 data-[selected]:bg-[var(--primary)] data-[selected]:text-white"
                                            />
                                        )}
                                    </CalendarGridBody>
                                </CalendarGrid>
                            </RangeCalendar>
                        </Dialog>
                    </Popover>
                </DateRangePicker>

                <div className="flex gap-3 items-stretch">
                    <div className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
                        <p className="text-[var(--text-soft)] text-sm font-semibold mb-3">{t("list.filterTitle")}</p>
                        <div className="relative flex items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-2">
                                {filterButtons.map((filter) => {
                                    const isActive = activeFilter === filter.key;
                                    const activeClass = filter.key === "expense"
                                        ? "border-[var(--danger)] bg-[var(--danger)] text-white"
                                        : "border-[var(--primary)] bg-[var(--primary)] text-white";
                                    return (
                                        <FilterChipButton
                                            key={filter.key}
                                            label={filter.label}
                                            active={isActive}
                                            activeClassName={activeClass}
                                            onClick={() => setActiveFilter(filter.key)}
                                        />
                                    );
                                })}
                            </div>
                            <button
                                type="button"
                                aria-label={t("list.extraFilterAria")}
                                onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                                className="inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface)]"
                            >
                                <FilterListIcon fontSize="small" />
                            </button>
                            {isCategoryDropdownOpen && (
                                <div
                                    ref={categoryDropdownRef}
                                    className="absolute right-0 top-full z-20 mt-2 w-52 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-soft)]"
                                >
                                    <p className="mb-2 text-xs font-semibold text-[var(--text-soft)]">{t("list.categoryTitle")}</p>
                                    <div className="flex flex-col gap-2">
                                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--text)]">
                                            <input
                                                type="checkbox"
                                                checked={activeCategories.length === 0}
                                                onChange={() => setActiveCategories([])}
                                                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                                            />
                                            {t("list.all")}
                                        </label>
                                        {categoryOptions.map((category) => {
                                            const checked = activeCategories.includes(category);
                                            return (
                                                <label key={category} className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--text)]">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => {
                                                            setActiveCategories((prev) =>
                                                                checked ? prev.filter((item) => item !== category) : [...prev, category]
                                                            );
                                                        }}
                                                        className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                                                    />
                                                    {category}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {listError && (
                    <div className="rounded-[var(--radius-card)] border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
                        {listError}
                    </div>
                )}

                <div className="flex flex-col gap-6">
                    {listLoading && (
                        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-center text-[var(--text-soft)] shadow-[var(--shadow-soft)]">
                            กำลังโหลดรายการ...
                        </div>
                    )}
                    {!listLoading && filteredGroups.map((group, index) => {
                        const dailyTotal = group.transactions.reduce((sum, tx) => {
                            const amount = Number(tx.amount);
                            return sum + (tx.txType === "income" ? amount : -amount);
                        }, 0);
                        const isPositive = dailyTotal >= 0;
                        const totalColor = isPositive ? 'text-[var(--primary)]' : 'text-[var(--danger)]';
                        const totalSign = isPositive ? '+' : '-';

                        return (
                            <div key={index} className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <p className="text-sm font-bold text-[var(--text-soft)] whitespace-nowrap">{group.date}</p>
                                    <div className="h-[1px] flex-grow bg-[var(--border)]"></div>
                                    <p className={`text-sm font-bold whitespace-nowrap ${totalColor}`}>
                                        {t("list.dailyTotalPrefix")} {totalSign}{Math.abs(dailyTotal).toLocaleString()} {t("list.currencySuffix")}
                                    </p>
                                </div>
                                
                                <div className="flex flex-col gap-3">
                                    {group.transactions.map((tx) => {
                                        const display = toDisplayTransaction(
                                            tx,
                                            categoryById,
                                            fallbackCategory,
                                        );
                                        return (
                                            <TransactionCard
                                                key={tx.txId}
                                                {...display}
                                                onOpen={() => openEditSheet(tx)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    {!listLoading && filteredGroups.length === 0 && (
                        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-center text-[var(--text-soft)] shadow-[var(--shadow-soft)]">
                            {t("list.empty")}
                        </div>
                    )}
                </div>
            </div>
            <button
                type="button"
                aria-label={t("list.addButtonAria")}
                onClick={openAddSheet}
                className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[var(--shadow-soft)] transition-all hover:brightness-95 active:scale-95"
            >
                <FaPlus size={18} />
            </button>
            {isAddSheetOpen && (
                <div className="bottom-sheet-backdrop fixed inset-0 z-40 bg-black/35" onClick={() => setIsAddSheetOpen(false)}>
                    <div
                        className="bottom-sheet-panel mx-auto flex h-[74vh] w-full max-w-[420px] flex-col rounded-t-[22px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-3 flex items-center justify-between">
                            {editingTxId ? (
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={handleDeleteTransaction}
                                    className="text-sm font-bold text-[var(--danger)] transition-all hover:brightness-90 disabled:opacity-50"
                                >
                                    {t("list.deleteButton")}
                                </button>
                            ) : (
                                <p className="text-base font-bold text-[var(--text)]">
                                    {t("list.addFormTitle")}
                                </p>
                            )}
                            <button
                                type="button"
                                aria-label={t("common.close")}
                                onClick={() => {
                                    resetAddForm();
                                    setIsAddSheetOpen(false);
                                }}
                                className="rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <form className="flex flex-1 flex-col gap-4 overflow-y-auto pb-1" onSubmit={handleSaveTransaction}>
                            <div>
                                <p className="text-sm font-bold text-[var(--text)]">{t("list.typeLabel")}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewType("income")}
                                        className={`rounded-[var(--radius-control)] border px-3 py-2 text-center text-sm font-semibold transition-all ${
                                            newType === "income"
                                                ? "border-2 border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                                                : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-soft)]"
                                        }`}
                                    >
                                        {t("list.income")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewType("expense")}
                                        className={`rounded-[var(--radius-control)] border px-3 py-2 text-center text-sm font-semibold transition-all ${
                                            newType === "expense"
                                                ? "border-2 border-[var(--danger)] bg-red-100 text-[var(--danger)]"
                                                : "border-red-100 bg-red-50 text-[var(--danger)] hover:bg-red-100"
                                        }`}
                                    >
                                        {t("list.expense")}
                                    </button>
                                </div>
                            </div>

                            <label className="text-sm font-bold text-[var(--text)]">
                                {t("list.cycleLabel")}
                                <button
                                    type="button"
                                    onClick={() => setIsAddCycleOpen((prev) => !prev)}
                                    className="mt-2 flex w-full items-center justify-between rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-medium text-[var(--text)] transition-all hover:border-[var(--primary)]"
                                >
                                    <span className={selectedCycle ? "text-[var(--text)]" : "text-[var(--text-soft)]"}>
                                        {selectedCycle ? selectedCycle.name : t("list.cycleNone")}
                                    </span>
                                    <FiChevronDown
                                        size={18}
                                        className={`text-[var(--text-soft)] transition-transform ${isAddCycleOpen ? "rotate-180" : ""}`}
                                    />
                                </button>
                                {isAddCycleOpen && (
                                    <div className="mt-2 max-h-[180px] overflow-y-auto rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewCycleId("");
                                                setIsAddCycleOpen(false);
                                            }}
                                            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-all ${
                                                !newCycleId
                                                    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                                                    : "text-[var(--text-soft)] hover:bg-[var(--surface-soft)]"
                                            }`}
                                        >
                                            <span>{t("list.cycleNone")}</span>
                                            {!newCycleId && <FiCheck size={18} className="text-[var(--text-soft)]" />}
                                        </button>
                                        {cycles.map((cycle) => {
                                            const isSelected = newCycleId === cycle.cycleId;
                                            return (
                                                <button
                                                    key={cycle.cycleId}
                                                    type="button"
                                                    onClick={() => {
                                                        setNewCycleId(cycle.cycleId);
                                                        setIsAddCycleOpen(false);
                                                    }}
                                                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-all ${
                                                        isSelected
                                                            ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                                                            : "text-[var(--text)] hover:bg-[var(--surface-soft)]"
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        {isIconName(cycle.icon) && (
                                                            <span className="text-base leading-none">{icons[cycle.icon]}</span>
                                                        )}
                                                        <span>{cycle.name}</span>
                                                    </span>
                                                    {isSelected && <FiCheck size={18} className="text-[var(--text-soft)]" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </label>

                            <label className="text-sm font-bold text-[var(--text)]">
                                {t("list.categoryTitle")}
                                <button
                                    type="button"
                                    onClick={() => setIsAddCategoryOpen((prev) => !prev)}
                                    className="mt-2 flex w-full items-center justify-between rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-medium text-[var(--text)] transition-all hover:border-[var(--primary)]"
                                >
                                    <span className={selectedFormCategory ? "text-[var(--text)]" : "text-[var(--text-soft)]"}>
                                        {selectedFormCategory?.name ?? t("list.quickAddCategory")}
                                    </span>
                                    <FiChevronDown
                                        size={18}
                                        className={`text-[var(--text-soft)] transition-transform ${isAddCategoryOpen ? "rotate-180" : ""}`}
                                    />
                                </button>
                                {isAddCategoryOpen && (
                                    <div className="mt-2 overflow-hidden rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)]">
                                        {formCategories.length === 0 ? (
                                            <p className="px-4 py-3 text-sm text-[var(--text-soft)]">{t("list.empty")}</p>
                                        ) : (
                                            formCategories.map((category) => {
                                                const isSelected = newCategoryId === category.categoryId;
                                                return (
                                                    <button
                                                        key={category.categoryId}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewCategoryId(category.categoryId);
                                                            setIsAddCategoryOpen(false);
                                                        }}
                                                        className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-all ${
                                                            isSelected
                                                                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                                                                : "text-[var(--text)] hover:bg-[var(--surface-soft)]"
                                                        }`}
                                                    >
                                                        <span>{category.name}</span>
                                                        {isSelected && <FiCheck size={18} className="text-[var(--text-soft)]" />}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </label>

                            <div className="flex items-end gap-2">
                                <label className="flex-1 text-sm font-bold text-[var(--text)]">
                                    {t("list.titleLabel")}
                                    <input
                                        type="text"
                                        required
                                        value={newTitle}
                                        onChange={(event) => setNewTitle(event.target.value)}
                                        placeholder={t("list.detailPlaceholder")}
                                        className="mt-2 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--primary)]"
                                    />
                                </label>
                                <button
                                    type="button"
                                    aria-label={t("list.iconLabel")}
                                    title={`${t("list.iconLabel")} (${newIcon})`}
                                    onClick={() => setIsIconPickerOpen((prev) => !prev)}
                                    className="mt-2 flex h-[38px] w-[46px] items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] transition-all hover:border-[var(--primary)]"
                                >
                                    <span className="text-[20px] leading-none">{icons[newIcon]}</span>
                                </button>
                            </div>

                            <label className="text-sm font-bold text-[var(--text)]">
                                {t("list.amountLabel")}
                                <div className="mt-2 flex items-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 focus-within:border-[var(--primary)]">
                                    <input
                                        type="number"
                                        min={0}
                                        required
                                        value={newAmount}
                                        onChange={(event) => setNewAmount(event.target.value)}
                                        className="w-full bg-transparent text-sm text-[var(--text)] outline-none"
                                    />
                                    <span className="ml-2 text-sm text-[var(--text-soft)]">฿</span>
                                </div>
                            </label>

                            <label className="text-sm font-bold text-[var(--text)]">
                                {t("list.dateTimeLabel")}
                                <div className="mt-2 flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 focus-within:border-[var(--primary)]">
                                    <FiCalendar className="text-[var(--text-soft)]" />
                                    <input
                                        type="datetime-local"
                                        required
                                        value={newDateTime}
                                        onChange={(event) => setNewDateTime(event.target.value)}
                                        className="w-full bg-transparent text-sm text-[var(--text)] outline-none"
                                    />
                                </div>
                            </label>

                            {addError && (
                                <p className="text-sm text-[var(--danger)]">{addError}</p>
                            )}
                            <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => {
                                        resetAddForm();
                                        setIsAddSheetOpen(false);
                                    }}
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

                        {isIconPickerOpen && (
                            <div className="fixed inset-0 z-[60] bg-black/20 px-4" onClick={() => setIsIconPickerOpen(false)}>
                                <div
                                    className="mx-auto mt-[24vh] w-full max-w-[400px] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-soft)]"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-sm font-bold text-[var(--text)]">{t("list.iconLabel")}</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsIconPickerOpen(false)}
                                            className="rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
                                        >
                                            <FiX size={16} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={iconQuery}
                                        onChange={(event) => setIconQuery(event.target.value)}
                                        placeholder={t("cycle.iconSearchPlaceholder")}
                                        className="w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text)] outline-none transition-all focus:border-[var(--primary)]"
                                    />
                                    <div className="mt-2 grid max-h-[220px] grid-cols-8 gap-1.5 overflow-y-auto pr-1">
                                        {filteredIcons.map(([key, emoji]) => {
                                            const isSelected = newIcon === key;
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    aria-label={key}
                                                    title={key}
                                                    onClick={() => {
                                                        setNewIcon(key);
                                                        setIsIconPickerOpen(false);
                                                    }}
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
                        )}
                    </div>
                </div>
            )}
        </MainLayout>
    );
}