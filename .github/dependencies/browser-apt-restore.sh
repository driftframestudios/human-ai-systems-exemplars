#!/usr/bin/env bash
# Copy only expected archives into the fresh install directory.
set -euo pipefail
while read -r uri name size hash rest; do
  [[ "$uri" == \'* ]] || continue
  [[ "$name" =~ ^[A-Za-z0-9%+._~:-]+\.deb$ && "$size" =~ ^[0-9]+$ ]]
  [[ "$hash" =~ ^SHA256:([0-9a-f]{64})$ && -z "$rest" ]]
  expected=${hash#SHA256:}
  archive="$2/$name"
  if [[ -f "$archive" && ! -L "$archive" ]]; then
    observed=$(sha256sum < "$archive")
    if [[ "${observed%% *}" == "$expected" ]]; then
      cp "$archive" "$3/$name"
    fi
  fi
done < "$1"
