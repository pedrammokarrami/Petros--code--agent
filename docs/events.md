# TokenDeck live events

`GET /api/v1/events` returns Server-Sent Events. Each `data` value is JSON.

## Event envelope

```json
{"id":"uuid","type":"key.active|key.updated|request.completed","timestamp":"ISO-8601","payload":{}}
```

## Required payload fields

- `key.active`: `alias`, `provider`, `model`, `startedAt`, `tokensStreaming`
- `key.updated`: `id`, `alias`, `provider`, `masked`, `enabled`, `cooldownMs`
- `request.completed`: `keyAlias`, `provider`, `model`, `tokensIn`, `tokensOut`, `tokensCached`, `latencyMs`, `status`, `estimatedCostUsd`, `streaming`

These fields are sufficient for an active-key panel, per-key gauges, cooldown timers, token metrics, latency, and error-rate calculations.
