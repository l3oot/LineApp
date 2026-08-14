const LINE_AUTH = "https://access.line.me/oauth2/v2.1/authorize";

/** OAuth state for CSRF check after redirect; keep in localStorage for mobile redirect resilience. */
const STATE_KEY = "line_oauth_state";
const STATE_CREATED_AT_KEY = "line_oauth_state_created_at";
const INFLIGHT_LOGIN_URL_KEY = "line_oauth_inflight_login_url";
const STATE_TTL_MS = 10 * 60 * 1000;
const POST_LOGIN_REDIRECT_KEY = "line_post_login_redirect";

// กัน redirect ไป LINE OAuth ซ้ำในช่วงสั้น ๆ (เช่น StrictMode remount, browser refresh กลางทาง)
const REDIRECT_GUARD_KEY = "line_oauth_redirect_started_at";
const REDIRECT_GUARD_TTL_MS = 5_000;

export type LineCallbackPayload =
    | { ok: true; code: string }
    | { ok: false; message: string };

function loadReusableState(): { state: string; loginUrl: string } | null {
    const state = localStorage.getItem(STATE_KEY)?.trim();
    const createdAtRaw = localStorage.getItem(STATE_CREATED_AT_KEY)?.trim();
    const loginUrl = localStorage.getItem(INFLIGHT_LOGIN_URL_KEY)?.trim();
    if (!state || !createdAtRaw || !loginUrl) {
        return null;
    }

    const createdAt = Number(createdAtRaw);
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > STATE_TTL_MS) {
        return null;
    }

    return { state, loginUrl };
}

function saveOAuthInflight(state: string, loginUrl: string): void {
    localStorage.setItem(STATE_KEY, state);
    localStorage.setItem(STATE_CREATED_AT_KEY, String(Date.now()));
    localStorage.setItem(INFLIGHT_LOGIN_URL_KEY, loginUrl);
}

function normalizePostLoginRedirect(target: string): string | null {
    const value = target.trim();
    if (!value.startsWith("/") || value.startsWith("//")) {
        return null;
    }
    if (value === "/callback" || value.startsWith("/callback?")) {
        return null;
    }
    return value;
}

function isFullLineLoginUrl(value: string): boolean {
    try {
        const u = new URL(value);
        if (!u.searchParams.get("client_id")?.trim()) {
            return false;
        }
        if (!u.searchParams.get("redirect_uri")?.trim()) {
            return false;
        }
        return u.hostname === "access.line.me";
    } catch {
        return false;
    }
}

function getLineLoginUrl(): string | null {
    const direct = import.meta.env.VITE_LINE_LOGIN_URL?.trim();
    // Only use when backend gives a *complete* authorize URL. A bare
    // https://access.line.me/oauth2/v2.1/authorize (no query) would cause LINE 400.
    if (direct && isFullLineLoginUrl(direct)) {
        return direct;
    }

    const reusable = loadReusableState();
    if (reusable) {
        return reusable.loginUrl;
    }

    const clientId = import.meta.env.VITE_LINE_CHANNEL_ID?.trim();
    const redirectUri = import.meta.env.VITE_LINE_REDIRECT_URI?.trim();
    if (!clientId || !redirectUri) {
        return null;
    }

    const state = crypto.randomUUID();

    const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope: "profile openid",
    });

    const loginUrl = `${LINE_AUTH}?${params.toString()}`;
    saveOAuthInflight(state, loginUrl);
    return loginUrl;
}

function isLineLoginConfigured(): boolean {
    const direct = import.meta.env.VITE_LINE_LOGIN_URL?.trim();
    if (direct && isFullLineLoginUrl(direct)) return true;
    return Boolean(
        import.meta.env.VITE_LINE_CHANNEL_ID?.trim() &&
            import.meta.env.VITE_LINE_REDIRECT_URI?.trim(),
    );
}

function parseLineCallback(search: string): LineCallbackPayload {
    const params = new URLSearchParams(search);
    const error = params.get("error");
    const errorDescription = params.get("error_description");
    if (error) {
        return {
            ok: false,
            message: errorDescription
                ? `LINE login error: ${errorDescription}`
                : `LINE login error: ${error}`,
        };
    }

    const code = params.get("code")?.trim();
    const state = params.get("state")?.trim();
    if (!code) {
        return { ok: false, message: "Missing authorization code." };
    }
    if (!state) {
        return { ok: false, message: "Missing state parameter." };
    }

    const expectedState = localStorage.getItem(STATE_KEY);
    if (!expectedState || expectedState !== state) {
        return { ok: false, message: "Invalid login state. Please try again." };
    }

    return { ok: true, code };
}

function savePostLoginRedirect(target: string): void {
    const safeTarget = normalizePostLoginRedirect(target);
    if (!safeTarget) {
        return;
    }
    localStorage.setItem(POST_LOGIN_REDIRECT_KEY, safeTarget);
}

function consumePostLoginRedirect(): string | null {
    const value = localStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    if (!value) {
        return null;
    }
    return normalizePostLoginRedirect(value);
}

/** ลบ OAuth state หลังแลก code สำเร็จ — อย่าลบตอน parse เพื่อให้ StrictMode remount ใช้ซ้ำได้ */
function clearLineOAuthState(): void {
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(STATE_CREATED_AT_KEY);
    localStorage.removeItem(INFLIGHT_LOGIN_URL_KEY);
}

/** เรียกก่อน location.replace(loginUrl) ทุกครั้ง เพื่อ mark ว่า redirect เริ่มไปแล้ว */
function markOAuthRedirectStarted(): void {
    sessionStorage.setItem(REDIRECT_GUARD_KEY, String(Date.now()));
}

/** true ถ้าเพิ่งเริ่ม redirect ไป LINE OAuth ไปหมาด ๆ — ใช้กัน trigger ซ้ำจาก effect/remount อื่น */
function isOAuthRedirectRecentlyStarted(): boolean {
    const raw = sessionStorage.getItem(REDIRECT_GUARD_KEY);
    if (!raw) return false;
    const startedAt = Number(raw);
    return Number.isFinite(startedAt) && Date.now() - startedAt < REDIRECT_GUARD_TTL_MS;
}

export {
    clearLineOAuthState,
    consumePostLoginRedirect,
    getLineLoginUrl,
    isLineLoginConfigured,
    isOAuthRedirectRecentlyStarted,
    markOAuthRedirectStarted,
    parseLineCallback,
    savePostLoginRedirect,
};
