import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createWaveRenderer } from "../dist/index.js";

// Capture tools are deliberately separate from the zero-dependency package.
const toolsPath = process.argv[2];
if (!toolsPath)
  throw new Error(
    "Usage: node scripts/generate-previews.mjs /path/to/capture-tools",
  );
const require = createRequire(join(resolve(toolsPath), "package.json"));
const { createCanvas } = require("@napi-rs/canvas");
const ffmpeg = require("ffmpeg-static");
const out = resolve(import.meta.dirname, "../docs/media");
const temp = mkdtempSync(join(tmpdir(), "gravity-wave-frames-"));
mkdirSync(out, { recursive: true });
const width = 480,
  height = 520,
  dpr = 2,
  fps = 30,
  frames = 243;
const variants = [
  {
    name: "circular",
    title: "Circular",
    direction: "inward",
    subtitle: "Inward flow",
    mode: "circular",
  },
  {
    name: "morphing",
    title: "Morphing",
    direction: "outward",
    subtitle: "Outward flow",
    mode: "morphing",
    morphAmount: 0.65,
  },
];
const fields = variants.map(({ mode, direction, morphAmount }) => ({
  center: { x: width / 2, y: 280 },
  mode,
  direction,
  morphAmount,
  radius: 200,
  innerRadius: 60,
}));
function presentation(canvas, ctx, renderer, field, time, variant) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#e9ecef";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#223344";
  ctx.font = "500 25px sans-serif";
  ctx.fillText(variant.title, 30, 40);
  ctx.fillStyle = "#586c7c";
  ctx.font = "14px sans-serif";
  ctx.fillText(variant.subtitle, 30, 64);
  renderer.draw([field], time);
  ctx.fillStyle = "#527c9a";
  ctx.beginPath();
  ctx.arc(width / 2, 280, 2.5, 0, Math.PI * 2);
  ctx.fill();
}
const canvases = variants.map(() => createCanvas(width * dpr, height * dpr));
const contexts = canvases.map((c) => c.getContext("2d"));
const renderers = contexts.map(createWaveRenderer);
const comparison = createCanvas(width * dpr * 2, height * dpr);
const pair = comparison.getContext("2d");
try {
  for (const v of variants) mkdirSync(join(temp, v.name));
  mkdirSync(join(temp, "comparison"));
  for (let i = 0; i < frames; i++) {
    const time = i / fps;
    for (let v = 0; v < variants.length; v++) {
      presentation(
        canvases[v],
        contexts[v],
        renderers[v],
        fields[v],
        time,
        variants[v],
      );
      const data = canvases[v].toBuffer("image/png");
      writeFileSync(
        join(temp, variants[v].name, `${String(i).padStart(4, "0")}.png`),
        data,
      );
      if (i === 36) writeFileSync(join(out, `${variants[v].name}.png`), data);
      pair.drawImage(canvases[v], v * width * dpr, 0);
    }
    const paired = comparison.toBuffer("image/png");
    writeFileSync(
      join(temp, "comparison", `${String(i).padStart(4, "0")}.png`),
      paired,
    );
    if (i === 36) writeFileSync(join(out, "comparison.png"), paired);
  }
  for (const v of variants) {
    execFileSync(
      ffmpeg,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-framerate",
        String(fps),
        "-i",
        join(temp, v.name, "%04d.png"),
        "-c:v",
        "libx264",
        "-crf",
        "16",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-an",
        join(out, `${v.name}.mp4`),
      ],
      { stdio: "inherit" },
    );
  }
  // A short circular loop has an exact 2.7-second crest period.
  execFileSync(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-framerate",
      String(fps),
      "-i",
      join(temp, "circular", "%04d.png"),
      "-t",
      "2.7",
      "-filter_complex",
      "fps=20,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=sierra2_4a",
      "-loop",
      "0",
      join(out, "circular.gif"),
    ],
    { stdio: "inherit" },
  );
  execFileSync(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-framerate",
      String(fps),
      "-i",
      join(temp, "comparison", "%04d.png"),
      "-filter_complex",
      "fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=sierra2_4a",
      "-loop",
      "0",
      join(out, "preview.gif"),
    ],
    { stdio: "inherit" },
  );
  console.log(
    "Rendered circular/morphing stills, animated previews, and 8.1-second MP4 clips.",
  );
} finally {
  renderers.forEach((r) => r.destroy());
  rmSync(temp, { recursive: true, force: true });
}
