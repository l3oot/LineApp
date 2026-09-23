import { Link } from "react-router-dom";
import AssetPlaceholder from "../../components/marketing/AssetPlaceholder";
import StoryCarousel from "../../components/marketing/StoryCarousel";
import { appPath } from "../../lib/appPaths";

export default function AboutPage() {
    return (
        <div className="mk-content">
            <div className="mk-shell">
                <h1 className="mk-content__title">เกี่ยวกับยายเภา</h1>
                <p className="mk-content__meta">บัญชีฟาร์มที่คุยด้วยภาษาคน — ไม่ต้องเป็นนักบัญชี</p>

                <div className="mk-split" style={{ marginBottom: "3rem" }}>
                    <div className="mk-prose">
                        <p>
                            <strong>ยายเภา</strong> คือระบบจดรายรับ-รายจ่ายสำหรับการเกษตร
                            ที่ออกแบบมาให้ใช้งานง่ายทั้งบน LINE และบนเว็บ
                            เป้าหมายคือให้เกษตรกรเห็นกำไรจริงต่อรอบปลูก ไม่ใช่แค่ตัวเลขรายวัน
                        </p>
                        <p>
                            เราเชื่อว่าการจดบัญชีไม่ควรเป็นภาระ — ควรเป็นนิสัยเล็ก ๆ
                            ที่ช่วยให้ตัดสินใจเรื่องต้นทุน ราคาขาย และเวลาเก็บเกี่ยวได้ดีขึ้น
                        </p>
                        <h2>ยายเภาช่วยอะไรบ้าง</h2>
                        <ul>
                            <li>จดรายการผ่านแชท LINE หรือดูสรุปบนเว็บ</li>
                            <li>แยกรอบปลูก / แปลง เพื่อเทียบผลระหว่างรอบ</li>
                            <li>สรุปด้วย AI ว่าเงินหมดไปกับอะไร</li>
                            <li>ดูราคาสินค้าเกษตร พยากรณ์อากาศ และเบอร์หน่วยงาน</li>
                        </ul>
                        <p style={{ marginTop: "1.5rem" }}>
                            <Link to={appPath()} className="mk-btn mk-btn--primary">
                                เข้าใช้งานแอป
                            </Link>
                        </p>
                    </div>
                    <AssetPlaceholder
                        aspect="auto"
                        src="/yaiphao.png"
                        framed={false}
                        label="โลโก้ยายเภา"
                    />
                </div>

                <div className="mk-section__head">
                    <h2>ทำไมถึงสร้างยายเภา</h2>
                    <p>
                        ชาวนาจดบัญชียากเพราะเครื่องมือส่วนใหญ่ไม่เข้ากับชีวิตจริงในแปลง
                        ยายเภาเลยอยู่บน LINE ที่ใช้ทุกวัน และสรุปเป็นภาษาง่าย ๆ
                    </p>
                </div>

                <StoryCarousel />
            </div>
        </div>
    );
}
