# M2 — Visual art-direction audit (gate, not approval)

Status: **awaiting human approval. No visual change implemented.**
Audited by eye on full-resolution captures (`docs/redesign/verify_shots/*`), not from test output.
One code change was made in this pass, and only because requirement 4 demanded a test that
*passes*: the same-room re-send reveal reset. It is a correctness fix, not art direction (see §5).

## 1. Method

| item | value |
|---|---|
| viewports | 1920x1080 desktop, 1170x2532 CSS 390x844 mobile (DPR 3, full page) |
| source | `docs/redesign/verify_shots/{room}-{viewport}.png`, captured by `npm run verify` |
| canvas-only crops | `docs/redesign/evidence/canvas-*.png` (WebGL surface, no chrome) |
| thresholds | `verify/thresholds.json` (unchanged) |
| numeric rows | `docs/redesign/verify_shots/last-run.json` from the 09:38 run before the reveal fix |

## 2. Five-room audit

| room | distinct purpose? | point geometry meaningful? | focal point / hierarchy | spatial or boxes? | type/contrast/touch | matches the room's task? |
|---|---|---|---|---|---|---|
| welcome | weak — a portal, but same portal as 4 other rooms | yes at first glance: arch + floor read as a doorway | arch is the focal point; hero text is small and sits beside it, not on it | partial — arch + floor are one space, but the `Enter` box and empty right column read as boxes | 10-12px nav at 1920; contrast fine on black; touch fine on mobile | no — greets, then says `PROCEDURAL SET · BACKDROP ASSET PENDING` |
| dev | no — identical silhouette to welcome | no: same arch, only the cards differ | four `pending` cards across the top compete with the arch | no — 4 floating panels over particles | 4x the word `pending`; `Editor/Plan/Terminal` boxes are empty | no — a dev room with nothing developing |
| research | partially — a podium/dais variant exists | yes, dais + arch is the most legible set of the five | cards sit on top of the arch, stealing focus | partial | `RESEARCH_PROVIDER/api/research` is 11px low-contrast dev text on the art | no — shows an endpoint string, not research |
| content | no — back to the plain arch | no | `off` and `empty` cards dominate the top-left | no | `MEDIA_PROVIDER/api/media` leaked | no — Player/Gallery/Progress all empty |
| command | no — arch + two pillars | weak; pillars are decorative, not instrument-like | three `pending` cards + arch | no | Settings/Logs/Tests empty boxes | no — a command room with no instruments |

## 3. The three highest-impact problems

**P1 — Every room is the same silhouette.** welcome, dev, content and command render the same
arch-and-floor set; research only swaps in a dais. Five rooms, one picture. The scene therefore
cannot communicate "which room am I in" without reading the labels above the canvas.
Evidence: `verify_shots/{welcome,dev,content,command}-desktop-1920x1080.png` are pixel-similar
outside the card layer. Root: `src/office/scene/proceduralSet.ts` builds the set from `room` but
the variants share the same portal generator.

**P2 — Placeholder/engineering text is in the product UI.** Provenance was added honestly, but it
is shipped as user-facing copy: the top-left slate `WELCOME · PROCEDURAL SET · BACKDROP ASSET
PENDING` (`src/office/scene/SceneHost.ts:159-161`), `PENDING_HUMAN_INPUT §2` under the welcome
subtitle (`src/office/shell/Rooms.tsx:25`), `pending` on four dev cards and three command cards,
`empty`/`off` frame states rendered as the card's title (`src/office/frames/FrameStack.tsx`,
`taskFeed.ts` type `FrameState`), and raw provider paths `RESEARCH_PROVIDER/api/research`,
`MEDIA_PROVIDER/api/media`. A premium product never shows its TODO list.

**P3 — Weak hierarchy: tiny type, huge voids, cards laid over noise.** At 1920 the nav is ~10px
and visually louder than the hero, which is ~28px and crowded against the arch. Cards are
transparent outlines over dense additive points with no scrim, so their body text competes with
the cloud. On mobile the five room links wrap into a two-line block of ~10px text with no
drawer or hamburger, and the hero title collides with the arch.

## 4. Proposed minimal changes (for approval, not implemented)

| # | change | files | size | risk | expected effect |
|---|---|---|---|---|---|
| 1 | One distinct silhouette per room: welcome = portal; dev = desk + dual monitors; research = dais + column of records; content = screen wall; command = instrument cluster + consoles. Same renderer, same sampler, different `buildProceduralSet` variant. | `src/office/scene/proceduralSet.ts` (room switch), `src/office/rooms/*` scene ids | M | medium — touches geometry only, gates re-measured | kills P1 outright |
| 2 | Move provenance to a dev-only overlay (`import.meta.env.DEV` or `?provenance=1`) and replace card state titles with task text: `pending` -> the queued step, `empty` -> what the user can add, `off` -> provider name + "not configured". Drop `PENDING_HUMAN_INPUT §2` from the hero subtitle; keep the fact in `docs/redesign/PENDING_HUMAN_INPUT.md`. | `SceneHost.ts:155-163`, `shell/Rooms.tsx:25`, `frames/FrameStack.tsx`, `frames/taskFeed.ts`, `i18n.ts` | S | low | kills P2 |
| 3 | Type + scrim pass: hero 44-56px desktop / 30px mobile, nav 13px with a mobile drawer, cards get a 40-60% black gradient scrim and 13/15px text. | `src/office/styles/*`, `src/office/shell/Rooms.tsx`, `FrameStack.tsx` | M | low | kills P3 |

Explicitly out of scope unless asked: new dependencies, a second layout engine, a second
renderer, amber/neon accents, extra animation.

## 5. Reveal regression — verified, not assumed

New deterministic suite: `tests/backdrop-reveal.test.mjs` (4 tests, all run by `npm test`).

1. Static: the harness counts `row.pass` and never `row.ok`; the last `__sceneReadyRoom === r`
   check precedes every `page.screenshot(`; readiness is scoped to the room under test.
2. Browser (`PETROS_REVEAL_E2E=1`): after welcome settles, `setScene('welcome')` (the
   late-fetch/SSE path) must keep `uReveal === 1`, readiness true, room `welcome`, and lit
   pixels within 80% of the settled frame; then `__setSpatialScene('dev')` must still restart
   the reveal and settle at `dev`.

It failed first, on real code: re-send drove `uReveal` to **0.81**. Cause: `setData` seeded
`reveal/dolly/sweep`, but the rAF loop re-derives all three from `this.start` every frame, so the
values were overwritten on the next frame. Fix (one line + comment, `src/office/scene/Backdrop.ts`):
backdate `start` past both ramps on a same-room re-send. Result after fix: **4/4 pass**.

## 6. What this audit does NOT claim

- It does not say the product looks premium. It does not.
- It does not approve M2. Green gates measure luminance/coverage/components; they cannot measure
  "is this a workspace or a particle demo with cards on it".
