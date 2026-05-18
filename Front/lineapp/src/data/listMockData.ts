import { icons } from "../assets/Iconlist";
import type { TransactionProps } from "../components/TransactionCard";

export type GroupedTransaction = {
    date: string;
    transactions: TransactionProps[];
};

export const initialGroupedTransactions: GroupedTransaction[] = [
    {
        date: "15 พ.ค. 2024",
        transactions: [
            { title: "ขายข้าว", type: "income", category: "ผลผลิต", amount: 15000, time: "14:30 น.", icon: icons.rice },
            { title: "ซื้อน้ำมันเชื้อเพลิง", type: "expense", category: "อื่นๆ", amount: 1500, time: "10:15 น.", icon: icons.fire },
            { title: "จ่ายค่าไฟ", type: "expense", category: "อื่นๆ", amount: 800, time: "08:00 น.", icon: icons.sun },
        ],
    },
    {
        date: "10 พ.ค. 2024",
        transactions: [
            { title: "ซื้อปุ๋ยยูเรีย", type: "expense", category: "ค่าปุ๋ย", amount: 2500, time: "16:00 น.", icon: icons.plant },
            { title: "ซื้อเมล็ดพันธุ์", type: "expense", category: "ค่าเมล็ดพันธุ์", amount: 1200, time: "13:45 น.", icon: icons.seedling },
            { title: "รับจ้างไถนา", type: "income", category: "รายได้เสริม", amount: 3000, time: "09:30 น.", icon: icons.tractor },
        ],
    },
    {
        date: "8 พ.ค. 2024",
        transactions: [
            { title: "จ้างคนงาน", type: "expense", category: "ค่าแรง", amount: 1200, time: "17:00 น.", icon: icons.shovel },
            { title: "ซื้ออาหารว่างคนงาน", type: "expense", category: "อื่นๆ", amount: 300, time: "12:00 น.", icon: icons.basket },
            { title: "ขายผักบุ้ง", type: "income", category: "ผลผลิต", amount: 500, time: "07:30 น.", icon: icons.lettuce },
        ],
    },
];
