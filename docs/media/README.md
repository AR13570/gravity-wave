# Preview media

These files are generated from the package's actual `createWaveRenderer` implementation. Both examples retain default colors, opacity, size, wavelength, and relief. Circular mode travels inward; morphing mode travels outward with morphAmount 0.65. A small center marker and labels belong to the presentation, not the effect.

- `comparison.png`: both modes at elapsed time 1.2 seconds, at twice CSS resolution.
- `circular.png` / `morphing.png`: individual frames from the same capture.
- `preview.gif`: 8.1-second comparison recording, 15 fps, 960 by 520 pixels. The recording repeats; its morphing cut is not a promise that morphing has an 8.1-second mathematical period.
- `circular.gif`: seamless 2.7-second circular cycle, 20 fps.
- `circular.mp4` / `morphing.mp4`: H.264, 30 fps, 8.1 seconds, silent, with fast-start metadata for playback.

Media uses absolute public GitHub URLs in the package README. It stays outside the npm files allowlist so applications do not download demonstration recordings when installing the library.

## Regenerate

Build the package, install capture tools in a temporary directory, and pass that directory to the generator. No capture tools are added to package dependencies.

```sh
npm run build
MEDIA_TOOLS=$(mktemp -d)
npm install --prefix "$MEDIA_TOOLS" @napi-rs/canvas ffmpeg-static
node scripts/generate-previews.mjs "$MEDIA_TOOLS"
```
