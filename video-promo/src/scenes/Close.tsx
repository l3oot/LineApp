import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { LogoMark } from "../components/LogoMark";
import { Stage } from "../components/Stage";
import { rise, sceneOpacity } from "../motion";
import { beat, color, fonts } from "../theme";

export const Close: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = rise(frame, fps, 4, 16);
  const title = rise(frame, fps, 10, 20, 14);
  const offer = rise(frame, fps, 18, 14);
  const qr = rise(frame, fps, beat.close.qr, 22, 16);
  const hint = rise(frame, fps, beat.close.hint, 12);

  return (
    <Stage tone="leaf">
      <AbsoluteFill style={{ opacity: sceneOpacity(frame, durationInFrames, 8) }}>
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 56px",
          }}
        >
          <div style={mark}>
            <LogoMark size={88} />
          </div>
          <h2
            style={{
              margin: "22px 0 0",
              fontFamily: fonts.mali,
              fontWeight: 700,
              fontSize: 52,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "#F7FAF7",
              ...title,
            }}
          >
            เริ่มจดกับยายเภาวันนี้
          </h2>
          <p
            style={{
              margin: "14px 0 0",
              fontSize: 26,
              lineHeight: 1.4,
              color: "rgba(247,250,247,0.82)",
              ...offer,
            }}
          >
            สแกนเพิ่มเพื่อนบน LINE
          </p>
          <div
            style={{
              marginTop: 28,
              background: color.surface,
              borderRadius: 32,
              padding: 28,
              boxShadow: "0 18px 48px rgba(6, 199, 85, 0.22)",
              ...qr,
            }}
          >
            <Img
              src={staticFile("line-qr.png")}
              style={{
                width: 420,
                height: 420,
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>
          <p
            style={{
              margin: "22px 0 0",
              fontSize: 22,
              fontWeight: 700,
              color: "rgba(247,250,247,0.78)",
              ...hint,
            }}
          >
            lin.ee/wOCf6Qe
          </p>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
