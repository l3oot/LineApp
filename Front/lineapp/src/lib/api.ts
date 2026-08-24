/**
 * HTTP client สำหรับ user-service —
 * อ่าน base URL จาก VITE_API_BASE_URL, แนบ JWT จาก localStorage, แกะ ApiRes envelope
 */

import { isJwtExpired } from "./jwt";
import { savePostLoginRedirect } from "./lineLogin";

// path เรียก API ทุกจุดใน src ใส่ prefix "/api/..." เองอยู่แล้ว
// ตัด "/api" ท้าย VITE_API_BASE_URL ออกกันไว้ (เผื่อตั้งค่ามาแบบมี /api ต่อท้าย) ป้องกัน path ซ้ำเป็น /api/api/...
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)
    ?.replace(/\/+$/, "")
    .replace(/\/api$/i, "") ||
    "http://localhost:8080";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";
let reauthRedirecting = false;

function clearSessionStorage(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function triggerReauthRedirect(): void {
    if (reauthRedirecting) return;
    reauthRedirecting = true;

    const currentPath =
        window.location.pathname + window.location.search + window.location.hash;
    savePostLoginRedirect(currentPath);

    // Redirect into protected root; RequireAuth will continue LINE login flow.
    window.location.replace("/");
}

export type ApiRes<T> = {
    success: boolean;
    message: string | null;
    typeError: string | null;
    data: T | null;
};

export class ApiError extends Error {
    readonly status: number;
    readonly typeError: string | null;

    constructor(status: number, typeError: string | null, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.typeError = typeError;
    }
}

type Query = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, query?: Query): string {
    const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
    if (query) {
        for (const [k, v] of Object.entries(query)) {
            if (v === null || v === undefined || v === "") continue;
            url.searchParams.set(k, String(v));
        }
    }
    return url.toString();
}

const DEFAULT_TIMEOUT_MS = 15_000;

async function request<T>(
    path: string,
    init: RequestInit & { query?: Query; timeoutMs?: number } = {},
): Promise<T> {
    const { query, headers: incomingHeaders, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
    const headers = new Headers(incomingHeaders);
    if (!headers.has("Content-Type") && rest.body) {
        headers.set("Content-Type", "application/json");
    }
    headers.set("Accept", "application/json");
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        if (isJwtExpired(token)) {
            clearSessionStorage();
            triggerReauthRedirect();
            throw new ApiError(401, "TOKEN_EXPIRED", "Session expired. Please sign in again.");
        }
        headers.set("Authorization", `Bearer ${token}`);
    }

    const url = buildUrl(path, query);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
        res = await fetch(url, { ...rest, headers, signal: controller.signal });
    } catch (err) {
        const e = err as Error & { name?: string };
        if (e.name === "AbortError") {
            throw new ApiError(0, "TIMEOUT", `Request timeout (${timeoutMs}ms): ${url}`);
        }
        throw new ApiError(0, "NETWORK_ERROR", `${e.message} (${url})`);
    } finally {
        clearTimeout(timer);
    }

    // 204 หรือ response ว่าง — คืน undefined (caller บอก T ให้)
    if (res.status === 204) {
        return undefined as T;
    }

    const text = await res.text();
    let body: ApiRes<T> | null = null;
    if (text) {
        try {
            body = JSON.parse(text) as ApiRes<T>;
        } catch {
            throw new ApiError(res.status, "INVALID_RESPONSE", text.slice(0, 200));
        }
    }

    if (!res.ok || !body || body.success === false) {
        if (res.status === 401 && !path.startsWith("/api/auth/")) {
            clearSessionStorage();
            triggerReauthRedirect();
        }
        throw new ApiError(
            res.status,
            body?.typeError ?? null,
            body?.message ?? `Request failed: ${res.status}`,
        );
    }
    return body.data as T;
}

export const api = {
    get: <T>(path: string, query?: Query, timeoutMs?: number) =>
        request<T>(path, { method: "GET", query, timeoutMs }),
    post: <T>(path: string, payload?: unknown, query?: Query) =>
        request<T>(path, {
            method: "POST",
            query,
            body: payload === undefined ? undefined : JSON.stringify(payload),
        }),
    put: <T>(path: string, payload?: unknown, query?: Query) =>
        request<T>(path, {
            method: "PUT",
            query,
            body: payload === undefined ? undefined : JSON.stringify(payload),
        }),
    delete: <T>(path: string, query?: Query) => request<T>(path, { method: "DELETE", query }),
};

export const API_BASE_URL = API_BASE;
