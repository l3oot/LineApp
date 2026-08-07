/**
 * จัดการ JWT + ข้อมูล user หลัง LINE login
 * - เก็บใน localStorage เพื่อให้ session ไม่หายเมื่อ refresh
 * - ใช้ใน api.ts อัตโนมัติ (อ่าน key "auth_token")
 */

import { api } from "./api";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export type AuthUser = {
    userId: string;          // UUID ของระบบ (ใช้เรียก /api/* ต่าง ๆ)
    lineUserId: string;      // LINE userId (string เริ่มต้นด้วย "U")
    displayName: string;
    pictureUrl: string | null;
};

type LineLoginRes = {
    token: string;
    userId: string;
    lineUserId: string;
    displayName: string;
    pictureUrl: string | null;
};

type LineLiffLoginReq = {
    idToken: string;
    accessToken: string;
};

export const auth = {
    getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    },
    getUser(): AuthUser | null {
        const raw = localStorage.getItem(USER_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as AuthUser;
        } catch {
            return null;
        }
    },
    isAuthed(): boolean {
        return Boolean(localStorage.getItem(TOKEN_KEY));
    },
    setSession(token: string, user: AuthUser): void {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    clear(): void {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },
};

let pendingExchange: { code: string; promise: Promise<AuthUser> } | null = null;

/**
 * แลก LINE OAuth code → JWT + user profile แล้ว save session
 * ใช้ใน LineCallback หลังเอา code จาก URL
 * dedupe ตาม code — กัน StrictMode เรียก API ซ้ำด้วย code เดียวกัน
 */
export async function exchangeLineCode(code: string): Promise<AuthUser> {
    if (pendingExchange?.code === code) {
        return pendingExchange.promise;
    }

    const promise = (async () => {
        const res = await api.post<LineLoginRes>("/api/auth/line", { code });
        const user: AuthUser = {
            userId: res.userId,
            lineUserId: res.lineUserId,
            displayName: res.displayName,
            pictureUrl: res.pictureUrl,
        };
        auth.setSession(res.token, user);
        return user;
    })().finally(() => {
        if (pendingExchange?.code === code) {
            pendingExchange = null;
        }
    });

    pendingExchange = { code, promise };
    return promise;
}

let pendingLiffExchange: { key: string; promise: Promise<AuthUser> } | null = null;

/**
 * แลก LIFF token (id/access token) → JWT + user profile แล้ว save session
 * ใช้ใน RequireAuth เมื่อเปิดแอปผ่าน LINE browser
 */
export async function exchangeLiffSession(payload: LineLiffLoginReq): Promise<AuthUser> {
    const key = `${payload.idToken}:${payload.accessToken}`;
    if (pendingLiffExchange?.key === key) {
        return pendingLiffExchange.promise;
    }

    const promise = (async () => {
        const res = await api.post<LineLoginRes>("/api/auth/line/liff", payload);
        const user: AuthUser = {
            userId: res.userId,
            lineUserId: res.lineUserId,
            displayName: res.displayName,
            pictureUrl: res.pictureUrl,
        };
        auth.setSession(res.token, user);
        return user;
    })().finally(() => {
        if (pendingLiffExchange?.key === key) {
            pendingLiffExchange = null;
        }
    });

    pendingLiffExchange = { key, promise };
    return promise;
}
