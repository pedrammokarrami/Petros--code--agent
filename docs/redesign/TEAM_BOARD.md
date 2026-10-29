# Team board

Ownership is by directory. There is one runtime here, so the roles below are separate passes over
the same diff, in this order, never merged: ARCHITECT -> ENGINE -> FRONTEND -> BACKEND -> QA -> REVIEWER.
A row is DONE only with an evidence path.

| id | owner | item | depends | evidence | state |
| :-- | :-- | :-- | :-- | :-- | :-- |
| P0-1 | ARCHITECT | inventory + parity matrix + architecture + board | — | docs/redesign/FEATURE_INVENTORY.md, PARITY_MATRIX.md, ARCHITECTURE.md | DONE |
| P0-2 | ARCHITECT | decisions log + pending human input | P0-1 | docs/redesign/DECISIONS.md, PENDING_HUMAN_INPUT.md | DONE |
| P1-1 | ENGINE | scenes:build (image -> depth -> .dptscn) | P0 | docs/redesign/evidence/p1.txt, p2.txt | DONE |
| P1-2 | ENGINE | backdrop renderer + tiers + registry | P1-1 | docs/redesign/evidence/p1.txt, p2.txt | DONE |
| P1-3 | ENGINE | WebGL-off poster + reduced motion | P1-2 | docs/redesign/evidence/p1.txt | DONE |
| P2-1 | FRONTEND | shell, header, room host | P1 | docs/redesign/evidence/p2.txt | DONE 3a7f6b0 |
| P2-2 | FRONTEND | dock (composer, attach, voice, history, status) | P2-1 | docs/redesign/evidence/p2.txt | DONE 3a7f6b0 |
| P2-3 | FRONTEND | RTL fa/en, breakpoints 390/768/1440/1920, keyboard | P2-2 | docs/redesign/evidence/p2.txt | DONE 3a7f6b0 |
| P3-1 | BACKEND | /api/office/director (zod, timeout, fallback) | P0 | tests/office-director.test.mjs | DONE 5afb6c4 |
| P3-2 | FRONTEND | frame system + layout rules | P3-1 | src/office/frames/, src/engine/spatial/layoutEngine.ts | DONE 5afb6c4 |
| P3-3 | QA | eventMap fixtures + layout determinism tests | P3-2 | tests/event-map.test.mjs, tests/spatial-layout.test.mjs, tests/office-director.test.mjs | DONE |
| P3-4 | ARCHITECT | SceneSpec v2 (room/frames[5]/cues[8]/say), no coordinates, adapter to layout engine | P3-2 | src/office/director/sceneSpecV2.ts, tests/office-scene-v2.test.mjs | DONE (12 tests) |
| P4 | FRONTEND | welcome room + host + greeting | P3 | docs/redesign/evidence/p4.txt | TODO |
| P5 | FRONTEND | dev room frames | P3 | docs/redesign/evidence/p5.txt | TODO |
| P6 | FRONTEND | research room frames | P3 | docs/redesign/evidence/p6.txt | TODO |
| P7 | FRONTEND | content room frames | P3 | docs/redesign/evidence/p7.txt | TODO |
| P8 | FRONTEND | command room parity | P3 | docs/redesign/evidence/p8.txt | TODO |
| P9-1 | QA | playwright personas + video/trace | P4-P8 | docs/redesign/usertests/ | TODO |
| P9-2 | QA | fresh-eyes pass -> UX_BUGS.md | P9-1 | docs/redesign/UX_BUGS.md | TODO |
| P9-3 | REVIEWER | REVIEW.md + release:check | P9-2 | docs/redesign/REVIEW.md | TODO |
