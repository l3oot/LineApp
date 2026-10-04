import { useState, type FormEvent } from "react";
import AssetPlaceholder from "../../components/marketing/AssetPlaceholder";
import Reveal from "../../components/marketing/Reveal";
import { LINE_ADD_FRIEND_URL } from "../../lib/lineOfficial";
import lineQr from "../../assets/index/L_gainfriends_2dbarcodes_GW.png";

const CONTACT_EMAIL = "chutiman222@gmail.com";

export default function ContactPage() {
    const [sent, setSent] = useState(false);

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        const name = String(data.get("name") ?? "").trim();
        const email = String(data.get("email") ?? "").trim();
        const message = String(data.get("message") ?? "").trim();

        const subject = encodeURIComponent(`[ยายเภา] ข้อความจาก ${name}`);
        const body = encodeURIComponent(
            `ชื่อ: ${name}\nอีเมล: ${email}\n\nข้อความ:\n${message}`,
        );
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
        setSent(true);
    };

    return (
        <div className="mk-content">
            <div className="mk-shell">
                <Reveal as="header" className="mk-content__mast">
                    <h1 className="mk-content__title">ติดต่อยายเภา</h1>
                    <p className="mk-content__meta">
                        มีคำถามเรื่องจดรายรับรายจ่ายเกษตร ข้อเสนอแนะ หรืออยากร่วมงาน — บอกยายมาได้เลย
                    </p>
                </Reveal>

                <Reveal delay={60}>
                    <dl className="mk-ledger">
                        <div className="mk-ledger__row">
                            <dt>อีเมล</dt>
                            <dd>
                                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                            </dd>
                        </div>
                        <div className="mk-ledger__row">
                            <dt>LINE Official</dt>
                            <dd>เพิ่มเพื่อนยายเภาบน LINE เพื่อสอบถามหรือเริ่มจดบัญชี</dd>
                        </div>
                    </dl>
                </Reveal>

                <Reveal className="mk-split" delay={100}>
                    <div className="mk-ledger-paper">
                        <h2 className="mk-form__title">ส่งข้อความถึงเรา</h2>
                        {sent ? (
                            <div className="mk-prose">
                                <p style={{ color: "var(--mk-leaf-deep)" }}>
                                    เปิดแอปอีเมลให้แล้ว — ส่งถึง {CONTACT_EMAIL} ได้เลย
                                </p>
                                <button
                                    type="button"
                                    className="mk-btn mk-btn--ghost"
                                    onClick={() => setSent(false)}
                                >
                                    เขียนข้อความใหม่
                                </button>
                            </div>
                        ) : (
                            <form className="mk-form" onSubmit={onSubmit}>
                                <div className="mk-field">
                                    <label htmlFor="contact-name">ชื่อ</label>
                                    <input id="contact-name" name="name" type="text" required autoComplete="name" />
                                </div>
                                <div className="mk-field">
                                    <label htmlFor="contact-email">อีเมล</label>
                                    <input
                                        id="contact-email"
                                        name="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                                <div className="mk-field">
                                    <label htmlFor="contact-message">ข้อความ</label>
                                    <textarea id="contact-message" name="message" required />
                                </div>
                                <button type="submit" className="mk-btn mk-btn--primary">
                                    ส่งข้อความ
                                </button>
                            </form>
                        )}
                    </div>

                    <aside className="mk-contact-peak">
                        <a
                            href={LINE_ADD_FRIEND_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="สแกน QR หรือเปิดลิงก์เพิ่มเพื่อน LINE"
                        >
                            <AssetPlaceholder
                                aspect="auto"
                                src={lineQr}
                                framed={false}
                                label="QR Code เพิ่มเพื่อนยายเภาบน LINE"
                            />
                        </a>
                        <a
                            href={LINE_ADD_FRIEND_URL}
                            className="mk-btn mk-btn--line"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            เพิ่มเพื่อนบน LINE
                        </a>
                    </aside>
                </Reveal>
            </div>
        </div>
    );
}
