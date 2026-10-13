import { createGravityWave } from "../src/index.js";
import type { GravityWaveOptions, WaveField } from "../src/types.js";
import "./style.css";
const canvas = document.querySelector<HTMLCanvasElement>("#wave")!;
const form = document.querySelector<HTMLFormElement>("#controls")!;
const pause = document.querySelector<HTMLButtonElement>("#pause")!;
const status = document.querySelector<HTMLElement>("#status")!;
const snippet = document.querySelector<HTMLElement>("#snippet")!;
const wave = createGravityWave(canvas);
let codeMode = "vanilla";
let config: GravityWaveOptions = {};
function options(): GravityWaveOptions {
  const data = new FormData(form);
  const result: Record<string, unknown> = {};
  for (const [name, value] of data) {
    if (["sources"].includes(name)) continue;
    result[name] = [
      "mode",
      "direction",
      "density",
      "color",
      "shadowColor",
    ].includes(name)
      ? value
      : name === "reducedMotion"
        ? value === "auto"
          ? "auto"
          : value === "true"
        : Number(value);
  }
  return result as GravityWaveOptions;
}
function updateSources(): void {
  const sources = new FormData(form).get("sources");
  if (sources === "multiple") {
    const { width, height } = canvas.getBoundingClientRect();
    const r = Math.min(Number(config.radius ?? 200), width * 0.28);
    const inner = Math.min(Number(config.innerRadius ?? 60), r * 0.3);
    const fields: WaveField[] = [
      {
        ...config,
        center: { x: width * 0.3, y: height * 0.42 },
        radius: r,
        innerRadius: inner,
      },
      {
        ...config,
        center: { x: width * 0.7, y: height * 0.42 },
        radius: r,
        innerRadius: inner,
        direction: "outward",
        color: "#b76550",
      },
      {
        ...config,
        center: { x: width * 0.5, y: height * 0.73 },
        radius: r,
        innerRadius: inner,
        color: "#765d9e",
      },
    ];
    wave.update({ ...config, fields });
  } else wave.update({ ...config, fields: undefined });
  document.querySelector<HTMLElement>(".center-dot")!.hidden =
    sources === "multiple";
}
function showCode(): void {
  const m = config.mode ?? "circular",
    speed = config.speed ?? 1,
    radius = config.radius ?? 200;
  snippet.textContent =
    codeMode === "react"
      ? `import { GravityWave } from 'gravity-wave/react';\n\n<GravityWave\n  mode="${m}"\n  radius={${radius}}\n  speed={${speed}}\n  style={{ height: 420 }}\n/>`
      : `import { createGravityWave } from 'gravity-wave';\n\nconst wave = createGravityWave(canvas, {\n  mode: '${m}',\n  radius: ${radius},\n  speed: ${speed},\n});\n\n// When the view is removed:\nwave.destroy();`;
}
function refresh(): void {
  config = options();
  updateSources();
  showCode();
  document.querySelector<HTMLElement>("#morph-controls")!.hidden =
    config.mode !== "morphing";
  for (const input of form.querySelectorAll<HTMLInputElement>(
    "input[type=range]",
  )) {
    const out = form.querySelector<HTMLOutputElement>(
      `output[for="${input.id}"]`,
    )!;
    out.value =
      input.name === "opacity"
        ? `${Math.round(Number(input.value) * 100)}%`
        : input.value +
          (["radius", "innerRadius", "wavelength", "amplitude"].includes(
            input.name,
          )
            ? " px"
            : ["speed", "pointSize", "morphSpeed"].includes(input.name)
              ? "×"
              : "");
  }
  showStatus();
}
function showStatus(): void {
  const state = wave.getState();
  pause.textContent = state.playing ? "Pause" : "Play";
  status.textContent = state.reducedMotion
    ? "Static preview"
    : state.completed
      ? "Playback complete"
      : !state.playing
        ? "Paused"
        : config.duration === Infinity
          ? "Continuous playback"
          : `${config.duration} seconds of motion`;
}
wave.update({ onComplete: showStatus });
form.addEventListener("input", (event) => {
  refresh();
  if ((event.target as HTMLInputElement).name === "duration") wave.restart();
  showStatus();
});
pause.addEventListener("click", () => {
  const state = wave.getState();
  if (state.completed) wave.restart();
  else if (state.playing) wave.pause();
  else wave.play();
  showStatus();
});
document.querySelector("#restart")!.addEventListener("click", () => {
  wave.restart();
  showStatus();
});
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-code]",
))
  button.addEventListener("click", () => {
    codeMode = button.dataset.code!;
    for (const b of document.querySelectorAll<HTMLButtonElement>("[data-code]"))
      b.setAttribute("aria-pressed", String(b === button));
    showCode();
  });
document.querySelector("#copy")!.addEventListener("click", async (event) => {
  const b = event.currentTarget as HTMLButtonElement;
  try {
    await navigator.clipboard.writeText(snippet.textContent!);
    b.textContent = "Copied";
  } catch {
    b.textContent = "Select code to copy";
  }
});
new ResizeObserver(updateSources).observe(canvas);
window
  .matchMedia("(prefers-reduced-motion: reduce)")
  .addEventListener("change", showStatus);
window.addEventListener("pagehide", () => wave.destroy(), { once: true });
refresh();
