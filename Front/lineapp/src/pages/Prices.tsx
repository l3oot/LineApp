import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { LuSearch } from "react-icons/lu";
import {
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import MainLayout from "../layouts/MainLayout";
import { agriPriceApi, type AgriPriceRow } from "../lib/agriPriceApi";
import { analyticFilters, type AnalyticFilter } from "../data/analyticMockData";
import { getFriendlyApiErrorMessage } from "../utils/friendlyApiError";
import { CHART_INCOME, chartColorWithAlpha } from "../utils/chartTheme";
import "../styles/Prices.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const ALL_MARKETS = "__all__";
const PERIODS = ["auto", "daily", "weekly", "monthly"] as const;

type QueryPeriod = (typeof PERIODS)[number];

type ChartPoint = {
    dateKey: string;
    label: string;
    axisLabel: string;
    tickKey: string;
    price: number;
};

function chartLocale(language: string): string {
    return language.startsWith("en") ? "en-US" : language.startsWith("jp") ? "ja-JP" : "th-TH";
}

function formatPrice(value: number, language: string): string {
    return new Intl.NumberFormat(chartLocale(language), {
        maximumFractionDigits: 2,
    }).format(value);
}

function monthLabel(month: string, language: string): string {
    const monthNum = Number(month);
    if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) {
        return month;
    }
    return new Intl.DateTimeFormat(chartLocale(language), { month: "short" }).format(
        new Date(2020, monthNum - 1, 1),
    );
}

function displayYear(row: AgriPriceRow, language: string): string {
    if (row.yearTh != null) {
        return language.startsWith("en") || language.startsWith("jp")
            ? String(gregorianYear(row.yearTh))
            : String(row.yearTh);
    }
    const date = rowToDate(row);
    if (!date) return "";
    return language.startsWith("th") ? String(date.getFullYear() + 543) : String(date.getFullYear());
}

function paddedMonth(row: AgriPriceRow): string {
    if (row.month && row.month.trim()) {
        return row.month.trim().padStart(2, "0");
    }
    const match = /^(\d{4})-(\d{2})/.exec(row.dateKey);
    return match ? match[2] : "";
}

function axisTick(row: AgriPriceRow, language: string, filter: AnalyticFilter): { axisLabel: string; tickKey: string } {
    if (filter === "5Y" || filter === "ALL") {
        const year = displayYear(row, language);
        return { axisLabel: year || row.dateKey, tickKey: year || row.dateKey };
    }
    if (filter === "1M") {
        if (row.week && row.week > 0 && row.month) {
            return {
                axisLabel: `${monthLabel(row.month, language)} ${row.week}`,
                tickKey: row.dateKey,
            };
        }
        const parsed = Date.parse(row.dateKey);
        if (row.dateKey.length >= 10 && Number.isFinite(parsed)) {
            return {
                axisLabel: new Intl.DateTimeFormat(chartLocale(language), {
                    day: "numeric",
                    month: "short",
                }).format(new Date(parsed)),
                tickKey: row.dateKey,
            };
        }
        const month = paddedMonth(row);
        return {
            axisLabel: month ? monthLabel(month, language) : row.dateKey,
            tickKey: row.dateKey,
        };
    }
    const month = paddedMonth(row);
    const year = displayYear(row, language);
    return {
        axisLabel: month ? monthLabel(month, language) : year,
        tickKey: `${year}-${month}`,
    };
}

function maxAxisTicks(filter: AnalyticFilter): number {
    switch (filter) {
        case "1M":
            return 4;
        case "6M":
        case "YTD":
            return 5;
        case "1Y":
            return 6;
        default:
            return 5;
    }
}

function pointLabel(row: AgriPriceRow, language: string): string {
    if (row.week && row.week > 0 && row.yearTh && row.month) {
        const month = monthLabel(row.month, language);
        return language.startsWith("en")
            ? `${month} W${row.week} ${row.yearTh}`
            : language.startsWith("jp")
              ? `${row.yearTh}/${row.month} 第${row.week}週`
              : `${month} สัปดาห์ ${row.week} ${row.yearTh}`;
    }
    const parsed = Date.parse(row.dateKey);
    if (row.dateKey.length >= 10 && Number.isFinite(parsed)) {
        return new Intl.DateTimeFormat(chartLocale(language), { day: "numeric", month: "short" }).format(
            new Date(parsed),
        );
    }
    if (row.yearTh && row.month) {
        return `${monthLabel(row.month, language)} ${row.yearTh}`;
    }
    return row.dateKey;
}

function uniqueProductNames(rows: AgriPriceRow[]): string[] {
    return [...new Set(rows.map((row) => row.productName).filter((name): name is string => Boolean(name)))].sort((a, b) =>
        a.localeCompare(b, "th"),
    );
}

function pickProduct(names: string[], query: string): string | null {
    if (names.length === 0) return null;
    return names.find((name) => name === query) ?? names[0];
}

function variantChipLabel(name: string, parent: string): string {
    const prefix = parent.trim();
    if (prefix && name.startsWith(`${prefix} `)) {
        return name.slice(prefix.length + 1);
    }
    return name;
}

function gregorianYear(year: number): number {
    return year > 2400 ? year - 543 : year;
}

function rowToDate(row: AgriPriceRow): Date | null {
    if (row.dateKey.length >= 10 && !row.dateKey.includes("W")) {
        const parsed = Date.parse(row.dateKey);
        if (Number.isFinite(parsed)) return new Date(parsed);
    }
    if (row.yearTh != null && row.month) {
        const monthIndex = Number(row.month) - 1;
        if (!Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return null;
        const day = row.week && row.week > 0 ? Math.min(28, (row.week - 1) * 7 + 1) : 1;
        return new Date(gregorianYear(row.yearTh), monthIndex, day);
    }
    const match = /^(\d{4})-(\d{2})(?:-W(\d{2}))?/.exec(row.dateKey);
    if (!match) return null;
    const monthIndex = Number(match[2]) - 1;
    const week = match[3] ? Number(match[3]) : 0;
    const day = week > 0 ? Math.min(28, (week - 1) * 7 + 1) : 1;
    return new Date(gregorianYear(Number(match[1])), monthIndex, day);
}

function rangeStart(filter: AnalyticFilter, end: Date): Date | null {
    switch (filter) {
        case "1M":
            return new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
        case "6M":
            return new Date(end.getFullYear(), end.getMonth() - 6, 1);
        case "YTD":
            return new Date(end.getFullYear(), 0, 1);
        case "1Y":
            return new Date(end.getFullYear() - 1, end.getMonth(), 1);
        case "5Y":
            return new Date(end.getFullYear() - 5, 0, 1);
        case "ALL":
            return null;
    }
}

function buildChartPoints(rows: AgriPriceRow[], language: string, filter: AnalyticFilter): ChartPoint[] {
    const buckets = new Map<string, { sum: number; count: number; sample: AgriPriceRow }>();
    for (const row of rows) {
        const current = buckets.get(row.dateKey);
        if (current) {
            current.sum += row.price;
            current.count += 1;
        } else {
            buckets.set(row.dateKey, { sum: row.price, count: 1, sample: row });
        }
    }
    return [...buckets.entries()]
        .map(([dateKey, bucket]) => {
            const tick = axisTick(bucket.sample, language, filter);
            return {
                dateKey,
                label: pointLabel(bucket.sample, language),
                axisLabel: tick.axisLabel,
                tickKey: tick.tickKey,
                price: bucket.sum / bucket.count,
            };
        })
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export default function Prices() {
    const { t, i18n } = useTranslation();
    const [query, setQuery] = useState("");
    const [period, setPeriod] = useState<QueryPeriod>("auto");
    const [resultPeriod, setResultPeriod] = useState<string | null>(null);
    const [productNames, setProductNames] = useState<string[]>([]);
    const [items, setItems] = useState<AgriPriceRow[]>([]);
    const [matchedName, setMatchedName] = useState("");
    const [market, setMarket] = useState(ALL_MARKETS);
    const [product, setProduct] = useState<string | null>(null);
    const [rangeFilter, setRangeFilter] = useState<AnalyticFilter>("1Y");
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const searchGen = useRef(0);

    useEffect(() => {
        let cancelled = false;
        agriPriceApi
            .productNames()
            .then((names) => {
                if (!cancelled) setProductNames(names ?? []);
            })
            .catch(() => {
                if (!cancelled) setProductNames([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const suggestions = useMemo(() => {
        const needle = query.trim();
        if (!needle) return productNames;
        return productNames.filter((name) => name.includes(needle));
    }, [productNames, query]);

    const productVariants = useMemo(() => uniqueProductNames(items), [items]);

    const productItems = useMemo(() => {
        if (!product) return items;
        return items.filter((row) => row.productName === product);
    }, [items, product]);

    const markets = useMemo(() => {
        const unique = [...new Set(productItems.map((row) => row.marketName).filter((name): name is string => Boolean(name)))];
        return unique.sort((a, b) => a.localeCompare(b, "th"));
    }, [productItems]);

    const filteredItems = useMemo(() => {
        if (market === ALL_MARKETS) return productItems;
        return productItems.filter((row) => row.marketName === market);
    }, [productItems, market]);

    const rangedItems = useMemo(() => {
        let latest = 0;
        for (const row of filteredItems) {
            const date = rowToDate(row);
            if (date && date.getTime() > latest) latest = date.getTime();
        }
        const start = rangeStart(rangeFilter, latest ? new Date(latest) : new Date());
        if (!start) return filteredItems;
        const startMs = start.getTime();
        return filteredItems.filter((row) => {
            const date = rowToDate(row);
            return !date || date.getTime() >= startMs;
        });
    }, [filteredItems, rangeFilter]);

    const chartPoints = useMemo(
        () => buildChartPoints(rangedItems, i18n.language, rangeFilter),
        [rangedItems, i18n.language, rangeFilter],
    );

    const latestPoint = chartPoints.at(-1) ?? null;
    const minPrice = chartPoints.length ? Math.min(...chartPoints.map((p) => p.price)) : null;
    const maxPrice = chartPoints.length ? Math.max(...chartPoints.map((p) => p.price)) : null;
    const unit = rangedItems[0]?.unit ?? filteredItems[0]?.unit ?? "";
    const titleName = product || matchedName || query.trim();

    const lineData = useMemo(
        () => ({
            labels: chartPoints.map((p) => p.axisLabel),
            datasets: [
                {
                    data: chartPoints.map((p) => p.price),
                    borderColor: CHART_INCOME,
                    backgroundColor: chartColorWithAlpha(CHART_INCOME, 0.16),
                    fill: true,
                    tension: 0.35,
                    pointRadius: chartPoints.length > 40 ? 0 : 3,
                    pointHoverRadius: 5,
                    borderWidth: 2,
                },
            ],
        }),
        [chartPoints],
    );

    const lineOptions = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (items: { dataIndex: number }[]) => {
                            const index = items[0]?.dataIndex;
                            return typeof index === "number" ? (chartPoints[index]?.label ?? "") : "";
                        },
                        label: (context: { parsed: { y: number | null } }) => {
                            const value = context.parsed.y;
                            if (typeof value !== "number") return "";
                            return ` ${formatPrice(value, i18n.language)} ${unit}`.trim();
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        maxRotation: 0,
                        minRotation: 0,
                        autoSkip: false,
                        font: { size: 10, weight: 600 },
                    },
                    afterBuildTicks(axis: { ticks: { value: number }[] }) {
                        const unique: { value: number }[] = [];
                        let prev = "";
                        for (let i = 0; i < chartPoints.length; i++) {
                            const key = chartPoints[i]?.tickKey ?? "";
                            if (key && key !== prev) {
                                unique.push({ value: i });
                                prev = key;
                            }
                        }
                        const maxTicks = maxAxisTicks(rangeFilter);
                        if (unique.length <= maxTicks) {
                            axis.ticks = unique;
                            return;
                        }
                        const last = unique.length - 1;
                        const picked: { value: number }[] = [];
                        for (let i = 0; i < maxTicks; i++) {
                            const tick = unique[Math.round((i * last) / (maxTicks - 1))];
                            if (!picked.length || picked[picked.length - 1].value !== tick.value) {
                                picked.push(tick);
                            }
                        }
                        axis.ticks = picked;
                    },
                },
                y: {
                    ticks: {
                        callback: (value: string | number) =>
                            typeof value === "number" ? formatPrice(value, i18n.language) : value,
                    },
                },
            },
        }),
        [chartPoints, i18n.language, rangeFilter, unit],
    );

    const recentRows = useMemo(() => {
        return [...rangedItems]
            .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
            .slice(0, 8);
    }, [rangedItems]);

    async function runSearch(nextQuery: string, nextPeriod: QueryPeriod = period) {
        const trimmed = nextQuery.trim();
        if (!trimmed) return;
        const gen = ++searchGen.current;
        setQuery(trimmed);
        setPeriod(nextPeriod);
        setLoading(true);
        setLoadError(null);
        setSearched(true);
        setMarket(ALL_MARKETS);
        setProduct(null);
        try {
            const result = await agriPriceApi.search(trimmed, nextPeriod);
            if (gen !== searchGen.current) return;
            const rows = result.items ?? [];
            setItems(rows);
            setMatchedName(result.matchedName ?? trimmed);
            setProduct(pickProduct(uniqueProductNames(rows), trimmed));
            setResultPeriod(result.period ?? (nextPeriod === "auto" ? null : nextPeriod));
            setLoadError(null);
        } catch (err) {
            if (gen !== searchGen.current) return;
            setItems([]);
            setMatchedName(trimmed);
            setProduct(null);
            setResultPeriod(nextPeriod === "auto" ? null : nextPeriod);
            setLoadError(getFriendlyApiErrorMessage(err, t));
        } finally {
            if (gen === searchGen.current) {
                setLoading(false);
            }
        }
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        void runSearch(query);
    }

    return (
        <MainLayout>
            <div className="home-page">
                <div className="home-content-card">
                    <div className="prices-page">
                        <section className="prices-card">
                            <form className="prices-search" onSubmit={handleSubmit}>
                                <label className="prices-search-label" htmlFor="prices-query">
                                    {t("prices.searchLabel")}
                                </label>
                                <div className="prices-search-row">
                                    <input
                                        id="prices-query"
                                        className="prices-search-input"
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder={t("prices.searchPlaceholder")}
                                        autoComplete="off"
                                    />
                                    <button type="submit" className="prices-search-btn" disabled={loading || !query.trim()}>
                                        <LuSearch size={16} aria-hidden />
                                        {loading ? t("prices.searching") : t("prices.search")}
                                    </button>
                                </div>
                                <div className="prices-period-track pill-segment-track" role="tablist" aria-label={t("prices.periodLabel")}>
                                    {PERIODS.map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            role="tab"
                                            aria-selected={period === value}
                                            className={`pill-control pill-control--chip pill-control--ghost prices-period-btn${period === value ? " is-active" : ""}`}
                                            onClick={() => {
                                                if (searched && query.trim()) {
                                                    void runSearch(query, value);
                                                    return;
                                                }
                                                setPeriod(value);
                                            }}
                                        >
                                            {t(`prices.period.${value}`)}
                                        </button>
                                    ))}
                                </div>
                            </form>

                            {suggestions.length > 0 && (
                                <div className="prices-suggest">
                                    {suggestions.map((name) => (
                                        <button
                                            key={name}
                                            type="button"
                                            className={`prices-chip${query.trim() === name ? " is-active" : ""}`}
                                            onClick={() => void runSearch(name)}
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {productVariants.length > 1 && (
                                <div>
                                    <p className="prices-variant-label">{t("prices.variantLabel")}</p>
                                    <div className="prices-suggest" role="list">
                                        {productVariants.map((name) => (
                                            <button
                                                key={name}
                                                type="button"
                                                className={`prices-chip${product === name ? " is-active" : ""}`}
                                                onClick={() => {
                                                    setProduct(name);
                                                    setMarket(ALL_MARKETS);
                                                }}
                                            >
                                                {variantChipLabel(name, matchedName || query)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        {loadError && chartPoints.length === 0 && <p className="prices-error">{loadError}</p>}

                        {searched && !loading && !loadError && filteredItems.length === 0 && (
                            <p className="prices-empty">{t("prices.empty")}</p>
                        )}

                        {filteredItems.length > 0 && (
                            <>
                                <section className="prices-stats">
                                    <article className="prices-stat">
                                        <p className="prices-stat-label">{t("prices.latest")}</p>
                                        <p className="prices-stat-value">
                                            {latestPoint ? formatPrice(latestPoint.price, i18n.language) : "-"}
                                        </p>
                                        <p className="prices-stat-meta">{unit}</p>
                                    </article>
                                    <article className="prices-stat">
                                        <p className="prices-stat-label">{t("prices.min")}</p>
                                        <p className="prices-stat-value">
                                            {minPrice == null ? "-" : formatPrice(minPrice, i18n.language)}
                                        </p>
                                        <p className="prices-stat-meta">{latestPoint?.label}</p>
                                    </article>
                                    <article className="prices-stat">
                                        <p className="prices-stat-label">{t("prices.max")}</p>
                                        <p className="prices-stat-value">
                                            {maxPrice == null ? "-" : formatPrice(maxPrice, i18n.language)}
                                        </p>
                                        <p className="prices-stat-meta">{t("prices.records", { count: rangedItems.length })}</p>
                                    </article>
                                </section>

                                <section className="prices-card">
                                    <div className="prices-card-header">
                                        <div>
                                            <h2 className="prices-card-title">{t("prices.chartTitle", { name: titleName })}</h2>
                                            {resultPeriod && resultPeriod !== "auto" && (
                                                <p className="prices-period-hint">{t(`prices.periodHint.${resultPeriod}`)}</p>
                                            )}
                                        </div>
                                        {markets.length > 1 && (
                                            <select
                                                className="prices-market-select"
                                                value={market}
                                                onChange={(event) => setMarket(event.target.value)}
                                                aria-label={t("prices.marketLabel")}
                                            >
                                                <option value={ALL_MARKETS}>{t("prices.allMarkets")}</option>
                                                {markets.map((name) => (
                                                    <option key={name} value={name}>
                                                        {name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div className="prices-chart-wrap">
                                        {loading ? (
                                            <div className="prices-loading">{t("prices.searching")}</div>
                                        ) : chartPoints.length > 0 ? (
                                            <Line data={lineData} options={lineOptions} />
                                        ) : (
                                            <div className="prices-loading">{t("prices.emptyRange")}</div>
                                        )}
                                    </div>
                                    <div
                                        className="prices-filter-bar pill-segment-track"
                                        role="tablist"
                                        aria-label={t("prices.rangeLabel")}
                                    >
                                        {analyticFilters.map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                role="tab"
                                                aria-selected={rangeFilter === value}
                                                className={`pill-control pill-control--chip pill-control--ghost prices-filter-btn${rangeFilter === value ? " is-active" : ""}`}
                                                onClick={() => setRangeFilter(value)}
                                            >
                                                {t(`analytic.filter.${value}`)}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="prices-card">
                                    <h2 className="prices-card-title">{t("prices.recentTitle")}</h2>
                                    <ul className="prices-list">
                                        {recentRows.map((row, index) => (
                                            <li key={`${row.dateKey}-${row.marketName ?? ""}-${index}`} className="prices-list-item">
                                                <div className="prices-list-main">
                                                    <p className="prices-list-name">{row.productName ?? titleName}</p>
                                                    <p className="prices-list-meta">
                                                        {[row.marketName, row.province, pointLabel(row, i18n.language)]
                                                            .filter(Boolean)
                                                            .join(" · ")}
                                                    </p>
                                                </div>
                                                <p className="prices-list-price">
                                                    {formatPrice(row.price, i18n.language)}
                                                    <span>{row.unit ?? unit}</span>
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
