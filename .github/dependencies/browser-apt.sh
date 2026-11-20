#!/usr/bin/env bash
# The locked Playwright CLI owns engine-to-package selection on the Ubuntu runner.
set -euo pipefail
export LC_ALL=C
case "${SELECTED_SUITE:?}" in
  all) engines=(chromium firefox webkit) ;;
  iframe) engines=(chromium webkit) ;;
  core|narrative) engines=(chromium) ;;
  *) exit 2 ;;
esac
plan="$RUNNER_TEMP/browser-apt-plan"
cache="$RUNNER_TEMP/browser-apt-archives"
archives="$RUNNER_TEMP/browser-apt-install"
helper=$(dirname "${BASH_SOURCE[0]}")/browser-apt-restore.sh
case "${1:?}" in
  plan)
    sudo apt-get update
    report="$RUNNER_TEMP/browser-apt-report"
    if npm run --silent playwright -- install-deps --dry-run "${engines[@]}" > "$report"; then
      grep -Fxq 'All system dependencies are installed.' "$report"
      : > "$plan"
    else
      # Playwright returns 1 with a counted list when its APT simulation has work.
      count=$(sed -nE 's/^Missing system dependencies \(([0-9]+)\):$/\1/p' "$report")
      mapfile -t missing < <(sed -nE 's/^  ([a-z0-9][a-z0-9+.-]*(:[a-z0-9-]+)?)$/\1/p' "$report")
      [[ "$count" == "${#missing[@]}" && "$count" != 0 ]]
      apt-get --simulate install --no-install-recommends "${missing[@]}" |
        awk -f .github/dependencies/apt-install-plan.awk | sort -u > "$plan"
      test -s "$plan"
    fi
    version=$(node -p "require('playwright/package.json').version")
    digest=$(sha256sum "$plan" | cut -d' ' -f1)
    selection="${engines[*]}"
    selection="${selection// /-}-$version-$digest"
    prefix="browser-apt-v2-$RUNNER_OS-$RUNNER_ARCH-$selection-"
    printf 'key=%s\n' "$prefix${ImageVersion:?}" >> "$GITHUB_OUTPUT"
    printf 'compatible-prefix=%s\n' "$prefix" >> "$GITHUB_OUTPUT"
    # Existing v1 entries can supply the exact current image during migration.
    printf 'previous-key=%s\n' "browser-apt-v1-$RUNNER_OS-$RUNNER_ARCH-$ImageVersion-$selection" >> "$GITHUB_OUTPUT"
    printf 'packages=%s\n' "$(wc -l < "$plan" | tr -d ' ')" >> "$GITHUB_OUTPUT"
    ;;
  install)
    packages=()
    while IFS= read -r package; do packages+=("$package"); done < "$plan"
    if ((${#packages[@]})); then
      restored=$(mktemp -d "$RUNNER_TEMP/browser-restored.XXXXXX")
      if [[ -e "$cache" || -L "$cache" ]]; then mv "$cache" "$restored/entry"; fi
      mkdir -p "$archives/partial" "$cache"
      # Request destination names and SHA-256 from the fresh APT index against an empty cache.
      uris="$RUNNER_TEMP/browser-apt-uris"
      apt-get -o "Dir::Cache::archives=$archives" -o Acquire::ForceHash=SHA256 \
        --print-uris --yes install --no-install-recommends "${packages[@]}" > "$uris"
      if [[ -d "$restored/entry" && ! -L "$restored/entry" ]]; then
        bash "$helper" "$uris" "$restored/entry" "$archives"
      fi
      sudo chown _apt:root "$archives/partial"
      sudo chmod 0700 "$archives/partial"
      apt=(sudo apt-get -o "Dir::Cache::archives=$archives" install --yes --no-install-recommends)
      "${apt[@]}" --download-only "${packages[@]}"
      # Save only acquired package files. The restore helper rechecks their bytes on each use.
      cp "$archives"/*.deb "$cache/"
      "${apt[@]}" --no-download "${packages[@]}"
    fi
    npm run --silent playwright -- install-deps --dry-run "${engines[@]}"
    npm run --silent playwright -- install "${engines[@]}"
    ;;
  *) exit 2 ;;
esac
