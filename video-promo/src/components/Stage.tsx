import type { FC, ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { color } from "../theme";

export const Stage: FC<{ children: ReactNode; tone?: "cream" | "leaf" }> = ({
  children,
  tone = "cream",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  if (tone === "leaf") {
    return (
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 55% at 18% 0%, rgba(143, 217, 176, 0.28), transparent 58%), linear-gradient(180deg, #1A4630 0%, #163728 55%, #122C20 100%)`,
          overflow: "hidden",
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 10% -10%, rgba(47, 158, 98, 0.18), transparent 55%),
          radial-gradient(ellipse 60% 40% at 92% 8%, rgba(196, 165, 116, 0.16), transparent 50%),
          linear-gradient(180deg, #F3F8F4 0%, ${color.cream} 42%, #EEF5F0 100%)
        `,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "rgba(59, 178, 115, 0.16)",
          left: 640 + 40 * Math.sin((2 * Math.PI * t) / 7.2),
          top: -80 + 28 * Math.cos((2 * Math.PI * t) / 5.6),
          filter: "blur(8px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: "rgba(45, 106, 79, 0.12)",
          left: -80 + 28 * Math.cos((2 * Math.PI * t) / 6.4),
          top: 1480 + 22 * Math.sin((2 * Math.PI * t) / 4.8),
          filter: "blur(6px)",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
