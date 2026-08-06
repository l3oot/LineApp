const LINE_AUTH = "https://access.line.me/oauth2/v2.1/authorize";

/** OAuth state for CSRF check after redirect; verify with sessionStorage. */
const STATE_KEY = "line_oauth_state";
const POST_LOGIN_REDIRECT_KEY = "line_post_login_redirect";
export type LineCallbackPayload =
    | { ok: true; code: string }
    | { ok: false; message: string };

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

export function getLineLoginUrl(): string | null {
    const direct = import.meta.env.VITE_LINE_LOGIN_URL?.trim();
    // Only use when backend gives a *complete* authorize URL. A bare
    // https://access.line.me/oauth2/v2.1/authorize (no query) would cause LINE 400.
    if (direct && isFullLineLoginUrl(direct)) {
        return direct;
    }

    const clientId = import.meta.env.VITE_LINE_CHANNEL_ID?.trim();
    const redirectUri = import.meta.env.VITE_LINE_REDIRECT_URI?.trim();
    if (!clientId || !redirectUri) {
        return null;
    }

    const state = crypto.randomUUID();
    sessionStorage.setItem(STATE_KEY, state);

    const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope: "profile openid",
    });

    return `${LINE_AUTH}?${params.toString()}`;
}

export function isLineLoginConfigured(): boolean {
    const direct = import.meta.env.VITE_LINE_LOGIN_URL?.trim();
    if (direct && isFullLineLoginUrl(direct)) return true;
    return Boolean(
        import.meta.env.VITE_LINE_CHANNEL_ID?.trim() &&
            import.meta.env.VITE_LINE_REDIRECT_URI?.trim(),
    );
}

export function parseLineCallback(search: string): LineCallbackPayload {
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

    const expectedState = sessionStorage.getItem(STATE_KEY);
    if (!expectedState || expectedState !== state) {
        return { ok: false, message: "Invalid login state. Please try again." };
    }

    return { ok: true, code };
}

export function savePostLoginRedirect(target: string): void {
    const safeTarget = normalizePostLoginRedirect(target);
    if (!safeTarget) {
        return;
    }
    localStorage.setItem(POST_LOGIN_REDIRECT_KEY, safeTarget);
}

export function consumePostLoginRedirect(): string | null {
    const value = localStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    if (!value) {
        return null;
    }
    return normalizePostLoginRedirect(value);
}

/** ลบ OAuth state หลังแลก code สำเร็จ — อย่าลบตอน parse เพื่อให้ StrictMode remount ใช้ซ้ำได้ */
export function clearLineOAuthState(): void {
    sessionStorage.removeItem(STATE_KEY);
}
