import { useState, type ReactNode } from "react";
import { FaLandmark } from "react-icons/fa";
import { FiChevronDown, FiDownload, FiSearch } from "react-icons/fi";
import { LuMapPin } from "react-icons/lu";
import "../../styles/list.css";
import "../../styles/Prices.css";
import "../../styles/Weather.css";
import "../../styles/Government.css";
import "../../styles/analytic.css";

type Showcase = {
    id: string;
    title: string;
    blurb: string;
    screen: ReactNode;
};

function Phone({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="mk-show__phone">
            <header className="mk-show__phone-head">
                <h3 className="mk-show__phone-title">{title}</h3>
            </header>
            <div className="mk-show__phone-body">{children}</div>
        </div>
    );
}

function ListScreen() {
    return (
        <Phone title="รายการ">
            <div className="list-page mk-show__app">
                <div className="list-filter-card">
                    <div className="list-filter-chips">
                        <span className="list-filter-chip list-filter-chip--active list-filter-chip--all">
                            ทั้งหมด
                        </span>
                        <span className="list-filter-chip">รายรับ</span>
                        <span className="list-filter-chip">รายจ่าย</span>
                    </div>
                </div>

                <section className="list-day-card list-day-card--income">
                    <div className="list-day-card-header">
                        <span className="list-day-card-date">26 ก.ย. 2569</span>
                        <span className="list-day-card-summary">
                            <span className="list-day-card-count">3 รายการ</span>
                            <span className="list-day-card-total list-day-card-total--income">
                                +12,300
                            </span>
                            <FiChevronDown size={18} className="list-day-card-chevron" aria-hidden />
                        </span>
                    </div>
                    <div className="list-day-card-body">
                        <div className="list-tx-row list-tx-row--income">
                            <div className="list-tx-icon-wrap" aria-hidden>
                                <span className="list-tx-icon">🌽</span>
                            </div>
                            <div className="list-tx-body">
                                <div className="list-tx-title-row">
                                    <p className="list-tx-title">ขายข้าวโพด</p>
                                    <span className="list-tx-type-tag list-tx-type-tag--income">
                                        รายรับ
                                    </span>
                                </div>
                                <p className="list-tx-subtitle">ขายผลผลิต</p>
                            </div>
                            <div className="list-tx-amount-wrap">
                                <p className="list-tx-amount list-tx-amount--income">+18,500</p>
                            </div>
                        </div>
                        <div className="list-tx-row-divider">
                            <div className="list-tx-row list-tx-row--expense">
                                <div className="list-tx-icon-wrap" aria-hidden>
                                    <span className="list-tx-icon">🧪</span>
                                </div>
                                <div className="list-tx-body">
                                    <div className="list-tx-title-row">
                                        <p className="list-tx-title">ซื้อปุ๋ย</p>
                                        <span className="list-tx-type-tag list-tx-type-tag--expense">
                                            รายจ่าย
                                        </span>
                                    </div>
                                    <p className="list-tx-subtitle">ค่าปุ๋ย</p>
                                </div>
                                <div className="list-tx-amount-wrap">
                                    <p className="list-tx-amount list-tx-amount--expense">-5,000</p>
                                </div>
                            </div>
                        </div>
                        <div className="list-tx-row list-tx-row--expense">
                            <div className="list-tx-icon-wrap" aria-hidden>
                                <span className="list-tx-icon">⛽</span>
                            </div>
                            <div className="list-tx-body">
                                <div className="list-tx-title-row">
                                    <p className="list-tx-title">ค่าน้ำมัน</p>
                                    <span className="list-tx-type-tag list-tx-type-tag--expense">
                                        รายจ่าย
                                    </span>
                                </div>
                                <p className="list-tx-subtitle">ค่าขนส่ง</p>
                            </div>
                            <div className="list-tx-amount-wrap">
                                <p className="list-tx-amount list-tx-amount--expense">-1,200</p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="list-export-actions mk-show__export-row">
                    <span className="mk-show__export-btn">
                        <FiDownload size={14} aria-hidden />
                        Excel
                    </span>
                    <span className="mk-show__export-btn">
                        <FiDownload size={14} aria-hidden />
                        PDF
                    </span>
                </div>
            </div>
        </Phone>
    );
}

function AnalyticLineChart() {
    // Demo series in chart space (0–100 y, 0–100 x)
    const income = [42, 58, 50, 72, 64, 80];
    const expense = [30, 40, 36, 48, 44, 52];
    const labels = ["ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค."];
    const toPts = (vals: number[]) =>
        vals
            .map((v, i) => {
                const x = 8 + (i * 84) / (vals.length - 1);
                const y = 88 - v * 0.72;
                return `${x},${y}`;
            })
            .join(" ");

    return (
        <div className="mk-show__line-chart" aria-hidden>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mk-show__line-svg">
                {[22, 44, 66].map((y) => (
                    <line key={y} x1="6" x2="96" y1={y} y2={y} className="mk-show__line-grid" />
                ))}
                <polyline
                    points={toPts(expense)}
                    className="mk-show__line mk-show__line--expense"
                />
                <polyline
                    points={toPts(income)}
                    className="mk-show__line mk-show__line--income"
                />
                {income.map((v, i) => {
                    const x = 8 + (i * 84) / (income.length - 1);
                    const y = 88 - v * 0.72;
                    return <circle key={`in-${i}`} cx={x} cy={y} r="1.6" className="mk-show__line-dot--income" />;
                })}
                {expense.map((v, i) => {
                    const x = 8 + (i * 84) / (expense.length - 1);
                    const y = 88 - v * 0.72;
                    return <circle key={`out-${i}`} cx={x} cy={y} r="1.6" className="mk-show__line-dot--expense" />;
                })}
            </svg>
            <div className="mk-show__line-labels">
                {labels.map((label) => (
                    <span key={label}>{label}</span>
                ))}
            </div>
        </div>
    );
}

function AnalyticScreen() {
    return (
        <Phone title="วิเคราะห์">
            <div className="analytic-page mk-show__app">
                <section className="analytic-card">
                    <div className="analytic-card-body">
                        <div className="analytic-card-header">
                            <h2 className="analytic-card-title">แนวโน้มรายรับ-รายจ่าย</h2>
                        </div>

                        <div className="analytic-legend">
                            <div className="analytic-legend-item">
                                <span className="analytic-legend-dot analytic-legend-dot--income" aria-hidden />
                                <p className="analytic-legend-label">รายรับ</p>
                            </div>
                            <div className="analytic-legend-item">
                                <span className="analytic-legend-dot analytic-legend-dot--expense" aria-hidden />
                                <p className="analytic-legend-label">รายจ่าย</p>
                            </div>
                        </div>

                        <div className="analytic-chart-wrap mk-show__analytic-chart">
                            <AnalyticLineChart />
                        </div>

                        <div className="analytic-filter-bar pill-segment-track">
                            <span className="pill-control pill-control--chip pill-control--ghost analytic-filter-btn">
                                1M
                            </span>
                            <span className="pill-control pill-control--chip pill-control--ghost analytic-filter-btn is-active">
                                6M
                            </span>
                            <span className="pill-control pill-control--chip pill-control--ghost analytic-filter-btn">
                                1Y
                            </span>
                            <span className="pill-control pill-control--chip pill-control--ghost analytic-filter-btn">
                                ALL
                            </span>
                        </div>
                    </div>
                </section>
            </div>
        </Phone>
    );
}

function PricesScreen() {
    return (
        <Phone title="ราคาสินค้าเกษตร">
            <div className="prices-page mk-show__app">
                <section className="prices-card">
                    <form className="prices-search" onSubmit={(e) => e.preventDefault()}>
                        <label className="prices-search-label">ค้นหาสินค้า</label>
                        <div className="prices-search-row">
                            <div className="prices-search-input mk-show__fake-input">
                                ข้าวโพดเลี้ยงสัตว์
                            </div>
                            <span className="prices-search-btn">
                                <FiSearch size={16} aria-hidden />
                                ค้นหา
                            </span>
                        </div>
                        <div className="prices-period-track pill-segment-track">
                            <span className="pill-control pill-control--chip pill-control--ghost prices-period-btn is-active">
                                7 วัน
                            </span>
                            <span className="pill-control pill-control--chip pill-control--ghost prices-period-btn">
                                30 วัน
                            </span>
                            <span className="pill-control pill-control--chip pill-control--ghost prices-period-btn">
                                90 วัน
                            </span>
                        </div>
                        <div className="prices-suggest">
                            <span className="prices-chip is-active">ข้าวโพดเลี้ยงสัตว์</span>
                            <span className="prices-chip">ข้าวเปลือก</span>
                            <span className="prices-chip">มันสำปะหลัง</span>
                        </div>
                    </form>
                </section>

                <section className="prices-stats">
                    <article className="prices-stat">
                        <p className="prices-stat-label">ล่าสุด</p>
                        <p className="prices-stat-value">8.95</p>
                        <p className="prices-stat-meta">บาท/กก.</p>
                    </article>
                    <article className="prices-stat">
                        <p className="prices-stat-label">ต่ำสุด</p>
                        <p className="prices-stat-value">8.40</p>
                        <p className="prices-stat-meta">7 วัน</p>
                    </article>
                    <article className="prices-stat">
                        <p className="prices-stat-label">สูงสุด</p>
                        <p className="prices-stat-value">9.20</p>
                        <p className="prices-stat-meta">7 วัน</p>
                    </article>
                </section>
            </div>
        </Phone>
    );
}

function WeatherScreen() {
    return (
        <Phone title="พยากรณ์อากาศ">
            <div className="weather-page mk-show__app">
                <div className="weather-hero weather-hero--day" aria-hidden>
                    <div className="weather-hero-decor">
                        <span className="weather-hero-sun" />
                        <span className="weather-hero-cloud weather-hero-cloud--soft" />
                    </div>
                    <div className="weather-hero-top">
                        <p className="weather-hero-location">
                            <LuMapPin size={15} aria-hidden />
                            <span className="weather-hero-location-text">อำเภอเมือง · ขอนแก่น</span>
                        </p>
                    </div>
                    <div className="weather-hero-body">
                        <p className="weather-hero-temp">32°</p>
                        <p className="weather-hero-meta">
                            <span className="weather-hero-condition">มีเมฆบางส่วน</span>
                            <span className="weather-hero-humidity">ความชื้น 58%</span>
                        </p>
                    </div>
                </div>

                <section className="weather-card">
                    <p className="weather-card-title">พยากรณ์ 5 วัน</p>
                    <div className="mk-show__weather-row">
                        {[
                            ["จ.", "33°"],
                            ["อ.", "32°"],
                            ["พ.", "30°"],
                            ["พฤ.", "29°"],
                            ["ศ.", "31°"],
                        ].map(([d, t]) => (
                            <div key={d} className="mk-show__weather-day">
                                <span>{d}</span>
                                <strong>{t}</strong>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </Phone>
    );
}

function GovScreen() {
    return (
        <Phone title="ติดต่อหน่วยงาน">
            <div className="government-page mk-show__app">
                <section className="gov-section">
                    <div className="gov-card-list">
                        <article className="gov-card gov-card--green">
                            <div className="gov-card-top">
                                <span className="gov-card-icon-wrap" aria-hidden>
                                    <FaLandmark size={16} />
                                </span>
                                <div className="gov-card-heading">
                                    <h3 className="gov-card-agency">สายด่วนเกษตร</h3>
                                    <p className="gov-card-parent">กระทรวงเกษตรและสหกรณ์</p>
                                </div>
                            </div>
                            <p className="gov-card-purpose">สอบถามเรื่องพืช ปุ๋ย และโรคระบาด</p>
                            <div className="gov-card-phones">
                                <span className="gov-phone-chip">
                                    1170
                                    <span className="gov-phone-chip-badge">โทร</span>
                                </span>
                            </div>
                        </article>

                        <article className="gov-card gov-card--blue">
                            <div className="gov-card-top">
                                <span className="gov-card-icon-wrap" aria-hidden>
                                    <FaLandmark size={16} />
                                </span>
                                <div className="gov-card-heading">
                                    <h3 className="gov-card-agency">กรมส่งเสริมการเกษตร</h3>
                                </div>
                            </div>
                            <p className="gov-card-purpose">ติดต่อเจ้าหน้าที่อำเภอและจังหวัด</p>
                            <div className="gov-card-phones">
                                <span className="gov-phone-chip">
                                    02-579-0151
                                    <span className="gov-phone-chip-badge">โทร</span>
                                </span>
                            </div>
                        </article>
                    </div>
                </section>
            </div>
        </Phone>
    );
}

const SHOWCASES: Showcase[] = [
    {
        id: "list",
        title: "รายการรับ-จ่าย",
        blurb: "ดูแยกวัน กรองประเภท และส่งออก Excel / PDF",
        screen: <ListScreen />,
    },
    {
        id: "analytic",
        title: "วิเคราะห์",
        blurb: "กราฟแนวโน้มรายรับ-รายจ่ายตามช่วงเวลา",
        screen: <AnalyticScreen />,
    },
    {
        id: "prices",
        title: "ราคาสินค้าเกษตร",
        blurb: "ค้นหาและเทียบราคารายวันก่อนขาย",
        screen: <PricesScreen />,
    },
    {
        id: "weather",
        title: "พยากรณ์อากาศ",
        blurb: "สภาพอากาศตามพื้นที่ในโปรไฟล์",
        screen: <WeatherScreen />,
    },
    {
        id: "gov",
        title: "ติดต่อหน่วยงาน",
        blurb: "เบอร์สายด่วนและภาครัฐรวมไว้ที่เดียว",
        screen: <GovScreen />,
    },
];

export default function FeatureShowcases() {
    const [activeId, setActiveId] = useState(SHOWCASES[0].id);
    const active = SHOWCASES.find((item) => item.id === activeId) ?? SHOWCASES[0];

    return (
        <div className="mk-show">
            <div className="mk-show__layout">
                <nav className="mk-show__nav" aria-label="เลือกฟีเจอร์เพื่อดูตัวอย่าง">
                    {SHOWCASES.map((item) => {
                        const selected = item.id === active.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={`mk-show__nav-btn${selected ? " is-active" : ""}`}
                                onClick={() => setActiveId(item.id)}
                                aria-pressed={selected}
                            >
                                <strong>{item.title}</strong>
                                <span>{item.blurb}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="mk-show__stage" aria-live="polite">
                    <div key={active.id} className="mk-show__stage-inner">
                        {active.screen}
                    </div>
                </div>
            </div>
        </div>
    );
}
