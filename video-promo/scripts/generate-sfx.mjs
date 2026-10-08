import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sr = 44100;
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "sfx");
mkdirSync(outDir, { recursive: true });

function clamp(v) {
  return Math.max(-1, Math.min(1, v));
}

function env(t, attack, decay, sustain, release, dur) {
  if (t < attack) return t / attack;
  if (t < attack + decay) {
    const p = (t - attack) / decay;
    return 1 - (1 - sustain) * p;
  }
  if (t < dur - release) return sustain;
  if (t >= dur) return 0;
  return sustain * (1 - (t - (dur - release)) / release);
}

function sine(freq, t) {
  return Math.sin(2 * Math.PI * freq * t);
}

function noise() {
  return Math.random() * 2 - 1;
}

function writeWav(name, samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(Math.round(clamp(samples[i]) * 32767), 44 + i * 2);
  }
  writeFileSync(path.join(outDir, name), buf);
}

function render(seconds, fn) {
  const n = Math.floor(sr * seconds);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) samples[i] = fn(i / sr, i, n);
  return samples;
}

writeWav(
  "swell.wav",
  render(1.15, (t, i, n) => {
    const dur = n / sr;
    const e = env(t, 0.18, 0.22, 0.55, 0.55, dur);
    return (
      sine(196, t) * 0.18 * e +
      sine(294, t) * 0.08 * e +
      sine(392, t) * 0.04 * e
    );
  }),
);

writeWav(
  "whoosh.wav",
  render(0.42, (t, i, n) => {
    const dur = n / sr;
    const e = Math.pow(Math.sin(Math.PI * t / dur), 1.6);
    const sweep = 520 - 340 * (t / dur);
    return noise() * 0.22 * e + sine(sweep, t) * 0.12 * e;
  }),
);

writeWav(
  "paper.wav",
  render(0.28, (t, i, n) => {
    const dur = n / sr;
    const e = env(t, 0.01, 0.06, 0.35, 0.18, dur);
    return noise() * 0.16 * e + sine(240, t) * 0.04 * e;
  }),
);

writeWav(
  "tap.wav",
  render(0.045, (t, i, n) => {
    const dur = n / sr;
    const e = env(t, 0.002, 0.012, 0.2, 0.028, dur);
    return sine(1680, t) * 0.22 * e + noise() * 0.05 * e;
  }),
);

writeWav(
  "send.wav",
  render(0.2, (t, i, n) => {
    const dur = n / sr;
    const e = env(t, 0.006, 0.04, 0.35, 0.14, dur);
    return sine(620, t) * 0.22 * e + sine(980, t) * 0.12 * e;
  }),
);

writeWav(
  "pop.wav",
  render(0.16, (t, i, n) => {
    const dur = n / sr;
    const e = env(t, 0.004, 0.04, 0.28, 0.1, dur);
    return sine(440, t) * 0.2 * e + sine(880, t) * 0.08 * e;
  }),
);

writeWav(
  "tick.wav",
  render(0.07, (t, i, n) => {
    const dur = n / sr;
    const e = env(t, 0.002, 0.02, 0.18, 0.04, dur);
    return sine(1240, t) * 0.16 * e;
  }),
);

writeWav(
  "chime.wav",
  render(1.35, (t, i, n) => {
    const dur = n / sr;
    const e1 = env(t, 0.01, 0.12, 0.4, 0.9, dur);
    const e2 = t < 0.16 ? 0 : env(t - 0.16, 0.01, 0.14, 0.38, 0.85, dur - 0.16);
    return sine(523.25, t) * 0.2 * e1 + sine(783.99, t) * 0.16 * e2;
  }),
);

console.log(`Wrote SFX to ${outDir}`);
