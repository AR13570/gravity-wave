import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
const root = resolve(import.meta.dirname, "..");
const temporary = mkdtempSync(join(tmpdir(), "gravity-wave-consumers-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
function run(file, args, cwd = root) {
  return execFileSync(file, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
try {
  run(npm, ["run", "build"]);
  const [pack] = JSON.parse(
    run(npm, [
      "pack",
      "--json",
      "--ignore-scripts",
      "--pack-destination",
      temporary,
    ]),
  );
  for (const entry of pack.files)
    assert.match(
      entry.path,
      /^(dist\/|README\.md$|LICENSE$|package\.json$)/,
      `unexpected published file: ${entry.path}`,
    );
  const archive = join(temporary, pack.filename);
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(
    Object.keys(manifest.dependencies ?? {}).length,
    0,
    "core must have no runtime dependencies",
  );
  assert.equal(manifest.peerDependenciesMeta.react.optional, true);
  for (const kind of ["vanilla", "react"]) {
    const cwd = join(temporary, kind);
    mkdirSync(cwd);
    writeFileSync(
      join(cwd, "package.json"),
      JSON.stringify({
        name: `gravity-wave-${kind}-smoke`,
        private: true,
        type: "module",
      }),
    );
    const args = [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      archive,
    ];
    if (kind === "react")
      args.push(
        "react@19",
        "react-dom@19",
        "@types/react@19",
        "@types/react-dom@19",
      );
    run(npm, args, cwd);
    const code =
      kind === "vanilla"
        ? `import assert from 'node:assert/strict';import {createGravityWave,createWaveRenderer} from '${manifest.name}';assert.equal(typeof createGravityWave,'function');assert.equal(typeof createWaveRenderer,'function');assert.equal(typeof globalThis.window,'undefined');`
        : `import assert from 'node:assert/strict';import {createElement} from 'react';import {renderToString} from 'react-dom/server';import {GravityWave} from '${manifest.name}/react';const html=renderToString(createElement(GravityWave,{mode:'morphing',style:{height:300}}));assert.match(html,/<canvas/);assert.match(html,/aria-hidden="true"/);`;
    writeFileSync(join(cwd, "smoke.mjs"), code);
    run(process.execPath, ["smoke.mjs"], cwd);
    if (kind === "vanilla")
      assert.equal(
        existsSync(join(cwd, "node_modules", "react")),
        false,
        "React must not be installed for vanilla consumers",
      );
    const types =
      kind === "vanilla"
        ? `import {createWaveRenderer,createGravityWave} from '${manifest.name}';const wave=createGravityWave(document.createElement('canvas'),{mode:'morphing',intensity:1.5,opacity:0.8,duration:5});wave.renderAt(1);createWaveRenderer(document.createElement('canvas').getContext('2d')!).draw([{center:{x:0,y:0},intensity:2}],0);`
        : `import {createElement} from 'react';import {GravityWave} from '${manifest.name}/react';createElement(GravityWave,{mode:'morphing',intensity:1.5,opacity:0.8,duration:5,style:{height:300}});`;
    writeFileSync(join(cwd, "types.ts"), types);
    run(
      process.execPath,
      [
        join(root, "node_modules/typescript/bin/tsc"),
        "--noEmit",
        "--strict",
        "--skipLibCheck",
        "--module",
        "NodeNext",
        "--moduleResolution",
        "NodeNext",
        "--target",
        "ES2022",
        "types.ts",
      ],
      cwd,
    );
    console.log(
      `${kind}: install, server import, and public TypeScript declarations passed`,
    );
  }
  console.log(
    `${pack.files.length} package files; ${(pack.size / 1024).toFixed(1)} KiB packed; allowlist passed`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
