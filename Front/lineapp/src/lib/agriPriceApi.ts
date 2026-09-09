import { api, ApiError } from "./api";

export type AgriPricePeriod = "daily" | "weekly" | "monthly";
export type AgriPriceQueryPeriod = AgriPricePeriod | "auto";

export type AgriPriceRow = {
    dateKey: string;
    price: number;
    unit: string | null;
    productName: string | null;
    marketName: string | null;
    province: string | null;
    yearTh: number | null;
    month: string | null;
    week: number | null;
};

export type AgriPriceSearch = {
    period: AgriPricePeriod;
    matchedBy: string;
    matchedName: string;
    total: number;
    items: AgriPriceRow[];
};

const SEARCH_TIMEOUT_MS = 25_000;

function emptySearch(q: string): AgriPriceSearch {
    return { period: "daily", matchedBy: "none", matchedName: q, total: 0, items: [] };
}

function isFallbackSearchError(error: unknown): boolean {
    if (!(error instanceof ApiError)) return false;
    const typeError = (error.typeError ?? "").toUpperCase();
    return (
        error.status === 0 ||
        error.status === 400 ||
        error.status === 404 ||
        error.status === 422 ||
        error.status === 502 ||
        error.status === 503 ||
        error.status === 504 ||
        typeError === "VALIDATION_ERROR" ||
        typeError === "BAD_REQUEST" ||
        typeError === "NOT_FOUND" ||
        typeError === "TIMEOUT" ||
        typeError === "NETWORK_ERROR" ||
        typeError === "AGRI_PRICE_API_ERROR" ||
        typeError === "INTERNAL_ERROR"
    );
}

async function searchPeriod(q: string, period: AgriPricePeriod): Promise<AgriPriceSearch> {
    return api.get<AgriPriceSearch>("/api/agri-prices/search", { q, period }, SEARCH_TIMEOUT_MS);
}

async function searchAuto(q: string): Promise<AgriPriceSearch> {
    for (const period of ["daily", "weekly", "monthly"] as const) {
        try {
            const result = await searchPeriod(q, period);
            if ((result.items?.length ?? 0) > 0) {
                return result;
            }
        } catch (error) {
            if (!isFallbackSearchError(error)) {
                throw error;
            }
        }
    }
    return emptySearch(q);
}

export const agriPriceApi = {
    productNames: () => api.get<string[]>("/api/agri-prices/product-names", undefined, 25_000),
    search: (q: string, period: AgriPriceQueryPeriod = "auto") =>
        period === "auto" ? searchAuto(q) : searchPeriod(q, period),
};
