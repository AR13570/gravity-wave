import { numberOption } from "./options.js";
import type { ResolvedField } from "./types.js";
const TAU = Math.PI * 2;
function morphPhase(time: number, rate: number): number {
  return rate === 0 ? 0 : (time % (TAU / rate)) * rate;
}
export interface WaveSample {
  crest: number;
  slope: number;
}
/** Writes into caller-owned storage, with no allocations in the sample loop. */
export function sampleSurface(
  edge: number,
  angle: number,
  time: number,
  field: ResolvedField,
  out: WaveSample,
): void {
  let sampleEdge = edge;
  if (field.mode === "morphing" && field.morphAmount > 0) {
    const span = field.radius - field.innerRadius;
    const envelope =
      Math.sin(Math.PI * Math.min(1, Math.max(0, edge / span))) ** 2;
    const shape =
      (Math.sin(angle * 3 + morphPhase(time, field.morphSpeed * 0.7)) +
        0.5 * Math.sin(angle * 5 - morphPhase(time, field.morphSpeed * 0.43))) /
      1.5;
    sampleEdge +=
      shape *
      field.morphAmount *
      Math.min(field.wavelength * 0.65, span * 0.18) *
      envelope;
  }
  writeWave(
    sampleEdge,
    field.wavelength,
    time,
    field.speed,
    field.direction === "outward",
    out,
  );
}

function writeWave(
  edge: number,
  wavelength: number,
  time: number,
  speed: number,
  outward: boolean,
  out: WaveSample,
): void {
  const cycle = speed === 0 ? 0 : (time % (2.7 / speed)) / (2.7 / speed);
  const phase =
    TAU * ((edge % wavelength) / wavelength + (outward ? -1 : 1) * cycle);
  out.crest = (1 + Math.cos(phase)) * 0.5;
  out.slope = -Math.sin(phase) * out.crest;
}

/** Samples the default circular field without allocating a result. */
export function sampleGravityWave(
  fromEdge: number,
  radius: number,
  activeTime: number,
  repels: boolean,
  sample: WaveSample,
): void {
  numberOption("fromEdge", fromEdge, -Infinity);
  numberOption("radius", radius);
  numberOption("activeTime", activeTime);
  if (typeof repels !== "boolean")
    throw new TypeError("gravity-wave: repels must be boolean");
  writeWave(fromEdge, 32 + radius * 0.34, activeTime, 1, repels, sample);
}
