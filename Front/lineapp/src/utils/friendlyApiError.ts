import type { TFunction } from "i18next";
import { ApiError } from "../lib/api";

function mapStatusToFriendlyMessage(status: number | undefined, t: TFunction): string | null {
    switch (status) {
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
            return null;
    }
}

function mapTypeErrorToFriendlyMessage(typeError: string | undefined, t: TFunction): string | null {
    switch ((typeError ?? "").toUpperCase()) {
        case "NETWORK_ERROR":
        case "TIMEOUT":
            return t("errors.network");
        case "BAD_REQUEST":
        case "VALIDATION_ERROR":
            return t("errors.validation");
        case "INVALID_CREDENTIAL":
        case "TOKEN_EXPIRED":
            return t("errors.sessionExpired");
        case "FORBIDDEN":
            return t("errors.forbidden");
        case "NOT_FOUND":
        case "TRANSACTION_NOT_FOUND":
        case "USER_NOT_FOUND":
        case "CATEGORY_NOT_FOUND":
        case "CYCLE_NOT_FOUND":
            return t("errors.notFound");
        case "CONFLICT":
            return t("errors.conflict");
        case "RATE_LIMIT":
            return t("errors.rateLimit");
        case "INTERNAL_ERROR":
        case "SERVER_ERROR":
        case "AGRI_PRICE_API_ERROR":
            return t("errors.server");
        default:
            return null;
    }
}

export function getFriendlyApiErrorMessage(error: unknown, t: TFunction): string {
    if (error instanceof ApiError) {
        return (
            mapTypeErrorToFriendlyMessage(error.typeError ?? undefined, t) ??
            mapStatusToFriendlyMessage(error.status, t) ??
            t("errors.unknown")
        );
    }

    if (typeof error === "object" && error !== null) {
        const record = error as Record<string, unknown>;
        const typeError = typeof record.typeError === "string" ? record.typeError : undefined;
        const status = typeof record.status === "number" ? record.status : undefined;

        return (
            mapTypeErrorToFriendlyMessage(typeError, t) ??
            mapStatusToFriendlyMessage(status, t) ??
            t("errors.unknown")
        );
    }

    if (typeof error === "string") {
        const lower = error.toLowerCase();
        if (lower.includes("not found") || lower.includes("cannot find")) {
            return t("errors.notFound");
        }
        if (lower.includes("forbidden") || lower.includes("unauthorized")) {
            return t("errors.forbidden");
        }
        if (lower.includes("network") || lower.includes("timeout")) {
            return t("errors.network");
        }
        if (lower.includes("validation") || lower.includes("required") || lower.includes("invalid")) {
            return t("errors.validation");
        }
    }

    return t("errors.unknown");
}
