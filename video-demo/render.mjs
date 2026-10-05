import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ffmpegPath = require("ffmpeg-static");

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(demoDir, "lineapp-demo.mp4");

const fontCandidates = [
  "C:/Windows/Fonts/LeelawUI.ttf",
  "C:/Windows/Fonts/segoeui.ttf",
  "C:/Windows/Fonts/tahoma.ttf",
];
const boldCandidates = [
  "C:/Windows/Fonts/segoeuib.ttf",
  "C:/Windows/Fonts/LeelawUI.ttf",
  "C:/Windows/Fonts/segoeui.ttf",
];

const fontFile = fontCandidates.find((candidate) => existsSync(candidate));
const boldFile = boldCandidates.find((candidate) => existsSync(candidate));
if (!ffmpegPath || !fontFile || !boldFile) {
  console.error("FFmpeg binary or a Thai-capable font was not found.");
  process.exit(1);
}

/** Escape a Windows path so FFmpeg filter options do not split on ":". */
function escapeFilterPath(filePath) {
  return filePath.replaceAll("\\", "/").replaceAll(":", "\\:");
}

const width = 1280;
const height = 720;
const duration = 8;
const fps = 30;
const font = escapeFilterPath(fontFile);
const bold = escapeFilterPath(boldFile);

const cardX = 150;
const cardY = 96;
const cardW = 980;
const cardH = 490;

/** Shared vertical slide: card and its contents settle over the first 0.6s. */
const slide = "64*max(0\\,1-min(1\\,max(0\\,t-0.08)/0.6))";
const yAt = (base) => `'${base}+${slide}'`;

function circleMask(inputLabel, outputLabel, size, alpha, rgb) {
  const radius = size / 2;
  const radiusSq = radius * radius;
  return `[${inputLabel}]format=rgba,geq=r=${rgb.r}:g=${rgb.g}:b=${rgb.b}:a='if(lt(pow(X-${radius}\\,2)+pow(Y-${radius}\\,2)\\,${radiusSq})\\,${alpha}\\,0)'[${outputLabel}]`;
}

function rise(delay, distance) {
  return `${distance}*max(0\\,1-min(1\\,max(0\\,t-${delay})/0.4))`;
}

function fadeIn(delay, length = 0.35) {
  return `min(1\\,max(0\\,(t-${delay})/${length}))`;
}

/**
 * A ledger row that wipes in, then counts up to its target.
 * @param {{ start: number, y: number, label: string, target: number, prefix: string, color: string, bg: string }} row
 */
function ledgerRow(row) {
  const wipe = `min(900\\,max(2\\,(t-${row.start})*2800))`;
  const labelFade = fadeIn(row.start + 0.05);
  const amountFade = fadeIn(row.start + 0.28, 0.3);
  const enter = `max(0\\,1-min(1\\,max(0\\,t-${row.start + 0.05})/0.34))`;
  const count = `min(${row.target}\\,max(0\\,(t-${row.start + 0.28})/1.05*${row.target}))`;
  const textY = yAt(row.y + 13);

  return [
    `drawbox=x=190:y=${yAt(row.y)}:w='${wipe}':h=58:color=${row.bg}:t=fill:enable='gte(t\\,${row.start})'`,
    `drawbox=x=202:y=${yAt(row.y + 14)}:w=6:h=30:color=${row.color}:t=fill:enable='gte(t\\,${row.start + 0.1})'`,
    `drawtext=fontfile='${font}':text='${row.label}':fontsize=30:fontcolor=0x1B2433:x='222+30*${enter}':y=${textY}:alpha='${labelFade}':enable='gte(t\\,${row.start})'`,
    `drawtext=fontfile='${font}':text='${row.prefix}%{eif\\:${count}\\:d} บาท':fontsize=30:fontcolor=${row.color}:x='w-text_w-280':y=${textY}:alpha='${amountFade}':enable='gte(t\\,${row.start + 0.28})'`,
  ];
}

const rows = [
  ledgerRow({
    start: 1.55,
    y: 292,
    label: "รายรับ",
    target: 12840,
    prefix: "+",
    color: "0x2D6A4F",
    bg: "0xE8F8EE",
  }),
  ledgerRow({
    start: 2.25,
    y: 364,
    label: "รายจ่าย",
    target: 4260,
    prefix: "-",
    color: "0xD45454",
    bg: "0xFDECEC",
  }),
  ledgerRow({
    start: 2.95,
    y: 436,
    label: "คงเหลือ",
    target: 8580,
    prefix: "",
    color: "0x1B2433",
    bg: "0xF3F7F4",
  }),
];

const cardDraw = [
  `drawbox=x=158:y=${yAt(cardY + 10)}:w=${cardW}:h=${cardH}:color=0xD5E6DC:t=fill`,
  `drawbox=x=${cardX}:y=${yAt(cardY)}:w=${cardW}:h=${cardH}:color=0xFFFFFF:t=fill`,
  `drawbox=x=${cardX}:y=${yAt(cardY)}:w='min(${cardW}\\,max(2\\,(t-0.36)*2200))':h=9:color=0x3BB273:t=fill:enable='gte(t\\,0.36)'`,
  `drawtext=fontfile='${bold}':text='LineApp':fontsize=68:fontcolor=0x1B2433:x=(w-text_w)/2:y='132+${slide}+${rise(0.42, 22)}':alpha='${fadeIn(0.42)}'`,
  `drawbox=x='640-min(78\\,max(0\\,(t-0.95)*160))':y=${yAt(214)}:w='2*min(78\\,max(0\\,(t-0.95)*160))':h=4:color=0x3BB273:t=fill:enable='gte(t\\,0.98)'`,
  `drawtext=fontfile='${font}':text='สรุปรายการวันนี้':fontsize=28:fontcolor=0x6E7A72:x=(w-text_w)/2:y='232+${slide}+${rise(0.95, 16)}':alpha='${fadeIn(0.95)}'`,
  ...rows,
  `drawtext=fontfile='${font}':text='เรนเดอร์จาก Node.js + FFmpeg':fontsize=26:fontcolor=0x6E7A72:x=(w-text_w)/2:y=648:alpha='${fadeIn(4.15, 0.45)}'`,
];

const graph = [
  circleMask("1:v", "orbA", 380, 150, { r: 59, g: 178, b: 115 }),
  circleMask("2:v", "orbB", 250, 185, { r: 143, g: 217, b: 176 }),
  circleMask("3:v", "orbC", 170, 150, { r: 45, g: 106, b: 79 }),
  "[0:v][orbA]overlay=x='900+54*sin(2*PI*t/6.5)':y='-80+36*cos(2*PI*t/5.2)':format=auto[b1]",
  "[b1][orbB]overlay=x='-50+42*cos(2*PI*t/7.4)':y='470+30*sin(2*PI*t/5.6)':format=auto[b2]",
  "[b2][orbC]overlay=x='1040+28*sin(2*PI*t/4.4)':y='530+22*cos(2*PI*t/3.6)':format=auto[scene]",
  `[scene]${cardDraw.join(",")}[drawn]`,
  "[drawn]fade=t=in:st=0:d=0.3,fade=t=out:st=7.2:d=0.8[vout]",
].join(";");

const args = [
  "-y",
  "-f", "lavfi", "-i", `color=c=0xF4F8F5:s=${width}x${height}:d=${duration}:r=${fps}`,
  "-f", "lavfi", "-i", `color=c=0x3BB273:s=380x380:d=${duration}:r=${fps}`,
  "-f", "lavfi", "-i", `color=c=0x8FD9B0:s=250x250:d=${duration}:r=${fps}`,
  "-f", "lavfi", "-i", `color=c=0x2D6A4F:s=170x170:d=${duration}:r=${fps}`,
  "-filter_complex", graph,
  "-map", "[vout]",
  "-c:v", "libx264",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  output,
];

const child = spawn(ffmpegPath, args, { stdio: ["ignore", "inherit", "inherit"] });

child.on("exit", (code) => {
  if (code === 0) {
    console.log(`Wrote ${output}`);
    return;
  }
  process.exit(code ?? 1);
});
