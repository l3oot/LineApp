import type { Transaction } from "../lib/userService";

export type GroupedTransaction = {
    date: string;
    transactions: Transaction[];
};
