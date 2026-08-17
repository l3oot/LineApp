/**
 * Typed API client สำหรับ user-service —
 * ต้อง login ก่อน (auth.getUser()) แล้วใช้ user.userId ในการเรียก
 */

import { api, ApiError } from "./api";
import { auth } from "./auth";

export type PageRes<T> = {
    items: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
};

export const TRANSACTION_PAGE_SIZE = 10;

export type TransactionListPageQuery = {
    cycleId?: string;
    startDate?: string;
    endDate?: string;
};

function normalizeTransactionPage(
    data: PageRes<Transaction> | Transaction[] | null | undefined,
    page: number,
    size: number,
): PageRes<Transaction> {
    if (!data) {
        return {
            items: [],
            page,
            size,
            totalElements: 0,
            totalPages: 0,
            hasNext: false,
        };
    }
    if (Array.isArray(data)) {
        const safePage = Math.max(page, 0);
        const safeSize = size > 0 ? size : TRANSACTION_PAGE_SIZE;
        const start = safePage * safeSize;
        const items = data.slice(start, start + safeSize);
        const totalElements = data.length;
        return {
            items,
            page: safePage,
            size: safeSize,
            totalElements,
            totalPages: safeSize > 0 ? Math.ceil(totalElements / safeSize) : 0,
            hasNext: start + items.length < totalElements,
        };
    }
    return {
        items: data.items ?? [],
        page: data.page ?? page,
        size: data.size ?? size,
        totalElements: data.totalElements ?? data.items?.length ?? 0,
        totalPages: data.totalPages ?? 0,
        hasNext: data.hasNext ?? false,
    };
}

function requireUserId(): string {
    const user = auth.getUser();
    if (!user?.userId) {
        throw new Error("ยังไม่ได้ login — เข้าสู่ระบบด้วย LINE ก่อน");
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
    budgetAmount: number | null;
    dateComeIn?: number | null;
};

export type CycleCreatePayload = {
    name: string;
    farmType: string;
    startDate: string;
    endDate: string;
    status: string;
    icon: string;
    budgetAmount?: number | null;
};

export type CycleUpdatePayload = CycleCreatePayload & { cycleId: string };

export const cycleApi = {
    list: () => api.get<Cycle[]>(`/api/cycle/user/${requireUserId()}`),

    create: (payload: CycleCreatePayload) =>
        api.post<Cycle>("/api/cycle", { ...payload, userId: requireUserId() }),

    update: (payload: CycleUpdatePayload) =>
        api.put<Cycle>("/api/cycle", payload),

    delete: (cycleId: string) =>
        api.delete<void>("/api/cycle", { cycleId, userId: requireUserId() }),
};

// ============ Plan / Quota ============

export type PlanQuota = {
    planName: string;
    maxCycles: number;
    activeCycles: number;
    canCreate: boolean;
    expiresAt: string | null;
};

export const planApi = {
    getQuota: () => api.get<PlanQuota>("/api/plan/quota", { userId: requireUserId() }),
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
        api.get<Category[]>(`/api/category/user/${requireUserId()}`, { type: typeFilter }),

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
    icon: string | null;
    txDate: string;          // ISO datetime
    createdAt: string;
};

export type TransactionCreatePayload = {
    cycleId?: string | null;
    categoryId?: string | null;
    txType: "expense" | "income";
    amount: number;
    note?: string | null;
    icon?: string | null;
    txDate: string;
};

export type TransactionUpdatePayload = TransactionCreatePayload & { txId: string };

export const transactionApi = {
    /** GET /api/transaction?userId= — รายการทั้งหมด (ใช้กับหน้า analytic/sum) */
    list: (cycleId?: string) => {
        const userId = requireUserId();
        return api.get<Transaction[]>("/api/transaction", { userId, cycleId });
    },

    /** GET /api/transaction/user/{userId}?page=&size=10 — แบ่งหน้าทีละ 10 รายการ */
    listPage: async (
        page = 0,
        query: TransactionListPageQuery = {},
        size = TRANSACTION_PAGE_SIZE,
    ) => {
        const userId = requireUserId();
        const params = { page, size, ...query };
        const path = `/api/transaction/user/${encodeURIComponent(userId)}`;
        try {
            const data = await api.get<PageRes<Transaction> | Transaction[]>(path, params);
            return normalizeTransactionPage(data, page, size);
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : "";
            if (
                err instanceof ApiError &&
                (err.status === 404 || msg.includes("static resource") || msg.includes("No static resource"))
            ) {
                const rows = await api.get<Transaction[]>("/api/transaction", {
                    userId,
                    cycleId: query.cycleId,
                });
                return normalizeTransactionPage(rows, page, size);
            }
            throw err;
        }
    },

    get: (txId: string) =>
        api.get<Transaction>(`/api/transaction/${txId}`, { userId: requireUserId() }),

    create: (payload: TransactionCreatePayload) =>
        api.post<Transaction>("/api/transaction", { ...payload, userId: requireUserId() }),

    update: (payload: TransactionUpdatePayload) =>
        api.put<Transaction>("/api/transaction", { ...payload, userId: requireUserId() }),

    delete: (txId: string) =>
        api.delete<void>("/api/transaction", { txId, userId: requireUserId() }),

    deleteMany: (txIds: string[]) => {
        const userId = requireUserId();
        return Promise.all(
            txIds.map((txId) => api.delete<void>("/api/transaction", { txId, userId })),
        );
    },

    /** DELETE /api/transaction/user/{userId} — ลบธุรกรรมทั้งหมดของผู้ใช้ */
    deleteAllByUser: () => {
        const userId = requireUserId();
        return api.delete<void>(`/api/transaction/user/${encodeURIComponent(userId)}`);
    },
};

// ============ User Profile ============

export type UserProfile = {
    userId: string;
    province: string | null;
    district: string | null;
    subDistrict: string | null;
    mainAgricultureType: string | null;
    updatedAt: string | null;
};

export type UserProfileUpsertPayload = {
    province?: string | null;
    district?: string | null;
    subDistrict?: string | null;
    mainAgricultureType?: string | null;
};

export const userProfileApi = {
    get: () => api.get<UserProfile>("/api/user-profile", { userId: requireUserId() }),

    upsert: (payload: UserProfileUpsertPayload) =>
        api.put<UserProfile>("/api/user-profile", { ...payload, userId: requireUserId() }),
};

// ============ Thai Admin (MOPH HCode) ============

export type ThaiAdminOption = {
    code: string;
    name: string;
};

export const thaiAdminApi = {
    listProvinces: () => api.get<ThaiAdminOption[]>("/api/thai-admin/provinces"),

    listDistricts: (provinceCode: string) =>
        api.get<ThaiAdminOption[]>("/api/thai-admin/districts", { provinceCode }),

    listSubdistricts: (districtCode: string) =>
        api.get<ThaiAdminOption[]>("/api/thai-admin/subdistricts", { districtCode }),
};
