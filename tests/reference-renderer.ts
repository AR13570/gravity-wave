// Frozen 0.1.1 renderer for visual command parity tests.
import { numberOption, resolveField } from "../src/options.js";
import { sampleSurface } from "../src/surface.js";
import type {
  DrawOptions,
  ResolvedField,
  WaveField,
  WaveRenderer,
} from "../src/types.js";

export function createReferenceRenderer(
  ctx: CanvasRenderingContext2D,
): WaveRenderer {
  const points = new Float32Array(73 * 73 * 4);
  const wave = { crest: 0, slope: 0 };
  let destroyed = false;
  function drawField(
    field: ResolvedField,
    time: number,
    scale: number,
    low: boolean,
  ): void {
    const outer = field.radius,
      inner = field.innerRadius;
    const halfCells =
      field.density === "low" ||
      (field.density === "auto" && (low || scale < 0.55))
        ? 24
        : 36;
    const step = Math.max(4, 3 / scale, outer / halfCells);
    const cells = Math.min(halfCells, Math.floor(outer / step));
    let count = 0;
    for (let row = -cells; row <= cells; row++)
      for (let col = -cells; col <= cells; col++) {
        const dx = col * step,
          dy = row * step,
          distance = Math.hypot(dx, dy),
          edge = distance - inner;
        if (edge <= 3 || distance >= outer) continue;
        const fade =
          Math.exp(-edge / 82) *
          Math.min(1, (edge - 3) / 18) *
          Math.min(1, (outer - distance) / 35) ** 2;
        sampleSurface(edge, Math.atan2(dy, dx), time, field, wave);
        const { crest, slope } = wave;
        const height = field.amplitude * fade * crest * crest;
        const lit = Math.max(0, (slope * (-dx - dy)) / (distance * Math.SQRT2));
        const size = Math.min(
          step * 0.65,
          ((1.3 + crest * 1.2 + lit * 0.3) * field.pointSize) / scale,
          (outer - inner) * 0.5,
        );
        const halfDiagonal = Math.hypot(size / 2, size * 0.36);
        // Contain the full glyph when callers choose large relief or point sizes.
        const displaced = Math.max(
          inner + halfDiagonal,
          Math.min(outer - halfDiagonal, distance + height * 0.45),
        );
        const alpha = fade * (0.28 + 0.3 * crest + 0.22 * lit);
        const shade =
          Math.min(7, Math.floor(alpha / 0.09)) + (lit > 0.08 ? 8 : 0);
        const slot = count++ * 4;
        points[slot] =
          field.center.x + (dx / distance) * displaced - size * 0.5;
        points[slot + 1] =
          field.center.y + (dy / distance) * displaced - size * 0.36;
        points[slot + 2] = size;
        points[slot + 3] = shade;
      }
    const opacity = ctx.globalAlpha * field.opacity;
    for (let shade = 0; shade < 16; shade++) {
      ctx.beginPath();
      ctx.globalAlpha = opacity * 0.7 * (0.02 + (shade % 8) * 0.09);
      ctx.fillStyle = shade >= 8 ? field.color : field.shadowColor;
      for (let i = 0; i < count; i++) {
        const slot = i * 4;
        if (points[slot + 3] !== shade) continue;
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
    },
  };
}
