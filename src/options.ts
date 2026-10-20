import type {
  GravityWaveOptions,
  Point,
  ResolvedField,
  WaveAppearance,
} from "./types.js";

export function numberOption(
  name: string,
  value: number,
  min = 0,
  inclusive = true,
): number {
  if (!Number.isFinite(value) || (inclusive ? value < min : value <= min))
    throw new RangeError(
      `gravity-wave: ${name} must be finite and ${inclusive ? "at least" : "greater than"} ${min}`,
    );
  return value;
}
function choice<T extends string>(
  name: string,
  value: T,
  values: readonly T[],
): T {
  if (!values.includes(value))
    throw new TypeError(`gravity-wave: invalid ${name}`);
  return value;
}
function unit(name: string, value: number): number {
  numberOption(name, value);
  if (value > 1)
    throw new RangeError(`gravity-wave: ${name} must be between 0 and 1`);
  return value;
}
function color(ctx: CanvasRenderingContext2D, value: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new TypeError("gravity-wave: color must be a CSS color");
  ctx.save();
  try {
    ctx.fillStyle = "#000001";
    ctx.fillStyle = value;
    if (ctx.fillStyle === "#000001") {
      ctx.fillStyle = "#000002";
      ctx.fillStyle = value;
      if (ctx.fillStyle === "#000002")
        throw new TypeError(`gravity-wave: invalid color ${value}`);
    }
    return value;
  } finally {
    ctx.restore();
  }
}
export function resolveField(
  ctx: CanvasRenderingContext2D,
  input: WaveAppearance,
  center: Point = { x: 0, y: 0 },
): ResolvedField {
  const innerRadius = numberOption("innerRadius", input.innerRadius ?? 60);
  const radius = numberOption(
    "radius",
    input.radius ?? 200,
    innerRadius,
    false,
  );
  const p = input.center ?? center;
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y))
    throw new TypeError("gravity-wave: center must contain finite x and y");
  return {
    center: { x: p.x, y: p.y },
    innerRadius,
    radius,
    mode: choice("mode", input.mode ?? "circular", ["circular", "morphing"]),
    direction: choice("direction", input.direction ?? "inward", [
      "inward",
      "outward",
    ]),
    speed: numberOption("speed", input.speed ?? 1),
    wavelength: numberOption(
      "wavelength",
      input.wavelength ?? 32 + innerRadius * 0.34,
      0,
      false,
    ),
    amplitude: numberOption("amplitude", input.amplitude ?? 28),
    pointSize: numberOption("pointSize", input.pointSize ?? 1, 0, false),
    density: choice("density", input.density ?? "auto", [
      "low",
      "auto",
      "high",
    ]),
    color: color(ctx, input.color ?? "#527c9a"),
    shadowColor: color(ctx, input.shadowColor ?? "#303943"),
    opacity: unit("opacity", input.opacity ?? 1),
    intensity: numberOption("intensity", input.intensity ?? 1),
    morphAmount: unit("morphAmount", input.morphAmount ?? 0.35),
    morphSpeed: numberOption("morphSpeed", input.morphSpeed ?? 1),
  };
}
export function validatePlayback(options: GravityWaveOptions): void {
  if (options.duration !== undefined && options.duration !== Infinity)
    numberOption("duration", options.duration);
  if (options.pixelRatio !== undefined)
    numberOption("pixelRatio", options.pixelRatio, 0, false);
  if (options.playing !== undefined && typeof options.playing !== "boolean")
    throw new TypeError("gravity-wave: playing must be boolean");
  if (
    options.reducedMotion !== undefined &&
    ![true, false, "auto"].includes(options.reducedMotion)
  )
    throw new TypeError("gravity-wave: invalid reducedMotion");
  if (
    options.onComplete !== undefined &&
    typeof options.onComplete !== "function"
  )
    throw new TypeError("gravity-wave: onComplete must be a function");
}
