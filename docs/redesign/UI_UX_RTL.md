# UI/UX — RTL, BiDi and text rendering

Status: adopted rules (source: external template/repo survey, 2026-10-19).
Parts marked UNVERIFIED were read in that survey and not yet checked against
our code or package versions.

## Adopted rules
1. All user-visible text is DOM, never drawn into the WebGL canvas.
   Persian/Arabic needs bidi reordering and letter shaping (joining); canvas
   text (incl. MSDF/uikit atlases) does not provide them.
   - UNVERIFIED: uikit's Text/MSDF rendering has no bidi and no Arabic shaping.
2. Base direction of a block comes from its dominant content, not from its
   first character. `dir="auto"` mis-flips blocks that start with a Latin
   word ("API را ..."), so streaming chat bubbles do not use it.
3. Latin islands get an explicit `dir="ltr"` wrapper: code blocks, terminal
   output, URLs, file paths, log lines, ids.
4. Streaming: the direction of a message is decided once when the message
   starts and does not change per token; partial tokens never re-run bidi on
   the whole message.
5. Numbers and mixed At/percent tokens follow the block direction; no manual
   LRM/RLM characters unless a concrete rendering bug requires one.
6. Layout math (slot positions, chat band, drawer, scan lines) is
   direction-agnostic; mirroring happens in CSS, not in the LayoutEngine.

## Do not adopt (licence / fit)
- tldraw — production use not licensed.
- aituber-kit — non-commercial licence.
- aedifex — no licence file.
- AG-UI / A2UI / CopilotKit / Tambo / OpenUI / dockview — replace or wrap our
  own SSE protocol and event map; no need for that layer now.
  dockview only if real multi-pane windows are requested later.

## Requires verification before any dependency is added
Version, licence and star claims from that survey are unverified and partly
inconsistent (dates in the future, two repos with identical star counts).
Check with `npm view <pkg> version license time.modified` and the real
LICENSE file, and record the result in DEPENDENCIES.md.
