/** Base path for the authenticated finance app (separate from marketing site). */
export const APP_BASE = "/app";

export function appPath(path = ""): string {
    if (!path || path === "/") return APP_BASE;
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${APP_BASE}${normalized}`;
}
