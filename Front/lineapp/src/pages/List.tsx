import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDate, Time, getLocalTimeZone, today } from "@internationalized/date";
import {
    Button,
    CalendarCell,
    CalendarGrid,
    CalendarGridBody,
    CalendarGridHeader,
    CalendarHeaderCell,
    DateRangePicker,
    Dialog,
    Group,
    Heading,
    Popover,
    RangeCalendar,
} from "react-aria-components";
import MainLayout from "../layouts/MainLayout";
import AppDateTimeField, { initialAppDateTime } from "../components/AppDateTimeField";
import TransactionCard, { type TransactionProps } from "../components/TransactionCard";
import FilterChipButton from "../components/FilterChipButton";
import BottomSheet from "../components/BottomSheet";
import { icons } from "../assets/Iconlist";
import { FiCalendar, FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import { FaPlus } from "react-icons/fa";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useTranslation } from "react-i18next";
import type { GroupedTransaction } from "../data/listMockData";
import { ApiError } from "../lib/api";
import {
    categoryApi,
    cycleApi,
    transactionApi,
    type Category,
    type Cycle,
    type Transaction,
    type TransactionListPageQuery,
} from "../lib/userService";
import { auth } from "../lib/auth";
import { formatTxTime, parseTxDateTime } from "../utils/parseTxDateTime";
import {
    calendarDateTimeFromTx,
    calendarDateTimeToApi,
    calendarDateToApiEnd,
    calendarDateToApiStart,
    formatAppDate,
    formatCalendarDate,
    gregorianKeyFromCalendarDate,
    intlLocaleForAppLanguage,
    parseTxToGregorianCalendarDate,
    toAppCalendarDate,
    toGregorianCalendarDate,
} from "../utils/formatAppDate";

function isIconName(value: string | null | undefined): value is keyof typeof icons {
    return Boolean(value && Object.prototype.hasOwnProperty.call(icons, value));
}

function toDisplayTransaction(
    tx: Transaction,
    categoryById: Record<string, string>,
    fallbackCategory: string,
    dateLocale: string,
): TransactionProps {
    return {
        title: tx.note?.trim() || "—",
        type: tx.txType,
        category: tx.categoryId ? (categoryById[tx.categoryId] ?? fallbackCategory) : fallbackCategory,
        amount: Number(tx.amount),
        time: formatTxTime(tx.txDate, dateLocale),
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

function groupTransactionsByDate(rows: Transaction[], lang: string): GroupedTransaction[] {
    const sorted = [...rows].sort(
        (a, b) => parseTxDateTime(b.txDate).getTime() - parseTxDateTime(a.txDate).getTime(),
    );
    const groups: GroupedTransaction[] = [];
    let currentDateKey = "";
    let currentDateLabel = "";
    let currentItems: Transaction[] = [];

    for (const tx of sorted) {
        const dateKey = gregorianKeyFromCalendarDate(parseTxToGregorianCalendarDate(tx.txDate));
        const dateLabel = formatAppDate(tx.txDate, lang);
        if (dateKey !== currentDateKey) {
            if (currentItems.length > 0) {
                groups.push({ date: currentDateLabel, transactions: currentItems });
            }
            currentDateKey = dateKey;
            currentDateLabel = dateLabel;
            currentItems = [tx];
        } else {
            currentItems.push(tx);
        }
    }
    if (currentItems.length > 0) {
        groups.push({ date: currentDateLabel, transactions: currentItems });
    }
    return groups;
}

export default function List() {
    const { t, i18n } = useTranslation();
    const dateLocale = intlLocaleForAppLanguage(i18n.language);
    const [searchParams, setSearchParams] = useSearchParams();
    const pendingEditTxId = searchParams.get("editTxId");
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
    const [listLoadingMore, setListLoadingMore] = useState(false);
    const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
    const [nextPage, setNextPage] = useState(0);
    const [listError, setListError] = useState<string | null>(null);
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [newType, setNewType] = useState<"income" | "expense">("expense");
    const [formCategories, setFormCategories] = useState<Category[]>([]);
    const [newCategoryId, setNewCategoryId] = useState("");
    const [newCycleId, setNewCycleId] = useState<string>("");
    const [newAmount, setNewAmount] = useState("0");
    const [formDate, setFormDate] = useState<CalendarDate>(() => initialAppDateTime(i18n.language).date);
    const [formTime, setFormTime] = useState<Time>(() => initialAppDateTime(i18n.language).time);
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [isAddCycleOpen, setIsAddCycleOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const selectAllRef = useRef<HTMLInputElement>(null);
    const fallbackCategory = t("list.quickAddCategory");

    const listPageQuery = useMemo<TransactionListPageQuery>(
        () => ({
            startDate: calendarDateToApiStart(dateRange.start),
            endDate: calendarDateToApiEnd(dateRange.end),
        }),
        [dateRange],
    );

    const loadTransactions = useCallback(async () => {
        if (!auth.isAuthed()) {
            setTransactions([]);
            setCategoryById({});
            setHasMoreTransactions(false);
            setNextPage(0);
            setListLoading(false);
            return;
        }
        setListLoading(true);
        setListError(null);
        try {
            const [txPage, categories] = await Promise.all([
                transactionApi.listPage(0, listPageQuery),
                categoryApi.list(),
            ]);
            setCategoryById(
                Object.fromEntries((categories ?? []).map((c) => [c.categoryId, c.name])),
            );
            setTransactions(txPage.items);
            setHasMoreTransactions(txPage.hasNext);
            setNextPage(txPage.page + 1);
        } catch (err) {
            setTransactions([]);
            setHasMoreTransactions(false);
            setNextPage(0);
            setListError(err instanceof ApiError ? err.message : (err as Error).message);
        } finally {
            setListLoading(false);
        }
    }, [listPageQuery]);

    const loadMoreTransactions = useCallback(async () => {
        if (!auth.isAuthed() || listLoading || listLoadingMore || !hasMoreTransactions) {
            return;
        }
        setListLoadingMore(true);
        setListError(null);
        try {
            const txPage = await transactionApi.listPage(nextPage, listPageQuery);
            setTransactions((prev) => {
                const seen = new Set(prev.map((tx) => tx.txId));
                const merged = [...prev];
                for (const tx of txPage.items) {
                    if (!seen.has(tx.txId)) {
                        merged.push(tx);
                    }
                }
                return merged;
            });
            setHasMoreTransactions(txPage.hasNext);
            setNextPage(txPage.page + 1);
        } catch (err) {
            setListError(err instanceof ApiError ? err.message : (err as Error).message);
        } finally {
            setListLoadingMore(false);
        }
    }, [hasMoreTransactions, listLoading, listLoadingMore, listPageQuery, nextPage]);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    const groupedTransactions = useMemo(
        () => groupTransactionsByDate(transactions, i18n.language),
        [transactions, i18n.language],
    );

    const categoryOptions = useMemo(() => {
        const fromList = transactions.map((tx) =>
            categoryNameForTx(tx, categoryById, fallbackCategory),
        );
        return Array.from(new Set([...Object.values(categoryById), ...fromList]));
    }, [transactions, categoryById, fallbackCategory]);
    const selectedFormCategory = formCategories.find((c) => c.categoryId === newCategoryId) ?? null;

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

    const visibleTransactions = useMemo(
        () => filteredGroups.flatMap((group) => group.transactions),
        [filteredGroups],
    );

    const visibleTxIdSet = useMemo(
        () => new Set(visibleTransactions.map((tx) => tx.txId)),
        [visibleTransactions],
    );

    const allVisibleSelected =
        visibleTransactions.length > 0 &&
        visibleTransactions.every((tx) => selectedTxIds.includes(tx.txId));

    const someVisibleSelected =
        visibleTransactions.some((tx) => selectedTxIds.includes(tx.txId)) && !allVisibleSelected;

    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = someVisibleSelected;
        }
    }, [someVisibleSelected, allVisibleSelected, visibleTransactions.length]);

    useEffect(() => {
        setSelectedTxIds((prev) => prev.filter((id) => visibleTxIdSet.has(id)));
    }, [visibleTxIdSet]);

    const exitBulkSelectMode = useCallback(() => {
        setIsBulkSelectMode(false);
        setSelectedTxIds([]);
    }, []);

    const toggleSelectAllVisible = useCallback(() => {
        if (allVisibleSelected) {
            setSelectedTxIds([]);
            return;
        }
        setSelectedTxIds(visibleTransactions.map((tx) => tx.txId));
    }, [allVisibleSelected, visibleTransactions]);

    const toggleTxSelection = useCallback((txId: string, selected: boolean) => {
        setSelectedTxIds((prev) => {
            if (selected) {
                return prev.includes(txId) ? prev : [...prev, txId];
            }
            return prev.filter((id) => id !== txId);
        });
    }, []);

    const handleDeleteSelected = async () => {
        if (selectedTxIds.length === 0) return;
        if (!window.confirm(t("list.deleteSelectedConfirm", { count: selectedTxIds.length }))) {
            return;
        }

        setBulkDeleting(true);
        setListError(null);
        try {
            await transactionApi.deleteMany(selectedTxIds);
            exitBulkSelectMode();
            await loadTransactions();
        } catch (err) {
            setListError(err instanceof ApiError ? err.message : (err as Error).message);
        } finally {
            setBulkDeleting(false);
        }
    };

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
        const initial = initialAppDateTime(i18n.language);
        setFormDate(initial.date);
        setFormTime(initial.time);
        setIsAddCategoryOpen(false);
        setIsAddCycleOpen(false);
    };

    const openEditSheet = useCallback((tx: Transaction) => {
        setEditingTxId(tx.txId);
        setNewTitle(tx.note?.trim() ?? "");
        setNewType(tx.txType);
        setNewCategoryId(tx.categoryId ?? "");
        setNewCycleId(tx.cycleId ?? "");
        setNewAmount(String(tx.amount));
        const { date, time } = calendarDateTimeFromTx(tx.txDate, i18n.language);
        setFormDate(date);
        setFormTime(time);
        setAddError(null);
        setIsAddSheetOpen(true);
    }, [i18n.language]);

    useEffect(() => {
        setFormDate((current) => toAppCalendarDate(toGregorianCalendarDate(current), i18n.language));
        setDateRange((current) => ({
            start: toAppCalendarDate(toGregorianCalendarDate(current.start), i18n.language),
            end: toAppCalendarDate(toGregorianCalendarDate(current.end), i18n.language),
        }));
    }, [i18n.language]);

    useEffect(() => {
        if (!pendingEditTxId || listLoading || !auth.isAuthed()) return;

        const fromList = transactions.find((tx) => tx.txId === pendingEditTxId);
        if (fromList) {
            openEditSheet(fromList);
            setSearchParams({}, { replace: true });
            return;
        }

        let cancelled = false;
        transactionApi
            .get(pendingEditTxId)
            .then((tx) => {
                if (cancelled) return;
                openEditSheet(tx);
                setSearchParams({}, { replace: true });
            })
            .catch((err) => {
                if (cancelled) return;
                setListError(err instanceof ApiError ? err.message : (err as Error).message);
                setSearchParams({}, { replace: true });
            });

        return () => {
            cancelled = true;
        };
    }, [pendingEditTxId, listLoading, transactions, openEditSheet, setSearchParams]);

    const openAddSheet = () => {
        setEditingTxId(null);
        setAddError(null);
        setIsAddSheetOpen(true);
    };

    const handleCloseAddSheet = () => {
        setIsAddSheetOpen(false);
        setIsAddCategoryOpen(false);
        setIsAddCycleOpen(false);
        if (editingTxId) {
            resetAddForm();
        }
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
                txDate: calendarDateTimeToApi(formDate, formTime),
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
                            <span className="whitespace-nowrap text-base font-semibold text-[var(--text)]">
                                {formatCalendarDate(dateRange.start, i18n.language)}
                            </span>
                            <span className="text-base font-semibold text-[var(--text)]">-</span>
                            <span className="whitespace-nowrap text-base font-semibold text-[var(--text)]">
                                {formatCalendarDate(dateRange.end, i18n.language)}
                            </span>
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
                                <CalendarGrid className="w-full table-fixed border-separate border-spacing-1">
                                    <CalendarGridHeader>
                                        {(day) => (
                                            <CalendarHeaderCell className="pb-1 text-center text-xs font-semibold text-[var(--text-soft)]">
                                                {day}
                                            </CalendarHeaderCell>
                                        )}
                                    </CalendarGridHeader>
                                    <CalendarGridBody>
                                        {(date) => (
                                            <CalendarCell
                                                date={date}
                                                className="flex h-8 w-full items-center justify-center rounded-full text-sm text-[var(--text)] outline-none hover:bg-[var(--surface-soft)] data-[disabled]:text-gray-300 data-[outside-month]:text-gray-300 data-[selected]:bg-[var(--primary-soft)] data-[selected]:text-[var(--primary)] data-[selected]:font-semibold"
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

                {!listLoading && visibleTransactions.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {!isBulkSelectMode ? (
                            <button
                                type="button"
                                onClick={() => setIsBulkSelectMode(true)}
                                className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-soft)] transition-all hover:bg-[var(--surface-soft)]"
                            >
                                {t("list.bulkSelectMode")}
                            </button>
                        ) : (
                            <>
                                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--text)]">
                                    <input
                                        ref={selectAllRef}
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAllVisible}
                                        className="h-4 w-4 rounded border-[var(--border)] accent-[var(--danger)]"
                                    />
                                    {t("list.selectAllLoaded", { count: visibleTransactions.length })}
                                </label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={bulkDeleting}
                                        onClick={exitBulkSelectMode}
                                        className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)] disabled:opacity-50"
                                    >
                                        {t("list.bulkDeleteCancel")}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={bulkDeleting || selectedTxIds.length === 0}
                                        onClick={handleDeleteSelected}
                                        className="rounded-[var(--radius-control)] border border-[var(--danger)] bg-red-50 px-3 py-1.5 text-sm font-semibold text-[var(--danger)] transition-all hover:bg-red-100 disabled:opacity-50"
                                    >
                                        {bulkDeleting
                                            ? t("list.deletingSelected")
                                            : `${t("list.deleteSelected")} (${selectedTxIds.length})`}
                                    </button>
                                </div>
                            </>
                        )}
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
                                            dateLocale,
                                        );
                                        return (
                                            <TransactionCard
                                                key={tx.txId}
                                                {...display}
                                                selectable={isBulkSelectMode}
                                                selected={selectedTxIds.includes(tx.txId)}
                                                onSelectedChange={(selected) =>
                                                    toggleTxSelection(tx.txId, selected)
                                                }
                                                onOpen={
                                                    isBulkSelectMode
                                                        ? undefined
                                                        : () => openEditSheet(tx)
                                                }
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
                    {!listLoading && hasMoreTransactions && (
                        <button
                            type="button"
                            disabled={listLoadingMore}
                            onClick={loadMoreTransactions}
                            className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition-all hover:bg-[var(--surface-soft)] disabled:opacity-50"
                        >
                            {listLoadingMore ? t("list.loadingMore") : t("list.loadMore")}
                        </button>
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
            <BottomSheet
                open={isAddSheetOpen}
                onClose={handleCloseAddSheet}
                dragDisabled={submitting}
                backdropClassName="z-40"
                panelClassName="mx-auto flex h-[74vh] w-full max-w-[420px] flex-col rounded-t-[22px] border border-[var(--border)] p-4 shadow-[var(--shadow-soft)]"
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
                                onClick={handleCloseAddSheet}
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

                            <label className="text-sm font-bold text-[var(--text)]">
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
                                <AppDateTimeField
                                    className="mt-2"
                                    ariaLabel={t("list.dateTimeLabel")}
                                    date={formDate}
                                    time={formTime}
                                    onDateChange={setFormDate}
                                    onTimeChange={setFormTime}
                                />
                            </label>

                            {addError && (
                                <p className="text-sm text-[var(--danger)]">{addError}</p>
                            )}
                            <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={handleCloseAddSheet}
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
            </BottomSheet>
        </MainLayout>
    );
}