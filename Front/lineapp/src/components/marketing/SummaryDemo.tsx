import grannyLogo from "../../assets/logosum.png";

/** Demo copy mirrors a typical AI cycle summary for the corn crop card. */
const DEMO_SUMMARY =
    "รอบข้าวโพดนี้ทุน 50,000 บาท จ่ายไปแล้ว 22,000 ส่วนใหญ่เป็นค่าปุ๋ยกับน้ำมัน\n" +
    "รายรับยังมี 18,500 คงเหลือประมาณ 46,500 — ยังอยู่ในเกณฑ์กำไร\n" +
    "ถ้าจะประหยัดรอบหน้า ลองดูค่าปุ๋ยก่อนจ้า มันกินงบไปเยอะสุด";

/**
 * Static mock of CycleSummaryModal (ปุ่มสรุปบนหน้ารอบพืช /app).
 */
export default function SummaryDemo() {
    return (
        <div className="mk-summary-demo" aria-label="ตัวอย่างป๊อปอัปสรุปรอบพืชจากยายเภา">
            <div className="mk-summary-demo__modal" role="presentation">
                <div className="mk-summary-demo__hero">
                    <span className="mk-summary-demo__close" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </span>
                    <div className="mk-summary-demo__avatar">
                        <img src={grannyLogo} alt="" className="mk-summary-demo__avatar-face" />
                    </div>
                    <h3 className="mk-summary-demo__title">สรุปรอบนี้ให้ฟังจ้า</h3>
                    <span className="mk-summary-demo__chip">ข้าวโพด</span>
                </div>

                <div className="mk-summary-demo__body">
                    <blockquote className="mk-summary-demo__bubble">
                        <p className="mk-summary-demo__text">{DEMO_SUMMARY}</p>
                    </blockquote>
                    <span className="mk-summary-demo__done" aria-hidden>
                        เข้าใจแล้วจ้า
                    </span>
                </div>
            </div>
        </div>
    );
}
