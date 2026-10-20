# Renderer performance, 0.1.1 to 0.2.0

Measured locally on 20 October 2026. These are standalone library measurements, not Orbit frame-rate results. The same scene, field formulas, density policy, and default appearance are used for both versions. No runtime dependencies were added.

## What changed

The baseline CPU profile confirmed repeated point geometry, circular-wave sampling, and morphing terms in the hot loop, alongside substantial native Canvas calls. The old renderer also tested every point against all sixteen shade buckets.

0.2.0 keeps an eight-entry LRU of static lattices, radial fades, unit directions, morph envelopes, and angular harmonics. Fields with the same geometry share one entry even when supplied as fresh objects, and moving centers do not invalidate it. Wave and morph time phases are computed once per field. Stable linked buckets in the existing point buffer replace sixteen scans with one paint visit per point. Wavelength, time, relief, point size, colors, opacity, and intensity stay dynamic. Morphing remains fully animated.

`intensity` changes shade alpha in the same pass. Its default of one preserves the old appearance, and gain is clamped before field opacity and caller global alpha. Transparent source-over fields skip geometry work. Other Canvas composite modes retain their transparent drawing behavior.

## Browser benchmark

Chromium 155 on local macOS; 900 × 700 logical pixels, a 1800 × 1400 backing canvas (DPR 2), one, three, or seven fields of radius 200 / inner radius 60, morph amount 0.65, zoom 0.4 / 1 / 2. Centers move slightly and fresh field objects are created for every draw. The default auto-density policy is retained, including lower density below zoom 0.55. Fields share geometry in this controlled matrix.

Each scenario has 40 warmup frames and nine timed batches of ten draws. Canvas clearing, setting the transform, allocating input fields, validation, sampling, and draw submission are included. A readback outside each timed batch flushes pending canvas work. Results below are the median of three runs' batch medians. The raw data preserves every run's median, p95 batch average, and first-draw measurement.

| Mode     | Zoom | Fields | Before ms/draw | After ms/draw | Reduction |
| -------- | ---: | -----: | -------------: | ------------: | --------: |
| circular |  0.4 |      1 |           0.32 |          0.15 |       53% |
| circular |  0.4 |      3 |           0.95 |          0.44 |       54% |
| circular |  0.4 |      7 |           2.45 |          1.01 |       59% |
| circular |    1 |      1 |           0.67 |          0.34 |       49% |
| circular |    1 |      3 |           1.98 |          0.97 |       51% |
| circular |    1 |      7 |           4.56 |          2.24 |       51% |
| circular |    2 |      1 |           0.67 |          0.33 |       51% |
| circular |    2 |      3 |           1.96 |          0.97 |       51% |
| circular |    2 |      7 |           4.55 |          2.25 |       51% |
| morphing |  0.4 |      1 |           0.40 |          0.17 |       58% |
| morphing |  0.4 |      3 |           1.20 |          0.49 |       59% |
| morphing |  0.4 |      7 |           2.78 |          1.13 |       59% |
| morphing |    1 |      1 |           0.87 |          0.36 |       59% |
| morphing |    1 |      3 |           2.59 |          1.08 |       58% |
| morphing |    1 |      7 |           6.02 |          2.52 |       58% |
| morphing |    2 |      1 |           0.87 |          0.36 |       59% |
| morphing |    2 |      3 |           2.60 |          1.08 |       58% |
| morphing |    2 |      7 |           6.05 |          2.51 |       59% |

At zoom 1, seven circular fields improve from 4.56 to 2.24 ms/draw, and seven morphing fields from 6.02 to 2.52 ms/draw. The gain applies to one draw pass; replacing duplicate application passes provides a separate saving. Initial runs and desktop scheduling produced some outliers, especially the single-field cases. See [raw browser results](../benchmarks/results/2026-10-20-browser.json).

## Native Canvas cross-check

Node 24.14.0 with `@napi-rs/canvas` 1.0.12, using the same 18-scenario scene and timing harness. Results below show zoom 1; [raw native results](../benchmarks/results/2026-10-20-native.json) include every zoom. These timings include the native Canvas binding and raster costs and should not be substituted for browser timings.

| Mode     | Fields | Before ms/draw | After ms/draw | Reduction |
| -------- | -----: | -------------: | ------------: | --------: |
| circular |      1 |           2.01 |          1.61 |       20% |
| circular |      3 |           5.52 |          4.40 |       20% |
| circular |      7 |          12.34 |          9.78 |       21% |
| morphing |      1 |           2.36 |          1.65 |       30% |
| morphing |      3 |           6.40 |          4.42 |       31% |
| morphing |      7 |          14.50 |          9.90 |       32% |

## Compatibility evidence

- The full unit/integration suite covers validation, React prop updates/removal, controller updates, mutable inputs, cache invalidation/eviction, sample budgets, annulus bounds, reduced motion, lifecycle handling, and context restoration after exceptions.
- Frozen 0.1.1 draw commands are compared with the new renderer across modes, zoom boundaries, directions, radii, wavelength, and times, including long elapsed times. Shade/color order is unchanged; numeric tolerance allows only subpixel floating-point reassociation.
- Real Skia Canvas pixel comparisons use DPR 2, two differently sized overlapping fields, both modes, three zooms, two opacity settings, caller global alpha 0.8, and times 0 / 0.8 / 12345. All 36 cases are byte-identical: zero differing channels across 362,880,000 channel comparisons.

## Costs and limits

- The geometry cache adds up to about 3.6 MiB of typed-array data per renderer (eight maximum-size morphing grids), excluding small object/engine overhead. The point buffer remains 85,264 bytes, plus 128 bytes of bucket indices. Destruction clears the cache.
- Cold geometry, radius changes, and zoom changes that alter the grid spacing must build a grid. More than eight distinct geometries in an active working set can cause eviction/rebuild churn. Constantly changing geometry can reduce or erase the cache benefit. First-draw numbers include JIT and scheduling noise and are not a reliable latency guarantee.
- The benchmark measures CPU draw submission and Canvas API cost, not end-to-end GPU raster/compositing time, requestAnimationFrame cadence, battery use, or a promise of 60 fps. Readbacks can affect the browser's Canvas backend choice; both versions use the same harness.
- Native Skia and browser timing differ because backend and API costs differ. Canvas rectangle/fill work remains significant and still grows with field count.
- No new mobile/Safari/Firefox or 4× CPU-throttled measurements were made. Orbit was not changed or remeasured in this release. Verify the consuming scene and devices separately.

## Reproduce

From this repository, create an ignored baseline from the published 0.1.1 package:

```sh
mkdir -p .validation/baseline .validation/package
npm pack gravity-wave@0.1.1 --pack-destination .validation/package
tar -xzf .validation/package/gravity-wave-0.1.1.tgz -C .validation/package
cp -R .validation/package/package/dist/. .validation/baseline/
npm run build
node node_modules/vite/bin/vite.js . --host 127.0.0.1 --port 5194
```

Open `http://127.0.0.1:5194/benchmarks/index.html`, run the baseline, then the candidate, and save the displayed JSON. Buttons are disabled while a run is active to prevent overlap. Keep other heavy work idle and repeat each run. The harness runs both modes, all three field counts, and all three zoom levels.

For an optional native Canvas cross-check, install the benchmark-only tooling into an ignored directory:

```sh
npm install --prefix .validation/tools --no-package-lock --ignore-scripts @napi-rs/canvas@1.0.12
node benchmarks/run-native.mjs .validation/baseline/index.js .validation/before.json .validation/tools
node benchmarks/run-native.mjs dist/index.js .validation/after.json .validation/tools
node scripts/check-visual.mjs .validation/baseline/index.js dist/index.js .validation/tools
```

`PROFILE=1` restricts the native harness to seven morphing fields at zoom 1. Run it under Node's `--cpu-prof` flag to collect a CPU profile. Timings are evidence, not hard CI assertions; deterministic geometry/trigonometry checks cover the eliminated repeated work.
