/** Chart colors aligned with CSS theme variables in index.css */
export const CHART_INCOME = "#5bb35f";
export const CHART_EXPENSE = "#e57373";

export function chartColorWithAlpha(hex: string, alpha: number): string {
    const normalized = hex.replace("#", "");
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function chartColorWithOpacity(hex: string, opacityHex: string): string {
    return `${hex}${opacityHex}`;
}
