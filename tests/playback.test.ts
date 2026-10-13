import { describe, it, expect, vi } from "vitest";
import { Playback } from "../src/playback.js";
describe("active playback clock", () => {
  it("counts active time and completes once without depending on wave speed", () => {
    const done = vi.fn();
    const p = new Playback({ duration: 0.15, onComplete: done });
    p.tick(0, true);
    p.tick(50, true);
    p.tick(100, true);
    p.tick(150, true);
    p.tick(200, true);
    expect(p.elapsed).toBeCloseTo(0.15);
    expect(done).toHaveBeenCalledTimes(1);
    expect(p.completed).toBe(true);
    p.restart();
    p.tick(300, true);
    p.tick(375, true);
    p.tick(450, true);
    expect(done).toHaveBeenCalledTimes(2);
  });
  it("ignores gaps, duplicate and backward timestamps", () => {
    const p = new Playback();
    p.tick(0, true);
    p.tick(50, true);
    p.tick(50, true);
    p.tick(40, true);
    p.tick(5000, true);
    p.tick(5050, true);
    expect(p.elapsed).toBeCloseTo(0.1);
  });
  it("pauses without adding hidden time on resume", () => {
    const p = new Playback();
    p.tick(0, true);
    p.tick(50, true);
    p.tick(100, false);
    p.tick(5000, true);
    p.tick(5050, true);
    expect(p.elapsed).toBeCloseTo(0.1);
    p.pause();
    p.tick(5100, true);
    expect(p.elapsed).toBeCloseTo(0.1);
    p.play();
    p.tick(8000, true);
    p.tick(8050, true);
    expect(p.elapsed).toBeCloseTo(0.15);
  });
  it("seeks silently and requires restart after completion", () => {
    const done = vi.fn();
    const p = new Playback({ duration: 1, onComplete: done });
    p.seek(2);
    expect(p.elapsed).toBe(1);
    expect(p.completed).toBe(true);
    expect(done).not.toHaveBeenCalled();
    p.play();
    expect(p.playing).toBe(false);
    p.restart();
    expect(p.playing).toBe(true);
    expect(p.elapsed).toBe(0);
  });
  it("handles a zero duration on first active tick", () => {
    const done = vi.fn();
    const p = new Playback({ duration: 0, onComplete: done });
    p.tick(0, true);
    p.tick(10, true);
    expect(done).toHaveBeenCalledTimes(1);
    expect(p.completed).toBe(true);
  });
  it("validates updates before changing playback", () => {
    const p = new Playback();
    expect(() => p.update({ duration: -1 })).toThrow();
    expect(p.duration).toBe(Infinity);
  });
});
it("notifies only once per run even after seeking backward from completion", () => {
  const done = vi.fn();
  const p = new Playback({ duration: 0.1, onComplete: done });
  p.tick(0, true);
  p.tick(100, true);
  p.seek(0);
  p.play();
  p.tick(200, true);
  p.tick(300, true);
  expect(done).toHaveBeenCalledTimes(1);
  p.restart();
  p.tick(400, true);
  p.tick(500, true);
  expect(done).toHaveBeenCalledTimes(2);
});
