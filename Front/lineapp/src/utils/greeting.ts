export type GreetingPeriod = "morning" | "afternoon" | "evening" | "night";

const DAY_ICON =
    "https://ssl.gstatic.com/weather/conditions/v1/svg/mostly_cloudy_day_dark.svg";
const NIGHT_ICON =
    "https://ssl.gstatic.com/weather/conditions/v1/svg/partly_cloudy_night_dark.svg";

export function getGreetingPeriod(hour = new Date().getHours()): GreetingPeriod {
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
}

export function getGreetingIconUrl(hour = new Date().getHours()): string {
    return hour >= 6 && hour < 18 ? DAY_ICON : NIGHT_ICON;
}
