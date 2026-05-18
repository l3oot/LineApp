import { icons } from "../assets/Iconlist";

type IconName = keyof typeof icons;

export type SumOverviewCard = {
    icon: IconName;
    titleKey: string;
    balance: number;
    color: string;
};

export type SumCycleCard = {
    icon: IconName;
    title: string;
    balance: number;
    length: string;
    balanceused: number;
};

export const sumOverviewCards: SumOverviewCard[] = [
    { icon: "money", titleKey: "sum.totalIncome", balance: 62000, color: "#2f8f4e" },
    { icon: "bill", titleKey: "sum.totalExpense", balance: 45000, color: "#b23a3a" },
    { icon: "bank", titleKey: "sum.totalBalance", balance: 17000, color: "#2d6fbe" },
];

export const sumCycleCards: SumCycleCard[] = [
    { icon: "corn", title: "ข้าวโพด ปี 2567", balance: 62000, length: "ม.ค. 2567 - ธ.ค. 2567 4 เดือน", balanceused: 4000 },
    { icon: "rice", title: "ข้าวปี 2567", balance: 55000, length: "ม.ค. 2567 - ธ.ค. 2567 4 เดือน", balanceused: 62000 },
    { icon: "cow", title: "วัว 2567", balance: 60000, length: "ม.ค. 2567 - ธ.ค. 2567 4 เดือน", balanceused: 55000 },
];
