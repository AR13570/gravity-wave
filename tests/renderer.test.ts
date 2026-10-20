import { describe, it, expect, vi } from "vitest";
import { createWaveRenderer } from "../src/renderer.js";
import { createReferenceRenderer } from "./reference-renderer.js";
import { context } from "./context.js";

function frame(options = {}, time = 0, scale = 1) {
  const c = context();
  const renderer = createWaveRenderer(c.ctx);
  renderer.draw([{ center: { x: 0, y: 0 }, ...options }], time, { scale });
  return c;
}
describe("wave renderer", () => {
  it("draws a dense, concentric lattice and preserves the accepted opacity", () => {
    const { points, raw, fills } = frame();
    expect(points.length).toBeGreaterThan(500);
    expect(raw.fill).toHaveBeenCalledTimes(16);
    expect(Math.max(...fills)).toBeCloseTo(0.7 * (0.02 + 7 * 0.09));
    const right = points
      .filter((p) => Math.abs(p.y + p.h / 2) < 0.001 && p.x + p.w / 2 > 0)
      .map((p) => p.x + p.w / 2)
      .sort((a, b) => a - b);
    const left = points
      .filter((p) => Math.abs(p.y + p.h / 2) < 0.001 && p.x + p.w / 2 < 0)
      .map((p) => -p.x - p.w / 2)
      .sort((a, b) => a - b);
    expect(right.length).toBeGreaterThan(10);
    right.forEach((v, i) => expect(v).toBeCloseTo(left[i], 3));
  });
  it.each([1, 0.4])("matches the source formula at scale %s", (scale) => {
    const { points } = frame({}, 0, scale);
    const step = Math.max(4, 3 / scale, 200 / (scale < 0.55 ? 24 : 36)),
      dx = step * 20,
      edge = dx - 60;
    const fade =
      Math.exp(-edge / 82) *
      Math.min(1, (edge - 3) / 18) *
      Math.min(1, (200 - dx) / 35) ** 2;
    const crest = (1 + Math.cos((Math.PI * 2 * edge) / (32 + 60 * 0.34))) / 2;
    const x = dx + 28 * fade * crest * crest * 0.45;
    expect(
      points.some(
        (p) =>
          Math.abs(p.x + p.w / 2 - x) < 0.0001 &&
          Math.abs(p.y + p.h / 2) < 0.0001,
      ),
    ).toBe(true);
  });
  it("makes zero morphing identical to circular and morphing deterministic", () => {
    const circular = frame({}, 0.8).points;
    expect(frame({ mode: "morphing", morphAmount: 0 }, 0.8).points).toEqual(
      circular,
    );
    const morph = frame({ mode: "morphing" }, 0.8).points;
    expect(morph).not.toEqual(circular);
    expect(frame({ mode: "morphing" }, 0.8).points).toEqual(morph);
    expect(frame({ mode: "morphing" }, 1.2).points).not.toEqual(morph);
  });
  it("freezes both modes in reduced motion", () => {
    const c = context();
    const r = createWaveRenderer(c.ctx);
    r.draw([{ center: { x: 0, y: 0 }, mode: "morphing" }], 3, {
      reducedMotion: true,
    });
    expect(c.points).toEqual(frame({ mode: "morphing" }, 0).points);
  });
  it("keeps speed independent of spacing and supports outward travel", () => {
    expect(frame({ speed: 2 }, 0.5).points).toEqual(frame({}, 1).points);
    expect(frame({ direction: "outward" }, 0.8).points).not.toEqual(
      frame({}, 0.8).points,
    );
    expect(frame({ wavelength: 80 }).points).not.toEqual(frame().points);
  });
  it.each([1, 0.4])("limits sample budgets at scale %s", (scale) => {
    const c = frame({ radius: 10000 }, 0, scale);
    expect(c.points.length).toBeLessThanOrEqual(scale < 0.55 ? 2401 : 5329);
  });
  it("contains extreme relief and glyph size inside the annulus", () => {
    const { points } = frame(
      { mode: "morphing", morphAmount: 1, amplitude: 10000, pointSize: 100 },
      1.3,
    );
    for (const p of points) {
      const corners = [
        [p.x, p.y],
        [p.x + p.w, p.y],
        [p.x, p.y + p.h],
        [p.x + p.w, p.y + p.h],
      ];
      for (const [x, y] of corners)
        expect(Math.hypot(x, y)).toBeLessThanOrEqual(200.001);
      const nearestX = Math.max(p.x, Math.min(0, p.x + p.w));
      const nearestY = Math.max(p.y, Math.min(0, p.y + p.h));
      expect(Math.hypot(nearestX, nearestY)).toBeGreaterThanOrEqual(59.999);
    }
  });
  it("restores context state including when drawing throws", () => {
    const c = context();
    c.ctx.globalAlpha = 0.4;
    c.ctx.fillStyle = "red";
    const r = createWaveRenderer(c.ctx);
    r.draw([{ center: { x: 0, y: 0 } }], 0);
    expect(c.ctx.globalAlpha).toBe(0.4);
    expect(c.ctx.fillStyle).toBe("red");
    c.raw.fill.mockImplementationOnce(() => {
      throw Error("draw failed");
    });
    expect(() => r.draw([{ center: { x: 0, y: 0 } }], 0)).toThrow(
      "draw failed",
    );
    expect(c.ctx.globalAlpha).toBe(0.4);
    expect(c.ctx.fillStyle).toBe("red");
  });
  it.each([
    { radius: NaN },
    { speed: -1 },
    { wavelength: 0 },
    { center: { x: Infinity, y: 0 } },
    { color: "invalid-color" },
    { innerRadius: 200 },
    { mode: "oops" },
  ])("rejects invalid fields %j", (field) => {
    expect(() => frame(field)).toThrow(/gravity-wave/);
  });
  it("renders multiple fields and makes destruction idempotent", () => {
    const c = context();
    const r = createWaveRenderer(c.ctx);
    r.draw([{ center: { x: 0, y: 0 } }, { center: { x: 500, y: 0 } }], 0);
    expect(c.raw.fill).toHaveBeenCalledTimes(32);
    r.destroy();
    r.destroy();
    c.points.length = 0;
    r.draw([{ center: { x: 0, y: 0 } }], 0);
    expect(c.points).toHaveLength(0);
  });
});
it("keeps morphing continuous across a full base phase", async () => {
  const { sampleSurface } = await import("../src/surface.js");
  const { resolveField } = await import("../src/options.js");
  const field = resolveField(context().ctx, { mode: "morphing" });
  const before = { crest: 0, slope: 0 },
    after = { crest: 0, slope: 0 };
  sampleSurface(55, 0.7, Math.PI * 2 - 0.000001, field, before);
  sampleSurface(55, 0.7, Math.PI * 2 + 0.000001, field, after);
  expect(after.crest).toBeCloseTo(before.crest, 4);
  expect(after.slope).toBeCloseTo(before.slope, 4);
});

describe("intensity", () => {
  it("strengthens shading in a single pass without changing geometry", () => {
    const normal = frame();
    const strong = frame({ intensity: 2 });
    expect(strong.points.map(({ alpha, ...p }) => p)).toEqual(
      normal.points.map(({ alpha, ...p }) => p),
    );
    expect(strong.fills).toEqual(normal.fills.map((a) => Math.min(1, a * 2)));
    expect(strong.raw.fill).toHaveBeenCalledTimes(16);
  });
  it("clamps shading before applying field and caller opacity", () => {
    const c = context();
    c.ctx.globalAlpha = 0.4;
    createWaveRenderer(c.ctx).draw(
      [{ center: { x: 0, y: 0 }, intensity: 100, opacity: 0.5 }],
      0,
    );
    expect(Math.max(...c.fills)).toBeCloseTo(0.2);
    expect(c.ctx.globalAlpha).toBe(0.4);
    expect(frame({ intensity: 0 }).points).toHaveLength(0);
    expect(frame({ opacity: 0 }).points).toHaveLength(0);
  });
  it.each([-1, NaN, Infinity])(
    "rejects invalid intensity %s before drawing any field",
    (intensity) => {
      const c = context();
      expect(() =>
        createWaveRenderer(c.ctx).draw(
          [{ center: { x: 0, y: 0 } }, { center: { x: 1, y: 1 }, intensity }],
          0,
        ),
      ).toThrow(/intensity/);
      expect(c.points).toHaveLength(0);
    },
  );
});

describe("cached renderer compatibility", () => {
  it("preserves reference geometry, shading and order across changing fields and zooms", () => {
    const actual = context(),
      expected = context();
    const renderer = createWaveRenderer(actual.ctx),
      reference = createReferenceRenderer(expected.ctx);
    for (const mode of ["circular", "morphing"] as const)
      for (const scale of [0.4, 0.54, 0.55, 1, 2])
        for (const time of [0, 0.8, 2.7, 12345]) {
          actual.points.length = expected.points.length = 0;
          const fields = [
            {
              center: { x: 123 + (time % 2), y: 240 },
              mode,
              morphAmount: 0.65,
            },
            {
              center: { x: 500, y: 200 },
              mode,
              radius: 155,
              innerRadius: 25,
              wavelength: 40,
              amplitude: 70,
              pointSize: 1.4,
              direction: "outward" as const,
            },
          ];
          renderer.draw(fields, time, { scale });
          reference.draw(fields, time, { scale });
          expect(actual.points.length).toBe(expected.points.length);
          const maxError = { position: 0, size: 0 };
          expect(actual.points.map((p) => [p.alpha, p.color])).toEqual(
            expected.points.map((p) => [p.alpha, p.color]),
          );
          for (let i = 0; i < actual.points.length; i++) {
            const a = actual.points[i],
              b = expected.points[i];
            maxError.position = Math.max(
              maxError.position,
              Math.abs(a.x - b.x),
              Math.abs(a.y - b.y),
            );
            maxError.size = Math.max(
              maxError.size,
              Math.abs(a.w - b.w),
              Math.abs(a.h - b.h),
            );
          }
          expect(maxError.position).toBeLessThan(0.0005);
          expect(maxError.size).toBeLessThan(0.000005);
        }
  });
  it("observes in-place changes to every geometry key and survives cache eviction", () => {
    const actual = context(),
      expected = context();
    const renderer = createWaveRenderer(actual.ctx),
      reference = createReferenceRenderer(expected.ctx);
    const field = {
      center: { x: 0, y: 0 },
      radius: 200,
      innerRadius: 60,
      wavelength: 50,
      density: "high" as "high" | "low",
      mode: "morphing" as const,
    };
    for (let i = 0; i < 20; i++) {
      field.radius = 140 + i * 7;
      field.innerRadius = 20 + i;
      field.wavelength = 30 + i;
      field.density = i % 2 ? "low" : "high";
      field.center.x = i * 10;
      actual.points.length = expected.points.length = 0;
      renderer.draw([field], i / 10);
      reference.draw([field], i / 10);
      expect(actual.points.length).toBe(expected.points.length);
      for (let j = 0; j < actual.points.length; j++) {
        expect(actual.points[j].x).toBeCloseTo(expected.points[j].x, 3);
        expect(actual.points[j].alpha).toBe(expected.points[j].alpha);
      }
    }
  });
});

it("reuses geometry for moving fields and factors morph time outside the lattice", () => {
  const c = context();
  const renderer = createWaveRenderer(c.ctx);
  const field = { center: { x: 0, y: 0 }, mode: "morphing" as const };
  renderer.draw([field], 0);
  const hypot = vi.spyOn(Math, "hypot"),
    atan2 = vi.spyOn(Math, "atan2"),
    sin = vi.spyOn(Math, "sin");
  try {
    c.points.length = 0;
    renderer.draw(
      [
        {
          ...field,
          center: { x: 100, y: 200 },
          amplitude: 50,
          morphAmount: 0.7,
        },
      ],
      0.5,
    );
    expect(hypot).not.toHaveBeenCalled();
    expect(atan2).not.toHaveBeenCalled();
    expect(sin.mock.calls.length).toBeLessThanOrEqual(c.points.length + 10);
  } finally {
    hypot.mockRestore();
    atan2.mockRestore();
    sin.mockRestore();
  }
});

it.each(["copy", "destination-in"] as const)(
  "retains transparent drawing with %s compositing",
  (operation) => {
    const c = context();
    c.ctx.globalCompositeOperation = operation;
    createWaveRenderer(c.ctx).draw([{ center: { x: 0, y: 0 }, opacity: 0 }], 0);
    expect(c.points.length).toBeGreaterThan(500);
    expect(c.fills.every((alpha) => alpha === 0)).toBe(true);
    expect(c.ctx.globalCompositeOperation).toBe(operation);
  },
);
