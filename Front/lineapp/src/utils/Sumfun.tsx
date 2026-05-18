export function calpercentused(balanceused: number, balance: number) {
    return balanceused / balance * 100;
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

export function calPnL(percent: number) {
    if (percent < 90) {
        return "profit";
    } else if (percent >= 90 && percent < 100) {
        return "nearBreakEven";
    } else if (percent === 100) {
        return "breakEven";
    } else if (percent > 100) {
        return "loss";
    }
}