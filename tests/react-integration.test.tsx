// @vitest-environment jsdom
import { afterEach, it, expect, vi } from "vitest";
import { act, createRef, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GravityWave } from "../src/react.js";
import type { GravityWaveController } from "../src/types.js";
import { environment } from "./browser.js";
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});
it("integrates Strict Mode, removed props, imperative pause, and zero-size suspension", async () => {
  const e = environment();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(e.ctx);
  vi.spyOn(
    HTMLCanvasElement.prototype,
    "getBoundingClientRect",
  ).mockImplementation(() => e.canvas.getBoundingClientRect());
  Object.defineProperty(window, "devicePixelRatio", {
    configurable: true,
    value: 2,
  });
  const rootEl = document.createElement("div");
  document.body.append(rootEl);
  const root = createRoot(rootEl);
  const ref = createRef<GravityWaveController>();
  await act(() =>
    root.render(
      <StrictMode>
        <GravityWave ref={ref} playing={false} pixelRatio={1} />
      </StrictMode>,
    ),
  );
  expect(e.frames.size).toBe(0);
  expect(rootEl.querySelector("canvas")!.width).toBe(600);
  await act(() =>
    root.render(
      <StrictMode>
        <GravityWave ref={ref} />
      </StrictMode>,
    ),
  );
  expect(e.frames.size).toBe(1);
  expect(rootEl.querySelector("canvas")!.width).toBe(1200);
  ref.current!.pause();
  await act(() =>
    root.render(
      <StrictMode>
        <GravityWave ref={ref} color="red" />
      </StrictMode>,
    ),
  );
  expect(e.frames.size).toBe(0);
  expect(ref.current!.getState().playing).toBe(false);
  ref.current!.play();
  e.resize(0, 0);
  expect(e.frames.size).toBe(0);
  e.resize(600, 500);
  expect(e.frames.size).toBe(1);
  await act(() => root.unmount());
  expect(e.frames.size).toBe(0);
  expect(e.mediaListeners.size).toBe(0);
  expect(e.disconnect).toHaveBeenCalledTimes(4);
});
