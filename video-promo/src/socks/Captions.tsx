import type { CSSProperties, FC } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts } from "../theme";
import { sockColor } from "./theme";

type Caption = {
  from: number;
  to: number;
  text: string;
  sub?: string;
};

const captions: Caption[] = [
  { from: 2, to: 48, text: "ไอเท็มที่ใส่บ่อยสุด" },
  { from: 48, to: 94, text: "ต้องตัวนี้เลย" },
  { from: 94, to: 129, text: "ถุงเท้ากันลื่น" },
  { from: 129, to: 165, text: "ใส่ได้ทุกสถานการณ์" },
  { from: 165, to: 203, text: "เล่นกีฬา · วิ่ง" },
  { from: 203, to: 268, text: "มีกันลื่น" },
  { from: 268, to: 320, text: "ใส่กระชับ" },
  { from: 320, to: 350, text: "รองเท้าไม่เลื่อน" },
  { from: 350, to: 390, text: "ถูกมาก" },
];

const stroke: CSSProperties = {
  color: sockColor.white,
  fontFamily: fonts.mali,
  fontWeight: 700,
  textAlign: "center",
  lineHeight: 1.12,
  letterSpacing: "-0.03em",
  textShadow:
    "0 2px 0 #000, 3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000, 0 10px 24px rgba(0,0,0,0.45)",
};

export const SockCaptions: FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const showCta = frame >= 390;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 220,
          background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 520,
          background: "linear-gradient(0deg, rgba(0,0,0,0.72) 0%, transparent 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 72,
          left: 48,
          right: 48,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            padding: "10px 28px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: sockColor.volt,
            fontFamily: fonts.sarabun,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: "0.08em",
          }}
        >
          ถุงเท้ากันลื่น
        </div>
      </div>

      {!showCta &&
        captions.map((cap) => {
          if (frame < cap.from || frame >= cap.to) return null;
          const local = frame - cap.from;
          const pop = spring({
            frame: local,
            fps,
            config: { damping: 14, mass: 0.55, stiffness: 180 },
          });
          const exit = interpolate(frame, [cap.to - 5, cap.to], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.quad),
          });
          return (
            <div
              key={`${cap.from}-${cap.text}`}
              style={{
                position: "absolute",
                left: 48,
                right: 48,
                bottom: 168,
                transform: `translateY(${(1 - pop) * 36}px) scale(${0.86 + pop * 0.14})`,
                opacity: pop * exit,
              }}
            >
              <div style={{ ...stroke, fontSize: cap.text.length > 12 ? 64 : 78 }}>{cap.text}</div>
            </div>
          );
        })}

      {showCta ? <PriceCard /> : null}
    </div>
  );
};

const PriceCard: FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - 390;
  const pop = spring({
    frame: local,
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 160 },
  });
  const pulse = interpolate(Math.sin((local / fps) * Math.PI * 4), [-1, 1], [0.98, 1.02]);

  return (
    <div
      style={{
        position: "absolute",
        left: 56,
        right: 56,
        bottom: 120,
        transform: `translateY(${(1 - pop) * 80}px) scale(${pop * pulse})`,
        opacity: pop,
      }}
    >
      <div
        style={{
          background: sockColor.ink,
          border: `4px solid ${sockColor.volt}`,
          borderRadius: 36,
          padding: "36px 32px 32px",
          textAlign: "center",
          boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            fontFamily: fonts.sarabun,
            fontWeight: 700,
            fontSize: 28,
            color: sockColor.volt,
            letterSpacing: "0.12em",
            marginBottom: 8,
          }}
        >
          ถูกมาก
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 10,
            color: sockColor.white,
            fontFamily: fonts.mali,
            fontWeight: 700,
            lineHeight: 0.9,
          }}
        >
          <span style={{ fontSize: 128, letterSpacing: "-0.04em" }}>199</span>
          <span style={{ fontSize: 42, marginBottom: 18 }}>บาท</span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: fonts.mali,
            fontWeight: 700,
            fontSize: 48,
            color: sockColor.volt,
          }}
        >
          ได้ตั้ง 5 คู่
        </div>
        <div
          style={{
            marginTop: 16,
            fontFamily: fonts.sarabun,
            fontWeight: 700,
            fontSize: 34,
            color: sockColor.white,
          }}
        >
          ต้องจัดแล้วครับ
        </div>
      </div>
    </div>
  );
};
