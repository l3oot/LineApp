import { Link } from "react-router-dom";
import { FaLandmark } from "react-icons/fa";
import { LuClipboardList, LuCloudSun } from "react-icons/lu";
import AssetPlaceholder from "../../components/marketing/AssetPlaceholder";
import { appPath } from "../../lib/appPaths";
import heroBg from "../../assets/index/bg.png";
import lineChat from "../../assets/index/line.png";
import lineWeb from "../../assets/index/line1.png";
import lineAi from "../../assets/index/line2.png";

export default function MarketingHome() {
    return (
        <>
            <section
                className="mk-hero mk-hero--bg"
                style={{ ["--mk-hero-bg" as string]: `url(${heroBg})` }}
            >
                <div className="mk-shell mk-hero__grid">
                    <div className="mk-hero__copy">
                        <span className="mk-eyebrow">บัญชีฟาร์มบน LINE</span>
                        <h1>
                            ยายเภา
                            <span className="mk-dim"> จดรายรับรายจ่ายง่าย ๆ รู้กำไรต่อรอบปลูก</span>
                        </h1>
                        <p className="mk-hero__lead">
                            พิมพ์บอกยายเหมือนแชทเพื่อน หรือเปิดเว็บดูสรุป — แยกหมวด ติดตามต้นทุน
                            และเห็นผลกำไรจริงของแต่ละรอบการเกษตร
                        </p>
                        <div className="mk-hero__cta">
                            <Link to={appPath()} className="mk-btn mk-btn--primary mk-btn--lg">
                                เริ่มใช้งานเว็บ
                            </Link>
                            <a
                                href="#features"
                                className="mk-btn mk-btn--ghost mk-btn--lg"
                            >
                                ดูฟีเจอร์
                            </a>
                        </div>
                        <div className="mk-stats" aria-label="จุดเด่น">
                            <div>
                                <div className="mk-stat__value">รอบปลูก</div>
                                <div className="mk-stat__label">แยกรายรับ-ต้นทุนต่อรอบ</div>
                            </div>
                            <div>
                                <div className="mk-stat__value">LINE</div>
                                <div className="mk-stat__label">จดได้จากแชททุกวัน</div>
                            </div>
                            <div>
                                <div className="mk-stat__value">AI</div>
                                <div className="mk-stat__label">สรุปเงินหายไปไหน</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="features" className="mk-section">
                <div className="mk-shell">
                    <div className="mk-section__head">
                        <h2>จดบัญชีฟาร์มได้หลายทาง</h2>
                        <p>
                            เลือกวิธีที่เข้ากับงานในแปลง — พิมพ์บน LINE เปิดเว็บดูสรุป
                            หรือดูราคาและอากาศประกอบการตัดสินใจ
                        </p>
                    </div>

                    <div className="mk-feature-grid">
                        <article className="mk-feature">
                            <span className="mk-feature__index">1</span>
                            <h3>พิมพ์เหมือนคุยยาย</h3>
                            <p>ส่งข้อความสั้น ๆ เช่น “ซื้อปุ๋ย 1200” แล้วยายจดและแยกหมวดให้</p>
                        </article>
                        <article className="mk-feature">
                            <span className="mk-feature__index">2</span>
                            <h3>ดูกำไรต่อรอบปลูก</h3>
                            <p>รายรับลบต้นทุนต่อรอบ — รู้ว่ารอบไหนคุ้ม และเงินรั่วตรงไหน</p>
                        </article>
                        <article className="mk-feature">
                            <span className="mk-feature__index">3</span>
                            <h3>ราคาอากาศติดมือ</h3>
                            <p>เช็คราคาสินค้าเกษตร พยากรณ์อากาศ และเบอร์หน่วยงาน ในแอปเดียวกัน</p>
                        </article>
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section--tight">
                <div className="mk-shell" style={{ display: "grid", gap: "3rem" }}>
                    <div className="mk-split">
                        <AssetPlaceholder
                            aspect="auto"
                            src={lineChat}
                            label="ตัวอย่างแชทจดรายการกับยายเภาบน LINE"
                        />
                        <div className="mk-split__copy">
                            <h3>จดบน LINE ไม่ต้องเปิดแอปหลายตัว</h3>
                            <p>
                                อยู่แปลงหรืออยู่บ้าน ก็พิมพ์บอกยายได้ทันที
                                เหมาะกับพฤติกรรมที่ใช้ LINE อยู่แล้วทุกวัน
                            </p>
                            <ul className="mk-list">
                                <li>จดรายรับ-รายจ่ายด้วยข้อความ</li>
                                <li>แยกหมวดอัตโนมัติตามบริบทฟาร์ม</li>
                                <li>กลับมาดูสรุปบนเว็บเมื่อพร้อม</li>
                            </ul>
                        </div>
                    </div>

                    <div className="mk-split mk-split--flip">
                        <AssetPlaceholder
                            aspect="auto"
                            src={lineWeb}
                            label="สรุปรอบปลูกและกำไรจริงบนเว็บยายเภา"
                        />
                        <div className="mk-split__copy">
                            <h3>เว็บสรุปให้เห็นภาพรวมชัด</h3>
                            <p>
                                เปิดดูรายการ กราฟ และรอบการเกษตรได้เต็มจอ
                                ส่งออกข้อมูลต่อเมื่อต้องการวิเคราะห์เอง
                            </p>
                            <ul className="mk-list">
                                <li>แยกรอบปลูก / แปลง</li>
                                <li>กราฟและสรุปรายเดือน</li>
                                <li>Export Excel / PDF</li>
                            </ul>
                        </div>
                    </div>

                    <div className="mk-split">
                        <AssetPlaceholder
                            aspect="auto"
                            src={lineAi}
                            label="ยายสรุปด้วย AI — บอกว่าเงินหายไปไหน"
                        />
                        <div className="mk-split__copy">
                            <h3>ยายช่วยสรุปว่าเงินหายไปไหน</h3>
                            <p>
                                ไม่ใช่แค่จดตัวเลข — ได้คำอธิบายสั้น ๆ ว่าต้นทุนไหนสูง
                                และรอบนี้ผลเป็นอย่างไร
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section">
                <div className="mk-shell">
                    <div className="mk-section__head">
                        <h2>เครื่องมือคู่ใจชาวนา</h2>
                        <p>นอกจากบัญชี ยายเภาช่วยเรื่องที่ต้องรู้ก่อนตัดสินใจในแต่ละวัน</p>
                    </div>
                    <div className="mk-feature-grid">
                        <article className="mk-feature">
                            <span className="mk-feature__icon" aria-hidden>
                                <LuClipboardList size={22} />
                            </span>
                            <h3>ราคาสินค้าเกษตร</h3>
                            <p>ดูราคารายวันจากแหล่งข้อมูลกลาง ก่อนตัดสินใจขาย</p>
                        </article>
                        <article className="mk-feature">
                            <span className="mk-feature__icon mk-feature__icon--sky" aria-hidden>
                                <LuCloudSun size={22} />
                            </span>
                            <h3>พยากรณ์อากาศ</h3>
                            <p>วางแผนฉีดพ่น เก็บเกี่ยว หรือเลื่อนงานตามสภาพอากาศ</p>
                        </article>
                        <article className="mk-feature">
                            <span className="mk-feature__icon mk-feature__icon--pink" aria-hidden>
                                <FaLandmark size={20} />
                            </span>
                            <h3>ติดต่อหน่วยงาน</h3>
                            <p>เบอร์สายด่วนและหน่วยงานเกษตร รวมไว้ที่เดียว</p>
                        </article>
                    </div>
                </div>
            </section>

            <section className="mk-shell">
                <div className="mk-cta-band">
                    <h2>เริ่มจดกับยายเภาวันนี้</h2>
                    <p>เห็นว่าเงินในฟาร์มไปไหน และกำไรต่อรอบปลูกเป็นเท่าไร</p>
                    <div className="mk-hero__cta" style={{ justifyContent: "center" }}>
                        <Link to={appPath()} className="mk-btn mk-btn--primary mk-btn--lg">
                            เข้าใช้งานเว็บ
                        </Link>
                        <Link to="/about" className="mk-btn mk-btn--ghost mk-btn--lg">
                            รู้จักยายเภา
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}
