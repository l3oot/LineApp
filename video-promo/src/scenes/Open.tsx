import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { LogoMark } from "../components/LogoMark";
import { Stage } from "../components/Stage";
import { fade, rise, sceneOpacity } from "../motion";
import { beat, color, fonts } from "../theme";

export const Open: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = rise(frame, fps, beat.open.swell, 22);
  const title = rise(frame, fps, beat.open.title, 30, 14);
  const offer = rise(frame, fps, beat.open.offer, 20);
  const rule = fade(frame, beat.open.offer + 6, 10);

  return (
    <Stage>
      <AbsoluteFill style={{ opacity: sceneOpacity(frame, durationInFrames, 10) }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: "0 64px",
            textAlign: "center",
          }}
        >
          <div style={mark}>
            <LogoMark size={128} />
          </div>
          <h1
            style={{
              margin: "32px 0 0",
              fontFamily: fonts.mali,
              fontWeight: 700,
              fontSize: 108,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              color: color.ink,
              ...title,
            }}
          >
            ยายเภา
          </h1>
          <div
            style={{
              width: 88,
              height: 6,
              borderRadius: 99,
              background: color.leafDeep,
              marginTop: 20,
              opacity: rule,
              transform: `scaleX(${rule})`,
            }}
          />
          <p
            style={{
              margin: "22px 0 0",
              maxWidth: 780,
              fontSize: 36,
              fontWeight: 500,
              lineHeight: 1.45,
              color: color.inkSoft,
              ...offer,
            }}
          >
            จดรายรับรายจ่ายเกษตรง่าย ๆ
            <br />
            รู้กำไรต่อรอบปลูก
          </p>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
