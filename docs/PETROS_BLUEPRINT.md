# PETROS Blueprint Implementation

This document maps the architectural blueprint (13 rooms, 52 agents, free-first AI,
sub-5MB first load) onto the code that implements it, so the plan and the repository
never drift apart.

## 1. Rooms and agents

| Concept | Implementation |
| --- | --- |
| 13 spatial rooms | `src/data/petrosBlueprint.ts` → `PETROS_ROOMS` |
| 52 agents (1 lead + 3 specialists per room) | `PETROS_ROOMS[].agents`, flattened into `PETROS_AGENTS` |
| Agent attire, station, preferred model | `AgentSpec` fields on every agent |
| Room props + sourcing keywords | `RoomSpec.props` |
| Licensed asset repositories | `RoomSpec.sources` (`AssetSource.attributionRequired`) |
| Allowed zero-cost feeds per room | `RoomSpec.feeds` |

`TOTAL_ROOMS` and `TOTAL_AGENTS` are exported so tests and the UI assert the
blueprint contract instead of hard-coding numbers.

Room rendering is data-driven: `src/components/petros-city/BlueprintRoom.tsx` renders
any room id — roster, stations, prop manifest, live feed panel and credits — so a new
industry bay is a registry entry, not a new component.

## 2. Zero-cost AI

| Layer | Implementation |
| --- | --- |
| Free-tier reasoning (Gemini 2.0 Flash, 15 RPM / 1,500 RPD) | `server/routes/petrosAi.ts` → `POST /api/petros/ai/reason` |
| Quota and pacing for every upstream | `src/services/ai/quotaGuard.ts` |
| Browser client with 429-aware retry | `src/services/ai/domainFeeds.ts` |
| Server-side feed gateway | `server/routes/petrosFeeds.ts` |

Rules the code enforces:

- The API key never reaches the browser; only the server route touches Google.
- The daily free budget is counted locally, so we degrade to feed-only mode before
  Google throttles us. The room UI surfaces that as a readable line, not a crash.
- Every outbound call carries the PETROS `User-Agent`; Nominatim blocks default
  browser agents outright.
- Overpass queries are wrapped with `[timeout:180][maxsize:536870912]` and callers may
  not override those caps. PubChem is paced at 5 req/s, Nominatim at 1 req/s.

Feeds without a configured key (Unsplash, Hugging Face, GitHub, NASA) stay usable
anonymously at their documented public limits and report `optionalKey` in the registry.

## 3. Rendering and the 5 MB promise

| Concern | Implementation |
| --- | --- |
| Room-level code splitting | `PetrosCityShell` imports every room with `React.lazy` |
| Loading placeholder | `HologramRezIn` + `src/three/hologramMaterial.ts` |
| GLB compression (Draco + KTX2) | `scripts/optimize-glb.mjs` (`npm run assets:optimize`) |
| Budget gate | `scripts/check-bundle-budget.mjs` (`npm run budget`) |

The hologram shader is the transition, not decoration: `uBuild` drives a `discard`
against model-space height so geometry "prints" from the floor up while the chunk
streams, and the Fresnel term uses `-mvPosition.xyz` so the rim lights the silhouette
rather than the faces aimed at the camera.

`npm run budget` fails the build when the gzipped entry exceeds 5 MB, when any single
chunk exceeds 1.5 MB, or when a room chunk is referenced eagerly from `index.html`.

## 4. Licensing

`src/components/petros-city/AssetCreditLedger.tsx` renders every CC-BY source from the
registry with its licence and the rooms that use it. CC0 and public-domain sources are
listed separately. A room cannot ship a CC-BY prop without appearing in that ledger,
because the ledger is derived from `RoomSpec.sources`.

## 5. Rollout order

1. `feat(petros)` registry + quota guard + feed gateway — done.
2. `feat(3d)` hologram rez-in material and placeholder — done.
3. `feat(ui)` registry-driven rooms, lazy loading, attribution ledger — done.
4. `feat(perf)` asset pipeline and budget gate — done.
5. `feat(ai)` edge fallbacks: WebLLM (`Llama-3.2-1B-Instruct-q4f32_1-MLC`,
   `DeepSeek-R1-Distill-Qwen-7B`) and Transformers.js for embeddings — next.
6. `feat(assets)` author the actual room GLBs per `RoomSpec.props` and route them
   through `npm run assets:optimize` — next.
7. `feat(presence)` animate the 52 avatars (Ready Player Me + Mixamo idle/typing
   clips baked into the GLB) — next.

## 6. Environment variables

Add these to `.env` (never to the client bundle):

| Variable | Purpose | Required |
| --- | --- | --- |
| `GEMINI_API_KEY` | Lead-agent reasoning on the free tier | For reasoning; rooms work without it |
| `GITHUB_TOKEN` | Raise GitHub limit from 60/h to 5,000/h | Optional |
| `HF_TOKEN` | Hugging Face inference quota | Optional |
| `UNSPLASH_ACCESS_KEY` | Storyboard stills | Optional |
| `NASA_API_KEY` | Higher NASA API quota | Optional |
