# Changelog

## 0.2.0

- Add `intensity` to the vanilla, shared-canvas, and React APIs, with an unchanged default of `1`. Strengthen shading in one pass while retaining `opacity` in `[0, 1]` and respecting the caller's global alpha.
- Cache bounded static lattice geometry, radial fades, and morphing harmonics across matching fields. Factor time-dependent phases outside the point loop and replace sixteen shade rescans with stable bucket links.
- Preserve wave formulas, density budgets, reduced motion, drawing order, and Canvas state restoration. Add command and pixel compatibility checks and reproducible browser/native benchmarks.
- Add intensity to the playground and document the cache memory/cold-start trade-off. No runtime dependencies added.

## 0.1.1

- Add real-renderer still images, animated previews, and MP4 recordings to the README.
- Use public media URLs so the same previews work on GitHub and npm.
- Keep media files out of the installed package; runtime behavior is unchanged.

## 0.1.0

- Circular and smoothly morphing Canvas2D wave fields.
- Inward and outward flow, radius, crest spacing, relief, density, color, and opacity controls.
- Active-time playback, finite duration, pause, restart, and deterministic seeking.
- Automatic reduced motion and suspension for hidden or offscreen views.
- Framework-independent renderer/controller and an optional React component.
- Reusable circular-wave sampler, TypeScript declarations, and source maps.
- Interactive playground and MIT licensing.
