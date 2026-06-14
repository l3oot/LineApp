import { useEffect, useMemo, useState } from "react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
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
import Sumcard from "../components/Sumcard";
import Cyclecard from "../components/Cyclecard";
import { icons } from "../assets/Iconlist";
import { FiCalendar } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { ApiError } from "../lib/api";
import { auth } from "../lib/auth";
import { cycleApi, transactionApi, type Cycle, type Transaction } from "../lib/userService";
import { aggregateTransactionsByCycle } from "../utils/cycleStats";
import { formatCalendarDate } from "../utils/formatAppDate";
import { formatCycleDateRange } from "../utils/formatMonthYear";
import {
  filterTransactionsInRange,
  sumTransactionTotals,
} from "../utils/transactionDateRange";

type IconName = keyof typeof icons;

function isIconName(value: string | null | undefined): value is IconName {
  return Boolean(value && Object.prototype.hasOwnProperty.call(icons, value));
}

function cycleLengthLabel(c: Cycle, lang: string): string {
  return formatCycleDateRange(c.startDate, c.endDate, lang);
}

const overviewCardConfig = [
  { icon: "money" as IconName, titleKey: "sum.totalIncome", color: "#2f8f4e", field: "income" as const },
  { icon: "bill" as IconName, titleKey: "sum.totalExpense", color: "#b23a3a", field: "expense" as const },
  { icon: "bank" as IconName, titleKey: "sum.totalBalance", color: "#2d6fbe", field: "balance" as const },
];

export default function Sum() {
  const { t, i18n } = useTranslation();
  const localTimeZone = getLocalTimeZone();
  const initialEnd = today(localTimeZone);
  const initialStart = initialEnd.add({ days: -29 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: CalendarDate; end: CalendarDate }>({
    start: initialStart,
    end: initialEnd,
  });
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
    Promise.all([cycleApi.list(), transactionApi.list()])
      .then(([cycleRows, txRows]) => {
        if (cancelled) return;
        setCycles(cycleRows ?? []);
        setTransactions(txRows ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setCycles([]);
        setTransactions([]);
        setError(err instanceof ApiError ? err.message : (err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const txsInRange = useMemo(
    () => filterTransactionsInRange(transactions, dateRange.start, dateRange.end),
    [transactions, dateRange],
  );

  const overviewTotals = useMemo(() => sumTransactionTotals(txsInRange), [txsInRange]);

  const cycleCards = useMemo(() => {
    const statsByCycle = aggregateTransactionsByCycle(txsInRange);
    return cycles.map((cycle) => {
      const stats = statsByCycle[cycle.cycleId] ?? { income: 0, expense: 0 };
      return {
        cycleId: cycle.cycleId,
        icon: isIconName(cycle.icon) ? cycle.icon : ("corn" as IconName),
        title: cycle.name,
        balance: stats.income,
        balanceused: stats.expense,
        budget: cycle.budgetAmount,
        length: cycleLengthLabel(cycle, i18n.language),
      };
    });
  }, [cycles, txsInRange, i18n.language]);

  const visibleCycleCards = isExpanded ? cycleCards : cycleCards.slice(0, 2);

  return (
    <MainLayout>
      <div className="flex flex-col gap-5 px-5 pb-3">
        <DateRangePicker
          aria-label={t("sum.dateRangeAria")}
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
          <Group className="relative w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)] transition-all focus-within:border-[var(--primary)] hover:bg-[var(--surface-soft)]">
            <Button
              aria-label={t("sum.dateRangeAria")}
              className="absolute inset-0 z-10 rounded-full"
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

        {error && (
          <p className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div>
          <p className="text-[var(--text-soft)] text-sm font-semibold">{t("sum.financeOverview")}</p>
          <div className="grid grid-cols-3 gap-4 mt-2">
            {overviewCardConfig.map((card) => (
              <Sumcard
                key={card.titleKey}
                icon={icons[card.icon]}
                title={t(card.titleKey)}
                balance={overviewTotals[card.field]}
                color={card.color}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[var(--text-soft)] text-sm font-semibold mb-2">{t("sum.farmingCycle")}</p>
          {loading ? (
            <p className="text-center text-sm text-[var(--text-soft)]">กำลังโหลด...</p>
          ) : (
            <div className="flex flex-col gap-4">
              {visibleCycleCards.map((card) => (
                <Cyclecard
                  key={card.cycleId}
                  icon={card.icon}
                  title={card.title}
                  balance={card.balance}
                  length={card.length}
                  balanceused={card.balanceused}
                  budget={card.budget}
                />
              ))}
              {!loading && cycleCards.length === 0 && (
                <p className="text-center text-sm text-[var(--text-soft)]">ยังไม่มีรอบปลูก</p>
              )}
              {cycleCards.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="self-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-sm font-semibold text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
                >
                  {isExpanded ? t("sum.hide") : t("sum.viewMore")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
