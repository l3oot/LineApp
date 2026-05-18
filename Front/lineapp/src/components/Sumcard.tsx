import '../styles/sum.css';

type SumcardProps = {
  icon?: string;
  title: string;
  balance: number;
  color: string;
};

export default function Sumcard({ icon, title, balance, color }: SumcardProps) {
  const lightColor = `color-mix(in srgb, ${color} 10%, white)`;
  const borderColor = `color-mix(in srgb, ${color} 28%, var(--border))`;
  const textColor = `color-mix(in srgb, ${color} 84%, #101910)`;
  const iconBg = `color-mix(in srgb, ${color} 18%, white)`;
  const isImageIcon = !!icon && (icon.startsWith("http://") || icon.startsWith("https://"));

  return (
    <div
      style={{ backgroundColor: lightColor, borderColor: borderColor }}
      className="rounded-[var(--radius-card)] border overflow-hidden flex flex-col items-start px-3 py-3 shadow-[var(--shadow-soft)]">
      <div
        className="mb-2 flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBg }}
      >
        {isImageIcon ? (
          <img src={icon} alt="" className='w-6 opacity-95' />
        ) : (
          <span className="text-2xl leading-none">{icon}</span>
        )}
      </div>
      <p className="text-xs font-semibold" style={{ color: textColor }}>{title}</p>
      <h1 className="font-bold" style={{ color: textColor }}>{balance.toLocaleString()}</h1>
    </div>
  );
}