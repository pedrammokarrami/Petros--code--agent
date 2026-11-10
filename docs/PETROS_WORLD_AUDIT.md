# Petros UI/UX and 3D World Audit

## Existing architecture

- React 19 + TypeScript + Vite.
- Three.js is already available and the repository contains a `petros-city` feature area.
- Existing city shell: `PetrosCityShell.tsx`.
- Existing rooms include welcome, laboratory, agency, commerce, engineering, content studio, flow, and control-center rooms.
- Existing ambient canvas: `LuminousPointCloudCanvas.tsx`.
- Existing wallet authentication: `WalletAuthScreen.tsx`.
- Existing chat and voice composition: `MinimalComposer.tsx` and `voiceAgent`.
- Existing backend integration points include `/api/agent/chat`, `/api/credit/balance`, `/api/supervisor/status`, `/api/research/github`, and file APIs.
- Existing shared models include `Message`, `AgentState`, `TaskRecord`, `TaskEvent`, `ToolCall`, and `PreviewArtifact`.

## Reusable implementations

- Preserve the current chat API and message model.
- Preserve wallet session handling and logout behavior.
- Preserve existing room components until the new world shell reaches feature parity.
- Reuse existing canvas and Three.js effects as secondary ambient layers.
- Reuse existing voice and file attachment behavior.

## Main problems

1. `PetrosCityShell` combines navigation, API polling, chat state, room routing, telemetry, and presentation.
2. The current room list is not data-driven and covers only a subset of the required categories.
3. Category selection, package versioning, caching, and first-download construction state do not share a framework.
4. Multiple visual identities and navigation patterns compete for attention.
5. Some research fallback results are hardcoded and must remain distinct from real backend data.
6. A production asset package pipeline is not discoverable in `public`; dedicated room packages need an explicit integration boundary.
7. Live browser screenshots, FPS measurement, and build verification remain to be run.

## Boundaries

- Backend replacement is out of scope.
- No fake wallet balances, transactions, agent responses, or task progress are introduced.
- When a package URL exists, the cache manager verifies and stores it; without one, the existing procedural room remains the fallback.
- The first milestone is the shared world foundation and Software & Technology reference environment. The other eleven environments use data-driven definitions until dedicated assets are supplied.

## Next verification sequence

1. Wire category selection into the authenticated shell without removing legacy routes.
2. Add cached environment lookup before room entry.
3. Show construction only on a cache miss.
4. Add a backend task-status adapter for visible agent activity.
5. Add camera/selection behavior to the reference laboratory.
6. Run TypeScript, Vite build, and browser checks at desktop and mobile sizes.
