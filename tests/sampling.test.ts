import { describe, it, expect } from "vitest";
import { sampleGravityWave } from "../src/index.js";
describe("public wave sampler", () => {
  it("writes the reference circular wave into a reusable result", () => {
    const sample = { crest: 0, slope: 0 };
    for (const radius of [30, 60, 125])
      for (const time of [0, 0.4, 2.7, 6]) {
        const edge = 43,
          phase = Math.PI * 2 * (edge / (32 + 0.34 * radius) + time / 2.7);
        sampleGravityWave(edge, radius, time, false, sample);
        expect(sample.crest).toBeCloseTo((1 + Math.cos(phase)) / 2, 12);
        expect(sample.slope).toBeCloseTo(-Math.sin(phase) * sample.crest, 12);
      }
  });
  it("supports repulsion and size-based wavelength", () => {
    const s = { crest: 0, slope: 0 };
    sampleGravityWave(0, 60, 0.675, true, s);
    expect(s.crest).toBeCloseTo(0.5);
    expect(s.slope).toBeGreaterThan(0);
    sampleGravityWave((32 + 0.34 * 125) / 2, 125, 0, false, s);
    expect(s.crest).toBeCloseTo(0);
  });
  it("rejects invalid input", () => {
    expect(() =>
      sampleGravityWave(0, -1, 0, false, { crest: 0, slope: 0 }),
    ).toThrow();
  });
});
