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

export async function initLiff(): Promise<boolean> {
    const liffId = import.meta.env.VITE_LIFF_ID?.trim();
    if (!liffId) {
        return false;
    }

    if (!initPromise) {
        // External browser ใช้เว็บ OAuth + /callback — ห้ามให้ LIFF auto-login
        // ไม่งั้น LINE จะส่ง code กลับ /callback โดยไม่มี line_oauth_state
        initPromise = liff
            .init({ liffId, withLoginOnExternalBrowser: false })
            .then(() => true)
            .catch((err) => {
                console.warn("[LIFF] init failed:", err);
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

/** Callback ที่ลงทะเบียนใน LINE Console (origin + /) ไม่ใส่ query จากหน้าปัจจุบัน */
export function getLiffLoginRedirectUri(): string {
    return `${window.location.origin}/`;
}

export function loginWithLiff(redirectUri: string = getLiffLoginRedirectUri()): void {
    liff.login({ redirectUri });
}

export function getLiffTokens(): LiffTokens | null {
    const idToken = liff.getIDToken()?.trim();
    const accessToken = liff.getAccessToken()?.trim();
    if (!idToken || !accessToken) {
        return null;
    }
    return { idToken, accessToken };
}