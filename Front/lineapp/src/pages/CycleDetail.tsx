import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import MainLayout from "../layouts/MainLayout";
import AnalyticCharts from "../components/AnalyticCharts";
import FilterChipButton from "../components/FilterChipButton";
import ListDayTypeCard from "../components/ListDayTypeCard";
import { icons } from "../assets/Iconlist";
import { auth } from "../lib/auth";
import {
    categoryApi,
    cycleApi,
    transactionApi,
    type Category,
    type Cycle,
    type Transaction,
} from "../lib/userService";
import { getFriendlyApiErrorMessage } from "../utils/friendlyApiError";
import { groupTransactionsByDate } from "../utils/groupTransactionsByDate";
import { formatCycleDateRange } from "../utils/formatMonthYear";
import dayjs from "dayjs";
import "../styles/analytic.css";
import "../styles/list.css";
import "../styles/Cycle.css";

function isIconName(value: string | null | undefined): value is keyof typeof icons {
    return Boolean(value && Object.prototype.hasOwnProperty.call(icons, value));
}

export default function CycleDetail() {
    const { cycleId = "" } = useParams();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [cycle, setCycle] = useState<Cycle | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [activeFilter, setActiveFilter] = useState<"all" | "expense" | "income">("all");
    const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
    const fallbackCategory = t("list.quickAddCategory");

    useEffect(() => {
        if (!auth.isAuthed()) {
            navigate("/settings", { replace: true });
            return;
        }
        if (!cycleId) {
            setNotFound(true);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        setNotFound(false);
        Promise.all([
            cycleApi.list(),
            transactionApi.list(cycleId),
            categoryApi.list("expense"),
            categoryApi.list("income"),
        ])
            .then(([cycles, rows, expenseCats, incomeCats]) => {
                if (cancelled) return;
                const found = (cycles ?? []).find((item) => item.cycleId === cycleId) ?? null;
                if (!found) {
                    setNotFound(true);
                    setCycle(null);
                    setTransactions([]);
                    return;
                }
                setCycle(found);
                setTransactions(rows ?? []);
                setExpenseCategories(expenseCats ?? []);
                setIncomeCategories(incomeCats ?? []);
            })
            .catch((err) => {
                if (cancelled) return;
                setCycle(null);
                setTransactions([]);
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
    }, [cycleId, navigate, t]);

    const categoryById = useMemo(
        () =>
            Object.fromEntries(
                [...expenseCategories, ...incomeCategories].map((c) => [c.categoryId, c.name]),
            ),
        [expenseCategories, incomeCategories],
    );

    const groupedTransactions = useMemo(
        () => groupTransactionsByDate(transactions, i18n.language),
        [transactions, i18n.language],
    );

    const filteredGroups = useMemo(
        () =>
            groupedTransactions
                .map((group) => ({
                    ...group,
                    transactions: group.transactions.filter(
                        (tx) => activeFilter === "all" || tx.txType === activeFilter,
                    ),
                }))
                .filter((group) => group.transactions.length > 0),
        [activeFilter, groupedTransactions],
    );

    const toggleCardCollapsed = useCallback((key: string) => {
        setCollapsedCards((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const dateLabel = cycle
        ? formatCycleDateRange(
              cycle.startDate ? dayjs(cycle.startDate).toDate() : null,
              cycle.endDate ? dayjs(cycle.endDate).toDate() : null,
              i18n.language,
          )
        : "";
    const rawIcon = cycle?.icon;
    const cycleIcon = isIconName(rawIcon) ? rawIcon : "corn";

    return (
        <MainLayout>
            <div className="home-page">
                <div className="home-content-card">
                    <div className="cycle-detail-page">
                        <button
                            type="button"
                            className="cycle-detail-back"
                            onClick={() => navigate("/cycle")}
                        >
                            <FiChevronLeft size={18} aria-hidden />
                            {t("cycle.detailBack")}
                        </button>

                        {notFound && !loading ? (
                            <p className="cycle-detail-empty">{t("cycle.detailNotFound")}</p>
                        ) : (
                            <>
                                <header className="cycle-detail-header">
                                    <span className="cycle-detail-icon" aria-hidden>
                                        {icons[cycleIcon]}
                                    </span>
                                    <div className="cycle-detail-heading">
                                        <h1 className="cycle-detail-title">
                                            {cycle?.name ?? t("cycle.detailLoading")}
                                        </h1>
                                        {dateLabel ? (
                                            <p className="cycle-detail-dates">{dateLabel}</p>
                                        ) : null}
                                    </div>
                                </header>

                                <AnalyticCharts
                                    transactions={transactions}
                                    expenseCategories={expenseCategories}
                                    incomeCategories={incomeCategories}
                                    loading={loading}
                                    loadError={loadError}
                                    initialFilter="1M"
                                />

                                <section className="list-page cycle-detail-list">
                                    <h2 className="cycle-detail-list-title">{t("cycle.detailTransactions")}</h2>
                                    <div className="list-filter-card">
                                        <div className="list-filter-chips">
                                            <FilterChipButton
                                                label={t("list.all")}
                                                active={activeFilter === "all"}
                                                variant="all"
                                                onClick={() => setActiveFilter("all")}
                                            />
                                            <FilterChipButton
                                                label={t("list.expense")}
                                                active={activeFilter === "expense"}
                                                variant="expense"
                                                onClick={() => setActiveFilter("expense")}
                                            />
                                            <FilterChipButton
                                                label={t("list.income")}
                                                active={activeFilter === "income"}
                                                variant="income"
                                                onClick={() => setActiveFilter("income")}
                                            />
                                        </div>
                                    </div>

                                    <div className="list-groups">
                                        {loading && (
                                            <div className="list-loading">{t("cycle.detailLoading")}</div>
                                        )}
                                        {!loading &&
                                            filteredGroups.map((group) => (
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
                                                        navigate(`/list?editTxId=${encodeURIComponent(tx.txId)}`)
                                                    }
                                                />
                                            ))}
                                        {!loading && filteredGroups.length === 0 && (
                                            <div className="list-empty">{t("list.empty")}</div>
                                        )}
                                    </div>
                                </section>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
