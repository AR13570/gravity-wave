import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [
  baseline,
  candidate = "dist/index.js",
  tools = "/private/tmp/gravity-wave-perf-tools",
] = process.argv.slice(2);
if (!baseline)
  throw Error(
    "Usage: node scripts/check-visual.mjs <baseline module> [candidate module] [temporary canvas tools directory]",
  );
const { createCanvas } = createRequire(resolve(tools, "package.json"))(
  "@napi-rs/canvas",
);
const before = await import(pathToFileURL(resolve(baseline)));
const after = await import(pathToFileURL(resolve(candidate)));
let cases = 0,
  changedChannels = 0,
  totalChannels = 0,
  maxChannelDelta = 0;
for (const mode of ["circular", "morphing"])
  for (const scale of [0.4, 1, 2])
    for (const opacity of [0.4, 1]) {
      const canvases = [createCanvas(1800, 1400), createCanvas(1800, 1400)];
      const contexts = canvases.map((c) => c.getContext("2d"));
      const renderers = [
        before.createWaveRenderer(contexts[0]),
        after.createWaveRenderer(contexts[1]),
      ];
      for (const time of [0, 0.8, 12345]) {
        for (let i = 0; i < 2; i++) {
          const ctx = contexts[i];
          ctx.resetTransform();
          ctx.clearRect(0, 0, 1800, 1400);
          ctx.fillStyle = "#121820";
          ctx.fillRect(0, 0, 1800, 1400);
          ctx.setTransform(2 * scale, 0, 0, 2 * scale, 0, 0);
          ctx.globalAlpha = 0.8;
          renderers[i].draw(
            [
              { center: { x: 200, y: 220 }, mode, morphAmount: 0.65, opacity },
              {
                center: { x: 450, y: 300 },
                mode,
                direction: "outward",
                radius: 155,
                innerRadius: 25,
                wavelength: 40,
                opacity,
              },
            ],
            time,
            { scale },
          );
          assert.equal(ctx.globalAlpha, 0.8);
          ctx.globalAlpha = 1;
        }
        const images = contexts.map(
          (ctx) => ctx.getImageData(0, 0, 1800, 1400).data,
        );
        for (let i = 0; i < images[0].length; i++) {
          const delta = Math.abs(images[0][i] - images[1][i]);
          if (delta) changedChannels++;
          maxChannelDelta = Math.max(maxChannelDelta, delta);
        }
        totalChannels += images[0].length;
        cases++;
      }
      renderers.forEach((r) => r.destroy());
    }
const result = { cases, changedChannels, totalChannels, maxChannelDelta };
console.log(JSON.stringify(result));
// Permit only sparse one-level antialiasing changes from floating-point reassociation.
assert.ok(maxChannelDelta <= 1, "pixel channel changed by more than one level");
assert.ok(
  changedChannels / totalChannels < 0.001,
  "more than 0.1% of channels changed",
);
