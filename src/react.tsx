"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CSSProperties } from "react";
import { createGravityWave } from "./controller.js";
import type { GravityWaveController, GravityWaveOptions } from "./types.js";

export interface GravityWaveProps extends GravityWaveOptions {
  className?: string;
  style?: CSSProperties;
  /** Gives the wrapper an accessible image role; omit for decoration. */
  label?: string;
}
export type {
  GravityWaveController,
  GravityWaveOptions,
  WaveField,
} from "./types.js";
const keys = [
  "center",
  "radius",
  "innerRadius",
  "mode",
  "direction",
  "speed",
  "wavelength",
  "amplitude",
  "pointSize",
  "density",
  "color",
  "shadowColor",
  "opacity",
  "morphAmount",
  "morphSpeed",
  "fields",
  "duration",
  "playing",
  "reducedMotion",
  "pixelRatio",
  "onComplete",
] as const;
function waveOptions(
  props: GravityWaveProps,
  previous?: GravityWaveProps,
): GravityWaveOptions {
  const options: Record<string, unknown> = {};
  // Explicit undefined values reset removed props to their defaults on update.
  for (const key of keys)
    if (props[key] !== undefined || previous?.[key] !== undefined)
      options[key] = props[key];
  return options as GravityWaveOptions;
}
export const GravityWave = forwardRef<GravityWaveController, GravityWaveProps>(
  function GravityWave(props, ref) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const controller = useRef<GravityWaveController | null>(null);
    const latest = useRef(props);
    latest.current = props;
    const applied = useRef(props);
    useImperativeHandle(
      ref,
      () => ({
        update: (options) => controller.current?.update(options),
        play: () => controller.current?.play(),
        pause: () => controller.current?.pause(),
        restart: () => controller.current?.restart(),
        renderAt: (t) => controller.current?.renderAt(t),
        getState: () =>
          controller.current?.getState() ?? {
            elapsed: 0,
            playing: false,
            completed: false,
            reducedMotion: false,
          },
        destroy: () => controller.current?.destroy(),
      }),
      [],
    );
    useEffect(() => {
      const instance = createGravityWave(
        canvas.current!,
        waveOptions(latest.current),
      );
      controller.current = instance;
      applied.current = latest.current;
      return () => {
        instance.destroy();
        controller.current = null;
      };
    }, []);
    useEffect(() => {
      controller.current?.update(waveOptions(props, applied.current));
      applied.current = props;
    }, [props]);
    return (
      <div
        className={props.className}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          ...props.style,
        }}
        role={props.label ? "img" : undefined}
        aria-label={props.label}
        aria-hidden={props.label ? undefined : true}
      >
        <canvas
          ref={canvas}
          aria-hidden="true"
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      </div>
    );
  },
);
