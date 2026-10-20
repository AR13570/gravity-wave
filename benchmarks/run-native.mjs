import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { measure } from "./measure.mjs";
const [modulePath, output, toolsPath = "/private/tmp/gravity-wave-perf-tools"] =
  process.argv.slice(2);
if (!modulePath || !output)
  throw Error(
    "Usage: node benchmarks/run-native.mjs <module> <output.json> [temporary tool directory]",
  );
const require = createRequire(resolve(toolsPath, "package.json"));
const { createCanvas } = require("@napi-rs/canvas");
const { createWaveRenderer } = await import(pathToFileURL(resolve(modulePath)));
const results = await measure(createWaveRenderer, createCanvas, {
  only: process.env.PROFILE === "1",
});
await writeFile(
  output,
  JSON.stringify(
    { backend: "@napi-rs/canvas", node: process.version, results },
    null,
    2,
  ) + "\n",
);
console.log("Saved " + output + " (" + results.length + " scenarios)");
