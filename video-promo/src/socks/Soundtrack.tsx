import type { FC } from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { SOCK_DURATION } from "./theme";

const sfx = (name: string) => staticFile(`sfx/${name}`);

type Hit = {
  from: number;
  file: string;
  volume: number;
  durationInFrames: number;
};

const hits: Hit[] = [
  { from: 0, file: "swell.wav", volume: 0.32, durationInFrames: 28 },
  { from: 48, file: "whoosh.wav", volume: 0.28, durationInFrames: 14 },
  { from: 94, file: "pop.wav", volume: 0.38, durationInFrames: 10 },
  { from: 129, file: "whoosh.wav", volume: 0.24, durationInFrames: 14 },
  { from: 165, file: "whoosh.wav", volume: 0.22, durationInFrames: 14 },
  { from: 203, file: "paper.wav", volume: 0.34, durationInFrames: 12 },
  { from: 268, file: "tick.wav", volume: 0.22, durationInFrames: 6 },
  { from: 320, file: "pop.wav", volume: 0.32, durationInFrames: 10 },
  { from: 350, file: "tick.wav", volume: 0.24, durationInFrames: 6 },
  { from: 390, file: "chime.wav", volume: 0.5, durationInFrames: 42 },
];

function duck(frame: number) {
  let factor = 1;
  for (const hit of hits) {
    const dt = frame - hit.from;
    if (dt < -4 || dt > 10) continue;
    const dip =
      dt < 0
        ? interpolate(dt, [-4, 0], [1, 0.78], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        : interpolate(dt, [0, 10], [0.78, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
    factor = Math.min(factor, dip);
  }
  return factor;
}

function voiceVolume(frame: number) {
  const envelope = interpolate(
    frame,
    [0, 4, SOCK_DURATION - 10, SOCK_DURATION],
    [0.92, 1, 1, 0.82],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return envelope * duck(frame);
}

export const SockSoundtrack: FC = () => {
  return (
    <>
      <Audio src={staticFile("socks/voice.mp3")} volume={voiceVolume} />
      {hits.map((hit) => (
        <Sequence
          key={`${hit.file}-${hit.from}`}
          from={hit.from}
          durationInFrames={hit.durationInFrames}
          layout="none"
        >
          <Audio src={sfx(hit.file)} volume={hit.volume} />
        </Sequence>
      ))}
    </>
  );
};
