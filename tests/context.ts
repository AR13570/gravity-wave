import { vi } from "vitest";
export function context() {
  const points: {
    x: number;
    y: number;
    w: number;
    h: number;
    alpha: number;
    color: string;
  }[] = [];
  const fills: number[] = [];
  const stack: { alpha: number; color: string }[] = [];
  let color = "#000000";
  const ctx = {
    globalAlpha: 1,
    get fillStyle() {
      return color;
    },
    set fillStyle(value: string) {
      if (
        /^#[a-f\d]{3,8}$/i.test(value) ||
        /^(blue|red|transparent|black|white|rebeccapurple)$/.test(value) ||
        /^(rgb|hsl)a?\(/.test(value)
      )
        color = value;
    },
    save: vi.fn(() => stack.push({ alpha: ctx.globalAlpha, color })),
    restore: vi.fn(() => {
      const s = stack.pop();
      if (s) {
        ctx.globalAlpha = s.alpha;
        color = s.color;
      }
    }),
    beginPath: vi.fn(),
    fill: vi.fn(() => fills.push(ctx.globalAlpha)),
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    rect: vi.fn((x: number, y: number, w: number, h: number) =>
      points.push({ x, y, w, h, alpha: ctx.globalAlpha, color }),
    ),
  };
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    points,
    fills,
    raw: ctx,
  };
}
