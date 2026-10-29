# Architecture proposal — AI-directed, adaptive holographic workspace

Status: **proposal only. No application code changed, nothing installed.**
Author: architecture review, 2026-10-19.
Scope: how the existing Three.js point renderer, SceneSpec v2, LayoutEngine, frame stack and
office shell grow into an AI-directed interface without a second layout engine.

---

## 0. What exists today (verified, with file references)

| Layer | File | Role | Evidence |
|---|---|---|---|
| Contract v2 | `src/office/director/sceneSpecV2.ts` | zod schema: `room`, 1–5 `frames`, ≤8 `cues`, optional `say`; rejects any coordinate key (`COORD_KEYS`) | 153 lines, `.strict()` on every object |
| Templates | `src/office/director/templates.ts` | frozen fallback specs per room; `OfficeDirectorSchema` max 4 frames | used by `degrade()` |
| Model call | `server/officeDirectorRoute.ts` | 8 s timeout, JSON-only system prompt, `extractJson`, `accept()` → `degrade()` | returns `source: llm|fallback` |
| Translation | `src/office/director/parse.ts` | `OfficeDirectorOut` → `SceneSpec`; exactly one hero; asset must be `usable` | `getUsableAsset`, `assetClips` |
| Layout | `src/engine/spatial/layoutEngine.ts` | `layoutScene(spec)`, seeded, FNV hash, `checkLayout` | `DEFAULT_LAYOUT = { drawer 0.28, chat 0.18, margin 0.06 }` |
| Frames | `src/office/frames/FrameStack.tsx`, `frames/plan.ts` | draws boxes from the plan; `ACCEPT_FALLBACK` on failure | 73 lines, no position math |
| 3D host | `src/office/scene/SceneHost.ts` | one `Backdrop`, `setScene(room)`, `freeRegion()`, poster fallback | 236 lines |
| Look | `src/office/scene/sceneShader.ts`, `tiers.ts` | point sprite, point budget by device class | 60k/120k/250k, 30k/60k/80k |
| Live state | `src/office/frames/taskFeed.ts`, `engine/spatial/eventMap.ts` | 18 SSE events → frame view; pure | tested |
| Gates | `verify/run.mjs`, `verify/thresholds.json` | luma/amber/blob/ui/composition per room × 4 viewports | 60 checks |

### 0.1 Problems found while reading (these shape the proposal)

1. **Two layout engines.** `SpatialLayoutEngine.ts` (216 lines) is imported by nothing but itself.
   `layoutScene` is the only live one. Keeping both is how a "second engine" would sneak in.
2. **Two scene systems.** `src/hologram/*` (ParticleTable, ParticleChart, ParticleConfirmation,
   DynamicWorkspace, ~1.4k lines) already renders semantic particles, but it bypasses SceneSpec,
   zod and the hash, and is not covered by `verify/run.mjs`.
3. **No content channel.** `FrameSpecSchema` carries `kind,title,slot,state` only. What a frame
   *shows* is derived from the task id in the URL (`?task=`). So a card or table cannot travel
   with the spec today.
4. **Layout constants vs real geometry.** `layoutScene` assumes fixed drawer 0.28 / chat 0.18;
   `SceneHost.freeRegion()` measures the DOM. Two different truths — a prime suspect for the
   desktop-laptop coverage drop already recorded in verify.
5. **Hash ignores viewport.** The same spec hashes identically at 390 px and 1920 px, so the
   layout gate cannot tell an intentional reflow from a regression.

---

## 1. AI director: request + state → small validated SceneSpec

Keep the existing shape. Extend, never replace.

**Pipeline (one request, one spec):**

```
user text ─┬─> OfficeDirector (server) ──> OfficeDirectorOut ──accept()──> SceneSpec ──layoutScene──> hash ──> FrameStack
           ├─ room/template hint (from nav, never from the model)
           └─ runtime snapshot (task phase, approval pending, §2)
```

Interfaces to add (names chosen to match existing files):

```ts
// src/office/director/sceneSpecV2.ts  — additive, .strict() preserved
export const ContentRefSchema = z.object({
  kind: z.enum(['text','list','table','card','code','artifact','chart','approval']),
  ref:  z.string().min(1).max(160),   // opaque id: task id, artifact id, message id
  lang: z.enum(['fa','en']).optional(),
}).strict();                          // NO inline body, NO coordinates, NO styles

// FrameSpecSchema gains one optional field:
//   content: ContentRefSchema.optional()
```

```ts
// server/officeDirectorRoute.ts — the context the model is allowed to see
export interface DirectorContext {
  room: 'welcome'|'dev_room'|'research'|'content'|'command';
  phase: 'idle'|'running'|'awaiting-approval'|'done'|'failed';
  lastUserIntent: string;             // ≤200 chars, passed as user message only
  availableAssets: string[];          // ids from asset library, usable only
  openFrames: string[];               // kinds already on screen → model may replace
}
```

Rules that stay binding:
- model output ≤ 1.2 kB (`PT` budget), 1–5 frames, one `say` ≤ 200 chars;
- any coordinate key, unknown key, or unlicensed asset → whole spec rejected → template default;
- `accept()` remains the only door; `degrade()` remains the only floor;
- no second prompt path: `/api/scene/direct` and `/api/office/director` must converge on
  `accept()`. Today they are two handlers — this is the one consolidation I recommend.

---

## 2. Renderer composition from semantic components (no second layout engine)

We already have semantic *frame kinds*. The renderer must stop special-casing them per room and
start resolving `kind + content.ref` against one registry:

```ts
// src/office/frames/registry.tsx  (new, small)
export type FrameView = (p: {
  content?: ContentRef;
  task: TaskState;
  lang: 'fa'|'en';
  density: 'compact'|'roomy';
}) => React.ReactNode;

export const FRAME_VIEWS: Record<FrameKind, FrameView> = {
  editor:   (p) => <CodeStream   {...p} code={p.task.code} files={p.task.files} />,
  terminal: (p) => <CodeStream   {...p} lang="sh" />,
  tests:    (p) => <TestList     {...p} />,
  diff:     (p) => <DiffPane     {...p} />,
  preview:  (p) => <ArtifactView {...p} />,
  gallery:  (p) => <MediaGrid    {...p} />,
  player:   (p) => <ClipPlayer   {...p} mediaId={p.content?.ref} poster={…} />,
  table:    (p) => <DataTable    {...p} />,   // new kind, see §3
  card:     (p) => <InfoCard     {...p} />,   // new kind
  approval: (p) => <ApprovalCard {...p} />,   // new kind, wraps ParticleConfirmation
  …
};
```

Key point: **`FrameStack` stays a dumb box renderer.** It receives `x,y,w,h` from `layoutScene`
and an element from the registry. Position still comes from exactly one place.

`src/hologram/particles/*` is reused as *leaf* components inside `FRAME_VIEWS` — not as a second
workspace. `DynamicWorkspace.tsx` and `PetrosHolographicApp.tsx` are then retired behind a flag
after parity shots, not deleted on day one.

---

## 3. Dynamic cards, tables, chat, code, approvals, rooms, business environments

The missing piece is `content.ref`, resolved by the server, never by the model:

| Need | Kind | `content.ref` points to | Producer |
|---|---|---|---|
| chat reply | existing `say` + HostDialogue | message id | SSE `agent.*` |
| card | `card` | `msg:<id>` | LLM text → sanitized markdown → card |
| table | `table` | `artifact:<id>#table` | tool result / data tool |
| code preview | `editor` | `task:<id>` | `file.changed` |
| approval | `approval` | `approval:<id>` | `approval.required` |
| 3D rooms | `room` (existing) | room id | nav + director |
| business env | `room` + `sceneAssetId` | asset id in library | template |

Resolution endpoint (read-only, cacheable):

```ts
// GET /api/office/content/:ref  ->  { kind, payload, lang, hash }
// payload is already sanitized: markdown → text nodes, tables → {columns,rows},
// code → {file,lang,lines}. No HTML, no inline styles, no coordinates.
```

Guardrails: payload ≤ 64 kB, `react-markdown` without raw HTML, table columns ≤ 8, rows ≤ 200
(paginate), Persian numerals and bidi handled by `UI_UX_RTL.md` rules already adopted.

Business environments need no new system: they are a room template that names real licensed
assets (`assetLibrary.ts`) — exactly the v2 contract, plus one new field `sceneAssetId` on the
**template**, not on the model output.

---

## 4. Preserving identity, determinism, accessibility, performance, RTL, gates

| Concern | Mechanism | Where |
|---|---|---|
| Blue point identity | one `Points` material, cold ramp, amber ≤2 % and dev-room only | `sceneShader.ts`, `verify/thresholds.json` |
| Determinism | seeded `layoutScene`; hash now includes `breakpoint` | `layoutEngine.ts` |
| No overlap / safe frame | `checkLayout` before render; failure → template | `parse.ts` |
| RTL / Persian | `dir=rtl` on `<html>`, logical properties in `frames.css`/`shell.css`, BiDi rules | `UI_UX_RTL.md` |
| Mobile perf | `resolveBudget` tiers; content payload lazy-loaded per frame | `tiers.ts` |
| Accessibility | every frame is a landmark `section` with `aria-label`; registry views keep focus order | `FrameStack.tsx` |
| Gates | same `npm run verify`; new checks only via `THRESHOLD_CHANGES.md` | `verify/run.mjs` |

Two deterministic fixes recommended (both small, both attack the desk/laptop regression):

1. `layoutScene(spec, { aspect, safeFrame })` where `safeFrame` is a **snapshot per
   breakpoint** (`sm|md|lg|xl`) taken once and frozen in `verify/fixtures/safe-frames.json`.
   The DOM measurement in `freeRegion()` then *verifies* the snapshot in a test instead of
   driving layout at runtime.
2. `hashSpec` includes `breakpoint` and `safeFrame.version` — same spec, same hash; different
   reflow, different hash, and the gate can assert “4 deterministic variants, not 60”.

---

## 5. AI vs deterministic: the boundary, stated as a rule

```
AI decides:      room · frame kinds (≤5) · titles (≤80 ch) · slots · cues · one say line
                 · content kind + ref to a server-issued id
Deterministic:   every coordinate, size, depth, camera, point count, colour, hash
Server owns:     content payloads, asset licences, SSE → state mapping
Renderer owns:   nothing but drawing what it is handed
```

Enforcement, three layers, none optional:
1. **schema** — `.strict()` + `COORD_KEYS` rejection (already live, keep it);
2. **test** — a corpus of hostile specs (coordinates, huge titles, 40 frames, foreign keys)
   must all degrade; add `tests/director-boundary.test.mjs`;
3. **gate** — `verify/run.mjs` records `data-source=llm|fallback` per shot, so a regression in
   the model path is visible as a value, not an opinion.

---

## 6. ManimGX strictly as an offline video producer

No browser bytes change. It is a **build-machine tool**, outside `dependencies`.

```
scripts/manimgx-clip.ts   (node, runs on a GPU host or CI with Vulkan)
  in : scripts/clips/<id>.scene.js   (plain JS, our own code, no template packs)
  out: public/media/clips/<id>.mp4  (H.264, ≤15 s, ≤4 MB, 1280×720)
       public/media/clips/<id>.jpg  (poster, first frame, ≤120 kB)
       public/media/clips/<id>.json (duration, size, sha256, tool versions)
```

Frame contract stays v2: `kind:"player"`, `content:{ kind:"artifact", ref:"clip:<id>" }`.
`ClipPlayer` renders `poster` immediately, then `<video preload="none" playsInline muted>` behind
a play control; if JS or WebGL is off, the poster is the whole experience. `player` already
exists in `FRAME_KINDS` and in the director prompt, so **no contract change is required**.

Hard rules for this path:
- the `manimgx` package and any wasm never enter `package.json` `dependencies` or `dist/`;
- output is reviewed by a human before it is committed (contact sheet row, like every asset);
- if the tool cannot run on this Mac (verified: no WebGPU here), clips are produced on
  `GPU_HOST.md` hardware and the evidence names that host — never claimed as local.

---

## 7. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Model latency vs 8 s budget on a slow provider | Med | template renders first, spec swaps in ≤400 ms later; `source` label visible in dev |
| Content payload grows into a rendering language | High | `ContentRefSchema` allows an id only; payload schema per kind is frozen and tested |
| Two systems drift further (`hologram/*`) | High | retire-by-parity: no new imports from `src/hologram` outside `FRAME_VIEWS` leaves |
| Hash/breakpoint change shifts every baseline shot | Med | regenerate baselines once, documented in `THRESHOLD_CHANGES.md` |
| Desktop coverage already failing | High | fix `safeFrame` + camera fit **before** any new frame kind ships |
| Persian text expansion breaks box titles (≤80 ch) | Low | title truncation with full text in `aria-label` |

---

## 8. Phased plan (each phase ends on a gate, nothing merges red)

**P0 — clean the ground (no new features).**
Remove/`SpatialLayoutEngine.ts` from the build or mark it `@deprecated` + delete imports; make
`/api/scene/direct` go through `accept()`; fix `safeFrame` + hash breakpoint; get the 4-size
verify back to green. *Gate: `npm run verify` all rooms pass, desktop coverage 8–40 %.*

**P1 — content channel.**
`ContentRefSchema`, `GET /api/office/content/:ref`, three kinds (`card`, `table`, `approval`),
`FRAME_VIEWS` registry. *Gate: fixture specs render a table and an approval card; layout hash
unchanged for specs without `content`.*

**P2 — director quality.**
`DirectorContext`, history-aware replacement of open frames, tests for the boundary corpus.
*Gate: 20 scripted prompts → 0 coordinate keys, 0 unlicensed assets, ≥90 % specs accepted.*

**P3 — unify the two scene systems.**
Move `ParticleTable/Chart/Confirmation` under `FRAME_VIEWS`, delete `DynamicWorkspace` usage,
parity shots before/after. *Gate: parity contact sheet approved by a human.*

**P4 — offline clips.**
`scripts/manimgx-clip.ts`, poster-first `ClipPlayer`, one sample clip. *Gate: clip plays with
JS on, poster shows with JS off, bundle size delta 0.*

P5 (later, separate approval): 3D room transitions as first-class cues.

---

## 9. What this proposal deliberately does not do

- no new layout engine, no second SceneSpec version;
- no model-authored coordinates, styles, sizes or animation curves;
- no ManimGX in the browser bundle;
- no deletion of `agentPointClouds.ts` or any live scene code before its replacement renders.
