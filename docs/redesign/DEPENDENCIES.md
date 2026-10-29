# Adopt, Don't Author - Dependency & Reuse Log

## Pre-approved Shortlist Evaluations

| Need / Capability | Candidates Searched | Chosen Solution | Reason |
| :--- | :--- | :--- | :--- |
| **Mesh Point Sampling** | `three/examples/jsm/math/MeshSurfaceSampler.js`, custom ray/barycentric sampler | `MeshSurfaceSampler` (three) | Official, area-weighted, O(log N) face sampling, zero custom code for base sampling. |
| **GPU Point Skinning** | CPU morph targets, CPU bone deformation per frame, GPU skinning shader chunk | Three.js GPU Skinning via `Skeleton` + interpolated `skinIndex`/`skinWeight` attributes | Zero CPU frame overhead. Bones update matrices on GPU via `AnimationMixer`; custom code is only the barycentric weight interpolation at sample time. |
| **GLB Optimization & Inspection** | `@gltf-transform/core`, `gltf-pipeline`, custom parser | `@gltf-transform/core` + Three.js `GLTFLoader` | Standard glTF-Transform ecosystem, lossless buffer extraction. |
| **Schema Validation** | Custom regex parser, custom Zod clone (`zod.ts`), `zod` npm package | `zod` (^3.24.2 / ^4) | Standard library; eliminated 115 lines of custom clone code. |
| **Point Cloud & React Integration** | Custom WebGL canvas loop, `@react-three/fiber` + `@react-three/drei` (Points, Sampler) | `@react-three/fiber` + `three.js` BufferGeometry / Points | Standard declarative Three.js pipeline, reactive state binding. |
| **Post-Processing & Look Lock** | Custom canvas post-pass, `@react-three/postprocessing` | Custom vertex/fragment Look Lock shader on Points | Single-pass point rendering respecting ART_DIRECTION.md cold ramp and amber cap without heavyweight fullscreen blits. |
| **Spatial Layout & Frustum Math** | Hand-rolled AABB / projection math, `three` (`Box3`, `Frustum`, `Matrix4`, `Vector3`) | `three` Math library (`Box3`, `Frustum`) | Standard, mathematically verified, edge-case correct. |
| **Offline Depth for Backdrops** | `@huggingface/transformers` (JS), `onnxruntime-web` directly, custom depth code | `@huggingface/transformers` + `onnx-community/depth-anything-v2-small` (q8) | Apache-2.0 runtime and model; runs only in Node at `npm run scenes:build`, caches the depth map as `.f32` by source sha256, and never ships to the client. |
| **Visual Verification** | Custom Python HTTP scraping, Playwright + `@axe-core/playwright` + `pixelmatch` | Playwright test runner with pixelmatch | Deterministic assertions, real rendering pipeline, WCAG contrast verification. |
| **UI Components (Drawers/Menus)** | Custom floating divs, Radix UI primitives / HTML `<dialog>` + ARIA | Standard accessible semantic HTML (`<aside role="complementary">`, `<dialog>`, `<bdi>`) | Accessible, zero unnecessary dependencies, 100% RTL compliant. |

## Agent skills (reviewed, installed)

Location: `.agents/skills/` (pointer added to `AGENTS.md`). Each pack was read in full before install; none runs shell or network on load (only `webapp-testing` ships scripts, and its SKILL.md never executes them on load).

| skill | repo | pinned commit | license | scripts | decision |
|---|---|---|---|---|---|
| threejs-skill-router | scottstts/Threejs-Awesome-Graphics-Agent-Skills | 5f1db4f388e7 | MIT | no | keep (router, load first) |
| threejs-bloom | scottstts/Threejs-Awesome-Graphics-Agent-Skills | 5f1db4f388e7 | MIT | no | keep |
| threejs-camera-direction | scottstts/Threejs-Awesome-Graphics-Agent-Skills | 5f1db4f388e7 | MIT | no | keep |
| threejs-postprocessing | scottstts/Threejs-Awesome-Graphics-Agent-Skills | 5f1db4f388e7 | MIT | no | keep |
| threejs-procedural-animation | scottstts/Threejs-Awesome-Graphics-Agent-Skills | 5f1db4f388e7 | MIT | no | keep |
| threejs-shaders | CloudAI-X/threejs-skills | 5f1db4f388e7 | MIT | no | keep |
| threejs-animation | CloudAI-X/threejs-skills | 5f1db4f388e7 | MIT | no | keep |
| shader-for-interfaces | v2space-labs/shader-for-interfaces | 08fe6fc1dad5 | MIT | no | keep |
| frontend-design | anthropics/skills | 5f1db4f388e7 | MIT-style (see LICENSE.txt) | no | keep |
| webapp-testing | anthropics/skills | 5f1db4f388e7 | MIT-style (see LICENSE.txt) | yes (helpers only, not run on load) | keep |

Skipped: `noklip-io/agent-skills` r3f-best-practices (not applicable: this project renders points in plain three.js, not R3F) and `threejs-particles` (no such skill exists in the CloudAI-X pack; verified by listing the repo).
