import liff from "@line/liff";

let initPromise: Promise<boolean> | null = null;

export type LiffTokens = {
    idToken: string;
    accessToken: string;
};

export function isLiffConfigured(): boolean {
    return Boolean(import.meta.env.VITE_LIFF_ID?.trim());
}

/** UA ของ LINE in-app — ใช้ข้าม liff.init บน Chrome/Safari นอกแอป */
export function isLikelyLineInAppBrowser(): boolean {
    return /Line\//i.test(navigator.userAgent);
}

export function hasPendingLiffLogin(): boolean {
    try {
        return Object.keys(localStorage).some(
            (key) => key.startsWith("LIFF_STORE:") && key.endsWith(":loginTmp"),
        );
    } catch {
        return false;
    }
}

export function collectLiffStatus(extra?: Record<string, unknown>): Record<string, unknown> {
    let loggedIn: boolean | "uninitialized" = "uninitialized";
    let inClient: boolean | "uninitialized" = "uninitialized";
    let hasIdToken = false;
    let hasAccessToken = false;
    try {
        loggedIn = liff.isLoggedIn();
        inClient = liff.isInClient();
        hasIdToken = Boolean(liff.getIDToken()?.trim());
        hasAccessToken = Boolean(liff.getAccessToken()?.trim());
    } catch {
        // init ยังไม่เสร็จ — ค่า uninitialized ถูกต้อง
    }
    return {
        configured: isLiffConfigured(),
        liffId: import.meta.env.VITE_LIFF_ID?.trim() || null,
        pendingLoginTmp: hasPendingLiffLogin(),
        loggedIn,
        inClient,
        hasIdToken,
        hasAccessToken,
        ...extra,
    };
}

export function dumpLiffStatus(label: string, extra?: Record<string, unknown>): void {
    console.log(label, collectLiffStatus(extra));
}

export async function initLiff(): Promise<boolean> {
    const liffId = import.meta.env.VITE_LIFF_ID?.trim();
    if (!liffId) {
        console.warn("[LIFF] skip init: VITE_LIFF_ID empty");
        return false;
    }

    if (!initPromise) {
        // External browser ใช้เว็บ OAuth + /callback — ห้ามให้ LIFF auto-login
        // ไม่งั้น LINE จะส่ง code กลับ /callback โดยไม่มี line_oauth_state
        initPromise = liff
            .init({ liffId, withLoginOnExternalBrowser: false })
            .then(async () => {
                await liff.ready;
                dumpLiffStatus("[LIFF] init ok");
                return true;
            })
            .catch((err) => {
                console.warn("[LIFF] init failed:", err);
                initPromise = null;
                return false;
            });
    }

    return initPromise;
}

export function isLiffLoggedIn(): boolean {
    try {
        return liff.isLoggedIn();
    } catch {
        return false;
    }
}

/** เรียกได้หลัง init สำเร็จเท่านั้น — อยู่ใน LINE in-app หรือไม่ */
export function isInLiffClient(): boolean {
    try {
        return liff.isInClient();
    } catch {
        return false;
    }
}

/**
 * ต้องตรงกับ Callback URL ใน LINE Console (VITE_LINE_REDIRECT_URI)
 * ถ้าชี้ไป / แต่ Console มีแค่ /callback LINE จะส่ง code กลับ /callback แล้วแลก token ไม่ติด
 */
export function getLiffLoginRedirectUri(): string {
    const configured = import.meta.env.VITE_LINE_REDIRECT_URI?.trim();
    if (configured) {
        return configured;
    }
    return `${window.location.origin}/callback`;
}

export function loginWithLiff(redirectUri: string = getLiffLoginRedirectUri()): void {
    console.log("[LIFF] login", { redirectUri });
    liff.login({ redirectUri });
}

export function getLiffTokens(): LiffTokens | null {
    const idToken = liff.getIDToken()?.trim();
    const accessToken = liff.getAccessToken()?.trim();
    if (!idToken || !accessToken) {
        console.warn("[LIFF] missing tokens", {
            hasIdToken: Boolean(idToken),
            hasAccessToken: Boolean(accessToken),
        });
        return null;
    }
    return { idToken, accessToken };
}
