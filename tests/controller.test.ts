// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createGravityWave } from "../src/controller.js";
import { environment } from "./browser.js";

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("dedicated canvas controller", () => {
  it("keeps one loop, pauses and resumes without counting hidden time", () => {
    const e = environment();
    const c = createGravityWave(e.canvas);
    expect(e.frames.size).toBe(1);
    e.step(0);
    e.step(50);
    expect(c.getState().elapsed).toBeCloseTo(0.05);
    e.hidden(true);
    expect(e.frames.size).toBe(0);
    e.hidden(false);
    e.step(5000);
    e.step(5050);
    expect(c.getState().elapsed).toBeCloseTo(0.1);
    c.pause();
    expect(e.frames.size).toBe(0);
    c.play();
    c.play();
    expect(e.frames.size).toBe(1);
    c.destroy();
  });
  it("stops offscreen and in zero-size containers", () => {
    const e = environment();
    const c = createGravityWave(e.canvas);
    e.visible(false);
    expect(e.frames.size).toBe(0);
    e.visible(true);
    expect(e.frames.size).toBe(1);
    e.resize(0, 0);
    expect(e.frames.size).toBe(0);
    e.resize(600, 500);
    expect(e.frames.size).toBe(1);
    c.destroy();
  });
  it("follows runtime reduced motion and permits explicit override", () => {
    const e = environment();
    const c = createGravityWave(e.canvas, { mode: "morphing" });
    e.step(0);
    e.step(50);
    e.reduced(true);
    expect(e.frames.size).toBe(0);
    expect(c.getState().reducedMotion).toBe(true);
    const last = e.points.slice(-e.points.length / 2);
    expect(last.length).toBeGreaterThan(0);
    c.update({ reducedMotion: false });
    expect(e.frames.size).toBe(1);
    c.update({ reducedMotion: "auto" });
    expect(e.frames.size).toBe(0);
    e.reduced(false);
    expect(e.frames.size).toBe(1);
    c.destroy();
  });
  it("completes once, holds the final frame and restarts", () => {
    const e = environment();
    const done = vi.fn();
    const c = createGravityWave(e.canvas, {
      duration: 0.1,
      speed: 4,
      onComplete: done,
    });
    e.step(0);
    e.step(50);
    e.step(100);
    expect(done).toHaveBeenCalledTimes(1);
    expect(e.frames.size).toBe(0);
    expect(c.getState().elapsed).toBe(0.1);
    c.update({ color: "red" });
    expect(c.getState().elapsed).toBe(0.1);
    expect(e.frames.size).toBe(0);
    c.restart();
    e.step(200);
    e.step(250);
    e.step(300);
    expect(done).toHaveBeenCalledTimes(2);
    c.destroy();
  });
  it("seeks silently and can play from a seeked point", () => {
    const e = environment();
    const done = vi.fn();
    const c = createGravityWave(e.canvas, { duration: 1, onComplete: done });
    c.renderAt(0.4);
    expect(e.frames.size).toBe(0);
    expect(c.getState().elapsed).toBe(0.4);
    expect(done).not.toHaveBeenCalled();
    c.play();
    expect(e.frames.size).toBe(1);
    c.destroy();
  });
  it("rejects invalid updates transactionally", () => {
    const e = environment();
    const c = createGravityWave(e.canvas);
    e.step(0);
    e.step(50);
    expect(() =>
      c.update({ duration: 0.01, color: "invalid-color" }),
    ).toThrow();
    expect(c.getState().elapsed).toBe(0.05);
    expect(e.frames.size).toBe(1);
    expect(() => c.update({ speed: -1 })).toThrow();
    c.update({ color: "blue" });
    e.step(100);
    expect(c.getState().elapsed).toBe(0.1);
    c.destroy();
  });
  it("does not inherit single-field colors into explicit fields and snapshots caller data", () => {
    const e = environment();
    const fields = [{ center: { x: 100, y: 100 } }];
    const c = createGravityWave(e.canvas, {
      color: "red",
      fields,
      playing: false,
    });
    expect(e.points.some((p) => p.color === "#527c9a")).toBe(true);
    expect(e.points.some((p) => p.color === "red")).toBe(false);
    fields[0].center.x = NaN;
    expect(() => c.renderAt(0.5)).not.toThrow();
    c.update({ fields: [] });
    expect(e.frames.size).toBe(0);
    c.destroy();
  });
  it("caps DPR and removes every resource on repeated destruction", () => {
    const e = environment();
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 3,
    });
    const c = createGravityWave(e.canvas);
    expect(e.canvas.width).toBe(1200);
    expect(e.canvas.height).toBe(1000);
    c.destroy();
    c.destroy();
    expect(e.frames.size).toBe(0);
    expect(e.disconnect).toHaveBeenCalledTimes(2);
    expect(e.mediaListeners.size).toBe(0);
    expect(() => {
      c.update({ radius: NaN });
      c.play();
      c.renderAt(1);
    }).not.toThrow();
    expect(e.frames.size).toBe(0);
  });
  it("resets an omitted duration and does not reset time on repeated playing updates", () => {
    const e = environment();
    const c = createGravityWave(e.canvas, { duration: 1 });
    e.step(0);
    e.step(50);
    c.update({ playing: true });
    e.step(100);
    expect(c.getState().elapsed).toBeCloseTo(0.1);
    c.update({ duration: undefined });
    for (let i = 2; i <= 30; i++) e.step(i * 50);
    expect(c.getState().elapsed).toBeCloseTo(1.5);
    expect(c.getState().completed).toBe(false);
    c.destroy();
  });
  it("reports missing context clearly", () => {
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(null);
    expect(() => createGravityWave(canvas)).toThrow(/Canvas2D/);
  });
});
it("restores playback and backing resolution when optional controls are removed", () => {
  const e = environment();
  const c = createGravityWave(e.canvas, { playing: false, pixelRatio: 1 });
  Object.defineProperty(window, "devicePixelRatio", {
    configurable: true,
    value: 2,
  });
  c.update({ playing: undefined, pixelRatio: undefined });
  expect(e.frames.size).toBe(1);
  expect(e.canvas.width).toBe(1200);
  c.destroy();
});

it("updates and resets intensity without changing playback", () => {
  const e = environment();
  const c = createGravityWave(e.canvas, { playing: false });
  const before = Math.max(...e.points.map((p) => p.alpha));
  e.points.length = 0;
  c.update({ intensity: 2 });
  expect(Math.max(...e.points.map((p) => p.alpha))).toBeCloseTo(before * 2);
  expect(c.getState().playing).toBe(false);
  e.points.length = 0;
  c.update({ intensity: undefined });
  expect(Math.max(...e.points.map((p) => p.alpha))).toBeCloseTo(before);
  expect(() => c.update({ intensity: -1 })).toThrow(/intensity/);
  c.destroy();
});
