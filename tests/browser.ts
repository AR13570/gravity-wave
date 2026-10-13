import { vi } from "vitest";
import { context } from "./context.js";
export function environment() {
  const c = context();
  const canvas = document.createElement("canvas");
  document.body.append(canvas);
  let width = 600,
    height = 500,
    hidden = false,
    reduced = false;
  vi.spyOn(canvas, "getContext").mockReturnValue(c.ctx);
  vi.spyOn(canvas, "getBoundingClientRect").mockImplementation(() => ({
    width,
    height,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    toJSON() {},
  }));
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    frames.set(++id, cb);
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((i) => {
    frames.delete(i);
  });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  const mediaListeners = new Set<() => void>();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_: string, cb: () => void) => mediaListeners.add(cb),
      removeEventListener: (_: string, cb: () => void) =>
        mediaListeners.delete(cb),
    }),
  });
  let resize: () => void = () => {},
    intersect: (e: { isIntersecting: boolean }[]) => void = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(cb: () => void) {
        resize = cb;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: typeof intersect) {
        intersect = cb;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  function step(time: number) {
    const current = [...frames.values()];
    frames.clear();
    current.forEach((cb) => cb(time));
  }
  return {
    ...c,
    canvas,
    frames,
    step,
    disconnect,
    mediaListeners,
    resize(w: number, h: number) {
      width = w;
      height = h;
      resize();
    },
    hidden(v: boolean) {
      hidden = v;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    reduced(v: boolean) {
      reduced = v;
      mediaListeners.forEach((cb) => cb());
    },
    visible(v: boolean) {
      intersect([{ isIntersecting: v }]);
    },
  };
}
