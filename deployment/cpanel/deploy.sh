#!/usr/bin/env bash

set -euo pipefail
set -f
export LC_ALL=C
PATH=/usr/local/cpanel/3rdparty/bin:/usr/bin:/bin
export PATH
umask 022

PHASE="initialization"
ACTIVE_PATH="none"
MUTATION_STARTED=0
PUBLIC_VERIFIED=0
LOCK_HELD=0
LOCK_DIRECTORY=""
SCRATCH_DIRECTORY=""
ACTIVE_TEMP=""
STATE_RELEASE_TEMP=""
PENDING_RELEASE_TEMP=""
PENDING_RELEASE_FILE=""

say() {
  printf '%s\n' "$*"
}

die() {
  say "cPanel deployment stopped: $*" >&2
  exit 1
}

on_exit() {
  local status=$1
  trap - EXIT
  if [ -n "$ACTIVE_TEMP" ] && [ -f "$ACTIVE_TEMP" ] && [ ! -L "$ACTIVE_TEMP" ]; then
    rm -f -- "$ACTIVE_TEMP" >/dev/null 2>&1 || true
  fi
  local temporary
  for temporary in "$STATE_RELEASE_TEMP" "$PENDING_RELEASE_TEMP"; do
    if [ -n "$temporary" ] && [ -f "$temporary" ] && [ ! -L "$temporary" ]; then
      rm -f -- "$temporary" >/dev/null 2>&1 || true
    fi
  done
  if [ -n "$SCRATCH_DIRECTORY" ] && [ -d "$SCRATCH_DIRECTORY" ] && [ ! -L "$SCRATCH_DIRECTORY" ]; then
    rm -rf -- "$SCRATCH_DIRECTORY" >/dev/null 2>&1 || true
  fi
  if [ "$LOCK_HELD" -eq 1 ]; then
    rmdir -- "$LOCK_DIRECTORY" >/dev/null 2>&1 || true
  fi
  if [ "$status" -ne 0 ]; then
    say "Failure phase: $PHASE; carrier path: $ACTIVE_PATH." >&2
    if [ "$MUTATION_STARTED" -eq 0 ]; then
      say "Public state: unchanged by this run." >&2
    elif [ "$PUBLIC_VERIFIED" -eq 1 ]; then
      say "Public state: requested bytes verified; the prior successful ownership record remains authoritative." >&2
      say "Recovery: rerun this same release to complete the successful-state update." >&2
    else
      say "Public state: a verified mixture of prior and requested bytes may be present; the prior successful ownership record remains authoritative." >&2
      say "Recovery: correct the host condition, then rerun this same release." >&2
    fi
    if [ -n "$PENDING_RELEASE_FILE" ] && [ -f "$PENDING_RELEASE_FILE" ] && [ ! -L "$PENDING_RELEASE_FILE" ]; then
      say "Pending state: resolve the bounded pending release before selecting another." >&2
    fi
  fi
  exit "$status"
}
trap 'on_exit $?' EXIT

SCRIPT_DIRECTORY=$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P) ||
  die "the installer directory is unavailable."
REPOSITORY_ROOT=$(cd -P -- "$SCRIPT_DIRECTORY/../.." >/dev/null 2>&1 && pwd -P) ||
  die "the repository root is unavailable."
CARRIER_GIT_PREFIX="deployment/cpanel/carrier"

CONFIGURATION_PATH=""
if [ "$#" -eq 0 ]; then
  CONFIGURATION_PATH="$(dirname -- "$REPOSITORY_ROOT")/.human-ai-systems-exemplars-cpanel.conf"
elif [ "$#" -eq 2 ] && [ "$1" = "--config" ]; then
  CONFIGURATION_PATH=$2
else
  die "usage is deploy.sh [--config private-config-file]."
fi

canonical_directory() {
  local candidate=$1
  [ -d "$candidate" ] && [ ! -L "$candidate" ] || return 1
  (cd -P -- "$candidate" >/dev/null 2>&1 && pwd -P)
}

canonical_regular_file() {
  local candidate=$1
  [ -f "$candidate" ] && [ ! -L "$candidate" ] || return 1
  local parent base real_parent
  parent=$(dirname -- "$candidate")
  base=$(basename -- "$candidate")
  real_parent=$(canonical_directory "$parent") || return 1
  printf '%s/%s\n' "$real_parent" "$base"
}

is_same_or_within() {
  local candidate=$1
  local boundary=$2
  [ "$candidate" = "$boundary" ] || [[ "$candidate" == "$boundary/"* ]]
}

PHASE="private configuration"
CONFIGURATION_REAL=$(canonical_regular_file "$CONFIGURATION_PATH") ||
  die "the private configuration must be a regular file."
if is_same_or_within "$CONFIGURATION_REAL" "$REPOSITORY_ROOT"; then
  die "the private configuration belongs outside the repository checkout."
fi

EXPECTED_BRANCH=""
PRIMARY_DOCUMENT_ROOT_VALUE=""
IFRAME_DOCUMENT_ROOT_VALUE=""
STATE_ROOT_VALUE=""
PRIMARY_FIRST_CUTOVER_ALLOWLIST=""
IFRAME_FIRST_CUTOVER_ALLOWLIST=""
SEEN_EXPECTED_BRANCH=0
SEEN_PRIMARY_DOCUMENT_ROOT=0
SEEN_IFRAME_DOCUMENT_ROOT=0
SEEN_STATE_ROOT=0
SEEN_PRIMARY_ALLOWLIST=0
SEEN_IFRAME_ALLOWLIST=0

while IFS= read -r configuration_line || [ -n "$configuration_line" ]; do
  case "$configuration_line" in
    ""|'#'*) continue ;;
  esac
  case "$configuration_line" in
    *$'\r'*|*$'\t'*) die "the private configuration uses an unsupported control character." ;;
  esac
  if [[ "$configuration_line" != *=* ]]; then
    die "each private configuration entry must use KEY=VALUE."
  fi
  configuration_key=${configuration_line%%=*}
  configuration_value=${configuration_line#*=}
  case "$configuration_key" in
    EXPECTED_BRANCH)
      [ "$SEEN_EXPECTED_BRANCH" -eq 0 ] || die "EXPECTED_BRANCH appears more than once."
      EXPECTED_BRANCH=$configuration_value
      SEEN_EXPECTED_BRANCH=1
      ;;
    PRIMARY_DOCUMENT_ROOT)
      [ "$SEEN_PRIMARY_DOCUMENT_ROOT" -eq 0 ] || die "PRIMARY_DOCUMENT_ROOT appears more than once."
      PRIMARY_DOCUMENT_ROOT_VALUE=$configuration_value
      SEEN_PRIMARY_DOCUMENT_ROOT=1
      ;;
    IFRAME_DOCUMENT_ROOT)
      [ "$SEEN_IFRAME_DOCUMENT_ROOT" -eq 0 ] || die "IFRAME_DOCUMENT_ROOT appears more than once."
      IFRAME_DOCUMENT_ROOT_VALUE=$configuration_value
      SEEN_IFRAME_DOCUMENT_ROOT=1
      ;;
    STATE_ROOT)
      [ "$SEEN_STATE_ROOT" -eq 0 ] || die "STATE_ROOT appears more than once."
      STATE_ROOT_VALUE=$configuration_value
      SEEN_STATE_ROOT=1
      ;;
    PRIMARY_FIRST_CUTOVER_ALLOWLIST)
      [ "$SEEN_PRIMARY_ALLOWLIST" -eq 0 ] || die "PRIMARY_FIRST_CUTOVER_ALLOWLIST appears more than once."
      PRIMARY_FIRST_CUTOVER_ALLOWLIST=$configuration_value
      SEEN_PRIMARY_ALLOWLIST=1
      ;;
    IFRAME_FIRST_CUTOVER_ALLOWLIST)
      [ "$SEEN_IFRAME_ALLOWLIST" -eq 0 ] || die "IFRAME_FIRST_CUTOVER_ALLOWLIST appears more than once."
      IFRAME_FIRST_CUTOVER_ALLOWLIST=$configuration_value
      SEEN_IFRAME_ALLOWLIST=1
      ;;
    *) die "the private configuration contains an unknown key." ;;
  esac
done < "$CONFIGURATION_REAL"

[ "$SEEN_EXPECTED_BRANCH" -eq 1 ] && [ -n "$EXPECTED_BRANCH" ] || die "EXPECTED_BRANCH is required."
[ "$SEEN_PRIMARY_DOCUMENT_ROOT" -eq 1 ] && [ -n "$PRIMARY_DOCUMENT_ROOT_VALUE" ] || die "PRIMARY_DOCUMENT_ROOT is required."
[ "$SEEN_IFRAME_DOCUMENT_ROOT" -eq 1 ] && [ -n "$IFRAME_DOCUMENT_ROOT_VALUE" ] || die "IFRAME_DOCUMENT_ROOT is required."
[ "$SEEN_STATE_ROOT" -eq 1 ] && [ -n "$STATE_ROOT_VALUE" ] || die "STATE_ROOT is required."
[ "$SEEN_PRIMARY_ALLOWLIST" -eq 1 ] || die "PRIMARY_FIRST_CUTOVER_ALLOWLIST is required, even when empty."
[ "$SEEN_IFRAME_ALLOWLIST" -eq 1 ] || die "IFRAME_FIRST_CUTOVER_ALLOWLIST is required, even when empty."
case "$EXPECTED_BRANCH" in
  *[!A-Za-z0-9._/-]*|/*|*/|*..*) die "EXPECTED_BRANCH has an unsupported form." ;;
esac
for configured_path in "$PRIMARY_DOCUMENT_ROOT_VALUE" "$IFRAME_DOCUMENT_ROOT_VALUE" "$STATE_ROOT_VALUE"; do
  case "$configured_path" in
    /*) ;;
    *) die "configured repository-external roots must use absolute paths." ;;
  esac
done

PRIMARY_DOCUMENT_ROOT=$(canonical_directory "$PRIMARY_DOCUMENT_ROOT_VALUE") ||
  die "PRIMARY_DOCUMENT_ROOT must already be a regular directory."
IFRAME_DOCUMENT_ROOT=$(canonical_directory "$IFRAME_DOCUMENT_ROOT_VALUE") ||
  die "IFRAME_DOCUMENT_ROOT must already be a regular directory."
STATE_ROOT=$(canonical_directory "$STATE_ROOT_VALUE") ||
  die "STATE_ROOT must already be a regular directory."

if is_same_or_within "$STATE_ROOT" "$REPOSITORY_ROOT" ||
  is_same_or_within "$REPOSITORY_ROOT" "$STATE_ROOT"; then
  die "the repository and private state root require separate ownership boundaries."
fi

for protected_root in "$PRIMARY_DOCUMENT_ROOT" "$IFRAME_DOCUMENT_ROOT" "$STATE_ROOT"; do
  [ "$protected_root" != "/" ] || die "a configured root resolves to the filesystem root."
done
for public_root in "$PRIMARY_DOCUMENT_ROOT" "$IFRAME_DOCUMENT_ROOT"; do
  if is_same_or_within "$public_root" "$REPOSITORY_ROOT" ||
    is_same_or_within "$REPOSITORY_ROOT" "$public_root" ||
    is_same_or_within "$public_root" "$STATE_ROOT" ||
    is_same_or_within "$STATE_ROOT" "$public_root"; then
    die "repository, state, and public roots must have separate ownership boundaries."
  fi
  if is_same_or_within "$CONFIGURATION_REAL" "$public_root"; then
    die "the private configuration belongs outside both public document roots."
  fi
done

IFRAME_WITHIN_PRIMARY=0
IFRAME_PRIMARY_RELATIVE=""
if [ "$PRIMARY_DOCUMENT_ROOT" = "$IFRAME_DOCUMENT_ROOT" ]; then
  die "the two public surfaces require distinct document roots."
elif is_same_or_within "$PRIMARY_DOCUMENT_ROOT" "$IFRAME_DOCUMENT_ROOT"; then
  die "the primary document root cannot sit inside the iframe document root."
elif is_same_or_within "$IFRAME_DOCUMENT_ROOT" "$PRIMARY_DOCUMENT_ROOT"; then
  IFRAME_WITHIN_PRIMARY=1
  IFRAME_PRIMARY_RELATIVE=${IFRAME_DOCUMENT_ROOT#"$PRIMARY_DOCUMENT_ROOT"/}
fi

[ -w "$STATE_ROOT" ] || die "the private state root must be writable."
[ "$(id -u)" -ne 0 ] || die "deployment runs as the owning cPanel account rather than the system root account."
for owned_root in "$PRIMARY_DOCUMENT_ROOT" "$IFRAME_DOCUMENT_ROOT" "$STATE_ROOT"; do
  [ -O "$owned_root" ] || die "the cPanel account must own every configured receiving root."
done
LOCK_DIRECTORY="$STATE_ROOT/install.lock"
if ! mkdir -- "$LOCK_DIRECTORY" >/dev/null 2>&1; then
  die "another deployment lock is present; confirm the prior process state before removing it manually."
fi
LOCK_HELD=1
SCRATCH_DIRECTORY=$(mktemp -d "$STATE_ROOT/.deployment-scratch.XXXXXX") ||
  die "temporary verification storage is unavailable."

sha256_file() {
  local file=$1
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -- "$file" 2>/dev/null | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -- "$file" 2>/dev/null | awk '{print $1}'
  else
    die "a SHA-256 utility is required."
  fi
}

file_bytes() {
  wc -c < "$1" | tr -d '[:space:]'
}

assert_relative_path() {
  local relative_path=$1
  local label=$2
  local old_ifs component lower base control_free
  case "$relative_path" in
    ""|/*|*//*|*\\*|*$'\r'*|*$'\n'*|*$'\t'*) die "$label has an unsafe relative path." ;;
  esac
  control_free=$(printf '%s' "$relative_path" | tr -d '\001-\037\177')
  [ "$control_free" = "$relative_path" ] || die "$label has an unsafe control character."
  old_ifs=$IFS
  IFS=/
  set -- $relative_path
  IFS=$old_ifs
  for component in "$@"; do
    [ -n "$component" ] && [ "$component" != "." ] && [ "$component" != ".." ] ||
      die "$label has an unsafe path component."
    case "$component" in
      *'<'*|*'>'*|*':'*|*'"'*|*'|'*|*'?'*|*'*'*|*.|*' ')
        die "$label has a non-portable path component."
        ;;
    esac
    lower=$(printf '%s' "$component" | tr '[:upper:]' '[:lower:]')
    base=${lower%%.*}
    case "$base" in
      con|prn|aux|nul|com[1-9]|lpt[1-9]) die "$label has a reserved path component." ;;
    esac
  done
}

validate_allowlist() {
  local value=$1
  local label=$2
  [ -z "$value" ] && return 0
  local old_ifs=$IFS
  local entry normalized
  IFS=,
  set -- $value
  IFS=$old_ifs
  for entry in "$@"; do
    [ -n "$entry" ] || die "$label contains an empty entry."
    normalized=${entry%/}
    assert_relative_path "$normalized" "$label"
  done
}
validate_allowlist "$PRIMARY_FIRST_CUTOVER_ALLOWLIST" "the primary first-cutover allowlist"
validate_allowlist "$IFRAME_FIRST_CUTOVER_ALLOWLIST" "the iframe first-cutover allowlist"
if [ "$IFRAME_WITHIN_PRIMARY" -eq 1 ]; then
  assert_relative_path "$IFRAME_PRIMARY_RELATIVE" "the nested iframe document root"
fi

allowlist_permits() {
  local relative_path=$1
  local value=$2
  [ -n "$value" ] || return 1
  local old_ifs=$IFS
  local entry normalized tree_entry
  IFS=,
  set -- $value
  IFS=$old_ifs
  for entry in "$@"; do
    tree_entry=0
    [[ "$entry" == */ ]] && tree_entry=1
    normalized=${entry%/}
    if [ "$relative_path" = "$normalized" ] ||
      { [ "$tree_entry" -eq 1 ] && [[ "$relative_path" == "$normalized/"* ]]; } ||
      [[ "$normalized" == "$relative_path/"* ]]; then
      return 0
    fi
  done
  return 1
}

PHASE="Git release coordinate"
git -C "$REPOSITORY_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1 ||
  die "the deployment source is not a Git worktree."
CURRENT_BRANCH=$(git -C "$REPOSITORY_ROOT" symbolic-ref --quiet --short HEAD 2>/dev/null) ||
  die "the deployment release must be on an attached branch."
[ "$CURRENT_BRANCH" = "$EXPECTED_BRANCH" ] || die "the attached branch differs from EXPECTED_BRANCH."
[ -z "$(git -C "$REPOSITORY_ROOT" status --porcelain=v1 --untracked-files=all 2>/dev/null)" ] ||
  die "the deployment release worktree must be clean."
PARENT_LINE=$(git -C "$REPOSITORY_ROOT" rev-list --parents -n 1 HEAD 2>/dev/null) ||
  die "the deployment release coordinate is unavailable."
set -- $PARENT_LINE
[ "$#" -ge 2 ] || die "the carrier release must keep its accepted source as first parent."
RELEASE_SHA=$1
SOURCE_SHA=$2
for release_coordinate in "$@"; do
  case "$release_coordinate" in *[!a-f0-9]*|"") die "the release coordinate is malformed." ;; esac
  { [ "${#release_coordinate}" -eq 40 ] || [ "${#release_coordinate}" -eq 64 ]; } ||
    die "the release coordinate is malformed."
done

DIFF_COUNT=0
DIFF_HAS_INDEX=0
DIFF_HAS_MANIFEST=0
git -C "$REPOSITORY_ROOT" diff --name-only --no-renames -z "$SOURCE_SHA" "$RELEASE_SHA" > "$SCRATCH_DIRECTORY/release-diff" 2>/dev/null ||
  die "the source-to-release difference is unavailable."
while IFS= read -r -d '' changed_path; do
  DIFF_COUNT=$((DIFF_COUNT + 1))
  case "$changed_path" in
    deployment/cpanel/carrier/*)
      [ "$changed_path" = "deployment/cpanel/carrier/deployment-files.tsv" ] && DIFF_HAS_INDEX=1
      [ "$changed_path" = "deployment/cpanel/carrier/deployment-manifest.json" ] && DIFF_HAS_MANIFEST=1
      ;;
    *) die "the release commit contains a change outside the carrier root." ;;
  esac
done < "$SCRATCH_DIRECTORY/release-diff"
[ "$DIFF_COUNT" -gt 0 ] || die "the release commit does not contain a carrier change."
[ "$DIFF_HAS_INDEX" -eq 1 ] && [ "$DIFF_HAS_MANIFEST" -eq 1 ] ||
  die "the release commit must refresh both carrier bindings."

PHASE="Git carrier materialization"
STAGED_CARRIER_ROOT="$SCRATCH_DIRECTORY/verified-carrier"
mkdir -- "$STAGED_CARRIER_ROOT" >/dev/null 2>&1 || die "private carrier staging is unavailable."
GIT_CARRIER_TREE="$SCRATCH_DIRECTORY/release-carrier-tree"
git -C "$REPOSITORY_ROOT" ls-tree -r -z "$RELEASE_SHA" -- "$CARRIER_GIT_PREFIX" > "$GIT_CARRIER_TREE" 2>/dev/null ||
  die "the release carrier tree is unavailable."
[ -s "$GIT_CARRIER_TREE" ] || die "the release carrier tree is empty."
GIT_CARRIER_FILES="$SCRATCH_DIRECTORY/git-carrier-files"
: > "$GIT_CARRIER_FILES"
while IFS= read -r -d '' carrier_tree_entry; do
  case "$carrier_tree_entry" in
    *$'\t'*) ;;
    *) die "the release carrier tree has an unsupported entry." ;;
  esac
  carrier_metadata=${carrier_tree_entry%%$'\t'*}
  carrier_git_path=${carrier_tree_entry#*$'\t'}
  set -- $carrier_metadata
  [ "$#" -eq 3 ] || die "the release carrier tree has malformed metadata."
  carrier_mode=$1
  carrier_type=$2
  carrier_object=$3
  [ "$carrier_mode" = "100644" ] && [ "$carrier_type" = "blob" ] ||
    die "each release carrier file must be one regular 100644 Git blob."
  case "$carrier_object" in
    *[!a-f0-9]*|"") die "the release carrier tree has a malformed object identifier." ;;
  esac
  case "$carrier_git_path" in
    "$CARRIER_GIT_PREFIX"/*) carrier_relative=${carrier_git_path#"$CARRIER_GIT_PREFIX"/} ;;
    *) die "the release carrier tree has an out-of-scope path." ;;
  esac
  assert_relative_path "$carrier_relative" "the release carrier"
  staged_file="$STAGED_CARRIER_ROOT/$carrier_relative"
  mkdir -p -- "$(dirname -- "$staged_file")" >/dev/null 2>&1 ||
    die "a private carrier parent could not be staged."
  git -C "$REPOSITORY_ROOT" cat-file blob "$carrier_object" > "$staged_file" 2>/dev/null ||
    die "a release carrier blob could not enter private staging."
  chmod 0600 "$staged_file" >/dev/null 2>&1 || die "a privately staged carrier mode could not be set."
  printf '%s\n' "$carrier_relative" >> "$GIT_CARRIER_FILES"
done < "$GIT_CARRIER_TREE"
sort -o "$GIT_CARRIER_FILES" "$GIT_CARRIER_FILES"

CARRIER_INDEX="$STAGED_CARRIER_ROOT/deployment-files.tsv"
CARRIER_MANIFEST="$STAGED_CARRIER_ROOT/deployment-manifest.json"
[ -f "$CARRIER_INDEX" ] && [ ! -L "$CARRIER_INDEX" ] || die "the release carrier index must be a regular blob."
[ -f "$CARRIER_MANIFEST" ] && [ ! -L "$CARRIER_MANIFEST" ] || die "the release carrier manifest must be a regular blob."

NEXT_MANIFEST_SHA=""
NEXT_SURFACES=()
NEXT_PROJECTED_PATHS=()
NEXT_RELATIVE_PATHS=()
NEXT_BYTES=()
NEXT_HASHES=()
PREVIOUS_MANIFEST_SHA=""
PREVIOUS_SURFACES=()
PREVIOUS_PROJECTED_PATHS=()
PREVIOUS_RELATIVE_PATHS=()
PREVIOUS_BYTES=()
PREVIOUS_HASHES=()

find_index() {
  local collection=$1
  local wanted=$2
  local index
  LOOKUP_INDEX=-1
  if [ "$collection" = "next" ]; then
    for ((index = 0; index < ${#NEXT_PROJECTED_PATHS[@]}; index++)); do
      if [ "${NEXT_PROJECTED_PATHS[$index]}" = "$wanted" ]; then
        LOOKUP_INDEX=$index
        return 0
      fi
    done
  else
    for ((index = 0; index < ${#PREVIOUS_PROJECTED_PATHS[@]}; index++)); do
      if [ "${PREVIOUS_PROJECTED_PATHS[$index]}" = "$wanted" ]; then
        LOOKUP_INDEX=$index
        return 0
      fi
    done
  fi
  return 1
}

parse_index() {
  local collection=$1
  local index_file=$2
  local manifest_file=$3
  local expected_source_sha=$4
  local expected_header=$'deployment_manifest_sha256\tsource_sha\tsurface\tprojected_path\tbytes\tsha256\tmedia_type'
  local header final_byte manifest_sha line_number=1 previous_path=""
  [ -f "$index_file" ] && [ ! -L "$index_file" ] || die "a deployment index must be a regular file."
  [ -f "$manifest_file" ] && [ ! -L "$manifest_file" ] || die "a deployment manifest must be a regular file."
  header=$(head -n 1 -- "$index_file" 2>/dev/null) || die "a deployment index is unreadable."
  [ "$header" = "$expected_header" ] || die "a deployment index has an unsupported header."
  final_byte=$(tail -c 1 -- "$index_file" 2>/dev/null | od -An -t u1 | tr -d '[:space:]')
  [ "$final_byte" = "10" ] || die "a deployment index must end with one LF-delimited row."
  if grep -q $'\r' "$index_file" 2>/dev/null; then
    die "a deployment index must use LF line endings."
  fi
  manifest_sha=$(sha256_file "$manifest_file")
  while IFS=$'\t' read -r row_manifest row_source_sha surface projected_path bytes digest media_type extra; do
    line_number=$((line_number + 1))
    [ -z "${extra:-}" ] || die "a deployment index row has too many fields."
    [ "$row_manifest" = "$manifest_sha" ] || die "a deployment index differs from its manifest digest."
    [ "$row_source_sha" = "$expected_source_sha" ] ||
      die "a deployment index differs from its accepted source coordinate."
    case "$surface:$projected_path" in
      primary:primary-public/*) relative_path=${projected_path#primary-public/} ;;
      iframe:iframe-public/*) relative_path=${projected_path#iframe-public/} ;;
      *) die "a deployment index row has an inconsistent surface path." ;;
    esac
    assert_relative_path "$projected_path" "a deployment index row"
    case "$bytes" in ""|*[!0-9]*) die "a deployment index row has an invalid byte count." ;; esac
    if [ "$bytes" != "0" ] && [[ "$bytes" == 0* ]]; then
      die "a deployment index row has a non-canonical byte count."
    fi
    [ "${#digest}" -eq 64 ] || die "a deployment index row has an invalid SHA-256 digest."
    case "$digest" in *[!a-f0-9]*) die "a deployment index row has an invalid SHA-256 digest." ;; esac
    [ -n "$media_type" ] || die "a deployment index row requires a media type."
    case "$media_type" in *$'\r'*|*$'\n'*|*$'\t'*) die "a deployment index media type is malformed." ;; esac
    if [ -n "$previous_path" ] && [[ "$projected_path" < "$previous_path" || "$projected_path" = "$previous_path" ]]; then
      die "a deployment index must be strictly sorted by projected path."
    fi
    previous_path=$projected_path
    if [ "$collection" = "next" ]; then
      folded_path=$(printf '%s' "$projected_path" | tr '[:upper:]' '[:lower:]')
      for ((case_index = 0; case_index < ${#NEXT_PROJECTED_PATHS[@]}; case_index++)); do
        [ "$(printf '%s' "${NEXT_PROJECTED_PATHS[$case_index]}" | tr '[:upper:]' '[:lower:]')" != "$folded_path" ] ||
          die "a deployment index contains a case-folding path collision."
      done
      NEXT_SURFACES+=("$surface")
      NEXT_PROJECTED_PATHS+=("$projected_path")
      NEXT_RELATIVE_PATHS+=("$relative_path")
      NEXT_BYTES+=("$bytes")
      NEXT_HASHES+=("$digest")
      NEXT_MANIFEST_SHA=$manifest_sha
    else
      folded_path=$(printf '%s' "$projected_path" | tr '[:upper:]' '[:lower:]')
      for ((case_index = 0; case_index < ${#PREVIOUS_PROJECTED_PATHS[@]}; case_index++)); do
        [ "$(printf '%s' "${PREVIOUS_PROJECTED_PATHS[$case_index]}" | tr '[:upper:]' '[:lower:]')" != "$folded_path" ] ||
          die "a prior deployment index contains a case-folding path collision."
      done
      PREVIOUS_SURFACES+=("$surface")
      PREVIOUS_PROJECTED_PATHS+=("$projected_path")
      PREVIOUS_RELATIVE_PATHS+=("$relative_path")
      PREVIOUS_BYTES+=("$bytes")
      PREVIOUS_HASHES+=("$digest")
      PREVIOUS_MANIFEST_SHA=$manifest_sha
    fi
  done < <(tail -n +2 -- "$index_file")
  if [ "$collection" = "next" ]; then
    [ "${#NEXT_PROJECTED_PATHS[@]}" -gt 0 ] || die "the carrier index declares no public files."
  else
    [ "${#PREVIOUS_PROJECTED_PATHS[@]}" -gt 0 ] || die "the prior ownership index declares no public files."
  fi
}

parse_index next "$CARRIER_INDEX" "$CARRIER_MANIFEST" "$SOURCE_SHA"

EXPECTED_CARRIER_FILES="$SCRATCH_DIRECTORY/expected-carrier-files"
: > "$EXPECTED_CARRIER_FILES"
printf '%s\n' "deployment-files.tsv" "deployment-manifest.json" >> "$EXPECTED_CARRIER_FILES"
next_index=0
while [ "$next_index" -lt "${#NEXT_PROJECTED_PATHS[@]}" ]; do
  printf '%s\n' "${NEXT_PROJECTED_PATHS[$next_index]}" >> "$EXPECTED_CARRIER_FILES"
  next_index=$((next_index + 1))
done
sort -o "$EXPECTED_CARRIER_FILES" "$EXPECTED_CARRIER_FILES"

ACTUAL_CARRIER_FILES="$SCRATCH_DIRECTORY/actual-carrier-files"
cp -- "$GIT_CARRIER_FILES" "$ACTUAL_CARRIER_FILES" >/dev/null 2>&1 || die "the release carrier closure is unavailable."
cmp -s "$EXPECTED_CARRIER_FILES" "$ACTUAL_CARRIER_FILES" ||
  die "the release carrier tree differs from its exact index closure."

for ((next_index = 0; next_index < ${#NEXT_PROJECTED_PATHS[@]}; next_index++)); do
  carrier_file="$STAGED_CARRIER_ROOT/${NEXT_PROJECTED_PATHS[$next_index]}"
  [ -f "$carrier_file" ] && [ ! -L "$carrier_file" ] || die "an indexed carrier payload is not a regular file."
  [ "$(file_bytes "$carrier_file")" = "${NEXT_BYTES[$next_index]}" ] || die "an indexed carrier payload has a byte-count mismatch."
  [ "$(sha256_file "$carrier_file")" = "${NEXT_HASHES[$next_index]}" ] || die "an indexed carrier payload has a digest mismatch."
done
[ "$(sha256_file "$STAGED_CARRIER_ROOT/deployment-manifest.json")" = "$NEXT_MANIFEST_SHA" ] || die "the privately staged carrier manifest changed during preflight."
for ((next_index = 0; next_index < ${#NEXT_PROJECTED_PATHS[@]}; next_index++)); do
  staged_file="$STAGED_CARRIER_ROOT/${NEXT_PROJECTED_PATHS[$next_index]}"
  [ "$(file_bytes "$staged_file")" = "${NEXT_BYTES[$next_index]}" ] || die "a privately staged payload has a byte-count mismatch."
  [ "$(sha256_file "$staged_file")" = "${NEXT_HASHES[$next_index]}" ] || die "a privately staged payload has a digest mismatch."
done

CURRENT_RELEASE_FILE="$STATE_ROOT/current-release"
PENDING_RELEASE_FILE="$STATE_ROOT/pending-release"
HAS_PREVIOUS=0
PREVIOUS_RELEASE_SHA=""
printf 'primary\0%s\0iframe\0%s\0' "$PRIMARY_DOCUMENT_ROOT" "$IFRAME_DOCUMENT_ROOT" > "$SCRATCH_DIRECTORY/root-binding"
ROOT_BINDING_SHA=$(sha256_file "$SCRATCH_DIRECTORY/root-binding")
if [ -e "$PENDING_RELEASE_FILE" ] || [ -L "$PENDING_RELEASE_FILE" ]; then
  [ -f "$PENDING_RELEASE_FILE" ] && [ ! -L "$PENDING_RELEASE_FILE" ] ||
    die "the pending-release marker must be a regular file."
  [ "$(wc -l < "$PENDING_RELEASE_FILE" | tr -d '[:space:]')" = "1" ] ||
    die "the pending-release marker must contain one bounded release record."
  pending_line=$(tr -d '\n' < "$PENDING_RELEASE_FILE")
  IFS=$'\t' read -r PENDING_RELEASE_SHA PENDING_ROOT_BINDING pending_extra <<< "$pending_line"
  [ -z "${pending_extra:-}" ] && [ -n "${PENDING_ROOT_BINDING:-}" ] ||
    die "the pending-release marker is malformed."
  case "$PENDING_RELEASE_SHA:$PENDING_ROOT_BINDING" in
    *[!a-f0-9:]*) die "the pending-release marker is malformed." ;;
  esac
  { [ "${#PENDING_RELEASE_SHA}" -eq 40 ] || [ "${#PENDING_RELEASE_SHA}" -eq 64 ]; } ||
    die "the pending-release marker is malformed."
  [ "${#PENDING_ROOT_BINDING}" -eq 64 ] || die "the pending-release marker is malformed."
  [ "$PENDING_RELEASE_SHA" = "$RELEASE_SHA" ] ||
    die "a different release is pending; resume that release before selecting another."
  [ "$PENDING_ROOT_BINDING" = "$ROOT_BINDING_SHA" ] ||
    die "the pending release remains bound to its original document roots."
fi
if [ -e "$CURRENT_RELEASE_FILE" ] || [ -L "$CURRENT_RELEASE_FILE" ]; then
  [ -f "$CURRENT_RELEASE_FILE" ] && [ ! -L "$CURRENT_RELEASE_FILE" ] || die "the successful-release pointer must be a regular file."
  [ "$(wc -l < "$CURRENT_RELEASE_FILE" | tr -d '[:space:]')" = "1" ] || die "the successful-release pointer must contain one release SHA."
  pointer_line=$(tr -d '\n' < "$CURRENT_RELEASE_FILE")
  IFS=$'\t' read -r PREVIOUS_RELEASE_SHA PREVIOUS_SOURCE_SHA PREVIOUS_MANIFEST_BINDING PREVIOUS_ROOT_BINDING pointer_extra <<< "$pointer_line"
  [ -z "${pointer_extra:-}" ] && [ -n "${PREVIOUS_SOURCE_SHA:-}" ] && [ -n "${PREVIOUS_MANIFEST_BINDING:-}" ] && [ -n "${PREVIOUS_ROOT_BINDING:-}" ] ||
    die "the successful-release pointer is malformed."
  case "$PREVIOUS_RELEASE_SHA" in *[!a-f0-9]*|"") die "the successful-release pointer is malformed." ;; esac
  { [ "${#PREVIOUS_RELEASE_SHA}" -eq 40 ] || [ "${#PREVIOUS_RELEASE_SHA}" -eq 64 ]; } || die "the successful-release pointer is malformed."
  case "$PREVIOUS_SOURCE_SHA:$PREVIOUS_MANIFEST_BINDING" in *[!a-f0-9:]*) die "the successful-release pointer is malformed." ;; esac
  { [ "${#PREVIOUS_SOURCE_SHA}" -eq 40 ] || [ "${#PREVIOUS_SOURCE_SHA}" -eq 64 ]; } || die "the successful-release pointer is malformed."
  [ "${#PREVIOUS_MANIFEST_BINDING}" -eq 64 ] || die "the successful-release pointer is malformed."
  [ "$PREVIOUS_ROOT_BINDING" = "$ROOT_BINDING_SHA" ] || die "the document-root binding changed after the prior successful release."
  git -C "$REPOSITORY_ROOT" cat-file -e "$PREVIOUS_RELEASE_SHA^{commit}" 2>/dev/null || die "the successful-release commit is unavailable."
  [ "$(git -C "$REPOSITORY_ROOT" rev-parse "$PREVIOUS_RELEASE_SHA^1" 2>/dev/null)" = "$PREVIOUS_SOURCE_SHA" ] ||
    die "the prior successful source binding differs from Git history."
  git -C "$REPOSITORY_ROOT" merge-base --is-ancestor "$PREVIOUS_RELEASE_SHA" "$RELEASE_SHA" >/dev/null 2>&1 ||
    die "the successful-release pointer is outside the current release history."
  git -C "$REPOSITORY_ROOT" show "$PREVIOUS_RELEASE_SHA:deployment/cpanel/carrier/deployment-files.tsv" > "$SCRATCH_DIRECTORY/previous-files.tsv" 2>/dev/null ||
    die "the prior successful ownership index is unavailable."
  git -C "$REPOSITORY_ROOT" show "$PREVIOUS_RELEASE_SHA:deployment/cpanel/carrier/deployment-manifest.json" > "$SCRATCH_DIRECTORY/previous-manifest.json" 2>/dev/null ||
    die "the prior successful deployment manifest is unavailable."
  parse_index previous "$SCRATCH_DIRECTORY/previous-files.tsv" "$SCRATCH_DIRECTORY/previous-manifest.json" "$PREVIOUS_SOURCE_SHA"
  [ "$PREVIOUS_MANIFEST_SHA" = "$PREVIOUS_MANIFEST_BINDING" ] || die "the prior successful manifest differs from private state."
  for ((previous_index = 0; previous_index < ${#PREVIOUS_PROJECTED_PATHS[@]}; previous_index++)); do
    previous_object="$PREVIOUS_RELEASE_SHA:deployment/cpanel/carrier/${PREVIOUS_PROJECTED_PATHS[$previous_index]}"
    previous_mode=$(git -C "$REPOSITORY_ROOT" ls-tree "$PREVIOUS_RELEASE_SHA" -- "deployment/cpanel/carrier/${PREVIOUS_PROJECTED_PATHS[$previous_index]}" 2>/dev/null | awk 'NR == 1 { print $1 ":" $2 }')
    [ "$previous_mode" = "100644:blob" ] || die "a prior successful payload is not a regular tracked blob."
    git -C "$REPOSITORY_ROOT" cat-file -e "$previous_object" 2>/dev/null || die "a prior successful payload is unavailable."
    git -C "$REPOSITORY_ROOT" show "$previous_object" > "$SCRATCH_DIRECTORY/previous-payload" 2>/dev/null || die "a prior successful payload is unreadable."
    [ "$(file_bytes "$SCRATCH_DIRECTORY/previous-payload")" = "${PREVIOUS_BYTES[$previous_index]}" ] || die "a prior successful payload differs from its ownership index."
    [ "$(sha256_file "$SCRATCH_DIRECTORY/previous-payload")" = "${PREVIOUS_HASHES[$previous_index]}" ] || die "a prior successful payload differs from its ownership digest."
  done
  HAS_PREVIOUS=1
fi

destination_for() {
  local surface=$1
  local relative=$2
  if [ "$surface" = "primary" ]; then
    DESTINATION_ROOT=$PRIMARY_DOCUMENT_ROOT
    DESTINATION_ABSOLUTE="$PRIMARY_DOCUMENT_ROOT/$relative"
  else
    DESTINATION_ROOT=$IFRAME_DOCUMENT_ROOT
    DESTINATION_ABSOLUTE="$IFRAME_DOCUMENT_ROOT/$relative"
  fi
}

PHASE="managed ownership separation"
NEXT_ABSOLUTE_PATHS=()
for ((next_index = 0; next_index < ${#NEXT_PROJECTED_PATHS[@]}; next_index++)); do
  if [ "${NEXT_SURFACES[$next_index]}" = "primary" ] && [ "$IFRAME_WITHIN_PRIMARY" -eq 1 ] &&
    { [ "${NEXT_RELATIVE_PATHS[$next_index]}" = "$IFRAME_PRIMARY_RELATIVE" ] || [[ "${NEXT_RELATIVE_PATHS[$next_index]}" == "$IFRAME_PRIMARY_RELATIVE/"* ]]; }; then
    die "a primary managed path enters the nested iframe document root."
  fi
  destination_for "${NEXT_SURFACES[$next_index]}" "${NEXT_RELATIVE_PATHS[$next_index]}"
  NEXT_ABSOLUTE_PATHS+=("$DESTINATION_ABSOLUTE")
done
for ((left = 0; left < ${#NEXT_ABSOLUTE_PATHS[@]}; left++)); do
  for ((right = left + 1; right < ${#NEXT_ABSOLUTE_PATHS[@]}; right++)); do
    if [ "${NEXT_ABSOLUTE_PATHS[$left]}" = "${NEXT_ABSOLUTE_PATHS[$right]}" ] ||
      [[ "${NEXT_ABSOLUTE_PATHS[$left]}" == "${NEXT_ABSOLUTE_PATHS[$right]}/"* ]] ||
      [[ "${NEXT_ABSOLUTE_PATHS[$right]}" == "${NEXT_ABSOLUTE_PATHS[$left]}/"* ]]; then
      die "the two managed surfaces contain an overlapping destination."
    fi
  done
done

PREVIOUS_ABSOLUTE_PATHS=()
if [ "$HAS_PREVIOUS" -eq 1 ]; then
  for ((previous_index = 0; previous_index < ${#PREVIOUS_PROJECTED_PATHS[@]}; previous_index++)); do
    if [ "${PREVIOUS_SURFACES[$previous_index]}" = "primary" ] && [ "$IFRAME_WITHIN_PRIMARY" -eq 1 ] &&
      { [ "${PREVIOUS_RELATIVE_PATHS[$previous_index]}" = "$IFRAME_PRIMARY_RELATIVE" ] || [[ "${PREVIOUS_RELATIVE_PATHS[$previous_index]}" == "$IFRAME_PRIMARY_RELATIVE/"* ]]; }; then
      die "a prior primary ownership path enters the nested iframe document root."
    fi
    destination_for "${PREVIOUS_SURFACES[$previous_index]}" "${PREVIOUS_RELATIVE_PATHS[$previous_index]}"
    PREVIOUS_ABSOLUTE_PATHS+=("$DESTINATION_ABSOLUTE")
  done
  for ((left = 0; left < ${#PREVIOUS_ABSOLUTE_PATHS[@]}; left++)); do
    for ((right = left + 1; right < ${#PREVIOUS_ABSOLUTE_PATHS[@]}; right++)); do
      if [ "${PREVIOUS_ABSOLUTE_PATHS[$left]}" = "${PREVIOUS_ABSOLUTE_PATHS[$right]}" ] ||
        [[ "${PREVIOUS_ABSOLUTE_PATHS[$left]}" == "${PREVIOUS_ABSOLUTE_PATHS[$right]}/"* ]] ||
        [[ "${PREVIOUS_ABSOLUTE_PATHS[$right]}" == "${PREVIOUS_ABSOLUTE_PATHS[$left]}/"* ]]; then
        die "the prior managed surfaces contain an overlapping destination."
      fi
    done
    for ((right = 0; right < ${#NEXT_ABSOLUTE_PATHS[@]}; right++)); do
      if [ "${PREVIOUS_ABSOLUTE_PATHS[$left]}" = "${NEXT_ABSOLUTE_PATHS[$right]}" ]; then
        [ "${PREVIOUS_PROJECTED_PATHS[$left]}" = "${NEXT_PROJECTED_PATHS[$right]}" ] ||
          die "prior and requested ownership collide across surfaces."
      elif [[ "${PREVIOUS_ABSOLUTE_PATHS[$left]}" == "${NEXT_ABSOLUTE_PATHS[$right]}/"* ]] ||
        [[ "${NEXT_ABSOLUTE_PATHS[$right]}" == "${PREVIOUS_ABSOLUTE_PATHS[$left]}/"* ]]; then
        die "prior and requested ownership contain a file-directory collision."
      fi
    done
  done
fi

is_managed_directory_prefix() {
  local surface=$1
  local relative=$2
  local index
  for ((index = 0; index < ${#NEXT_PROJECTED_PATHS[@]}; index++)); do
    if [ "${NEXT_SURFACES[$index]}" = "$surface" ] && [[ "${NEXT_RELATIVE_PATHS[$index]}" == "$relative/"* ]]; then
      return 0
    fi
  done
  return 1
}

verify_existing_managed_file() {
  local surface=$1
  local relative=$2
  local existing=$3
  local projected="$surface-public/$relative"
  local actual_bytes actual_hash next_match=-1 previous_match=-1
  find_index next "$projected" && next_match=$LOOKUP_INDEX || true
  if [ "$HAS_PREVIOUS" -eq 1 ]; then
    find_index previous "$projected" && previous_match=$LOOKUP_INDEX || true
  fi
  [ "$next_match" -ge 0 ] || [ "$previous_match" -ge 0 ] || return 0
  actual_bytes=$(file_bytes "$existing")
  actual_hash=$(sha256_file "$existing")
  if [ "$next_match" -ge 0 ] && [ "$actual_bytes" = "${NEXT_BYTES[$next_match]}" ] && [ "$actual_hash" = "${NEXT_HASHES[$next_match]}" ]; then
    return 0
  fi
  if [ "$previous_match" -ge 0 ] && [ "$actual_bytes" = "${PREVIOUS_BYTES[$previous_match]}" ] && [ "$actual_hash" = "${PREVIOUS_HASHES[$previous_match]}" ]; then
    return 0
  fi
  die "an owned or requested public file contains unrecognized bytes."
}

scan_public_root() {
  local surface=$1
  local root=$2
  local allowlist=$3
  local exclude_relative=$4
  local entry relative
  while IFS= read -r -d '' entry; do
    relative=${entry#"$root"/}
    if [ -n "$exclude_relative" ] && { [ "$relative" = "$exclude_relative" ] || [[ "$relative" == "$exclude_relative/"* ]]; }; then
      continue
    fi
    assert_relative_path "$relative" "an existing public entry"
    case "${relative##*/}" in
      .cpanel-deploy.*) die "a stale installer transaction file requires host review." ;;
    esac
    if [ -L "$entry" ]; then
      die "a public document root contains a symbolic link."
    elif [ -f "$entry" ]; then
      verify_existing_managed_file "$surface" "$relative" "$entry"
      if [ "$HAS_PREVIOUS" -eq 0 ]; then
        find_index next "$surface-public/$relative" && first_next=$LOOKUP_INDEX || first_next=-1
        if [ "$first_next" -lt 0 ] && ! allowlist_permits "$relative" "$allowlist"; then
          die "a first-cutover document root contains a non-allowlisted file."
        fi
      fi
    elif [ -d "$entry" ]; then
      if [ "$HAS_PREVIOUS" -eq 0 ] && ! is_managed_directory_prefix "$surface" "$relative" && ! allowlist_permits "$relative" "$allowlist"; then
        die "a first-cutover document root contains a non-allowlisted directory."
      fi
    else
      die "a public document root contains a special filesystem entry."
    fi
  done < <(find -P "$root" -mindepth 1 -print0)
}

assert_destination_shape() {
  local root=$1
  local relative=$2
  local old_ifs=$IFS
  local component current=$root
  IFS=/
  set -- $relative
  IFS=$old_ifs
  local total=$# position=0 nearest=$root
  for component in "$@"; do
    position=$((position + 1))
    current="$current/$component"
    if [ -L "$current" ]; then
      die "a requested destination crosses a symbolic link."
    elif [ -e "$current" ]; then
      if [ "$position" -lt "$total" ]; then
        [ -d "$current" ] || die "a requested destination crosses a non-directory entry."
        nearest=$current
      else
        [ -f "$current" ] || die "a requested destination collides with a non-file entry."
      fi
    fi
  done
  [ -w "$nearest" ] || die "a requested destination parent is not writable."
}

PHASE="two-root preflight"
scan_public_root primary "$PRIMARY_DOCUMENT_ROOT" "$PRIMARY_FIRST_CUTOVER_ALLOWLIST" "$IFRAME_PRIMARY_RELATIVE"
scan_public_root iframe "$IFRAME_DOCUMENT_ROOT" "$IFRAME_FIRST_CUTOVER_ALLOWLIST" ""
for ((next_index = 0; next_index < ${#NEXT_PROJECTED_PATHS[@]}; next_index++)); do
  destination_for "${NEXT_SURFACES[$next_index]}" "${NEXT_RELATIVE_PATHS[$next_index]}"
  assert_destination_shape "$DESTINATION_ROOT" "${NEXT_RELATIVE_PATHS[$next_index]}"
done

PHASE="pending release binding"
if [ ! -e "$PENDING_RELEASE_FILE" ] && [ ! -L "$PENDING_RELEASE_FILE" ]; then
  PENDING_RELEASE_TEMP=$(mktemp "$STATE_ROOT/.pending-release.XXXXXX") ||
    die "the pending-release transaction could not be created."
  printf '%s\t%s\n' "$RELEASE_SHA" "$ROOT_BINDING_SHA" > "$PENDING_RELEASE_TEMP" ||
    die "the pending-release marker could not be staged."
  chmod 0600 "$PENDING_RELEASE_TEMP" >/dev/null 2>&1 ||
    die "the pending-release mode could not be set."
  mv -f -- "$PENDING_RELEASE_TEMP" "$PENDING_RELEASE_FILE" >/dev/null 2>&1 ||
    die "the pending-release marker could not enter private state."
  PENDING_RELEASE_TEMP=""
fi
[ -f "$PENDING_RELEASE_FILE" ] && [ ! -L "$PENDING_RELEASE_FILE" ] ||
  die "the pending-release marker changed before public activation."
[ "$(tr -d '\n' < "$PENDING_RELEASE_FILE")" = "$RELEASE_SHA"$'\t'"$ROOT_BINDING_SHA" ] ||
  die "the pending-release marker changed before public activation."

ensure_parent_directory() {
  local root=$1
  local relative=$2
  local live_root
  live_root=$(canonical_directory "$root") || die "a document root changed after preflight."
  [ "$live_root" = "$root" ] || die "a document root changed after preflight."
  local parent_relative=${relative%/*}
  [ "$parent_relative" != "$relative" ] || { ENSURED_PARENT=$root; return 0; }
  local old_ifs=$IFS
  local component current=$root canonical
  IFS=/
  set -- $parent_relative
  IFS=$old_ifs
  for component in "$@"; do
    current="$current/$component"
    if [ ! -e "$current" ]; then
      mkdir -- "$current" >/dev/null 2>&1 || die "a managed parent directory could not be created."
    fi
    [ -d "$current" ] && [ ! -L "$current" ] || die "a managed parent path changed after preflight."
  done
  canonical=$(canonical_directory "$current") || die "a managed parent directory could not be verified."
  [ "$canonical" = "$current" ] || die "a managed parent directory changed after preflight."
  ENSURED_PARENT=$current
}

install_next_file() {
  local index=$1
  local projected=${NEXT_PROJECTED_PATHS[$index]}
  local relative=${NEXT_RELATIVE_PATHS[$index]}
  local source="$STAGED_CARRIER_ROOT/$projected"
  ACTIVE_PATH=$projected
  destination_for "${NEXT_SURFACES[$index]}" "$relative"
  ensure_parent_directory "$DESTINATION_ROOT" "$relative"
  if [ -e "$DESTINATION_ABSOLUTE" ] || [ -L "$DESTINATION_ABSOLUTE" ]; then
    [ -f "$DESTINATION_ABSOLUTE" ] && [ ! -L "$DESTINATION_ABSOLUTE" ] || die "a requested destination changed after preflight."
    verify_existing_managed_file "${NEXT_SURFACES[$index]}" "$relative" "$DESTINATION_ABSOLUTE"
  fi
  ACTIVE_TEMP=$(mktemp "$ENSURED_PARENT/.cpanel-deploy.XXXXXX") || die "a destination transaction file could not be created."
  cp -- "$source" "$ACTIVE_TEMP" >/dev/null 2>&1 || die "a carrier payload could not be staged."
  chmod 0644 "$ACTIVE_TEMP" >/dev/null 2>&1 || die "a staged payload mode could not be set."
  [ "$(file_bytes "$ACTIVE_TEMP")" = "${NEXT_BYTES[$index]}" ] || die "a staged payload has a byte-count mismatch."
  [ "$(sha256_file "$ACTIVE_TEMP")" = "${NEXT_HASHES[$index]}" ] || die "a staged payload has a digest mismatch."
  MUTATION_STARTED=1
  mv -f -- "$ACTIVE_TEMP" "$DESTINATION_ABSOLUTE" >/dev/null 2>&1 || die "a staged payload could not enter its document root."
  ACTIVE_TEMP=""
}

is_terminal_primary_path() {
  case "$1" in
    index.html|sitemap.xml|404.html|.htaccess) return 0 ;;
    *) return 1 ;;
  esac
}

remove_previous_file() {
  local index=$1
  local projected=${PREVIOUS_PROJECTED_PATHS[$index]}
  local relative=${PREVIOUS_RELATIVE_PATHS[$index]}
  find_index next "$projected" && return 0 || true
  ACTIVE_PATH=$projected
  destination_for "${PREVIOUS_SURFACES[$index]}" "$relative"
  live_root=$(canonical_directory "$DESTINATION_ROOT") || die "a document root changed after preflight."
  [ "$live_root" = "$DESTINATION_ROOT" ] || die "a document root changed after preflight."
  [ ! -e "$DESTINATION_ABSOLUTE" ] && [ ! -L "$DESTINATION_ABSOLUTE" ] && return 0
  [ -f "$DESTINATION_ABSOLUTE" ] && [ ! -L "$DESTINATION_ABSOLUTE" ] || die "a stale owned path is no longer a regular file."
  [ "$(file_bytes "$DESTINATION_ABSOLUTE")" = "${PREVIOUS_BYTES[$index]}" ] || die "a stale owned file changed after preflight."
  [ "$(sha256_file "$DESTINATION_ABSOLUTE")" = "${PREVIOUS_HASHES[$index]}" ] || die "a stale owned file changed after preflight."
  MUTATION_STARTED=1
  rm -f -- "$DESTINATION_ABSOLUTE" >/dev/null 2>&1 || die "a stale owned file could not be removed."
}

PHASE="iframe surface"
for ((next_index = 0; next_index < ${#NEXT_PROJECTED_PATHS[@]}; next_index++)); do
  [ "${NEXT_SURFACES[$next_index]}" = "iframe" ] && install_next_file "$next_index"
done
if [ "$HAS_PREVIOUS" -eq 1 ]; then
  for ((previous_index = 0; previous_index < ${#PREVIOUS_PROJECTED_PATHS[@]}; previous_index++)); do
    [ "${PREVIOUS_SURFACES[$previous_index]}" = "iframe" ] && remove_previous_file "$previous_index"
  done
fi

PHASE="primary assets"
for ((next_index = 0; next_index < ${#NEXT_PROJECTED_PATHS[@]}; next_index++)); do
  if [ "${NEXT_SURFACES[$next_index]}" = "primary" ] &&
    [[ "${NEXT_RELATIVE_PATHS[$next_index]}" != *.html ]] &&
    ! is_terminal_primary_path "${NEXT_RELATIVE_PATHS[$next_index]}"; then
    install_next_file "$next_index"
  fi
done

PHASE="primary HTML"
for ((next_index = 0; next_index < ${#NEXT_PROJECTED_PATHS[@]}; next_index++)); do
  if [ "${NEXT_SURFACES[$next_index]}" = "primary" ] &&
    [[ "${NEXT_RELATIVE_PATHS[$next_index]}" == *.html ]] &&
    ! is_terminal_primary_path "${NEXT_RELATIVE_PATHS[$next_index]}"; then
    install_next_file "$next_index"
  fi
done

PHASE="primary stale ownership"
if [ "$HAS_PREVIOUS" -eq 1 ]; then
  for ((previous_index = 0; previous_index < ${#PREVIOUS_PROJECTED_PATHS[@]}; previous_index++)); do
    if [ "${PREVIOUS_SURFACES[$previous_index]}" = "primary" ] && ! is_terminal_primary_path "${PREVIOUS_RELATIVE_PATHS[$previous_index]}"; then
      remove_previous_file "$previous_index"
    fi
  done
  for ((previous_index = 0; previous_index < ${#PREVIOUS_PROJECTED_PATHS[@]}; previous_index++)); do
    if [ "${PREVIOUS_SURFACES[$previous_index]}" = "primary" ] && is_terminal_primary_path "${PREVIOUS_RELATIVE_PATHS[$previous_index]}"; then
      remove_previous_file "$previous_index"
    fi
  done
fi

PHASE="primary root entries"
for terminal_name in 404.html .htaccess sitemap.xml index.html; do
  for ((next_index = 0; next_index < ${#NEXT_PROJECTED_PATHS[@]}; next_index++)); do
    if [ "${NEXT_SURFACES[$next_index]}" = "primary" ] && [ "${NEXT_RELATIVE_PATHS[$next_index]}" = "$terminal_name" ]; then
      install_next_file "$next_index"
    fi
  done
done

PHASE="post-install verification"
ACTIVE_PATH="none"
for ((next_index = 0; next_index < ${#NEXT_PROJECTED_PATHS[@]}; next_index++)); do
  ACTIVE_PATH=${NEXT_PROJECTED_PATHS[$next_index]}
  destination_for "${NEXT_SURFACES[$next_index]}" "${NEXT_RELATIVE_PATHS[$next_index]}"
  [ -f "$DESTINATION_ABSOLUTE" ] && [ ! -L "$DESTINATION_ABSOLUTE" ] || die "a requested public file is absent after installation."
  [ "$(file_bytes "$DESTINATION_ABSOLUTE")" = "${NEXT_BYTES[$next_index]}" ] || die "a requested public file has an unexpected byte count after installation."
  [ "$(sha256_file "$DESTINATION_ABSOLUTE")" = "${NEXT_HASHES[$next_index]}" ] || die "a requested public file has an unexpected digest after installation."
done
if [ "$HAS_PREVIOUS" -eq 1 ]; then
  for ((previous_index = 0; previous_index < ${#PREVIOUS_PROJECTED_PATHS[@]}; previous_index++)); do
    if ! find_index next "${PREVIOUS_PROJECTED_PATHS[$previous_index]}"; then
      destination_for "${PREVIOUS_SURFACES[$previous_index]}" "${PREVIOUS_RELATIVE_PATHS[$previous_index]}"
      [ ! -e "$DESTINATION_ABSOLUTE" ] && [ ! -L "$DESTINATION_ABSOLUTE" ] || die "a stale owned file remains after installation."
    fi
  done
fi
PUBLIC_VERIFIED=1

PHASE="successful-state update"
ACTIVE_PATH="none"
STATE_RELEASE_TEMP=$(mktemp "$STATE_ROOT/.current-release.XXXXXX") || die "the release-pointer transaction could not be created."
printf '%s\t%s\t%s\t%s\n' "$RELEASE_SHA" "$SOURCE_SHA" "$NEXT_MANIFEST_SHA" "$ROOT_BINDING_SHA" > "$STATE_RELEASE_TEMP" || die "the release pointer could not be staged."
chmod 0600 "$STATE_RELEASE_TEMP" >/dev/null 2>&1 || die "the private state mode could not be set."
mv -f -- "$STATE_RELEASE_TEMP" "$CURRENT_RELEASE_FILE" >/dev/null 2>&1 || die "the successful-release pointer could not enter private state."
STATE_RELEASE_TEMP=""
[ -f "$PENDING_RELEASE_FILE" ] && [ ! -L "$PENDING_RELEASE_FILE" ] ||
  die "the pending-release marker changed before completion."
[ "$(tr -d '\n' < "$PENDING_RELEASE_FILE")" = "$RELEASE_SHA"$'\t'"$ROOT_BINDING_SHA" ] ||
  die "the pending-release marker changed before completion."
rm -f -- "$PENDING_RELEASE_FILE" >/dev/null 2>&1 || die "the completed pending-release marker could not be removed."

PHASE="complete"
ACTIVE_PATH="none"
short_release=${RELEASE_SHA:0:12}
say "cPanel deployment complete."
say "Release: $short_release."
say "Public files verified: ${#NEXT_PROJECTED_PATHS[@]}."
say "Successful ownership state: updated."
