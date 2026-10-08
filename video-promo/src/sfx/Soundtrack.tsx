import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { DURATION, at, beat, scenes } from "../theme";

const sfx = (name: string) => staticFile(`sfx/${name}`);
const MUSIC = staticFile("product-intro.mp3");

type HitSpec = {
  from: number;
  file: string;
  volume: number;
  durationInFrames: number;
};

function Hit({ from, file, volume, durationInFrames }: HitSpec) {
  return (
    <Sequence from={from} durationInFrames={durationInFrames} layout="none">
      <Audio src={sfx(file)} volume={volume} />
    </Sequence>
  );
}

const taps: HitSpec[] = [];
for (let f = beat.chat.typeStart; f < beat.chat.typeEnd; f += 3) {
  taps.push({
    from: at("chat", f),
    file: "tap.wav",
    volume: 0.14,
    durationInFrames: 4,
  });
}

/** Accent hits only — used to duck the bed so SFX sit in front of the music. */
const accents: HitSpec[] = [
  { from: at("open", beat.open.swell), file: "swell.wav", volume: 0.36, durationInFrames: 36 },
  { from: at("problem", beat.problem.whoosh), file: "whoosh.wav", volume: 0.26, durationInFrames: 16 },
  { from: at("problem", beat.problem.paper), file: "paper.wav", volume: 0.3, durationInFrames: 12 },
  { from: at("chat", beat.chat.typeStart), file: "whoosh.wav", volume: 0.22, durationInFrames: 16 },
  { from: at("chat", beat.chat.send), file: "send.wav", volume: 0.4, durationInFrames: 10 },
  { from: at("chat", beat.chat.flex), file: "pop.wav", volume: 0.34, durationInFrames: 10 },
  { from: at("chat", beat.chat.coins), file: "tick.wav", volume: 0.22, durationInFrames: 6 },
  { from: at("chat", beat.chat.buttons), file: "tick.wav", volume: 0.2, durationInFrames: 6 },
  { from: at("cycle", beat.cycle.whoosh), file: "whoosh.wav", volume: 0.22, durationInFrames: 16 },
  { from: at("cycle", beat.cycle.income), file: "tick.wav", volume: 0.2, durationInFrames: 6 },
  { from: at("cycle", beat.cycle.expense), file: "tick.wav", volume: 0.2, durationInFrames: 6 },
  { from: at("cycle", beat.cycle.pop), file: "pop.wav", volume: 0.3, durationInFrames: 10 },
  { from: at("summary", beat.summary.whoosh), file: "whoosh.wav", volume: 0.22, durationInFrames: 16 },
  { from: at("summary", beat.summary.typeStart), file: "paper.wav", volume: 0.2, durationInFrames: 12 },
  { from: at("close", beat.close.whoosh), file: "whoosh.wav", volume: 0.24, durationInFrames: 16 },
  { from: at("close", beat.close.chime), file: "chime.wav", volume: 0.46, durationInFrames: 42 },
];

const duckFrames = accents.map((hit) => hit.from);

function duck(frame: number) {
  let factor = 1;
  for (const hit of duckFrames) {
    const dt = frame - hit;
    if (dt < -5 || dt > 12) continue;
    const dip =
      dt < 0
        ? interpolate(dt, [-5, 0], [1, 0.52], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
        : interpolate(dt, [0, 12], [0.52, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    factor = Math.min(factor, dip);
  }
  return factor;
}

/**
 * Bed envelope follows the 21s product-intro track:
 * 0.0–2.0s  swell with the logo
 * 2.0–4.5s  dip for the ledger / paper
 * 4.5–10.0s duck under LINE typing
 * 10.0–13.5s lift with the profit count
 * 13.5–16.5s ease for the spoken summary
 * 16.5–21.0s swell for the QR, then ride the track-out
 */
function musicVolume(frame: number) {
  const bed = interpolate(
    frame,
    [
      0,
      10,
      scenes.problem.from,
      scenes.problem.from + 12,
      scenes.chat.from,
      scenes.chat.from + 10,
      scenes.cycle.from - 6,
      scenes.cycle.from + 10,
      scenes.summary.from,
      scenes.summary.from + 10,
      scenes.close.from,
      scenes.close.from + 18,
      DURATION - 24,
      DURATION,
    ],
    [0, 0.44, 0.44, 0.34, 0.34, 0.24, 0.24, 0.38, 0.38, 0.32, 0.32, 0.48, 0.36, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return bed * duck(frame);
}

export const Soundtrack: React.FC = () => {
  return (
    <>
      <Audio src={MUSIC} volume={musicVolume} />
      {accents.map((hit) => (
        <Hit key={`${hit.file}-${hit.from}`} {...hit} />
      ))}
      {taps.map((hit) => (
        <Hit key={`tap-${hit.from}`} {...hit} />
      ))}
    </>
  );
};
