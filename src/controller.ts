import { numberOption, resolveField, validatePlayback } from "./options.js";
import { Playback } from "./playback.js";
import { createWaveRenderer } from "./renderer.js";
import type {
  GravityWaveController,
  GravityWaveOptions,
  ResolvedField,
} from "./types.js";

/** Owns a dedicated canvas. For a shared canvas, use createWaveRenderer instead. */
export function createGravityWave(
  canvas: HTMLCanvasElement,
  initial: GravityWaveOptions = {},
): GravityWaveController {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("gravity-wave: Canvas2D is unavailable");
  const doc = canvas.ownerDocument,
    win = doc.defaultView;
  if (!win) throw new Error("gravity-wave: a browser document is required");
  const renderer = createWaveRenderer(ctx);
  let config: GravityWaveOptions = {},
    fields: ResolvedField[] = [];
  let width = 0,
    height = 0,
    ratio = 1,
    frame = 0,
    visible = true,
    destroyed = false;
  const media =
    typeof win.matchMedia === "function"
      ? win.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  function reduced(): boolean {
    return (
      config.reducedMotion === true ||
      ((config.reducedMotion ?? "auto") === "auto" && !!media?.matches)
    );
  }
  function normalized(candidate: GravityWaveOptions): {
    config: GravityWaveOptions;
    fields: ResolvedField[];
  } {
    validatePlayback(candidate);
    if (candidate.fields !== undefined && !Array.isArray(candidate.fields))
      throw new TypeError("gravity-wave: fields must be an array");
    const sources = candidate.fields ?? [candidate];
    const resolved = sources.map((f) =>
      resolveField(ctx!, f, { x: width / 2, y: height / 2 }),
    );
    const copy = {
      ...candidate,
      center: candidate.center ? { ...candidate.center } : undefined,
      fields: candidate.fields?.map((f) => ({ ...f, center: { ...f.center } })),
    };
    return { config: copy, fields: resolved };
  }
  // Validate all inputs before any listeners or animation resources are installed.
  ({ config, fields } = normalized(initial));
  const clock = new Playback(config);
  function active(): boolean {
    return (
      !destroyed &&
      !reduced() &&
      !doc.hidden &&
      visible &&
      width > 0 &&
      height > 0 &&
      fields.length > 0
    );
  }
  function paint(): void {
    if (destroyed || width <= 0 || height <= 0) return;
    ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx!.clearRect(0, 0, width, height);
    renderer.draw(fields, clock.elapsed, {
      reducedMotion: reduced(),
      lowDensity: width < 480,
    });
  }
  function sync(redraw = true): void {
    if (destroyed) return;
    if (redraw) paint();
    if (active() && clock.playing && !clock.completed) {
      if (!frame) frame = win!.requestAnimationFrame(tick);
    } else {
      if (frame) win!.cancelAnimationFrame(frame);
      frame = 0;
      clock.suspend();
    }
  }
  function tick(timestamp: number): void {
    frame = 0;
    if (destroyed) return;
    try {
      clock.tick(timestamp, active());
      paint();
    } finally {
      sync(false);
    }
  }
  function measure(): void {
    if (destroyed) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(0, rect.width);
    height = Math.max(0, rect.height);
    ratio = Math.min(2, config.pixelRatio ?? 2, win!.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(width * ratio)),
      h = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    fields = normalized(config).fields;
    sync();
  }
  const onVisibility = () => {
    clock.suspend();
    sync();
  };
  const onPreference = () => {
    clock.suspend();
    sync();
  };
  const Resize = win.ResizeObserver;
  const resizeObserver = Resize ? new Resize(measure) : null;
  const Intersection = win.IntersectionObserver;
  const intersectionObserver = Intersection
    ? new Intersection((entries) => {
        visible = entries.some((e) => e.isIntersecting);
        clock.suspend();
        sync();
      })
    : null;
  resizeObserver?.observe(canvas);
  intersectionObserver?.observe(canvas);
  doc.addEventListener("visibilitychange", onVisibility);
  win.addEventListener("resize", measure);
  media?.addEventListener("change", onPreference);
  measure();
  return {
    update(patch) {
      if (destroyed) return;
      const next = normalized({ ...config, ...patch });
      config = next.config;
      fields = next.fields;
      clock.update({
        ...patch,
        ...("duration" in patch
          ? { duration: config.duration ?? Infinity }
          : {}),
      });
      if ("pixelRatio" in patch) measure();
      else sync();
    },
    play() {
      if (!destroyed) {
        clock.play();
        sync();
      }
    },
    pause() {
      if (!destroyed) {
        clock.pause();
        sync();
      }
    },
    restart() {
      if (!destroyed) {
        clock.restart();
        sync();
      }
    },
    renderAt(seconds) {
      if (!destroyed) {
        numberOption("seconds", seconds);
        clock.seek(seconds);
        sync();
      }
    },
    getState() {
      return {
        elapsed: clock.elapsed,
        playing: clock.playing,
        completed: clock.completed,
        reducedMotion: reduced(),
      };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frame) win!.cancelAnimationFrame(frame);
      frame = 0;
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      doc.removeEventListener("visibilitychange", onVisibility);
      win!.removeEventListener("resize", measure);
      media?.removeEventListener("change", onPreference);
      clock.pause();
      renderer.destroy();
    },
  };
}
