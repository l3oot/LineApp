import { Easing, interpolate, spring } from "remotion";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const out = Easing.out(Easing.cubic);

export function fade(frame: number, start: number, length = 14) {
  return interpolate(frame, [start, start + length], [0, 1], clamp);
}

export function fadeOut(frame: number, end: number, length = 12) {
  return interpolate(frame, [end - length, end], [1, 0], clamp);
}

export function sceneOpacity(frame: number, duration: number, edge = 12) {
  return (
    interpolate(frame, [0, edge], [0, 1], clamp) *
    interpolate(frame, [duration - edge, duration], [1, 0], clamp)
  );
}

export function rise(
  frame: number,
  fps: number,
  delay = 0,
  distance = 28,
  damping = 16,
) {
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping, mass: 0.7, stiffness: 90 },
  });
  return {
    opacity: interpolate(progress, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`,
  };
}

export function wipe(frame: number, start: number, length: number) {
  return interpolate(frame, [start, start + length], [0, 1], {
    ...clamp,
    easing: out,
  });
}

export function countTo(frame: number, start: number, length: number, target: number) {
  return Math.round(
    interpolate(frame, [start, start + length], [0, target], {
      ...clamp,
      easing: out,
    }),
  );
}

export function baht(value: number) {
  return value.toLocaleString("th-TH");
}
