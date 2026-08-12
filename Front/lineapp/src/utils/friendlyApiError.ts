import type { TFunction } from "i18next";
import { ApiError } from "../lib/api";

export function getFriendlyApiErrorMessage(error: unknown, t: TFunction): string {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 0:
                return t("errors.network");
            case 400:
                return t("errors.badRequest");
            case 401:
                return t("errors.sessionExpired");
            case 403:
                return t("errors.forbidden");
            case 404:
                return t("errors.notFound");
            case 409:
                return t("errors.conflict");
            case 422:
                return t("errors.validation");
            case 429:
                return t("errors.rateLimit");
            case 500:
            case 502:
            case 503:
            case 504:
                return t("errors.server");
            default:
                return t("errors.unknown");
        }
    }

    return t("errors.unknown");
}
