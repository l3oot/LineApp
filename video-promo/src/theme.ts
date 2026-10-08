import { loadFont as loadMali } from "@remotion/google-fonts/Mali";
import { loadFont as loadSarabun } from "@remotion/google-fonts/Sarabun";

export const mali = loadMali("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin", "thai"],
});

export const sarabun = loadSarabun("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "thai"],
});

export const fonts = {
  mali: mali.fontFamily,
  sarabun: sarabun.fontFamily,
};

export const color = {
  cream: "#F7FAF7",
  creamDeep: "#EEF5F0",
  paper: "#F3F8F4",
  ink: "#1A2E24",
  inkSoft: "#4A6356",
  leaf: "#2F9E62",
  leafDeep: "#1F6B42",
  youngRice: "#3BB273",
  youngRiceSoft: "#E8F8EE",
  youngRiceEdge: "#2F9A5F",
  canopy: "#2D6A4F",
  washed: "#F4F8F5",
  surface: "#FFFFFF",
  surfaceSoft: "#EEF6F0",
  border: "#DCE8E0",
  charcoal: "#1B2433",
  moss: "#6E7A72",
  chili: "#C82333",
  chiliAction: "#E57373",
  lineGreen: "#06C755",
  soil: "#C4A574",
} as const;

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_SEC = 21;
export const DURATION = DURATION_SEC * FPS;

/** 120 BPM grid of the 21s product-intro bed (1 beat = 15 frames). */
export const BEAT = 15;

export const scenes = {
  open: { from: 0, duration: 68 },
  problem: { from: 58, duration: 96 },
  chat: { from: 134, duration: 176 },
  cycle: { from: 298, duration: 116 },
  summary: { from: 402, duration: 102 },
  close: { from: 492, duration: 138 },
} as const;

/** Cue frames relative to each scene start — animation and SFX share these. */
export const beat = {
  open: { swell: 4, title: 12, offer: 16 },
  problem: { whoosh: 4, paper: 16, resolve: 20 },
  chat: {
    typeStart: 6,
    typeEnd: 40,
    send: 42,
    botStart: 48,
    botEnd: 66,
    flex: 66,
    rowStart: 70,
    rowStep: 4,
    coins: 100,
    buttons: 108,
  },
  cycle: { whoosh: 6, income: 14, expense: 28, remain: 44, pop: 52, barStart: 36, barEnd: 88 },
  summary: { whoosh: 6, typeStart: 12, typeEnd: 72, done: 78 },
  close: { whoosh: 6, qr: 22, chime: 26, hint: 40 },
} as const;

export const at = (scene: keyof typeof scenes, rel: number) => scenes[scene].from + rel;
