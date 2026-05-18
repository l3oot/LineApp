import { useState } from "react";
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
import Sumcard from "../components/Sumcard";
import Cyclecard from "../components/Cyclecard";
import { icons } from "../assets/Iconlist";
import { FiCalendar } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { sumCycleCards, sumOverviewCards } from "../data/sumMockData";

export default function Sum() {
  const { t } = useTranslation();
  const localTimeZone = getLocalTimeZone();
  const initialEnd = today(localTimeZone);
  const initialStart = initialEnd.add({ days: -29 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: CalendarDate; end: CalendarDate }>({
    start: initialStart,
    end: initialEnd,
  });
  const visibleCycleCards = isExpanded ? sumCycleCards : sumCycleCards.slice(0, 2);

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
          <Group className="relative w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)] transition-all focus-within:border-[var(--primary)] hover:bg-[var(--surface-soft)]">
            <Button
              aria-label={t("sum.dateRangeAria")}
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
        <div>
          <p className="text-[var(--text-soft)] text-sm font-semibold">{t("sum.financeOverview")}</p>
          <div className="grid grid-cols-3 gap-4 mt-2">
            {sumOverviewCards.map((card) => (
              <Sumcard
                key={card.titleKey}
                icon={icons[card.icon]}
                title={t(card.titleKey)}
                balance={card.balance}
                color={card.color}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-[var(--text-soft)] text-sm font-semibold mb-2">{t("sum.farmingCycle")}</p>
          <div className="flex flex-col gap-4">
            {visibleCycleCards.map((card) => (
              <Cyclecard
                key={card.title}
                icon={card.icon}
                title={card.title}
                balance={card.balance}
                length={card.length}
                balanceused={card.balanceused}
              />
            ))}
            {sumCycleCards.length > 1 && (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="self-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-sm font-semibold text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
              >
                {isExpanded ? t("sum.hide") : t("sum.viewMore")}
              </button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}