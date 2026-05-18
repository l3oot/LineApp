import { calpercentused, calbgcolor, calPnL } from "../utils/Sumfun";
import { icons } from "../assets/Iconlist";
import { useTranslation } from "react-i18next";
type IconName = keyof typeof icons;

type CyclecardProps = {
    icon: IconName;
    title: string;
    balance: number;
    length: string;
    balanceused: number;
};

export default function Cyclecard({ icon, title, balance, length, balanceused }: CyclecardProps) {
    const { t } = useTranslation();
    const percent = calpercentused(balanceused, balance);
    let bgcolor = calbgcolor(percent);
    let PnL = calPnL(percent);
    const safePercent = Math.min(100, Math.max(0, percent));

    return (
        <div style={{ backgroundColor: bgcolor }} className="hero w-full border border-white/20 rounded-[var(--radius-card)] overflow-hidden flex flex-col items-start shadow-[var(--shadow-soft)]">
            <div className="w-full px-4 flex flex-row items-center justify-between">
                <div className="mt-3 mb-1 flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full text-3xl bg-white/20">
                        {icons[icon]}
                    </div>
                    <p className="text-md text-white font-semibold">{title}</p>
                </div>
                <div className="bg-white/20 rounded-full px-2.5 py-1 ml-3 mt-3 mb-1">
                    <p className="text-xs font-bold text-white">{t(`pnl.${PnL}`)}</p>
                </div>
            </div>
            <h1 className="text-4xl font-bold ml-4 mb-1 text-white">{balance.toLocaleString()}</h1>
            <p className='ml-4 text-sm text-white/85'>{length}</p>
            <div className="mt-2 w-full px-4 flex flex-row mb-1 items-center justify-between">
                <p className="text-sm text-white/90">{t("cyclecard.usedBudgetLine", { amount: balanceused.toLocaleString() })}</p>
                <p className='text-sm ml-3 text-white'>{percent.toFixed(0)}%</p>
            </div>
            <div className="w-full px-4 mb-4">
                <div className="w-full h-1 bg-white/20 rounded-full">
                    <div
                        className="h-full bg-white rounded-full"
                        style={{ width: `${safePercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}