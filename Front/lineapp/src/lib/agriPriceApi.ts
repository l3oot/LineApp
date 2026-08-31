import { api } from "./api";

export type AgriPricePeriod = "daily" | "weekly" | "monthly";

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

export const agriPriceApi = {
    productNames: () => api.get<string[]>("/api/agri-prices/product-names"),
    search: (q: string) =>
        api.get<AgriPriceSearch>("/api/agri-prices/search", { q, period: "daily" }, 25_000),
};
