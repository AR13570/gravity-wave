import type { ResolvedField } from "./types.js";

interface Lattice {
  samples: Float64Array;
  stride: number;
  count: number;
  step: number;
  morphing: boolean;
}

/** Bounded per-renderer LRU, shared by fields with equal geometry, not identity. */
export function createGeometryCache() {
  const entries = new Map<string, Lattice>();
  return {
    get(field: ResolvedField, scale: number, low: boolean): Lattice {
      const outer = field.radius,
        inner = field.innerRadius;
      const halfCells =
        field.density === "low" ||
        (field.density === "auto" && (low || scale < 0.55))
          ? 24
          : 36;
      const step = Math.max(4, 3 / scale, outer / halfCells);
      const cells = Math.min(halfCells, Math.floor(outer / step));
      const morphing = field.mode === "morphing" && field.morphAmount > 0;
      const key = `${outer}/${inner}/${step}/${cells}/${morphing}`;
      const cached = entries.get(key);
      if (cached) {
        entries.delete(key);
        entries.set(key, cached);
        return cached;
      }
      const stride = morphing ? 11 : 6;
      const samples = new Float64Array((cells * 2 + 1) ** 2 * stride);
      let count = 0;
      for (let row = -cells; row <= cells; row++)
        for (let col = -cells; col <= cells; col++) {
          const dx = col * step,
            dy = row * step;
          const distance = Math.hypot(dx, dy),
            edge = distance - inner;
          if (edge <= 3 || distance >= outer) continue;
          const slot = count++ * stride;
          samples[slot] = dx / distance;
          samples[slot + 1] = dy / distance;
          samples[slot + 2] = distance;
          samples[slot + 3] = edge;
          samples[slot + 4] =
            Math.exp(-edge / 82) *
            Math.min(1, (edge - 3) / 18) *
            Math.min(1, (outer - distance) / 35) ** 2;
          samples[slot + 5] = (-dx - dy) / (distance * Math.SQRT2);
          if (morphing) {
            const angle = Math.atan2(dy, dx);
            samples[slot + 6] =
              Math.sin(
                Math.PI * Math.min(1, Math.max(0, edge / (outer - inner))),
              ) ** 2;
            samples[slot + 7] = Math.sin(angle * 3);
            samples[slot + 8] = Math.cos(angle * 3);
            samples[slot + 9] = Math.sin(angle * 5);
            samples[slot + 10] = Math.cos(angle * 5);
          }
        }
      const lattice = { samples, stride, count, step, morphing };
      // At most eight grids, each no larger than 73 * 73 * 11 doubles.
      if (entries.size === 8) entries.delete(entries.keys().next().value!);
      entries.set(key, lattice);
      return lattice;
    },
    clear() {
      entries.clear();
    },
  };
}
