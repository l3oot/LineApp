import liff from "@line/liff";

let initPromise: Promise<boolean> | null = null;

export type LiffTokens = {
    idToken: string;
    accessToken: string;
};

export function isLiffConfigured(): boolean {
    return Boolean(import.meta.env.VITE_LIFF_ID?.trim());
}

export async function initLiff(): Promise<boolean> {
    const liffId = import.meta.env.VITE_LIFF_ID?.trim();
    if (!liffId) {
        return false;
    }

    if (!initPromise) {
        initPromise = liff
            .init({ liffId, withLoginOnExternalBrowser: true })
            .then(() => true)
            .catch((err) => {
                console.warn("[LIFF] init failed:", err);
                return false;
            });
    }

    return initPromise;
}

export function isLiffLoggedIn(): boolean {
    return liff.isLoggedIn();
}

export function loginWithLiff(redirectUri: string): void {
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