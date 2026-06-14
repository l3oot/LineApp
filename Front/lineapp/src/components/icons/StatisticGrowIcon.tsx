type StatisticGrowIconProps = {
    color?: string;
    className?: string;
};

export default function StatisticGrowIcon({
    color = "#2f8f4e",
    className = "h-6 w-6",
}: StatisticGrowIconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
            <path
                d="M21,5l-7,7L8,9,3,15m18-5V5H16"
                fill="none"
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
            />
            <line
                x1="3"
                y1="19"
                x2="21"
                y2="19"
                fill="none"
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
            />
        </svg>
    );
}
