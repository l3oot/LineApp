/**
 * Typed API client สำหรับ user-service —
 * ต้อง login ก่อน (auth.getUser()) แล้วใช้ user.userId ในการเรียก
 */

import { api } from "./api";
import { auth } from "./auth";

function requireUserId(): string {
    const user = auth.getUser();
    if (!user?.userId) {
        throw new Error("ยังไม่ได้ login — กรุณาเข้าสู่ระบบด้วย LINE ก่อน");
    }
    return user.userId;
}

// ============ Cycle ============

export type Cycle = {
    cycleId: string;
    userId: string;
    name: string;
    farmType: string | null;
    startDate: string;       // ISO yyyy-mm-dd
    endDate: string;
    status: string | null;
    icon: string | null;
    createdAt: string;
};

export type CycleCreatePayload = {
    name: string;
    farmType: string;
    startDate: string;
    endDate: string;
    status: string;
    icon: string;
};

export type CycleUpdatePayload = CycleCreatePayload & { cycleId: string };

export const cycleApi = {
    list: () => api.get<Cycle[]>("/api/cycle", { userId: requireUserId() }),

    create: (payload: CycleCreatePayload) =>
        api.post<Cycle>("/api/cycle", { ...payload, userId: requireUserId() }),

    update: (payload: CycleUpdatePayload) =>
        api.put<Cycle>("/api/cycle", payload),

    delete: (cycleId: string) => api.delete<void>("/api/cycle", { cycleId }),
};

// ============ Category ============

export type Category = {
    categoryId: string;
    userId: string;
    name: string;
    type: "expense" | "income";
    createdAt: string;
};

export type CategoryCreatePayload = {
    name: string;
    type: "expense" | "income";
};

export type CategoryUpdatePayload = CategoryCreatePayload & { categoryId: string };

export const categoryApi = {
    list: (typeFilter?: "expense" | "income") =>
        api.get<Category[]>("/api/category", { userId: requireUserId(), type: typeFilter }),

    get: (categoryId: string) =>
        api.get<Category>(`/api/category/${categoryId}`, { userId: requireUserId() }),

    create: (payload: CategoryCreatePayload) =>
        api.post<Category>("/api/category", { ...payload, userId: requireUserId() }),

    update: (payload: CategoryUpdatePayload) =>
        api.put<Category>("/api/category", { ...payload, userId: requireUserId() }),

    delete: (categoryId: string) =>
        api.delete<void>("/api/category", { categoryId, userId: requireUserId() }),
};

// ============ Transaction ============

export type Transaction = {
    txId: string;
    userId: string;
    cycleId: string | null;
    categoryId: string | null;
    txType: "expense" | "income";
    amount: number;
    note: string | null;
    txDate: string;          // ISO datetime
    createdAt: string;
};

export type TransactionCreatePayload = {
    cycleId?: string | null;
    categoryId?: string | null;
    txType: "expense" | "income";
    amount: number;
    note?: string | null;
    txDate: string;
};

export type TransactionUpdatePayload = TransactionCreatePayload & { txId: string };

export const transactionApi = {
    list: (cycleId?: string) =>
        api.get<Transaction[]>("/api/transaction", { userId: requireUserId(), cycleId }),

    get: (txId: string) =>
        api.get<Transaction>(`/api/transaction/${txId}`, { userId: requireUserId() }),

    create: (payload: TransactionCreatePayload) =>
        api.post<Transaction>("/api/transaction", { ...payload, userId: requireUserId() }),

    update: (payload: TransactionUpdatePayload) =>
        api.put<Transaction>("/api/transaction", { ...payload, userId: requireUserId() }),

    delete: (txId: string) =>
        api.delete<void>("/api/transaction", { txId, userId: requireUserId() }),
};
