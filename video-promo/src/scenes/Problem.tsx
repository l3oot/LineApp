import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneColumn } from "../components/SceneColumn";
import { Stage } from "../components/Stage";
import { rise, sceneOpacity } from "../motion";
import { beat, color, fonts } from "../theme";

export const Problem: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = rise(frame, fps, 2, 24, 14);
  const line = rise(frame, fps, 12, 18);
  const resolve = rise(frame, fps, beat.problem.resolve, 16);
  const scrap = rise(frame, fps, beat.problem.paper, 28, 16);

  return (
    <Stage>
      <AbsoluteFill style={{ opacity: sceneOpacity(frame, durationInFrames, 10) }}>
        <SceneColumn
          copy={
            <>
              <h2
                style={{
                  margin: 0,
                  fontFamily: fonts.mali,
                  fontWeight: 700,
                  fontSize: 64,
                  lineHeight: 1.18,
                  letterSpacing: "-0.02em",
                  color: color.ink,
                  ...title,
                }}
              >
                รอบนี้คุ้มไหม
              </h2>
              <p
                style={{
                  margin: "18px auto 0",
                  fontSize: 28,
                  lineHeight: 1.45,
                  color: color.inkSoft,
                  maxWidth: 840,
                  ...line,
                }}
              >
                จดบัญชียาก แล้วก็ยังไม่รู้ว่าเงินรั่วตรงไหน
              </p>
              <p
                style={{
                  margin: "16px 0 0",
                  fontFamily: fonts.mali,
                  fontWeight: 600,
                  fontSize: 32,
                  lineHeight: 1.35,
                  color: color.leafDeep,
                  ...resolve,
                }}
              >
                ยายเภาเลยอยู่บน LINE ที่ใช้ทุกวัน
              </p>
            </>
          }
          proof={
            <div style={{ width: "100%", ...scrap }}>
              <div
                style={{
                  background: color.surface,
                  borderRadius: 28,
                  padding: "28px 30px 24px",
                  boxShadow: "0 18px 48px rgba(59,178,115,0.14)",
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.mali,
                    fontSize: 22,
                    fontWeight: 700,
                    color: color.moss,
                    marginBottom: 16,
                  }}
                >
                  สมุดบัญชีในแปลง
                </div>
                {[
                  ["ขายข้าวโพด", "18,500", true],
                  ["ซื้อปุ๋ย", "?", false],
                  ["ค่าน้ำมัน", "ลืมจด", false],
                ].map(([label, value, ok]) => (
                  <div
                    key={String(label)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "14px 0",
                      borderBottom: `1px solid ${color.border}`,
                      fontSize: 26,
                      fontWeight: 700,
                      color: ok ? color.ink : color.moss,
                    }}
                  >
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontSize: 20, fontWeight: 700, color: color.moss }}>กำไรต่อรอบ</span>
                  <span
                    style={{
                      fontFamily: fonts.mali,
                      fontSize: 36,
                      fontWeight: 700,
                      color: color.chili,
                    }}
                  >
                    ยังไม่รู้
                  </span>
                </div>
              </div>
            </div>
          }
        />
      </AbsoluteFill>
    </Stage>
  );
};
