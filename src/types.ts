/** Dimensions are CSS pixels and time values are seconds. */
export interface Point {
  x: number;
  y: number;
}
export type WaveMode = "circular" | "morphing";
export type WaveDirection = "inward" | "outward";
export type WaveDensity = "low" | "auto" | "high";
export interface WaveAppearance {
  center?: Point;
  radius?: number;
  innerRadius?: number;
  mode?: WaveMode;
  direction?: WaveDirection;
  speed?: number;
  wavelength?: number;
  amplitude?: number;
  pointSize?: number;
  density?: WaveDensity;
  color?: string;
  shadowColor?: string;
  opacity?: number;
  morphAmount?: number;
  morphSpeed?: number;
}
export interface WaveField extends WaveAppearance {
  center: Point;
}
export interface ResolvedField extends Required<WaveAppearance> {}
export interface DrawOptions {
  scale?: number;
  reducedMotion?: boolean;
  lowDensity?: boolean;
}
export interface WaveRenderer {
  draw(
    fields: readonly WaveField[],
    elapsedSeconds: number,
    options?: DrawOptions,
  ): void;
  destroy(): void;
}
export interface GravityWaveOptions extends WaveAppearance {
  /** Replaces the single source. Each field has its own appearance defaults. */
  fields?: readonly WaveField[];
  duration?: number;
  playing?: boolean;
  reducedMotion?: "auto" | boolean;
  /** Maximum device pixel ratio, clamped to 2. */
  pixelRatio?: number;
  onComplete?: () => void;
}
export interface GravityWaveState {
  elapsed: number;
  playing: boolean;
  completed: boolean;
  reducedMotion: boolean;
}
export interface GravityWaveController {
  update(options: Partial<GravityWaveOptions>): void;
  play(): void;
  pause(): void;
  restart(): void;
  /** Pause playback and seek to an elapsed time without firing onComplete. */
  renderAt(seconds: number): void;
  getState(): GravityWaveState;
  destroy(): void;
}
