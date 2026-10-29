# Architecture — Petros AI Office

Branch `redesign/office`, branched from `redesign/point-cloud` and fast-forwarded with the
depth-point spike (`spike/depth-points`) so the renderer proven there is available as reference.

## Layers

```
browser
  src/office/App.tsx            shell: <SceneCanvas/> + <FrameHost/> + <Dock/> + rooms
  src/office/scene/*            backdrop points (depth), skinned actors, camera fit, FX
  src/office/director/*         SceneSpec v2 (zod), 6s LLM call, deterministic fallback, SSE->cue map
  src/office/layout/*           seeded, deterministic slot placement (never coordinates from the LLM)
  src/office/frames/*           DOM/CSS3D panel host, focus/expand, scan-in
  src/office/dock/*             composer, attachments, voice, history, room switch, status
  src/office/rooms/*            welcome / dev / research / content / command
  src/office/state/*            reducer store + persisted settings
server
  server/office/routes.ts       director, assets, scenes meta, service health adapters
  server/adapters/*             stt (existing), tts/search/media (honest "not configured")
  server.ts                     mounts server/office/routes; existing API untouched
offline
  scripts/scenes-build.mjs      public/scene-sources/<room>-169|916.png -> depth -> public/scenes/<room>[-916].dptscn
  scripts/depth-node.mjs        Depth Anything V2 Small via @huggingface/transformers (APACHE-2.0, pinned revision logged per build)
```

## Contracts

- `SceneSpec v2` — `{ room: 'welcome'|'dev'|'research'|'content'|'command', frames: FrameSpec[5], cues: CueSpec[8], say?: string }`, zod `.strict()`. The model never emits coordinates.
- `FrameSpec` — `{ id, kind, title, slot: 'left'|'right'|'top'|'center'|'bottom', source, state }`.
- `LayoutEngine.place(spec, viewport)` — pure, seeded from `hash(spec)`, returns x/y/w/h per frame in CSS px with the dock band and header reserved.
- `eventMap` — pure `TaskEvent -> SceneCue`; reused from `src/engine/spatial/eventMap.ts`, extended with frame state cues.
- `Settings` — `{ lang, theme, motion, quality, voiceIn, voiceOut, privacy }`, persisted under `petros.office.settings.v1`.

## Data flow

1. User message -> DOCK -> `POST /api/office/director` (6s) resolves the room + frames; on timeout or no key the deterministic keyword fallback decides.
2. `POST /api/tasks` runs the turn; `GET /api/tasks/:id/events` streams real `TaskEvent`s.
3. `eventMap` turns each event into a cue; frames read cue state from the store; amber is only reachable from `live: true` cues.
4. SSE drop -> exponential reconnect + offline banner; queued message is kept.

## Non-goals / constraints

- Depth is computed offline only. The browser loads a binary `.dptscn`; no model runs on user devices.
- The legacy app stays mounted at `?legacy=1` until the parity matrix is fully green.
- `backdropMode: depth | flat` is a setting; the UI never requires the 3D backdrop to function.
