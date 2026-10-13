import { numberOption, validatePlayback } from "./options.js";
import type { GravityWaveOptions } from "./types.js";
/** Active-time clock; rendering and browser state are deliberately external. */
export class Playback {
  elapsed = 0;
  playing = true;
  completed = false;
  duration = Infinity;
  private last: number | null = null;
  private notified = false;
  private onComplete: (() => void) | undefined;
  constructor(
    options: Pick<
      GravityWaveOptions,
      "duration" | "playing" | "onComplete"
    > = {},
  ) {
    this.update(options);
  }
  update(
    options: Pick<GravityWaveOptions, "duration" | "playing" | "onComplete">,
  ): void {
    validatePlayback(options);
    if ("duration" in options) {
      this.duration = options.duration ?? Infinity;
      this.elapsed = Math.min(this.elapsed, this.duration);
    }
    if ("onComplete" in options) this.onComplete = options.onComplete;
    if ("playing" in options) {
      if (options.playing ?? true) this.play();
      else this.pause();
    }
  }
  tick(timestamp: number, active: boolean): void {
    if (!Number.isFinite(timestamp)) return;
    if (!active || !this.playing || this.completed) {
      this.last = null;
      return;
    }
    const previous = this.last;
    if (previous !== null && timestamp <= previous) return;
    this.last = timestamp;
    const delta = previous === null ? 0 : (timestamp - previous) / 1000;
    if (delta <= 0.1)
      this.elapsed = Math.min(this.duration, this.elapsed + delta);
    if (this.elapsed >= this.duration) {
      this.completed = true;
      this.playing = false;
      this.last = null;
      if (!this.notified) {
        this.notified = true;
        this.onComplete?.();
      }
    }
  }
  suspend(): void {
    this.last = null;
  }
  play(): void {
    if (!this.completed && !this.playing) {
      this.playing = true;
      this.last = null;
    }
  }
  pause(): void {
    this.playing = false;
    this.last = null;
  }
  restart(): void {
    this.elapsed = 0;
    this.completed = false;
    this.notified = false;
    this.playing = true;
    this.last = null;
  }
  seek(seconds: number): void {
    numberOption("seconds", seconds);
    this.elapsed = Math.min(seconds, this.duration);
    this.completed = this.elapsed >= this.duration;
    this.pause();
  }
}
