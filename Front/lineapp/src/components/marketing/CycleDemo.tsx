/**
 * Static phone mock of /app cycle — add-crop button + one crop card.
 */

const CROP = {
    icon: "🌽",
    title: "ข้าวโพด",
    statusLabel: "กำไร",
    range: "ก.ย. – ธ.ค. 2569",
    daysLeft: "จะถึงใน 42 วัน",
    capital: "50,000",
    income: "18,500",
    expense: "22,000",
    remaining: "46,500",
    usedPct: 44,
    barColor: "#25A247",
} as const;

export default function CycleDemo() {
    return (
        <div className="mk-cycle-demo" aria-label="ตัวอย่างหน้ารอบพืชในแอปยายเภา">
            <div className="mk-cycle-demo__phone">
                <div className="mk-cycle-demo__add" aria-hidden>
                    <span className="mk-cycle-demo__add-icon">+</span>
                    <span>เพิ่มพืช</span>
                </div>

                <div className="mk-cycle-demo__list">
                    <article className="mk-cycle-demo__card">
                        <div className="mk-cycle-demo__card-top">
                            <div className="mk-cycle-demo__icon" aria-hidden>
                                {CROP.icon}
                            </div>
                            <div className="mk-cycle-demo__info">
                                <h3 className="mk-cycle-demo__crop-title">{CROP.title}</h3>
                                <span className="mk-cycle-demo__status mk-cycle-demo__status--profit">
                                    {CROP.statusLabel}
                                </span>
                                <p className="mk-cycle-demo__meta">
                                    <span>{CROP.range}</span>
                                    <span>{CROP.daysLeft}</span>
                                </p>
                            </div>
                        </div>

                        <div className="mk-cycle-demo__stats">
                            <div className="mk-cycle-demo__stat">
                                <span className="mk-cycle-demo__stat-label">ทุน</span>
                                <span className="mk-cycle-demo__stat-value">{CROP.capital}</span>
                            </div>
                            <div className="mk-cycle-demo__stat mk-cycle-demo__stat--wide">
                                <span className="mk-cycle-demo__stat-label">รับ / จ่าย</span>
                                <span className="mk-cycle-demo__stat-value">
                                    {CROP.income} / {CROP.expense}
                                </span>
                            </div>
                            <div className="mk-cycle-demo__stat">
                                <span className="mk-cycle-demo__stat-label">คงเหลือ</span>
                                <span className="mk-cycle-demo__stat-value mk-cycle-demo__stat-value--remain">
                                    {CROP.remaining}
                                </span>
                            </div>
                            <div className="mk-cycle-demo__stat">
                                <span className="mk-cycle-demo__stat-label">งบใช้ไป</span>
                                <div className="mk-cycle-demo__bar" aria-hidden>
                                    <div
                                        className="mk-cycle-demo__bar-fill"
                                        style={{
                                            width: `${CROP.usedPct}%`,
                                            backgroundColor: CROP.barColor,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mk-cycle-demo__card-foot" aria-hidden>
                            <span className="mk-cycle-demo__chip">สรุป</span>
                            <span className="mk-cycle-demo__more">
                                เพิ่มเติม
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                >
                                    <path d="M9 6l6 6-6 6" />
                                </svg>
                            </span>
                        </div>
                    </article>
                </div>
            </div>
        </div>
    );
}
