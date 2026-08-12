function decodeBase64Url(value: string): string {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return atob(padded);
}

export function getJwtExpiryEpochMs(token: string): number | null {
    const parts = token.split(".");
    if (parts.length < 2) {
        return null;
    }

    try {
        const payload = JSON.parse(decodeBase64Url(parts[1])) as { exp?: unknown };
        if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
            return null;
        }
        return payload.exp * 1000;
    } catch {
        return null;
    }
}

export function isJwtExpired(token: string, skewSeconds = 30): boolean {
    const expMs = getJwtExpiryEpochMs(token);
    if (!expMs) {
        // If token is malformed or has no exp, treat it as invalid/expired.
        return true;
    }
    return Date.now() >= expMs - skewSeconds * 1000;
}
