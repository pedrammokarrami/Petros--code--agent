# Running the GPU-only gates on a normal laptop

Two gates cannot be measured in the headless container: `npm run verify` and
`npm run verify:leak`. Both need a real, hardware-accelerated WebGL context. Under the
container's software rasteriser (SwiftShader) the renderer crashes while the points scene
compiles, or `verify` runs past twelve minutes without an exit. See `BLOCKERS.md` B8.

This file is for a human on their own machine. It assumes nothing about Docker, VMs or cloud.

## 1. Prerequisites

- Node 20 or newer (`node -v`).
- Chrome or Chromium installed (Playwright uses the browser it already has, or install once
  with `npx playwright install chromium`).
- The repository already installed: `npm ci`.
- A real GPU with hardware WebGL enabled. On a laptop with a hybrid GPU, make sure the
  browser runs on the discrete GPU if performance is being judged.

## 2. Run it

```bash
npm run build
npm run gpu-check
```

`gpu-check` does not start Docker and does not need a VM. It:

1. starts the built app on `127.0.0.1:4399` from `dist/server.cjs`,
2. reads the GL renderer string (`WEBGL_debug_renderer_info`),
3. measures frame time per room for 2.5 s at 1440x900,
4. runs `node verify/run.mjs` (the full scene gates),
5. runs `node verify/leak.mjs` (switch loop, geometry/texture counts),
6. writes everything to `docs/redesign/evidence/gpu-host.txt`.

## 3. Exit codes

| code | meaning |
| ---: | :--- |
| 0 | hardware GPU detected and both gates passed |
| 1 | a gate failed (read `gpu-host.txt`; the failing check is named in the log) |
| 2 | the renderer is software (SwiftShader/llvmpipe): the gates ran, but the frame times are **not** a product FPS and the result does not unblock P4 visuals |

## 4. What counts as evidence

`docs/redesign/evidence/gpu-host.txt` is the only accepted form. Paste it, or commit it.
A screenshot of a terminal is not evidence. Until that file shows a non-software renderer
and `RESULT: GPU + gates PASS`, P4+ visual work stays gated (see `PROGRESS.md`).

## 5. If WebGL is off in your browser

`chrome://gpu` should say "Hardware accelerated" for WebGL. If it says software, enable
"Use hardware acceleration when available" in Settings -> System, restart the browser, and
re-run. A laptop on battery saver may also fall back to software.
