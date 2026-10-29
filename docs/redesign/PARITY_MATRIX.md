# Parity matrix

Generated from `docs/redesign/inventory.json` (99 routes, 59 components, 18 SSE events).
Every route and every component appears in at least one row; `npm run parity:check` fails the
release if one is unaccounted for. Locations: DOCK, WELCOME, DEV, RESEARCH, CONTENT, COMMAND.

State values: `planned`, `built`, `n/a` (backend capability absent, never silently dropped).

| # | feature | source | new location | test id | state |
| --: | :-- | :-- | :-- | :-- | :-- |
| 1 | Chat turn, streaming answer | `POST /api/chat`, `POST /api/prompt`, `POST /api/agent/chat`, `POST /api/agent/prompt`, `src/components/CodedAiChatCard.tsx`, `src/components/MessageItem.tsx` | DOCK | `dock.send`, `dock.stream` | planned |
| 2 | Cancel a running turn | `POST /api/tasks/:id/cancel`, `POST /api/terminal/cancel` | DOCK | `dock.stop` | planned |
| 3 | Retry the last turn | (client state) | DOCK | `dock.retry` | planned |
| 4 | Attach files (button, drop, paste, camera) | `POST /api/files/content`, `POST /api/fs/read`, `src/components/Composer.tsx`, `src/components/MinimalComposer.tsx`, `src/components/FileExplorer.tsx` | DOCK | `dock.attach`, `upload.validation` | planned |
| 5 | Voice input + live transcript | `POST /api/transcribe`, `POST /api/voice/transcribe`, `src/utils/whisperSTT.ts`, `src/utils/nativeRecorder.ts` | DOCK | `dock.voice` | planned |
| 6 | Voice output per message | (no TTS endpoint — adapter) | DOCK | `dock.voice-out` | n/a |
| 7 | Chat history threads | `GET /api/tasks`, `GET /api/tasks/:id`, `src/components/SiriChatDrawer.tsx`, `src/components/Sidebar.tsx` | DOCK | `dock.history` | planned |
| 8 | Room switch (manual + chat intent) | `POST /api/scene/direct`, `src/engine/spatial/eventMap.ts` | DOCK | `dock.room-switch` | planned |
| 9 | Connection status / SSE reconnect | `GET /api/tasks/:id/events`, `GET /api/health` | DOCK | `dock.reconnect`, `offline.banner` | planned |
| 10 | Markdown + code blocks + copy | `src/components/MessageItem.tsx`, `src/components/CodedAiChatCard.tsx` | DOCK | `xss.model-output` | planned |
| 11 | Welcome greeting with android host | `src/components/LiveCharacterAvatar.tsx`, `src/components/MrRobotCanvas.tsx`, `src/components/MrRobotLiveCharacter.tsx`, `src/components/LiveArtifactPreview.tsx` | WELCOME | `welcome.greet` | planned |
| 12 | Ambient/visual character engine | `src/components/SiriVisualMotionEngine.tsx`, `src/components/CosmicOrbitalHackerCanvas.tsx`, `src/components/HolographicPolyhedron.tsx`, `src/components/LiquidGlassBackground.tsx`, `src/components/SpinningEarthGlobe.tsx`, `src/components/DeveloperRoomCanvas.tsx` | WELCOME | `welcome.greet` | planned |
| 13 | Avatar / motion preferences | `src/components/CosmicAvatarModal.tsx`, `src/components/SiriMotionControlsModal.tsx`, `src/components/SiriLiveSpeakerOverlay.tsx`, `src/components/SiriMiniBottomDock.tsx`, `src/components/SoundtrackBar.tsx`, `src/utils/ambientAudio.ts`, `src/utils/audio.ts`, `src/utils/audioNotification.ts`, `src/services/siriVoiceEngine.ts`, `src/services/voiceAgent.ts` | COMMAND | `cmd.voice` | planned |
| 14 | Streaming plan card | SSE `agent.planning` | DEV | `dev.stream` | planned |
| 15 | Streaming editor with tabs | SSE `worker.started`, `tool.started`, `file.changed`, `GET /api/fs/tree`, `POST /api/fs/write`, `src/components/AnimatedCodeDrawer.tsx`, `src/components/FuturisticLiveCodeHUD.tsx`, `src/components/LiveCodeExecutionVisualizer.tsx` | DEV | `dev.tabs`, `dev.tree` | planned |
| 16 | Terminal frame | SSE `command.started`, `command.output`, `command.completed`, `POST /api/claude/terminal`, `src/components/TerminalPanel.tsx` | DEV | `dev.terminal` | planned |
| 17 | Diff frame | SSE `file.changed`, `GET /api/git/diff`, `GET /api/git/status`, `GET /api/git/log`, `POST /api/git/commit`, `src/components/DiffViewerModal.tsx`, `src/utils/diffParser.ts` | DEV | `dev.diff` | planned |
| 18 | Tests frame | SSE `test.started`, `test.completed`, `server/comprehensiveTestRunner.ts`, `POST /api/compiler/execute`, `POST /api/sandbox/compile`, `POST /api/compiler/build-react`, `POST /api/compiler/build-universal`, `GET /api/compiler/languages`, `GET /api/compiler/tools`, `POST /api/compiler/install-tool`, `POST /api/compiler/auto-install-config` | DEV | `dev.tests` | planned |
| 19 | Preview frame | `POST /api/self-heal/compile`, `GET /api/media/proxy`, `src/components/PreviewModal.tsx` | DEV | `dev.preview` | planned |
| 20 | Apply patch / search codebase | `POST /api/patch/apply`, `POST /api/index/build`, `POST /api/index/search`, `POST /api/fs/search`, `GET /api/project/info`, `POST /api/security/scan`, `src/utils/typeSafeDecision.ts` | DEV | `dev.tree` | planned |
| 21 | Approval gate card | SSE `approval.required` | DEV | `dev.approval` | planned |
| 22 | Research query | (no search provider — adapter) | RESEARCH | `research.query` | n/a |
| 23 | Sources list with citations | (adapter contract) | RESEARCH | `research.sources` | n/a |
| 24 | Timeline of findings | SSE `agent.thinking`, `tool.started`, `tool.completed` | RESEARCH | `research.timeline` | planned |
| 25 | Image generation progress + gallery | (no media endpoint — adapter) | CONTENT | `content.gallery`, `content.progress` | n/a |
| 26 | Video player + download/share | `GET /api/media/proxy`, `GET /api/images/:id`, `src/components/MediaStudioDrawer.tsx`, `src/components/AudioVidoUniversalStudio.tsx`, `src/components/ImageMessageRenderer.tsx` | CONTENT | `content.player` | planned |
| 27 | Settings: models/providers | `GET /api/router/models`, `POST /api/router/select-model`, `GET /api/router/topology`, `GET /api/routers/active`, `POST /api/routers/select`, `GET /api/routers/book`, `GET /api/claude/status`, `POST /api/router/install-package`, `POST /api/router/comprehensive-test`, `POST /api/pool/cascade`, `POST /api/pool/restart`, `POST /api/pool/test-infinite`, `GET /api/pool/metrics`, `src/components/SettingsModal.tsx` | COMMAND | `cmd.models` | planned |
| 28 | Settings: API keys (masked) | `GET /api/keys/status`, `GET /api/keys/list`, `POST /api/keys/add`, `POST /api/keys/generate`, `POST /api/keys/rotate`, `POST /api/keys/verify-pin`, `POST /api/claude/key`, `src/components/FuelApiKeyView.tsx` | COMMAND | `cmd.keys` | planned |
| 29 | Agents / tasks status + history | `GET /api/tasks`, `GET /api/tasks/:id`, `POST /api/tasks`, `POST /api/project/timeline/decompose`, `POST /api/project/timeline/execute`, `src/components/AgentActivityBadge.tsx`, `src/components/ProjectTimelineDrawer.tsx` | COMMAND | `cmd.agents` | planned |
| 30 | Usage / cost / fuel | `GET /api/fuel/status`, `POST /api/fuel/claim`, `POST /api/fuel/boost`, `src/components/StatusBar.tsx` | COMMAND | `cmd.usage` | planned |
| 31 | Logs | `src/components/HolographicHudPanels.tsx` | COMMAND | `cmd.logs` | planned |
| 32 | Memory / data export + delete | `GET /api/memory`, `POST /api/memory` | COMMAND | `cmd.memory`, `cmd.export` | planned |
| 33 | Language (fa/en, RTL) | `src/components/LanguageSelectorModal.tsx`, `src/utils/translations.ts`, `POST /api/translate/messages` | COMMAND | `cmd.lang`, `rtl.mobile` | planned |
| 34 | Theme / motion / quality | `src/design/tokens.ts`, `src/engine/points/PointsWorld.ts` | COMMAND | `cmd.theme`, `cmd.quality` | planned |
| 35 | Privacy | (client state) | COMMAND | `cmd.privacy` | planned |
| 36 | Version | `package.json`, `GET /api/health` | COMMAND | `cmd.version` | planned |
| 37 | Projects / workspaces | `GET /api/projects`, `POST /api/projects/switch`, `POST /api/projects/select`, `POST /api/projects/create`, `POST /api/projects/create-test`, `GET /api/filesystem/quick-paths`, `GET /api/filesystem/list-dir`, `GET /api/filesystem/browse-folder`, `src/components/ProjectSelector.tsx`, `src/components/FreebuffWorkspacesModal.tsx`, `src/components/FreebuffQueueDrawer.tsx` | COMMAND | `cmd.projects` | planned |
| 38 | MCP connectors | `GET /api/mcp/registries`, `POST /api/mcp/provision`, `POST /api/connectors/mcp/execute`, `POST /api/connectors/test-all`, `GET /api/skills/standards/test`, `src/components/McpModal.tsx`, `src/components/McpConnectorsModal.tsx`, `src/components/McpWebViewModal.tsx`, `src/components/SkillsModal.tsx` | COMMAND | `cmd.mcp` | planned |
| 39 | Local bridge | `GET /api/local-bridge/status`, `POST /api/local-bridge/connect`, `POST /api/local-bridge/execute`, `POST /api/local-bridge/organize-desktop`, `src/components/LocalBridgeModal.tsx` | COMMAND | `cmd.bridge` | planned |
| 40 | Gmail connector | `GET /api/connectors/gmail/emails`, `GET /api/connectors/gmail/latest`, `POST /api/connectors/gmail/send-test`, `src/components/AnimatedUserEmailDropdown.tsx`, `src/components/LiveEmailViewerModal.tsx` | COMMAND | `cmd.gmail` | planned |
| 41 | Billing / payment | `POST /api/payment/request`, `POST /api/payment/verify`, `src/components/BillingModal.tsx`, `src/components/PaymentGatewayModal.tsx` | COMMAND | `cmd.billing` | planned |
| 42 | Profile | `src/components/ProfileModal.tsx` | COMMAND | `cmd.profile` | planned |
| 43 | Brand / navigation chrome | `src/components/CodgarLogo.tsx`, `src/components/YodawBrandMark.tsx`, `src/components/YodawMenuDrawer.tsx`, `src/components/YodawWorkspace.tsx`, `src/components/RadialArcMenu.tsx`, `src/components/CodgarSecondaryWorkspace.tsx` | COMMAND | `shell.boot` | planned |
| 44 | Error containment | `src/components/ErrorBoundary.tsx` | DOCK | `shell.boot` | planned |
| 45 | Legacy startup/competitor flows | `GET /api/startup/list`, `GET /api/startup/:id`, `POST /api/startup/scrape-competitors`, `POST /api/startup/autonomous-create`, `POST /api/ai-director/compose`, `src/components/AutonomousStartupModal.tsx`, `src/engine/spatial/competitors.ts` | n/a | — | n/a |
| 46 | Legion classic scene director | `POST /api/scene/direct`, `src/engine/spatial/SpatialSceneDirector.ts`, `src/engine/art_director/*` | n/a | — | n/a |
| 47 | Static hosting + SPA fallback | `GET *` | DOCK | `shell.boot` | planned |
