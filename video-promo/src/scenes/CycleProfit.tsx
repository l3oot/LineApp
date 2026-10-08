import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PhoneShell } from "../components/PhoneShell";
import { SceneColumn } from "../components/SceneColumn";
import { Stage } from "../components/Stage";
import { baht, countTo, rise, sceneOpacity } from "../motion";
import { beat, color, fonts } from "../theme";

export const CycleProfit: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = rise(frame, fps, 2, 16);
  const phone = rise(frame, fps, 10, 24, 16);
  const income = countTo(frame, beat.cycle.income, 22, 22000);
  const expense = countTo(frame, beat.cycle.expense, 22, 18500);
  const remain = countTo(frame, beat.cycle.remain, 24, 3500);
  const bar = interpolate(frame, [beat.cycle.barStart, beat.cycle.barEnd], [0, 84], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
                ดูกำไรต่อรอบปลูก
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
                รายรับลบต้นทุนต่อรอบ — รู้ว่ารอบไหนคุ้ม
              </p>
            </div>
          }
          proof={
            <div style={phone}>
              <PhoneShell width={540} height={640}>
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: color.youngRiceSoft,
                      borderRadius: 18,
                      padding: "16px 18px",
                      color: color.leafDeep,
                      fontWeight: 700,
                      fontSize: 20,
                    }}
                  >
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 99,
                        background: color.youngRice,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                      }}
                    >
                      +
                    </span>
                    เพิ่มการเกษตร
                  </div>

                  <article
                    style={{
                      marginTop: 18,
                      background: color.surface,
                      borderRadius: 22,
                      padding: 22,
                      boxShadow: "0 10px 28px rgba(59,178,115,0.10)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          background: color.youngRiceSoft,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          fontWeight: 800,
                          color: color.leafDeep,
                        }}
                      >
                        โพด
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: 26,
                              fontWeight: 800,
                              color: color.charcoal,
                            }}
                          >
                            ข้าวโพด
                          </h3>
                          <span
                            style={{
                              background: color.youngRice,
                              color: "#fff",
                              fontSize: 13,
                              fontWeight: 800,
                              borderRadius: 99,
                              padding: "4px 10px",
                            }}
                          >
                            กำไร
                          </span>
                        </div>
                        <p style={{ margin: "6px 0 0", fontSize: 16, color: color.moss }}>
                          ก.ย. – ธ.ค. 2569
                        </p>
                      </div>
                    </div>

                    <div style={{ marginTop: 20, display: "grid", gap: 14 }}>
                      <Stat label="รายรับ" value={`+${baht(income)}`} tone="in" />
                      <Stat label="รายจ่าย" value={`-${baht(expense)}`} tone="out" />
                      <Stat label="คงเหลือ" value={baht(remain)} tone="ink" />
                      <div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: color.moss,
                            marginBottom: 8,
                          }}
                        >
                          งบใช้ไป
                        </div>
                        <div
                          style={{
                            height: 12,
                            borderRadius: 99,
                            background: color.surfaceSoft,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${bar}%`,
                              height: "100%",
                              borderRadius: 99,
                              background: "#25A247",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </PhoneShell>
            </div>
          }
        />
      </AbsoluteFill>
    </Stage>
  );
};

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "in" | "out" | "ink";
}) {
  const valueColor =
    tone === "in" ? color.canopy : tone === "out" ? color.chili : color.charcoal;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: color.moss }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 800, color: valueColor, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
