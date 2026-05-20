/** สัดส่วนรายจ่ายต่อรายรับ (%) — ใช้แสดง progress / PnL badge */
export function calpercentused(balanceused: number, balance: number) {
    if (balance <= 0) {
        return balanceused > 0 ? 101 : 0;
    }
    return (balanceused / balance) * 100;
}

export function calbgcolor(percent: number) {
    if (percent < 90) {
        return "#25A247";
    } else if (percent >= 90 && percent <= 100) {
        return "#cd883a";
    } else {
        return "#b32929";
    }
}

export function calPnL(percent: number): "profit" | "nearBreakEven" | "breakEven" | "loss" {
    if (!Number.isFinite(percent) || percent < 0) {
        return "profit";
    }
    if (percent < 90) {
        return "profit";
    }
    if (percent >= 90 && percent < 100) {
        return "nearBreakEven";
    }
    if (percent === 100) {
        return "breakEven";
    }
    return "loss";
}