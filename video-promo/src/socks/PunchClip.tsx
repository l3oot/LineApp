import type { FC } from "react";
import { Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";

type ClipProps = {
  src: string;
  durationInFrames: number;
  startFrom?: number;
  zoomTo?: number;
};

export const PunchClip: FC<ClipProps> = ({
  src,
  durationInFrames,
  startFrom = 0,
  zoomTo = 1.08,
}) => {
  const frame = useCurrentFrame();
  const punch = interpolate(frame, [0, 7], [1.14, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const drift = interpolate(frame, [0, durationInFrames], [1, zoomTo], {
    extrapolateRight: "clamp",
  });
  const flash = interpolate(frame, [0, 5], [0.42, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#000",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${punch * drift})`,
          transformOrigin: "center center",
        }}
      >
        <OffthreadVideo
          src={staticFile(src)}
          muted
          startFrom={startFrom}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#fff",
          opacity: flash,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
