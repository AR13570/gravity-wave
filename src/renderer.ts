import { numberOption, resolveField } from "./options.js";
import { createGeometryCache } from "./geometry.js";
import type {
  DrawOptions,
  ResolvedField,
  WaveField,
  WaveRenderer,
} from "./types.js";

function morphPhase(time: number, rate: number): number {
  return rate === 0 ? 0 : (time % ((Math.PI * 2) / rate)) * rate;
}

export function createWaveRenderer(
  ctx: CanvasRenderingContext2D,
): WaveRenderer {
  const points = new Float32Array(73 * 73 * 4);
  const heads = new Int32Array(16),
    tails = new Int32Array(16);
  const geometry = createGeometryCache();
  const halfDiagonalFactor = Math.hypot(0.5, 0.36);
  let destroyed = false;
  function drawField(
    field: ResolvedField,
    time: number,
    scale: number,
    low: boolean,
  ): void {
    // Transparent source-over is a no-op. Other compositing modes may clear
    // destination pixels even with zero source alpha, so retain their draws.
    if (
      field.intensity === 0 ||
      ((field.opacity === 0 || ctx.globalAlpha === 0) &&
        (ctx.globalCompositeOperation ?? "source-over") === "source-over")
    )
      return;
    const outer = field.radius,
      inner = field.innerRadius;
    const { samples, stride, count, step, morphing } = geometry.get(
      field,
      scale,
      low,
    );
    const cycle =
      field.speed === 0
        ? 0
        : (time % (2.7 / field.speed)) / (2.7 / field.speed);
    const travel = (field.direction === "outward" ? -1 : 1) * cycle;
    const a = morphing ? morphPhase(time, field.morphSpeed * 0.7) : 0;
    const b = morphing ? morphPhase(time, field.morphSpeed * 0.43) : 0;
    const sinA = Math.sin(a),
      cosA = Math.cos(a),
      sinB = Math.sin(b),
      cosB = Math.cos(b);
    const morphLimit = Math.min(
      field.wavelength * 0.65,
      (outer - inner) * 0.18,
    );
    heads.fill(-1);
    tails.fill(-1);
    for (let i = 0; i < count; i++) {
      const g = i * stride;
      const nx = samples[g],
        ny = samples[g + 1],
        distance = samples[g + 2];
      const fade = samples[g + 4];
      let edge = samples[g + 3];
      if (morphing) {
        const shape =
          (samples[g + 7] * cosA +
            samples[g + 8] * sinA +
            0.5 * (samples[g + 9] * cosB - samples[g + 10] * sinB)) /
          1.5;
        edge += shape * field.morphAmount * morphLimit * samples[g + 6];
      }
      const wavePhase =
        Math.PI * 2 * ((edge % field.wavelength) / field.wavelength + travel);
      const crest = (1 + Math.cos(wavePhase)) * 0.5;
      const slope = -Math.sin(wavePhase) * crest;
      const height = field.amplitude * fade * crest * crest;
      const lit = Math.max(0, slope * samples[g + 5]);
      const size = Math.min(
        step * 0.65,
        ((1.3 + crest * 1.2 + lit * 0.3) * field.pointSize) / scale,
        (outer - inner) * 0.5,
      );
      const halfDiagonal = size * halfDiagonalFactor;
      const displaced = Math.max(
        inner + halfDiagonal,
        Math.min(outer - halfDiagonal, distance + height * 0.45),
      );
      const alpha = fade * (0.28 + 0.3 * crest + 0.22 * lit);
      const shade =
        Math.min(7, Math.floor(alpha / 0.09)) + (lit > 0.08 ? 8 : 0);
      const slot = i * 4;
      points[slot] = field.center.x + nx * displaced - size * 0.5;
      points[slot + 1] = field.center.y + ny * displaced - size * 0.36;
      points[slot + 2] = size;
      // Link points in original lattice order within each shade. No 16x rescans.
      points[slot + 3] = -1;
      if (tails[shade] === -1) heads[shade] = i;
      else points[tails[shade] * 4 + 3] = i;
      tails[shade] = i;
    }
    const opacity = ctx.globalAlpha * field.opacity;
    for (let shade = 0; shade < 16; shade++) {
      ctx.beginPath();
      ctx.globalAlpha =
        opacity *
        Math.min(1, 0.7 * (0.02 + (shade % 8) * 0.09) * field.intensity);
      ctx.fillStyle = shade >= 8 ? field.color : field.shadowColor;
      for (let i = heads[shade]; i !== -1; i = points[i * 4 + 3]) {
        const slot = i * 4;
        const size = points[slot + 2];
        ctx.rect(points[slot], points[slot + 1], size, size * 0.72);
      }
      ctx.fill();
    }
  }
  return {
    draw(
      fields: readonly WaveField[],
      elapsedSeconds: number,
      options: DrawOptions = {},
    ) {
      if (destroyed) return;
      numberOption("elapsedSeconds", elapsedSeconds);
      const scale = numberOption("scale", options.scale ?? 1, 0, false);
      // Validate the entire call before it draws anything.
      const resolved = fields.map((f) => resolveField(ctx, f));
      ctx.save();
      try {
        for (const f of resolved) {
          const alpha = ctx.globalAlpha;
          drawField(
            f,
            options.reducedMotion ? 0 : elapsedSeconds,
            scale,
            options.lowDensity ?? false,
          );
          ctx.globalAlpha = alpha;
        }
      } finally {
        ctx.restore();
      }
    },
    destroy() {
      destroyed = true;
      geometry.clear();
    },
  };
}
