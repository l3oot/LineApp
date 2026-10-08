import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { LogoMark } from "../components/LogoMark";
import { SceneColumn } from "../components/SceneColumn";
import { Stage } from "../components/Stage";
import { rise, sceneOpacity } from "../motion";
import { beat, color, fonts } from "../theme";

const DEMO_SUMMARY =
  "รอบข้าวโพดนี้ทุน 50,000 บาท จ่ายไปแล้ว 22,000 ส่วนใหญ่เป็นค่าปุ๋ยกับน้ำมัน\n" +
  "รายรับยังมี 18,500 คงเหลือประมาณ 46,500 — ยังอยู่ในเกณฑ์กำไร\n" +
  "ถ้าจะประหยัดรอบหน้า ลองดูค่าปุ๋ยก่อนจ้า มันกินงบไปเยอะสุด";

export const AiSummary: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = rise(frame, fps, 2, 16);
  const card = rise(frame, fps, 10, 24, 16);
  const typed = Math.round(
    interpolate(frame, [beat.summary.typeStart, beat.summary.typeEnd], [0, DEMO_SUMMARY.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

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
                  fontSize: 52,
                  lineHeight: 1.18,
                  letterSpacing: "-0.02em",
                  color: color.ink,
                }}
              >
                ยายช่วยสรุปว่าเงินหายไปไหน
              </h2>
              <p
                style={{
                  margin: "14px auto 0",
                  fontSize: 26,
                  lineHeight: 1.45,
                  color: color.inkSoft,
                  maxWidth: 840,
                }}
              >
                ได้คำอธิบายสั้น ๆ ว่าต้นทุนไหนสูง
              </p>
            </div>
          }
          proof={
            <div style={{ width: "100%", ...card }}>
              <div
                style={{
                  background: color.surface,
                  borderRadius: 28,
                  overflow: "hidden",
                  boxShadow: "0 18px 48px rgba(59,178,115,0.16)",
                }}
              >
                <div
                  style={{
                    background: color.youngRiceSoft,
                    padding: "28px 24px 22px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <LogoMark size={80} />
                  </div>
                  <h3
                    style={{
                      margin: "14px 0 8px",
                      fontFamily: fonts.mali,
                      fontSize: 32,
                      fontWeight: 700,
                      color: color.ink,
                    }}
                  >
                    สรุปรอบนี้ให้ฟังจ้า
                  </h3>
                  <span
                    style={{
                      display: "inline-block",
                      background: color.youngRice,
                      color: "#fff",
                      borderRadius: 99,
                      padding: "4px 14px",
                      fontSize: 15,
                      fontWeight: 800,
                    }}
                  >
                    ข้าวโพด
                  </span>
                </div>
                <div style={{ padding: 22 }}>
                  <div
                    style={{
                      background: color.washed,
                      borderRadius: 18,
                      padding: "18px 20px",
                      minHeight: 200,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 24,
                        lineHeight: 1.55,
                        color: color.ink,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {DEMO_SUMMARY.slice(0, typed)}
                    </p>
                  </div>
                  <div
                    style={{
                      marginTop: 16,
                      height: 52,
                      borderRadius: 99,
                      background: color.leafDeep,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: frame > beat.summary.done ? 1 : 0.45,
                    }}
                  >
                    เข้าใจแล้วจ้า
                  </div>
                </div>
              </div>
            </div>
          }
        />
      </AbsoluteFill>
    </Stage>
  );
};
