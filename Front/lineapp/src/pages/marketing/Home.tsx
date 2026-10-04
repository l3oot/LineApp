import { Link } from "react-router-dom";
import ChatDemo from "../../components/marketing/ChatDemo";
import CycleDemo from "../../components/marketing/CycleDemo";
import FeatureShowcases from "../../components/marketing/FeatureShowcases";
import Reveal from "../../components/marketing/Reveal";
import SummaryDemo from "../../components/marketing/SummaryDemo";
import { appPath } from "../../lib/appPaths";
import { LINE_ADD_FRIEND_URL } from "../../lib/lineOfficial";
import heroBg from "../../assets/index/bg.png";

function LineMark() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
            <path d="M12 2C6.5 2 2 5.6 2 10c0 4 3.6 7.3 8.4 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6C21.6 13.3 22 11.7 22 10c0-4.4-4.5-8-10-8Z" />
        </svg>
    );
}

export default function MarketingHome() {
    return (
        <>
            <section
                className="mk-hero mk-hero--bg mk-stage mk-stage--hero"
                style={{ ["--mk-hero-bg" as string]: `url(${heroBg})` }}
            >
                <div className="mk-shell mk-hero__grid">
                    <div className="mk-hero__copy">
                        <h1 className="mk-rise" style={{ ["--mk-rise-delay" as string]: "0.08s" }}>
                            ยายเภา
                        </h1>
                        <p
                            className="mk-hero__offer mk-rise"
                            style={{ ["--mk-rise-delay" as string]: "0.2s" }}
                        >
                            จดรายรับรายจ่ายง่าย ๆ รู้กำไรต่อรอบปลูก
                        </p>
                        <p
                            className="mk-hero__lead mk-rise"
                            style={{ ["--mk-rise-delay" as string]: "0.32s" }}
                        >
                            พิมพ์บอกยายเหมือนแชทเพื่อน หรือเปิดเว็บดูสรุป — แยกหมวด ติดตามต้นทุน
                            และเห็นผลกำไรจริงของแต่ละรอบการเกษตร
                        </p>
                        <div
                            className="mk-hero__cta mk-rise"
                            style={{ ["--mk-rise-delay" as string]: "0.44s" }}
                        >
                            <a
                                href={LINE_ADD_FRIEND_URL}
                                className="mk-btn mk-btn--line mk-btn--lg"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <LineMark />
                                เพิ่มเพื่อน
                            </a>
                        </div>
                    </div>

                    <div
                        className="mk-hero__proof mk-rise"
                        style={{ ["--mk-rise-delay" as string]: "0.36s" }}
                    >
                        <ChatDemo />
                    </div>
                </div>

                <a href="#features" className="mk-scroll-cue">
                    เลื่อนลงเพื่อดูต่อ
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </a>
                <div className="mk-wave" aria-hidden>
                    <svg viewBox="0 0 1440 72" preserveAspectRatio="none">
                        <path d="M0,72 L0,28 C240,56 480,8 720,28 C960,48 1200,12 1440,32 L1440,72 Z" />
                    </svg>
                </div>
            </section>

            <section id="features" className="mk-section mk-stage mk-stage--paper mk-anchor">
                <div className="mk-shell mk-stack mk-stack--section">
                    <Reveal className="mk-section__head mk-section__head--center">
                        <h2>จดบัญชีฟาร์มได้หลายทาง</h2>
                        <p>
                            เลือกวิธีที่เข้ากับงานในแปลง — พิมพ์บน LINE เปิดเว็บดูสรุป
                            หรือดูราคาและอากาศประกอบการตัดสินใจ
                        </p>
                    </Reveal>

                    <ol className="mk-steps">
                        <Reveal as="li" className="mk-step mk-step--peak" delay={40}>
                            <span className="mk-step__n" aria-hidden>
                                1
                            </span>
                            <div className="mk-step__body">
                                <h3>พิมพ์เหมือนคุยยาย</h3>
                                <p>ส่งข้อความสั้น ๆ เช่น “ซื้อปุ๋ย 1200” แล้วยายจดและแยกหมวดให้</p>
                            </div>
                        </Reveal>
                        <Reveal as="li" className="mk-step" delay={100}>
                            <span className="mk-step__n" aria-hidden>
                                2
                            </span>
                            <div className="mk-step__body">
                                <h3>ดูกำไรต่อรอบปลูก</h3>
                                <p>รายรับลบต้นทุนต่อรอบ — รู้ว่ารอบไหนคุ้ม และเงินรั่วตรงไหน</p>
                            </div>
                        </Reveal>
                        <Reveal as="li" className="mk-step" delay={160}>
                            <span className="mk-step__n" aria-hidden>
                                3
                            </span>
                            <div className="mk-step__body">
                                <h3>ราคาอากาศติดมือ</h3>
                                <p>เช็คราคาสินค้าเกษตร พยากรณ์อากาศ และเบอร์หน่วยงาน ในแอปเดียวกัน</p>
                            </div>
                        </Reveal>
                    </ol>
                </div>
            </section>

            <section className="mk-stage mk-stage--story mk-stage--paper" aria-labelledby="story-web">
                <div className="mk-shell">
                    <Reveal className="mk-split mk-split--flip">
                        <CycleDemo />
                        <div className="mk-split__copy">
                            <h3 id="story-web">เว็บสรุปให้เห็นภาพรวมชัด</h3>
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
                    </Reveal>
                </div>
            </section>

            <section className="mk-stage mk-stage--story" aria-labelledby="story-ai">
                <div className="mk-shell">
                    <Reveal className="mk-split">
                        <SummaryDemo />
                        <div className="mk-split__copy">
                            <h3 id="story-ai">ยายช่วยสรุปว่าเงินหายไปไหน</h3>
                            <p>
                                ไม่ใช่แค่จดตัวเลข — ได้คำอธิบายสั้น ๆ ว่าต้นทุนไหนสูง
                                และรอบนี้ผลเป็นอย่างไร
                            </p>
                        </div>
                    </Reveal>
                </div>
            </section>

            <section
                id="all-features"
                className="mk-section mk-stage mk-stage--paper"
                aria-labelledby="all-features-title"
            >
                <div className="mk-shell mk-stack mk-stack--section">
                    <Reveal className="mk-section__head mk-section__head--center">
                        <h2 id="all-features-title">ทุกอย่างที่ยายเภาทำได้</h2>
                        <p>เลือกฟีเจอร์ทางซ้าย แล้วดูตัวอย่างหน้าจอในแอปทางขวา</p>
                    </Reveal>
                    <Reveal delay={60}>
                        <FeatureShowcases />
                    </Reveal>
                </div>
            </section>

            <section className="mk-stage mk-stage--cta">
                <div className="mk-shell">
                    <Reveal>
                        <div className="mk-cta-band">
                            <h2>เริ่มจดกับยายเภาวันนี้</h2>
                            <p>เห็นว่าเงินในฟาร์มไปไหน และกำไรต่อรอบปลูกเป็นเท่าไร</p>
                            <div className="mk-hero__cta mk-cta-band__actions">
                                <Link to={appPath()} className="mk-btn mk-btn--primary mk-btn--lg">
                                    เข้าใช้งานเว็บ
                                </Link>
                                <Link to="/about" className="mk-btn mk-btn--ghost mk-btn--lg">
                                    รู้จักยายเภา
                                </Link>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>
        </>
    );
}
