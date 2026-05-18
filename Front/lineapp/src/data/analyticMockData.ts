export const analyticFilters = ["1M", "6M", "YTD", "1Y", "5Y", "ALL"] as const;

export type AnalyticFilter = (typeof analyticFilters)[number];

export type LineSeriesData = {
    labels: string[];
    income: number[];
    expense: number[];
};

export const analyticLineDataByFilter: Record<AnalyticFilter, LineSeriesData> = {
    "1M": {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        income: [12000, 19000, 15000, 22000],
        expense: [8000, 12000, 10000, 15000],
    },
    "6M": {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        income: [45000, 52000, 48000, 61000, 55000, 67000],
        expense: [30000, 35000, 32000, 40000, 38000, 42000],
    },
    YTD: {
        labels: ["Jan", "Feb", "Mar", "Apr"],
        income: [45000, 52000, 48000, 61000],
        expense: [30000, 35000, 32000, 40000],
    },
    "1Y": {
        labels: ["2023 Q1", "2023 Q2", "2023 Q3", "2023 Q4"],
        income: [150000, 180000, 165000, 210000],
        expense: [100000, 120000, 110000, 140000],
    },
    "5Y": {
        labels: ["2020", "2021", "2022", "2023", "2024"],
        income: [500000, 620000, 580000, 750000, 820000],
        expense: [350000, 400000, 380000, 500000, 550000],
    },
    ALL: {
        labels: ["2018", "2019", "2020", "2021", "2022", "2023", "2024"],
        income: [350000, 420000, 500000, 620000, 580000, 750000, 820000],
        expense: [250000, 280000, 350000, 400000, 380000, 500000, 550000],
    },
};

export const analyticBarLabels = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม"];

export const analyticBarDataSet = {
    income: [12, 19, 3, 5, 2],
    expense: [10, 11, 5, 6, 4],
};

export const analyticYearDropdownOptions = [
    { value: "2026" },
    { value: "2025" },
    { value: "2024" },
    { value: "2023" },
    { value: "2022" },
];

export const analyticPieDataList = [
    { label: "ค่าปุ๋ย", value: 35 },
    { label: "ค่ายา", value: 15 },
    { label: "ค่าแรง", value: 25 },
    { label: "ค่าเมล็ดพันธุ์", value: 20 },
    { label: "อื่นๆ", value: 5 },
];
