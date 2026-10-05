import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainLayout from "../layouts/MainLayout";
import AnalyticCharts from "../components/AnalyticCharts";
import Dropdown from "../components/Dropdown";
import FilterChipButton from "../components/FilterChipButton";
import ListDayTypeCard from "../components/ListDayTypeCard";
import { icons } from "../assets/Iconlist";
import { auth } from "../lib/auth";
import {
    categoryApi,
    cropApi,
    cycleApi,
    transactionApi,
    type Category,
    type Crop,
    type Cycle,
    type Transaction,
} from "../lib/userService";
import { getFriendlyApiErrorMessage } from "../utils/friendlyApiError";
import { groupTransactionsByDate } from "../utils/groupTransactionsByDate";
import { displayYearFromGregorian } from "../utils/formatAppDate";
import { formatMonthRange } from "../utils/formatMonthYear";
import { parseTxDateTime } from "../utils/parseTxDateTime";
import {
    activeSeasonStartYear,
    transactionInSeasonWindow,
    yearSeasonsFromDates,
    type SeasonWindow,
} from "../utils/seasonWindows";
import "../styles/analytic.css";
import "../styles/list.css";
import "../styles/Cycle.css";

const ALL_SEASONS = "all";
const LIST_PAGE_SIZE = 10;

function isIconName(value: string | null | undefined): value is keyof typeof icons {
    return Boolean(value && Object.prototype.hasOwnProperty.call(icons, value));
}

function seasonStartYear(cycle: Cycle): number {
    const raw = cycle.startDate?.slice(0, 4);
    const year = Number(raw);
    return Number.isFinite(year) ? year : new Date().getFullYear();
}

function seasonTabLabel(cycle: Cycle, lang: string): string {
    return displayYearFromGregorian(seasonStartYear(cycle), lang);
}

function pickDefaultSeasonId(seasons: Cycle[], preferredId: string | null): string {
    if (preferredId === ALL_SEASONS) return ALL_SEASONS;
    if (preferredId && seasons.some((s) => s.cycleId === preferredId)) {
        return preferredId;
    }
    const active = seasons.find((s) => (s.status ?? "active") === "active");
    if (active) return active.cycleId;
    return seasons[0]?.cycleId ?? ALL_SEASONS;
}

export default function CycleDetail() {
    const { cropId = "" } = useParams();
    const [searchParams] = useSearchParams();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [crop, setCrop] = useState<Crop | null>(null);
    const [seasons, setSeasons] = useState<Cycle[]>([]);
    const [listSeasonId, setListSeasonId] = useState<string>(ALL_SEASONS);
    const [preferredSeasonId, setPreferredSeasonId] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [txLoading, setTxLoading] = useState(false);
    const [txLoaded, setTxLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [activeFilter, setActiveFilter] = useState<"all" | "expense" | "income">("all");
    const [listPage, setListPage] = useState(1);
    const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
    const seasonChoiceKey = useRef<string | null>(null);
    const fallbackCategory = t("list.quickAddCategory");

    const preferredSeasonFromUrl = searchParams.get("season");

    useEffect(() => {
        if (!auth.isAuthed()) {
            navigate("/app/settings", { replace: true });
            return;
        }
        if (!cropId) {
            setNotFound(true);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setTxLoaded(false);
        setLoadError(null);
        setNotFound(false);
        Promise.all([
            cropApi.get(cropId),
            cycleApi.listByCrop(cropId),
            categoryApi.list("expense"),
            categoryApi.list("income"),
        ])
            .then(([cropRow, seasonRows, expenseCats, incomeCats]) => {
                if (cancelled) return;
                if (!cropRow) {
                    setNotFound(true);
                    setCrop(null);
                    setSeasons([]);
                    return;
                }
                const ordered = [...(seasonRows ?? [])].sort(
                    (a, b) => seasonStartYear(b) - seasonStartYear(a),
                );
                setCrop(cropRow);
                setSeasons(ordered);
                if (cropRow.startMonth == null || cropRow.endMonth == null) {
                    const defaultSeason = pickDefaultSeasonId(ordered, preferredSeasonFromUrl);
                    setListSeasonId(defaultSeason);
                    setPreferredSeasonId(
                        defaultSeason === ALL_SEASONS ? null : defaultSeason,
                    );
                }
                setExpenseCategories(expenseCats ?? []);
                setIncomeCategories(incomeCats ?? []);
            })
            .catch((err) => {
                if (cancelled) return;
                setCrop(null);
                setSeasons([]);
                setExpenseCategories([]);
                setIncomeCategories([]);
                setLoadError(getFriendlyApiErrorMessage(err, t));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // preferredSeasonFromUrl อ่านครั้งแรกตอนโหลดพืชเท่านั้น
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cropId, navigate, t]);

    useEffect(() => {
        if (!cropId || loading || notFound) return;
        let cancelled = false;
        setTxLoading(true);
        const seasonIds = new Set(seasons.map((s) => s.cycleId));
        transactionApi
            .list()
            .then((rows) => {
                if (cancelled) return;
                setTransactions(
                    (rows ?? []).filter((tx) => tx.cycleId && seasonIds.has(tx.cycleId)),
                );
            })
            .catch((err) => {
                if (!cancelled) {
                    setTransactions([]);
                    setLoadError(getFriendlyApiErrorMessage(err, t));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setTxLoading(false);
                    setTxLoaded(true);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [cropId, loading, notFound, seasons, t]);

    const yearSeasons = useMemo(() => {
        if (crop?.startMonth == null || crop.endMonth == null) return null;
        return yearSeasonsFromDates(
            crop.startMonth,
            crop.endMonth,
            transactions.map((tx) => parseTxDateTime(tx.txDate)),
        );
    }, [crop, transactions]);

    useEffect(() => {
        if (!txLoaded || !yearSeasons?.length || !crop?.startMonth || !crop.endMonth) return;
        if (seasonChoiceKey.current === crop.cropId) return;
        seasonChoiceKey.current = crop.cropId;
        const ids = new Set(yearSeasons.map((season) => season.id));
        const preferred = preferredSeasonFromUrl;
        let next = ALL_SEASONS;
        if (preferred === ALL_SEASONS) {
            next = ALL_SEASONS;
        } else if (preferred && ids.has(preferred)) {
            next = preferred;
        } else {
            const active = String(activeSeasonStartYear(crop.startMonth, crop.endMonth));
            next = ids.has(active) ? active : (yearSeasons[0]?.id ?? ALL_SEASONS);
        }
        setListSeasonId(next);
        setPreferredSeasonId(next === ALL_SEASONS ? null : next);
    }, [txLoaded, yearSeasons, crop, preferredSeasonFromUrl]);

    const categoryById = useMemo(
        () =>
            Object.fromEntries(
                [...expenseCategories, ...incomeCategories].map((c) => [c.categoryId, c.name]),
            ),
        [expenseCategories, incomeCategories],
    );

    const selectedYearSeason = useMemo(
        () => yearSeasons?.find((season) => season.id === listSeasonId) ?? null,
        [yearSeasons, listSeasonId],
    );

    const listTransactions = useMemo(() => {
        if (listSeasonId === ALL_SEASONS) return transactions;
        if (selectedYearSeason) {
            return transactions.filter((tx) => transactionInSeasonWindow(tx, selectedYearSeason));
        }
        return transactions.filter((tx) => tx.cycleId === listSeasonId);
    }, [transactions, listSeasonId, selectedYearSeason]);

    const filteredTransactions = useMemo(() => {
        const rows = listTransactions.filter(
            (tx) => activeFilter === "all" || tx.txType === activeFilter,
        );
        return [...rows].sort(
            (a, b) => parseTxDateTime(b.txDate).getTime() - parseTxDateTime(a.txDate).getTime(),
        );
    }, [activeFilter, listTransactions]);

    const listTotalPages = Math.max(1, Math.ceil(filteredTransactions.length / LIST_PAGE_SIZE));

    useEffect(() => {
        setListPage(1);
    }, [activeFilter, listSeasonId]);

    useEffect(() => {
        setListPage((prev) => Math.min(prev, listTotalPages));
    }, [listTotalPages]);

    const pagedGroups = useMemo(() => {
        const start = (listPage - 1) * LIST_PAGE_SIZE;
        const pageRows = filteredTransactions.slice(start, start + LIST_PAGE_SIZE);
        return groupTransactionsByDate(pageRows, i18n.language);
    }, [filteredTransactions, listPage, i18n.language]);

    const toggleCardCollapsed = useCallback((key: string) => {
        setCollapsedCards((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const selectListSeason = (id: string) => {
        setListSeasonId(id);
        setCollapsedCards({});
    };

    const setListFilter = (filter: "all" | "expense" | "income") => {
        setActiveFilter(filter);
        setCollapsedCards({});
    };

    const monthLabel =
        crop?.startMonth != null && crop?.endMonth != null
            ? formatMonthRange(crop.startMonth, crop.endMonth, i18n.language)
            : "";
    const rawIcon = crop?.icon;
    const cropIcon = isIconName(rawIcon) ? rawIcon : "corn";

    const chartsLoading = loading || txLoading;

    const seasonChoices = useMemo(() => {
        const source: { id: string; label: string; startDate: string; endDate: string }[] =
            yearSeasons != null
                ? yearSeasons.map((season: SeasonWindow) => ({
                      id: season.id,
                      label: displayYearFromGregorian(season.startYear, i18n.language),
                      startDate: season.startDate,
                      endDate: season.endDate,
                  }))
                : seasons.map((season) => ({
                      id: season.cycleId,
                      label: seasonTabLabel(season, i18n.language),
                      startDate: season.startDate,
                      endDate: season.endDate,
                  }));
        return source;
    }, [yearSeasons, seasons, i18n.language]);

    const seasonFilterOptions = useMemo(
        () => [
            { value: ALL_SEASONS, label: t("cycle.seasonAllYears") },
            ...seasonChoices.map((season) => ({
                value: season.id,
                label: season.label,
            })),
        ],
        [seasonChoices, t],
    );

    const chartSeasons = useMemo(
        () =>
            seasonChoices.map((season) => ({
                cycleId: season.id,
                label: season.label,
                startDate: season.startDate,
                endDate: season.endDate,
            })),
        [seasonChoices],
    );

    return (
        <MainLayout>
            <div className="home-page">
                <div className="home-content-card">
                    <div className="cycle-detail-page">
                        {notFound && !loading ? (
                            <p className="cycle-detail-empty">{t("cycle.detailNotFound")}</p>
                        ) : (
                            <>
                                <header className="cycle-detail-header">
                                    <span className="cycle-detail-icon" aria-hidden>
                                        {icons[cropIcon]}
                                    </span>
                                    <div className="cycle-detail-heading">
                                        <h1 className="cycle-detail-title">
                                            {crop?.name ?? t("cycle.detailLoading")}
                                        </h1>
                                        {monthLabel ? (
                                            <p className="cycle-detail-dates">{monthLabel}</p>
                                        ) : null}
                                    </div>
                                </header>

                                <AnalyticCharts
                                    transactions={transactions}
                                    expenseCategories={expenseCategories}
                                    incomeCategories={incomeCategories}
                                    loading={chartsLoading}
                                    loadError={loadError}
                                    initialFilter="1M"
                                    startMonth={crop?.startMonth}
                                    endMonth={crop?.endMonth}
                                    preferredSeasonId={preferredSeasonId}
                                    allSeasonsLabel={t("cycle.seasonAllYears")}
                                    seasons={chartSeasons}
                                />

                                <section className="list-page cycle-detail-list">
                                    <h2 className="cycle-detail-list-title">
                                        {t("cycle.detailTransactions")}
                                    </h2>
                                    <div className="list-filter-card">
                                        <div className="list-filter-row">
                                            <div className="list-filter-chips">
                                                <FilterChipButton
                                                    label={t("list.all")}
                                                    active={activeFilter === "all"}
                                                    variant="all"
                                                    onClick={() => setListFilter("all")}
                                                />
                                                <FilterChipButton
                                                    label={t("list.expense")}
                                                    active={activeFilter === "expense"}
                                                    variant="expense"
                                                    onClick={() => setListFilter("expense")}
                                                />
                                                <FilterChipButton
                                                    label={t("list.income")}
                                                    active={activeFilter === "income"}
                                                    variant="income"
                                                    onClick={() => setListFilter("income")}
                                                />
                                            </div>
                                            {seasonChoices.length > 0 ? (
                                                <Dropdown
                                                    label={t("analytic.season")}
                                                    data={seasonFilterOptions}
                                                    value={listSeasonId}
                                                    onValueChange={selectListSeason}
                                                    minWidth={96}
                                                />
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="list-groups">
                                        {chartsLoading && (
                                            <div className="list-loading">{t("cycle.detailLoading")}</div>
                                        )}
                                        {!chartsLoading &&
                                            pagedGroups.map((group) => (
                                                <ListDayTypeCard
                                                    key={group.date}
                                                    date={group.date}
                                                    transactions={group.transactions}
                                                    collapsed={Boolean(collapsedCards[group.date])}
                                                    onToggle={() => toggleCardCollapsed(group.date)}
                                                    categoryById={categoryById}
                                                    fallbackCategory={fallbackCategory}
                                                    fallbackIcon={icons.bill}
                                                    selectedTxIds={[]}
                                                    onToggleSelect={() => undefined}
                                                    onEdit={(tx) =>
                                                        navigate(
                                                            `/app/list?editTxId=${encodeURIComponent(tx.txId)}`,
                                                        )
                                                    }
                                                />
                                            ))}
                                        {!chartsLoading && filteredTransactions.length === 0 && (
                                            <div className="list-empty">{t("list.empty")}</div>
                                        )}
                                    </div>

                                    {!chartsLoading && filteredTransactions.length > LIST_PAGE_SIZE ? (
                                        <nav
                                            className="cycle-detail-pagination"
                                            aria-label={t("cycle.detailPaginationPage", {
                                                page: listPage,
                                                total: listTotalPages,
                                            })}
                                        >
                                            <button
                                                type="button"
                                                className="cycle-detail-page-btn"
                                                disabled={listPage <= 1}
                                                onClick={() => setListPage((p) => Math.max(1, p - 1))}
                                            >
                                                {t("cycle.detailPaginationPrev")}
                                            </button>
                                            <span className="cycle-detail-pagination-label">
                                                {t("cycle.detailPaginationPage", {
                                                    page: listPage,
                                                    total: listTotalPages,
                                                })}
                                            </span>
                                            <button
                                                type="button"
                                                className="cycle-detail-page-btn"
                                                disabled={listPage >= listTotalPages}
                                                onClick={() =>
                                                    setListPage((p) => Math.min(listTotalPages, p + 1))
                                                }
                                            >
                                                {t("cycle.detailPaginationNext")}
                                            </button>
                                        </nav>
                                    ) : null}
                                </section>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
