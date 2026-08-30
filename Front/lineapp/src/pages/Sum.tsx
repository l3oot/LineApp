import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { FiChevronRight } from "react-icons/fi";
import { LuPlus } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import MainLayout from "../layouts/MainLayout";
import AppLoadingScreen from "../components/AppLoadingScreen";
import DateFilterBar from "../components/DateFilterBar";
import FinanceOverview from "../components/FinanceOverview";
import GreetingHeader from "../components/GreetingHeader";
import WeatherHero from "../components/WeatherHero";
import QuickMenu from "../components/QuickMenu";
import RecentTransactionRow from "../components/RecentTransactionRow";
import AnnouncementBottomSheet from "../components/AnnouncementBottomSheet";
import { icons } from "../assets/Iconlist";
import "../styles/sum.css";
import { auth } from "../lib/auth";
import { useWeatherForecast } from "../lib/useWeatherForecast";
import {
  categoryApi,
  cycleApi,
  transactionApi,
  type Category,
  type Cycle,
  type Transaction,
} from "../lib/userService";
import { getFriendlyApiErrorMessage } from "../utils/friendlyApiError";
import { intlLocaleForAppLanguage } from "../utils/formatAppDate";
import { parseTxDateTime } from "../utils/parseTxDateTime";
import {
  filterTransactionsInRange,
  sumTransactionTotals,
} from "../utils/transactionDateRange";
import { resolveTxIconEmoji } from "../utils/resolveTxIcon";
import { aggregateTransactionsByCycle } from "../utils/cycleStats";
import { formatCycleDateRange } from "../utils/formatMonthYear";

type IconName = keyof typeof icons;

function isIconName(value: string | null | undefined): value is IconName {
  return Boolean(value && Object.prototype.hasOwnProperty.call(icons, value));
}

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

function cycleRemaining(cycle: Cycle, income: number, expense: number): number {
  const capital = cycle.budgetAmount ?? 0;
  return capital - (expense - income);
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
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const weather = useWeatherForecast();

  useEffect(() => {
    if (!auth.isAuthed()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      transactionApi.list(),
      categoryApi.list(),
      cycleApi.list().catch(() => [] as Cycle[]),
    ])
      .then(([txRows, categoryRows, cycleRows]) => {
        if (cancelled) return;
        setTransactions(txRows ?? []);
        setCategories(categoryRows ?? []);
        setCycles(cycleRows ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setTransactions([]);
        setCategories([]);
        setCycles([]);
        setError(getFriendlyApiErrorMessage(err, t));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.categoryId, category.name])),
    [categories],
  );

  const txsInRange = useMemo(
    () => filterTransactionsInRange(transactions, startDate, endDate),
    [transactions, startDate, endDate],
  );

  const overviewTotals = useMemo(() => sumTransactionTotals(txsInRange), [txsInRange]);

  const statsByCycleId = useMemo(
    () => aggregateTransactionsByCycle(transactions),
    [transactions],
  );

  const homeCycles = useMemo(() => cycles.slice(0, 3), [cycles]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => parseTxDateTime(b.txDate).getTime() - parseTxDateTime(a.txDate).getTime())
      .slice(0, 5);
  }, [transactions]);

  const relativeLabels = useMemo(
    () => ({ today: t("sum.relativeToday"), yesterday: t("sum.relativeYesterday") }),
    [t],
  );

  const homeLoading = loading || weather.status === "loading";
  if (homeLoading) {
    return <AppLoadingScreen label={t("sum.loading")} />;
  }

  return (
    <MainLayout>
      <div className="home-page home-page--index">
        <GreetingHeader onNotificationClick={() => setIsAnnouncementOpen(true)} />

        <WeatherHero
          province={weather.province}
          amphoe={weather.amphoe}
          weather={weather.forecast?.current}
          status={weather.status}
        />

        <section className="finance-overview-card">
          <DateFilterBar
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            dateFromLabel={t("sum.dateFrom")}
            dateToLabel={t("sum.dateTo")}
            dateFromAria={t("sum.dateFromAria")}
            dateToAria={t("sum.dateToAria")}
          />

          <FinanceOverview
            income={overviewTotals.income}
            expense={overviewTotals.expense}
            balance={overviewTotals.balance}
          />
        </section>

        {error && (
          <p className="home-error-banner">
            {error}
          </p>
        )}

        <QuickMenu />

        <section className="home-section">
          <div className="home-section-header">
            <h2 className="home-section-title">{t("sum.myCycles")}</h2>
            <Link to="/cycle" className="home-add-btn">
              <LuPlus size={14} aria-hidden />
              {t("sum.addCycle")}
            </Link>
          </div>

          {homeCycles.length === 0 ? (
            <p className="home-empty-text">{t("sum.noCycles")}</p>
          ) : (
            <div className="home-cycle-list">
              {homeCycles.map((cycle) => {
                const stats = statsByCycleId[cycle.cycleId] ?? { income: 0, expense: 0 };
                const remaining = cycleRemaining(cycle, stats.income, stats.expense);
                const iconName = isIconName(cycle.icon) ? cycle.icon : "corn";
                return (
                  <Link key={cycle.cycleId} to="/cycle" className="home-cycle-row">
                    <span className="home-cycle-icon" aria-hidden>
                      {icons[iconName]}
                    </span>
                    <div className="home-cycle-body">
                      <p className="home-cycle-name">{cycle.name}</p>
                      <p className="home-cycle-meta">
                        {formatCycleDateRange(cycle.startDate, cycle.endDate, i18n.language)}
                      </p>
                    </div>
                    <div className="home-cycle-value">
                      <p className="home-cycle-remaining-label">{t("sum.remaining")}</p>
                      <p className="home-cycle-remaining">{remaining.toLocaleString()}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="home-section">
          <div className="home-section-header">
            <h2 className="home-section-title">{t("sum.recentTransactions")}</h2>
            <Link to="/list" className="home-see-all">
              {t("sum.seeAll")}
              <FiChevronRight size={16} aria-hidden />
            </Link>
          </div>

          <div className="recent-tx-card">
            {recentTransactions.length === 0 ? (
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
                    icon={resolveTxIconEmoji(tx.icon, icons.bill)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <AnnouncementBottomSheet
        open={isAnnouncementOpen}
        onClose={() => setIsAnnouncementOpen(false)}
      />
    </MainLayout>
  );
}
