import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { FiChevronRight } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import MainLayout from "../layouts/MainLayout";
import DateFilterBar from "../components/DateFilterBar";
import FinanceOverview from "../components/FinanceOverview";
import QuickMenu from "../components/QuickMenu";
import RecentTransactionRow from "../components/RecentTransactionRow";
import "../styles/sum.css";
import { ApiError } from "../lib/api";
import { auth } from "../lib/auth";
import {
  categoryApi,
  transactionApi,
  type Category,
  type Transaction,
} from "../lib/userService";
import { intlLocaleForAppLanguage } from "../utils/formatAppDate";
import { parseTxDateTime } from "../utils/parseTxDateTime";
import {
  filterTransactionsInRange,
  sumTransactionTotals,
} from "../utils/transactionDateRange";

function formatRelativeTxDate(
  txDate: string,
  locale: string,
  labels: { today: string; yesterday: string },
): string {
  const date = parseTxDateTime(txDate);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const txStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart.getTime() - txStart.getTime()) / 86_400_000);

  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.yesterday;

  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });
}

export default function Sum() {
  const { t, i18n } = useTranslation();
  const dateLocale = intlLocaleForAppLanguage(i18n.language);
  const localTimeZone = getLocalTimeZone();
  const initialEnd = today(localTimeZone);
  const initialStart = initialEnd.add({ days: -29 });
  const [startDate, setStartDate] = useState<CalendarDate>(initialStart);
  const [endDate, setEndDate] = useState<CalendarDate>(initialEnd);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isAuthed()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([transactionApi.list(), categoryApi.list()])
      .then(([txRows, categoryRows]) => {
        if (cancelled) return;
        setTransactions(txRows ?? []);
        setCategories(categoryRows ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setTransactions([]);
        setCategories([]);
        setError(err instanceof ApiError ? err.message : (err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.categoryId, category.name])),
    [categories],
  );

  const txsInRange = useMemo(
    () => filterTransactionsInRange(transactions, startDate, endDate),
    [transactions, startDate, endDate],
  );

  const overviewTotals = useMemo(() => sumTransactionTotals(txsInRange), [txsInRange]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => parseTxDateTime(b.txDate).getTime() - parseTxDateTime(a.txDate).getTime())
      .slice(0, 5);
  }, [transactions]);

  const relativeLabels = useMemo(
    () => ({ today: t("sum.relativeToday"), yesterday: t("sum.relativeYesterday") }),
    [t],
  );

  return (
    <MainLayout>
      <div className="home-page">
        <div className="home-content-card">
          <DateFilterBar
            className="mb-4"
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            dateFromLabel={t("sum.dateFrom")}
            dateToLabel={t("sum.dateTo")}
            dateFromAria={t("sum.dateFromAria")}
            dateToAria={t("sum.dateToAria")}
          />

          {error && (
            <p className="mb-4 rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <FinanceOverview
            income={overviewTotals.income}
            expense={overviewTotals.expense}
            balance={overviewTotals.balance}
          />

          <QuickMenu />

          <section className="home-section">
            <div className="home-section-header">
              <h2 className="home-section-title">
                <span className="home-section-decor home-section-decor--heart" aria-hidden />
                {t("sum.recentTransactions")}
              </h2>
              <Link to="/list" className="home-see-all">
                {t("sum.seeAll")}
                <FiChevronRight size={16} aria-hidden />
              </Link>
            </div>

            <div className="recent-tx-card">
            {loading ? (
              <p className="home-empty-text">{t("sum.loading")}</p>
            ) : recentTransactions.length === 0 ? (
              <p className="home-empty-text">{t("sum.noRecentTransactions")}</p>
            ) : (
              <div className="recent-tx-list">
                {recentTransactions.map((tx) => (
                  <RecentTransactionRow
                    key={tx.txId}
                    title={tx.note?.trim() || "—"}
                    category={
                      tx.categoryId
                        ? (categoryById[tx.categoryId] ?? t("sum.uncategorized"))
                        : t("sum.uncategorized")
                    }
                    amount={Number(tx.amount)}
                    type={tx.txType}
                    timeLabel={formatRelativeTxDate(tx.txDate, dateLocale, relativeLabels)}
                  />
                ))}
              </div>
            )}
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
