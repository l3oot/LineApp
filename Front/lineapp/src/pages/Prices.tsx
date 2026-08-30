import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { getFriendlyApiErrorMessage } from "../utils/friendlyApiError";
import { CHART_INCOME, chartColorWithAlpha } from "../utils/chartTheme";
import "../styles/Prices.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const ALL_MARKETS = "__all__";
const SUGGESTION_LIMIT = 8;

type ChartPoint = {
    dateKey: string;
    label: string;
    price: number;
};

function formatPrice(value: number, language: string): string {
    return new Intl.NumberFormat(language.startsWith("en") ? "en-US" : language.startsWith("jp") ? "ja-JP" : "th-TH", {
        maximumFractionDigits: 2,
    }).format(value);
}

function pointLabel(row: AgriPriceRow, language: string): string {
    const locale = language.startsWith("en") ? "en-US" : language.startsWith("jp") ? "ja-JP" : "th-TH";
    const parsed = Date.parse(row.dateKey);
    if (Number.isFinite(parsed)) {
        return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(parsed));
    }
    return row.dateKey;
}

function buildChartPoints(rows: AgriPriceRow[], language: string): ChartPoint[] {
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
        .map(([dateKey, bucket]) => ({
            dateKey,
            label: pointLabel(bucket.sample, language),
            price: bucket.sum / bucket.count,
        }))
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export default function Prices() {
    const { t, i18n } = useTranslation();
    const [query, setQuery] = useState("");
    const [productNames, setProductNames] = useState<string[]>([]);
    const [items, setItems] = useState<AgriPriceRow[]>([]);
    const [matchedName, setMatchedName] = useState("");
    const [total, setTotal] = useState(0);
    const [market, setMarket] = useState(ALL_MARKETS);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

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
        const source = needle
            ? productNames.filter((name) => name.includes(needle))
            : productNames;
        return source.slice(0, SUGGESTION_LIMIT);
    }, [productNames, query]);

    const markets = useMemo(() => {
        const unique = [...new Set(items.map((row) => row.marketName).filter((name): name is string => Boolean(name)))];
        return unique.sort((a, b) => a.localeCompare(b, "th"));
    }, [items]);

    const filteredItems = useMemo(() => {
        if (market === ALL_MARKETS) return items;
        return items.filter((row) => row.marketName === market);
    }, [items, market]);

    const chartPoints = useMemo(
        () => buildChartPoints(filteredItems, i18n.language),
        [filteredItems, i18n.language],
    );

    const latestPoint = chartPoints.at(-1) ?? null;
    const minPrice = chartPoints.length ? Math.min(...chartPoints.map((p) => p.price)) : null;
    const maxPrice = chartPoints.length ? Math.max(...chartPoints.map((p) => p.price)) : null;
    const unit = filteredItems[0]?.unit ?? "";
    const titleName = matchedName || query.trim();

    const lineData = useMemo(
        () => ({
            labels: chartPoints.map((p) => p.label),
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
                    ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
                },
                y: {
                    ticks: {
                        callback: (value: string | number) =>
                            typeof value === "number" ? formatPrice(value, i18n.language) : value,
                    },
                },
            },
        }),
        [i18n.language, unit],
    );

    const recentRows = useMemo(() => {
        return [...filteredItems]
            .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
            .slice(0, 8);
    }, [filteredItems]);

    async function runSearch(nextQuery: string) {
        const trimmed = nextQuery.trim();
        if (!trimmed) return;
        setQuery(trimmed);
        setLoading(true);
        setLoadError(null);
        setSearched(true);
        setMarket(ALL_MARKETS);
        try {
            const result = await agriPriceApi.search(trimmed);
            setItems(result.items ?? []);
            setMatchedName(result.matchedName ?? trimmed);
            setTotal(result.total ?? result.items?.length ?? 0);
        } catch (err) {
            setItems([]);
            setMatchedName(trimmed);
            setTotal(0);
            setLoadError(getFriendlyApiErrorMessage(err, t));
        } finally {
            setLoading(false);
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
                        </section>

                        {loadError && <p className="prices-error">{loadError}</p>}

                        {searched && !loading && !loadError && chartPoints.length === 0 && (
                            <p className="prices-empty">{t("prices.empty")}</p>
                        )}

                        {chartPoints.length > 0 && (
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
                                        <p className="prices-stat-meta">{t("prices.records", { count: total || items.length })}</p>
                                    </article>
                                </section>

                                <section className="prices-card">
                                    <div className="prices-card-header">
                                        <h2 className="prices-card-title">{t("prices.chartTitle", { name: titleName })}</h2>
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
                                        ) : (
                                            <Line data={lineData} options={lineOptions} />
                                        )}
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
