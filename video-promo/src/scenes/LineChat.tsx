import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { LogoMark } from "../components/LogoMark";
import { PhoneShell } from "../components/PhoneShell";
import { SceneColumn } from "../components/SceneColumn";
import { Stage } from "../components/Stage";
import { rise, sceneOpacity } from "../motion";
import { beat, color, fonts } from "../theme";

const USER_TEXT = "ซื้อปุ๋ยข้าวโพด 5000";

const FLEX_ROWS = [
  { dt: "ประเภท", dd: "รายจ่าย", color: color.chili },
  { dt: "รายการ", dd: "ซื้อปุ๋ยข้าวโพด" },
  { dt: "หมวดหมู่", dd: "ค่าปุ๋ย" },
  { dt: "รอบ", dd: "ข้าวโพด" },
  { dt: "วันที่", dd: "26 ก.ย. 2569 | 09:04" },
  { dt: "จำนวน", dd: "5,000", amount: true },
] as const;

export const LineChat: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = rise(frame, fps, 2, 18);
  const phone = rise(frame, fps, 10, 28, 16);

  const typedCount = Math.round(
    interpolate(frame, [beat.chat.typeStart, beat.chat.typeEnd], [0, USER_TEXT.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const typed = USER_TEXT.slice(0, typedCount);
  const sent = frame >= beat.chat.send;
  const botTyping = frame >= beat.chat.botStart && frame < beat.chat.botEnd;
  const showFlex = frame >= beat.chat.flex;
  const typing = frame >= beat.chat.typeStart && frame < beat.chat.send;

  return (
    <Stage>
      <AbsoluteFill style={{ opacity: sceneOpacity(frame, durationInFrames, 10) }}>
        <SceneColumn
          copy={
            <div style={copy}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: fonts.mali,
                  fontWeight: 700,
                  fontSize: 56,
                  lineHeight: 1.18,
                  letterSpacing: "-0.02em",
                  color: color.ink,
                }}
              >
                พิมพ์เหมือนคุยยาย
              </h2>
              <p
                style={{
                  margin: "14px auto 0",
                  fontSize: 26,
                  lineHeight: 1.45,
                  color: color.inkSoft,
                  maxWidth: 820,
                }}
              >
                ส่ง “ซื้อปุ๋ย 1200” แล้วยายจดและแยกหมวดให้
              </p>
            </div>
          }
          proof={
            <div style={phone}>
              <PhoneShell
                width={540}
                height={980}
                bar={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      background: color.surface,
                      borderBottom: `1px solid ${color.border}`,
                    }}
                  >
                    <LogoMark size={36} />
                    <div>
                      <div
                        style={{
                          fontFamily: fonts.mali,
                          fontWeight: 700,
                          fontSize: 20,
                          color: color.ink,
                          lineHeight: 1.1,
                        }}
                      >
                        ยายเภา
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: color.inkSoft }}>
                        จดบัญชีฟาร์ม
                      </div>
                    </div>
                  </div>
                }
              >
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    background: "#E8F0EA",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: "16px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        alignSelf: "center",
                        background: "rgba(255,255,255,0.72)",
                        color: color.inkSoft,
                        fontSize: 14,
                        fontWeight: 600,
                        padding: "4px 12px",
                        borderRadius: 99,
                      }}
                    >
                      วันนี้
                    </div>

                    {sent ? (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div
                          style={{
                            background: color.lineGreen,
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: 20,
                            padding: "12px 16px",
                            borderRadius: 18,
                            borderBottomRightRadius: 6,
                            maxWidth: 340,
                          }}
                        >
                          {USER_TEXT}
                        </div>
                      </div>
                    ) : null}

                    {botTyping ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                        <LogoMark size={30} />
                        <div
                          style={{
                            background: "#fff",
                            borderRadius: 16,
                            padding: "14px 16px",
                            display: "flex",
                            gap: 6,
                          }}
                        >
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 99,
                                background: "#9AAB9F",
                                opacity: 0.35 + 0.65 * Math.abs(Math.sin((frame + i * 6) / 7)),
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {showFlex ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <LogoMark size={30} />
                        <article
                          style={{
                            width: 400,
                            background: "#fff",
                            borderRadius: 12,
                            overflow: "hidden",
                            border: "1px solid rgba(0,0,0,0.06)",
                            boxShadow: "0 5px 14px rgba(26,46,36,0.10)",
                          }}
                        >
                          <Img
                            src={staticFile("flex-transaction-banner.jpg")}
                            style={{ width: "100%", height: 118, objectFit: "cover" }}
                          />
                          <dl style={{ margin: 0, padding: "10px 14px 4px" }}>
                            {FLEX_ROWS.map((row, index) => {
                              const visible = frame > beat.chat.rowStart + index * beat.chat.rowStep;
                              return (
                                <div
                                  key={row.dt}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "72px 1fr",
                                    gap: 8,
                                    opacity: visible ? 1 : 0,
                                    minHeight: 26,
                                    alignItems: "center",
                                  }}
                                >
                                  <dt
                                    style={{
                                      margin: 0,
                                      fontSize: 14,
                                      fontWeight: 500,
                                      color: "#6E7A72",
                                    }}
                                  >
                                    {row.dt}
                                  </dt>
                                  <dd
                                    style={{
                                      margin: 0,
                                      fontSize: "amount" in row && row.amount ? 26 : 15,
                                      fontWeight: "amount" in row && row.amount ? 800 : 600,
                                      color: "color" in row ? row.color : "#333",
                                      textAlign: "right",
                                    }}
                                  >
                                    {row.dd}
                                  </dd>
                                </div>
                              );
                            })}
                          </dl>
                          <p
                            style={{
                              margin: "4px 12px 10px",
                              textAlign: "center",
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#669C5B",
                              opacity: frame > beat.chat.coins ? 1 : 0,
                            }}
                          >
                            ได้เหรียญสะสม +5
                          </p>
                          <footer
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 8,
                              padding: "10px 12px 12px",
                              borderTop: "1px solid rgba(0,0,0,0.08)",
                              opacity: frame > beat.chat.buttons ? 1 : 0,
                            }}
                          >
                            <span
                              style={{
                                height: 34,
                                borderRadius: 8,
                                background: "#669C5B",
                                color: "#fff",
                                fontSize: 15,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              แก้ไข
                            </span>
                            <span
                              style={{
                                height: 34,
                                borderRadius: 8,
                                background: color.chili,
                                color: "#fff",
                                fontSize: 15,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              ลบ
                            </span>
                          </footer>
                        </article>
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 14px 16px",
                      background: "#fff",
                      borderTop: `1px solid ${color.border}`,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minHeight: 44,
                        borderRadius: 22,
                        background: color.surfaceSoft,
                        display: "flex",
                        alignItems: "center",
                        padding: "0 16px",
                        fontSize: 18,
                        color: typing ? color.ink : color.moss,
                      }}
                    >
                      {typing ? typed : "พิมพ์ข้อความ…"}
                      {typing ? (
                        <span
                          style={{
                            width: 2,
                            height: 20,
                            marginLeft: 2,
                            background: color.ink,
                            opacity: frame % 16 < 8 ? 1 : 0,
                          }}
                        />
                      ) : null}
                    </div>
                    <span
                      style={{
                        padding: "10px 16px",
                        borderRadius: 99,
                        background: typing && typed.length > 0 ? color.lineGreen : color.surfaceSoft,
                        color: typing && typed.length > 0 ? "#fff" : color.moss,
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      ส่ง
                    </span>
                  </div>
                </div>
              </PhoneShell>
            </div>
          }
        />
      </AbsoluteFill>
    </Stage>
  );
};
