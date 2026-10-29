#!/usr/bin/env bash
# tools/shot.sh - take a real screenshot of any URL with a real headless Chromium.
#
# Usage:
#   tools/shot.sh <url> <out.png> [width] [height] [--full]
#
#   width/height default to the desktop viewport 1440x900.
#   Use 390 844 for the mobile viewport.
#   --full captures the full scrollable page instead of the viewport.
#
# Backend (printed on every run):
#   docker  mcr.microsoft.com/playwright:<pinned tag>, docker run --rm, only the
#           output directory is mounted, and host.docker.internal replaces
#           localhost so a dev server on the host is reachable.
#   local   Playwright + Chromium already installed in this VM, used when no
#           Docker daemon is reachable from here.
#
# Force one with SHOT_BACKEND=docker|local. Exit code 0 means a non-empty PNG
# with the requested dimensions was written; 1 means the capture failed.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLAYWRIGHT_IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.64.1-noble}"

die() { printf 'shot.sh: %s\n' "$*" >&2; exit 2; }

if [ "$#" -lt 2 ]; then
  sed -n '2,19p' "${BASH_SOURCE[0]}" >&2
  exit 2
fi

URL="$1"; OUT="$2"; shift 2
WIDTH=""; HEIGHT=""; FULL="0"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --full) FULL="1"; shift ;;
    --) shift; break ;;
    *[!0-9]*|"") die "unexpected argument: $1" ;;
    *) if [ -z "$WIDTH" ]; then WIDTH="$1"; elif [ -z "$HEIGHT" ]; then HEIGHT="$1"; else die "unexpected argument: $1"; fi; shift ;;
  esac
done
WIDTH="${WIDTH:-1440}"
HEIGHT="${HEIGHT:-900}"

OUT_DIR="$(dirname "$OUT")"
mkdir -p "$OUT_DIR"
OUT_ABS="$(cd "$OUT_DIR" && pwd)/$(basename "$OUT")"

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ] || [ "$("$NODE_BIN" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -lt 20 ]; then
  for cand in /home/cua/.local/node20/bin/node /usr/local/bin/node; do
    [ -x "$cand" ] && NODE_BIN="$cand" && break
  done
fi
[ -x "$NODE_BIN" ] || die "node >= 20 not found"

TMPDIR_SHOT="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_SHOT"' EXIT
JS="$TMPDIR_SHOT/shot.cjs"
cat > "$JS" <<'JS_EOF'
const fs = require('fs');
const crypto = require('crypto');
const { chromium } = require('playwright');

const [url, out, wStr, hStr, fullFlag] = process.argv.slice(2);
const width = Number(wStr);
const height = Number(hStr);
const fullPage = fullFlag === '1';
const extraArgs = (process.env.SHOT_CHROMIUM_ARGS || '').split(/\s+/).filter(Boolean);

(async () => {
  const browser = await chromium.launch({
    args: [...extraArgs, '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'fa-IR' });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('pageerror: ' + String(e.message).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + String(m.text()).slice(0, 200)); });
  page.on('requestfailed', (r) => problems.push('requestfailed: ' + r.url().slice(0, 160)));

  let status = null;
  const resp = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  if (resp) status = resp.status();
  if (process.env.SHOT_WAIT_FOR) {
    await page.waitForFunction(process.env.SHOT_WAIT_FOR, null, { timeout: Number(process.env.SHOT_WAIT_TIMEOUT || 30000) });
  }
  await page.waitForTimeout(Number(process.env.SHOT_SETTLE_MS || 3000));
  const title = await page.title();
  await page.screenshot({ path: out, fullPage });
  await browser.close();

  const buf = fs.readFileSync(out);
  const pngWidth = buf.readUInt32BE(16);
  const pngHeight = buf.readUInt32BE(20);
  console.log(JSON.stringify({
    url,
    httpStatus: status,
    title,
    viewport: { width, height },
    fullPage,
    png: {
      width: pngWidth,
      height: pngHeight,
      bytes: buf.length,
      sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    },
    problems,
  }, null, 2));
  if (!buf.length) { console.error('shot.sh: empty png written'); process.exit(3); }
  if (!fullPage && (pngWidth !== width || pngHeight !== height)) {
    console.error(`shot.sh: expected ${width}x${height}, got ${pngWidth}x${pngHeight}`);
    process.exit(4);
  }
})().catch((e) => { console.error('shot.sh: capture failed: ' + e.message); process.exit(1); });
JS_EOF

# --- backend selection -------------------------------------------------
# The Docker backend is only ever chosen when the daemon is genuinely
# reachable. A probe is bounded by a timeout and a negative verdict is
# cached, so a missing daemon is not re-probed on every single run.
DOCKER_PROBE_TIMEOUT="${SHOT_DOCKER_PROBE_TIMEOUT:-10}"
DOCKER_PROBE_TTL="${SHOT_DOCKER_PROBE_TTL:-300}"
DOCKER_PROBE_FILE="${XDG_CACHE_HOME:-$HOME/.cache}/shot.sh/docker-unreachable"

docker_cli_present() { command -v docker >/dev/null 2>&1; }

run_bounded() {
  local secs="$1"; shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "$secs" "$@"
  elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$secs" "$@"
  else
    "$@"
  fi
}

file_mtime() {
  stat -c %Y "$1" 2>/dev/null || stat -f %m "$1" 2>/dev/null || echo ""
}

# 0 = the daemon answered, 1 = it did not.
docker_probe() {
  docker_cli_present || return 1
  run_bounded "$DOCKER_PROBE_TIMEOUT" docker info >/dev/null 2>&1
}

cache_docker_unreachable() {
  mkdir -p "$(dirname "$DOCKER_PROBE_FILE")" 2>/dev/null || true
  printf '%s' "$(date +%s)" > "$DOCKER_PROBE_FILE" 2>/dev/null || true
}

docker_cached_unreachable() {
  [ -f "$DOCKER_PROBE_FILE" ] || return 1
  local now mtime age
  now="$(date +%s)"
  mtime="$(file_mtime "$DOCKER_PROBE_FILE")"
  [ -n "$mtime" ] || return 1
  age=$((now - mtime))
  [ "$age" -lt "$DOCKER_PROBE_TTL" ] && [ "$age" -ge 0 ]
}

backend="${SHOT_BACKEND:-auto}"
case "$backend" in
  auto|docker|local) ;;
  *) die "invalid SHOT_BACKEND='$backend' (expected: auto|docker|local)" ;;
esac

if [ "$backend" = "auto" ]; then
  if docker_cached_unreachable; then
    backend="local"
    printf 'shot.sh: docker daemon was unreachable on a recent probe (cached), using local\n' >&2
  elif docker_probe; then
    backend="docker"
  else
    cache_docker_unreachable
    backend="local"
    printf 'shot.sh: no reachable docker daemon, using local\n' >&2
  fi
elif [ "$backend" = "docker" ]; then
  docker_cli_present || die "SHOT_BACKEND=docker was requested but the docker CLI is not on PATH here"
  if ! docker_probe; then
    cache_docker_unreachable
    die "SHOT_BACKEND=docker was requested but no reachable Docker daemon was found (docker info failed). Start Docker or run with SHOT_BACKEND=local; this script never switches backends silently."
  fi
fi

if [ "$backend" = "docker" ]; then
  # Inside a container, localhost is the container. A dev server on the host is
  # reached through host.docker.internal.
  case "$URL" in
    *://localhost:*|*://127.0.0.1:*) URL="$(printf '%s' "$URL" | sed -E 's#://(localhost|127\.0\.0\.1):#://host.docker.internal:#')" ;;
  esac
  printf 'shot.sh: backend=docker image=%s\n' "$PLAYWRIGHT_IMAGE"
  docker run --rm -i --ipc=host \
    --add-host=host.docker.internal:host-gateway \
    -v "$(dirname "$OUT_ABS"):/out" -w /out \
    -e SHOT_CHROMIUM_ARGS="--no-sandbox" \
    "$PLAYWRIGHT_IMAGE" \
    bash -c 'cat > /tmp/shot.cjs && node /tmp/shot.cjs "$@"' shot \
    "$URL" "/out/$(basename "$OUT_ABS")" "$WIDTH" "$HEIGHT" "$FULL" < "$JS"
else
  printf 'shot.sh: backend=local image=n/a\n'
  NODE_PATH="$REPO_ROOT/node_modules" \
  SHOT_CHROMIUM_ARGS="${SHOT_CHROMIUM_ARGS:-}" \
    "$NODE_BIN" "$JS" "$URL" "$OUT_ABS" "$WIDTH" "$HEIGHT" "$FULL"
fi

ls -lh "$OUT_ABS"
