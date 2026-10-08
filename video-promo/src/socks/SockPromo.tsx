import type { FC } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { SockCaptions } from "./Captions";
import { PunchClip } from "./PunchClip";
import { SockSoundtrack } from "./Soundtrack";
import { SOCK_DURATION, sockColor } from "./theme";

type Cut = {
  from: number;
  duration: number;
  src: string;
  startFrom: number;
  zoomTo?: number;
};

const cuts: Cut[] = [
  { from: 0, duration: 48, src: "socks-clips/01_court.mp4", startFrom: 18, zoomTo: 1.1 },
  { from: 48, duration: 46, src: "socks-clips/02_outdoor.mp4", startFrom: 20, zoomTo: 1.08 },
  { from: 94, duration: 35, src: "socks-clips/03_grip_hold.mp4", startFrom: 12, zoomTo: 1.12 },
  { from: 129, duration: 36, src: "socks-clips/01_court.mp4", startFrom: 90, zoomTo: 1.12 },
  { from: 165, duration: 38, src: "socks-clips/12_indoor_white.mp4", startFrom: 36, zoomTo: 1.08 },
  { from: 203, duration: 65, src: "socks-clips/04_grip_close.mp4", startFrom: 24, zoomTo: 1.14 },
  { from: 268, duration: 52, src: "socks-clips/11_grip_foot.mp4", startFrom: 18, zoomTo: 1.1 },
  { from: 320, duration: 30, src: "socks-clips/09_walk_white.mp4", startFrom: 24, zoomTo: 1.1 },
  { from: 350, duration: 40, src: "socks-clips/06_pair.mp4", startFrom: 8, zoomTo: 1.08 },
  { from: 390, duration: SOCK_DURATION - 390, src: "socks-clips/05_stripes.mp4", startFrom: 40, zoomTo: 1.12 },
];

export const SockPromo: FC = () => {
  return (
    <AbsoluteFill style={{ background: sockColor.ink }}>
      <SockSoundtrack />
      {cuts.map((cut) => (
        <Sequence key={`${cut.src}-${cut.from}`} from={cut.from} durationInFrames={cut.duration}>
          <PunchClip
            src={cut.src}
            durationInFrames={cut.duration}
            startFrom={cut.startFrom}
            zoomTo={cut.zoomTo}
          />
        </Sequence>
      ))}
      <SockCaptions />
    </AbsoluteFill>
  );
};
