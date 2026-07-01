import { icons } from "../assets/Iconlist";

export function resolveTxIconEmoji(
    iconKey: string | null | undefined,
    fallback?: string,
): string | undefined {
    if (iconKey && Object.prototype.hasOwnProperty.call(icons, iconKey)) {
        return icons[iconKey as keyof typeof icons];
    }
    return fallback;
}
