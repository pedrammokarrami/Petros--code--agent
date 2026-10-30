#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN=false
for arg in "$@"; do [[ "$arg" == "--dry-run" ]] && DRY_RUN=true; done
command_exists() { command -v "$1" >/dev/null 2>&1; }
doctor() { printf '%-14s %-8s %s\n' TOOL STATUS PATH; while IFS= read -r tool; do [[ -z "$tool" ]] && continue; if command_exists "$tool"; then printf '%-14s %-8s %s\n' "$tool" found "$(command -v "$tool")"; else printf '%-14s %-8s %s\n' "$tool" missing '-'; fi; done < <(node -e 'const x=require(process.argv[1]); for(const a of [...x.required,...x.optional]) console.log(a.command)' "$ROOT/installer/prerequisites.json"); }
install() { doctor; if $DRY_RUN; then echo 'dry-run: no changes made'; return; fi; if ! command_exists brew; then echo 'Homebrew is required to install missing macOS tools.' >&2; exit 1; fi; command_exists node || brew install node; command_exists rg || brew install ripgrep; command_exists gh || true; export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"; doctor; }
case "${1:-doctor}" in doctor) doctor;; install) install;; *) echo 'usage: install.sh {doctor|install} [--dry-run]' >&2; exit 2;; esac
