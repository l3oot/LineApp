import { useEffect, useRef, useState } from "react";

/** Demo mirrors Back/.../line/flex/transaction.json field map */
const USER_TEXT = "ซื้อปุ๋ยข้าวโพด 5000";
/** Same asset as transaction.json hero image (cached in public/) */
const FLEX_HERO = "/flex-transaction-banner.jpg";

const DEMO = {
    typeLabel: "รายจ่าย",
    typeColor: "#C82333",
    main: "ซื้อปุ๋ยข้าวโพด",
    categoryName: "ค่าปุ๋ย",
    cycleName: "ข้าวโพด",
    txDateTime: "26 ก.ย. 2569 | 09:04",
    price: "5,000",
    amountColor: "#C82333",
    coinLine: "ได้เหรียญสะสม +5 🪙",
} as const;

type Phase =
    | "idle"
    | "typing-user"
    | "user-sent"
    | "bot-typing"
    | "flex"
    | "hold";

/**
 * Hero proof: type a farm expense in LINE, then receive the transaction flex bubble.
 */
export default function ChatDemo() {
    const [phase, setPhase] = useState<Phase>("idle");
    const [typed, setTyped] = useState("");
    const timers = useRef<number[]>([]);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const clearAll = () => {
            for (const id of timers.current) window.clearTimeout(id);
            timers.current = [];
        };

        const wait = (ms: number, fn: () => void) => {
            timers.current.push(window.setTimeout(fn, ms));
        };

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) {
            setTyped(USER_TEXT);
            setPhase("flex");
            return clearAll;
        }

        const run = () => {
            clearAll();
            setTyped("");
            setPhase("idle");

            wait(400, () => {
                setPhase("typing-user");
                let i = 0;
                const tick = () => {
                    i += 1;
                    setTyped(USER_TEXT.slice(0, i));
                    if (i < USER_TEXT.length) {
                        wait(55 + (i % 3) * 18, tick);
                        return;
                    }
                    wait(380, () => {
                        setPhase("user-sent");
                        wait(520, () => {
                            setPhase("bot-typing");
                            wait(900, () => {
                                setPhase("flex");
                                wait(5200, () => {
                                    setPhase("hold");
                                    wait(900, run);
                                });
                            });
                        });
                    });
                };
                tick();
            });
        };

        run();
        return clearAll;
    }, []);

    useEffect(() => {
        const el = logRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [phase, typed]);

    const showUserBubble =
        phase === "user-sent" || phase === "bot-typing" || phase === "flex" || phase === "hold";
    const showComposer = phase === "typing-user" || phase === "idle";
    const showTyping = phase === "bot-typing";
    const showFlex = phase === "flex" || phase === "hold";

    return (
        <div className="mk-chat" aria-label="ตัวอย่างการจดรายการกับยายเภาบน LINE">
            <div className="mk-chat__chrome">
                <div className="mk-chat__bar">
                    <img src="/yaiphao.png" alt="" width={28} height={28} className="mk-chat__avatar" />
                    <div className="mk-chat__bar-text">
                        <strong>ยายเภา</strong>
                        <span>จดบัญชีฟาร์ม</span>
                    </div>
                </div>

                <div
                    ref={logRef}
                    className="mk-chat__log"
                    role="log"
                    aria-live="polite"
                    aria-relevant="additions"
                >
                    <span className="mk-chat__day">วันนี้</span>

                    {showUserBubble ? (
                        <div className="mk-chat__row mk-chat__row--me">
                            <div className="mk-chat__bubble mk-chat__bubble--me">{USER_TEXT}</div>
                        </div>
                    ) : null}

                    {showTyping ? (
                        <div className="mk-chat__row mk-chat__row--bot">
                            <img src="/yaiphao.png" alt="" width={28} height={28} className="mk-chat__avatar" />
                            <div
                                className="mk-chat__bubble mk-chat__bubble--bot mk-chat__typing"
                                aria-label="ยายกำลังพิมพ์"
                            >
                                <span />
                                <span />
                                <span />
                            </div>
                        </div>
                    ) : null}

                    {showFlex ? (
                        <div className="mk-chat__row mk-chat__row--bot mk-chat__row--flex">
                            <img src="/yaiphao.png" alt="" width={28} height={28} className="mk-chat__avatar" />
                            <article className="mk-flex-card" aria-label="Flex บันทึกรายการ">
                                <div className="mk-flex-card__banner">
                                    <img
                                        src={FLEX_HERO}
                                        alt="บันทึกรายการแล้วจ้า!"
                                        width={400}
                                        height={140}
                                        decoding="async"
                                    />
                                </div>

                                <dl className="mk-flex-card__rows">
                                    <div>
                                        <dt>ประเภท</dt>
                                        <dd style={{ color: DEMO.typeColor }}>{DEMO.typeLabel}</dd>
                                    </div>
                                    <div>
                                        <dt>รายการ</dt>
                                        <dd>{DEMO.main}</dd>
                                    </div>
                                    <div>
                                        <dt>หมวดหมู่</dt>
                                        <dd>{DEMO.categoryName}</dd>
                                    </div>
                                    <div>
                                        <dt>รอบ</dt>
                                        <dd>{DEMO.cycleName}</dd>
                                    </div>
                                    <div>
                                        <dt>วันที่</dt>
                                        <dd>{DEMO.txDateTime}</dd>
                                    </div>
                                    <div className="mk-flex-card__amount-row">
                                        <dt>จำนวน</dt>
                                        <dd style={{ color: DEMO.amountColor }}>{DEMO.price}</dd>
                                    </div>
                                </dl>

                                <p className="mk-flex-card__coin">{DEMO.coinLine}</p>

                                <footer className="mk-flex-card__footer">
                                    <button type="button" className="mk-flex-card__btn mk-flex-card__btn--edit" tabIndex={-1}>
                                        แก้ไข
                                    </button>
                                    <button type="button" className="mk-flex-card__btn mk-flex-card__btn--delete" tabIndex={-1}>
                                        ลบ
                                    </button>
                                </footer>
                            </article>
                        </div>
                    ) : null}
                </div>

                <div className="mk-chat__composer" aria-hidden={!showComposer}>
                    <div className={`mk-chat__input${phase === "typing-user" ? " is-typing" : ""}`}>
                        {phase === "typing-user" ? (
                            <>
                                <span>{typed}</span>
                                <span className="mk-chat__caret" />
                            </>
                        ) : (
                            <span className="mk-chat__placeholder">พิมพ์ข้อความ…</span>
                        )}
                    </div>
                    <span
                        className={`mk-chat__send${phase === "typing-user" && typed.length > 0 ? " is-ready" : ""}`}
                    >
                        ส่ง
                    </span>
                </div>
            </div>
        </div>
    );
}
