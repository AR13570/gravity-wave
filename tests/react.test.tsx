// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { act, createRef, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { GravityWaveController } from "../src/types.js";
const mocks = vi.hoisted(() => ({ create: vi.fn(), instances: [] as any[] }));
vi.mock("../src/controller.js", () => ({
  createGravityWave: (canvas: HTMLCanvasElement, options: unknown) => {
    const c = {
      update: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      restart: vi.fn(),
      renderAt: vi.fn(),
      destroy: vi.fn(),
      getState: () => ({
        elapsed: 0,
        playing: true,
        completed: false,
        reducedMotion: false,
      }),
    };
    mocks.create(canvas, options);
    mocks.instances.push(c);
    return c;
  },
}));
import { GravityWave } from "../src/react.js";
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => {
  mocks.instances.length = 0;
  mocks.create.mockClear();
  document.body.innerHTML = "";
});
describe("React adapter", () => {
  it("renders stable decorative SSR markup without creating browser resources", () => {
    const html = renderToString(<GravityWave style={{ height: 400 }} />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("<canvas");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("provides an accessible label when requested", () => {
    const html = renderToString(<GravityWave label="A flowing wave field" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="A flowing wave field"');
  });
  it("updates props without recreation and exposes controller methods", async () => {
    const el = document.createElement("div");
    document.body.append(el);
    const root = createRoot(el);
    const ref = createRef<GravityWaveController>();
    await act(() =>
      root.render(<GravityWave ref={ref} mode="circular" duration={3} />),
    );
    expect(mocks.create).toHaveBeenCalledTimes(1);
    const c = mocks.instances[0];
    await act(() => root.render(<GravityWave ref={ref} mode="morphing" />));
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(c.update.mock.lastCall[0].mode).toBe("morphing");
    expect(c.update.mock.lastCall[0]).toHaveProperty("duration", undefined);
    ref.current?.pause();
    ref.current?.play();
    ref.current?.restart();
    ref.current?.renderAt(0.3);
    expect(c.pause).toHaveBeenCalledTimes(1);
    expect(c.renderAt).toHaveBeenCalledWith(0.3);
    await act(() => root.unmount());
    expect(c.destroy).toHaveBeenCalledTimes(1);
  });
  it("cleans up both Strict Mode mounts", async () => {
    const el = document.createElement("div");
    document.body.append(el);
    const root = createRoot(el);
    await act(() =>
      root.render(
        <StrictMode>
          <GravityWave />
        </StrictMode>,
      ),
    );
    expect(mocks.instances.length).toBe(2);
    expect(mocks.instances[0].destroy).toHaveBeenCalledTimes(1);
    await act(() => root.unmount());
    expect(mocks.instances[1].destroy).toHaveBeenCalledTimes(1);
  });
});
