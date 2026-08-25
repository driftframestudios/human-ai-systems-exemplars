#!/usr/bin/env python3
"""Produce aggregate-safe evidence for a public-possible repository boundary."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from typing import Any, Iterable


CATEGORY_GUIDANCE = {
    "gated_workspace_coordinate": (
        "Choose an accepted public receiver, a stable source key, or a complete "
        "local explanation for this reference."
    ),
    "workstation_coordinate": (
        "Choose a repository-local path, a stable source key, or a complete local "
        "explanation for this reference."
    ),
    "external_github_coordinate": (
        "Choose an accepted public receiver, add its reviewed repository identity "
        "to policy, or use a stable source key."
    ),
}

NOTION_WEB_PATTERN = re.compile(
    r"(?i)(?:https?://)?(?:www\.)?(?:notion\.(?:so|site)|app\.notion\.com)/"
    r"[^\s<>()\[\]{}\"']+"
)
NOTION_SCHEME_PATTERN = re.compile(
    re.escape("notion" + "://") + r"[^\s<>()\[\]{}\"']+", re.IGNORECASE
)
LOCAL_SCHEME_PATTERN = re.compile(
    r"(?i)(?:"
    + re.escape("file" + "://")
    + r"|"
    + re.escape("vscode" + "://file")
    + r")[^\s<>()\[\]{}\"']+"
)
LOCAL_PATH_PATTERN = re.compile(
    r"(?<![:A-Za-z0-9])(?:"
    + "/"
    + "Users"
    + r"/[^\s<>()\[\]{}\"']+|"
    + "/"
    + "home"
    + r"/[^\s<>()\[\]{}\"']+|"
    + "/"
    + "private"
    + r"/(?:tmp|var)/[^\s<>()\[\]{}\"']+|"
    + r"[A-Za-z]:\\"
    + "Users"
    + r"\\[^\s<>()\[\]{}\"']+"
    + r")"
)
GITHUB_REPOSITORY_PATTERNS = (
    re.compile(
        r"(?i)(?:https?://(?:www\.)?github\.com/|git@github\.com:|"
        r"ssh://git@github\.com/|git://github\.com/)"
        r"(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+)"
    ),
    re.compile(
        r"(?i)https?://api\.github\.com/repos/"
        r"(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+)"
    ),
    re.compile(
        r"(?i)https?://raw\.githubusercontent\.com/"
        r"(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+)"
    ),
)
REPOSITORY_SLUG_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read tracked text and write aggregate public-boundary evidence."
    )
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument(
        "--policy",
        type=Path,
        default=Path(".github/public-boundary/policy.json"),
    )
    parser.add_argument("--receipt", type=Path)
    parser.add_argument("--summary", type=Path)
    parser.add_argument(
        "--details",
        action="store_true",
        help="Show repository-local path, line, and category while working locally.",
    )
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args(argv)


def load_policy(root: Path, policy_path: Path) -> dict[str, Any]:
    resolved = policy_path if policy_path.is_absolute() else root / policy_path
    with resolved.open(encoding="utf-8") as handle:
        policy = json.load(handle)

    required = {
        "contract",
        "repository",
        "repository_posture",
        "standing",
        "evidence_window",
        "max_text_file_bytes",
        "accepted_external_github_receivers",
    }
    if set(policy) != required:
        raise ValueError("policy fields differ from the v1 contract")
    if policy["contract"] != "public-boundary-intake/v1":
        raise ValueError("policy contract is outside the supported version")
    if policy["repository_posture"] != "public-possible":
        raise ValueError("repository posture is outside the supported receiver")
    if policy["standing"] not in {"advisory", "enforcing"}:
        raise ValueError("standing must be advisory or enforcing")
    if not isinstance(policy["repository"], str) or not REPOSITORY_SLUG_PATTERN.fullmatch(
        policy["repository"]
    ):
        raise ValueError("repository must use owner/name form")
    if not isinstance(policy["max_text_file_bytes"], int) or not (
        1024 <= policy["max_text_file_bytes"] <= 10_000_000
    ):
        raise ValueError("max_text_file_bytes is outside the supported range")
    receivers = policy["accepted_external_github_receivers"]
    if not isinstance(receivers, list) or any(
        not isinstance(item, str) or not REPOSITORY_SLUG_PATTERN.fullmatch(item)
        for item in receivers
    ):
        raise ValueError("accepted receivers must use owner/name form")

    evidence_window = policy["evidence_window"]
    window_fields = {
        "starts_on",
        "ends_on",
        "successor_minutes",
        "shared_profile_minutes",
    }
    if not isinstance(evidence_window, dict) or set(evidence_window) != window_fields:
        raise ValueError("evidence window fields differ from the v1 contract")
    if any(
        not isinstance(evidence_window[field], str)
        for field in ("starts_on", "ends_on")
    ):
        raise ValueError("evidence window dates must use ISO date strings")
    starts_on = dt.date.fromisoformat(evidence_window["starts_on"])
    ends_on = dt.date.fromisoformat(evidence_window["ends_on"])
    if ends_on < starts_on:
        raise ValueError("evidence window ends before it starts")
    if any(
        not isinstance(evidence_window[field], int) or evidence_window[field] <= 0
        for field in ("successor_minutes", "shared_profile_minutes")
    ):
        raise ValueError("evidence window minutes must be positive integers")
    if evidence_window["successor_minutes"] > evidence_window["shared_profile_minutes"]:
        raise ValueError("successor minutes exceed the shared profile envelope")
    return policy


def git_output(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(root), *args],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return result.stdout.strip()


def tracked_paths(root: Path) -> list[Path]:
    result = subprocess.run(
        ["git", "-C", str(root), "ls-files", "-z"],
        check=True,
        capture_output=True,
    )
    return [Path(raw.decode("utf-8")) for raw in result.stdout.split(b"\0") if raw]


def normalized_slug(owner: str, repository: str) -> str:
    name = repository[:-4] if repository.lower().endswith(".git") else repository
    return f"{owner}/{name}".lower()


def line_categories(
    line: str,
    repository: str,
    accepted_receivers: set[str],
) -> set[str]:
    categories: set[str] = set()
    if NOTION_WEB_PATTERN.search(line) or NOTION_SCHEME_PATTERN.search(line):
        categories.add("gated_workspace_coordinate")
    if LOCAL_SCHEME_PATTERN.search(line) or LOCAL_PATH_PATTERN.search(line):
        categories.add("workstation_coordinate")

    current = repository.lower()
    for pattern in GITHUB_REPOSITORY_PATTERNS:
        for match in pattern.finditer(line):
            candidate = normalized_slug(match.group("owner"), match.group("repo"))
            if candidate != current and candidate not in accepted_receivers:
                categories.add("external_github_coordinate")
    return categories


def scan_repository(
    root: Path,
    policy: dict[str, Any],
) -> tuple[dict[str, Any], list[tuple[str, int, str]]]:
    paths = tracked_paths(root)
    current_repository = policy["repository"].lower()
    accepted = {
        receiver.lower()
        for receiver in policy["accepted_external_github_receivers"]
    }
    max_bytes = policy["max_text_file_bytes"]

    scanned_files = 0
    scanned_bytes = 0
    binary_files = 0
    large_files = 0
    symlink_files = 0
    category_counts = {category: 0 for category in CATEGORY_GUIDANCE}
    affected_files: set[str] = set()
    details: list[tuple[str, int, str]] = []

    for relative in paths:
        candidate = root / relative
        if candidate.is_symlink():
            symlink_files += 1
            continue
        data = candidate.read_bytes()
        if len(data) > max_bytes:
            large_files += 1
            continue
        if b"\0" in data:
            binary_files += 1
            continue
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            binary_files += 1
            continue

        scanned_files += 1
        scanned_bytes += len(data)
        for line_number, line in enumerate(text.splitlines(), start=1):
            for category in sorted(line_categories(line, current_repository, accepted)):
                category_counts[category] += 1
                affected_files.add(relative.as_posix())
                details.append((relative.as_posix(), line_number, category))

    finding_count = sum(category_counts.values())
    receipt = {
        "contract": policy["contract"],
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "repository": policy["repository"],
        "repository_posture": policy["repository_posture"],
        "standing": policy["standing"],
        "evidence_window": policy["evidence_window"],
        "revision": os.environ.get("GITHUB_SHA") or git_output(root, "rev-parse", "HEAD"),
        "event": os.environ.get("GITHUB_EVENT_NAME", "local"),
        "scope": {
            "tracked_files": len(paths),
            "scanned_text_files": scanned_files,
            "scanned_text_bytes": scanned_bytes,
            "binary_files_resting_local": binary_files,
            "large_files_resting_local": large_files,
            "symlink_files_resting_local": symlink_files,
        },
        "evidence": {
            "result": "clear" if finding_count == 0 else "attention",
            "finding_count": finding_count,
            "affected_file_count": len(affected_files),
            "category_counts": category_counts,
        },
    }
    return receipt, details


def receipt_markdown(receipt: dict[str, Any]) -> str:
    evidence = receipt["evidence"]
    scope = receipt["scope"]
    if evidence["result"] == "clear":
        posture = "Current tracked text has fitting receiving routes for this bounded check."
    else:
        posture = (
            "Some references are ready for receiving-route review. Findings carry "
            "advisory standing in this evidence window."
        )
    rows = [
        "## Public-boundary intake",
        "",
        posture,
        "",
        "| Evidence | Count |",
        "| --- | ---: |",
        f"| Tracked files | {scope['tracked_files']} |",
        f"| Scanned text files | {scope['scanned_text_files']} |",
        f"| Files resting with local binary review | {scope['binary_files_resting_local']} |",
        f"| Files resting with local size review | {scope['large_files_resting_local']} |",
        f"| References ready for receiving review | {evidence['finding_count']} |",
        f"| Affected files | {evidence['affected_file_count']} |",
        "",
        "| Receiving category | Count |",
        "| --- | ---: |",
    ]
    rows.extend(
        f"| `{category}` | {count} |"
        for category, count in evidence["category_counts"].items()
    )
    rows.extend(
        [
            "",
            "Choose an accepted public receiver, stable source key, complete local "
            "explanation, or repository-local source for each reference ready for review.",
            "",
        ]
    )
    return "\n".join(rows)


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def append_summary(path: Path, receipt: dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as handle:
        handle.write(receipt_markdown(receipt))


def print_aggregate(receipt: dict[str, Any]) -> None:
    evidence = receipt["evidence"]
    scope = receipt["scope"]
    print(
        "Public-boundary intake: "
        f"{evidence['result']}; {scope['scanned_text_files']} text files; "
        f"{evidence['finding_count']} references ready for receiving review."
    )
    for category, count in evidence["category_counts"].items():
        print(f"  {category}: {count}")


def print_details(details: Iterable[tuple[str, int, str]]) -> None:
    for path, line, category in details:
        print(f"{path}:{line} {category} — {CATEGORY_GUIDANCE[category]}")


def self_test() -> None:
    repository = "driftframestudios/human-ai-systems-exemplars"
    gated = "https" + "://" + "app." + "notion" + ".com/page-coordinate"
    workstation = "file" + ":///" + "Users" + "/operator/source.md"
    external = "https" + "://github.com/example/receiver/issues/4"
    same_repository = "https" + "://github.com/" + repository + "/issues/1"
    cases = (
        (gated, {"gated_workspace_coordinate"}),
        (workstation, {"workstation_coordinate"}),
        (external, {"external_github_coordinate"}),
        (same_repository, set()),
        ("A complete repository-local explanation.", set()),
    )
    for text, expected in cases:
        observed = line_categories(text, repository, set())
        if observed != expected:
            raise AssertionError(f"self-test category mismatch: {observed} != {expected}")
    accepted = line_categories(external, repository, {"example/receiver"})
    if accepted:
        raise AssertionError("accepted receiver remained in the attention set")
    print("Public-boundary checker self-test: ready.")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if args.self_test:
        self_test()
        return 0
    if args.receipt is None:
        print("Choose --receipt so the bounded evidence has an explicit receiver.", file=sys.stderr)
        return 2

    root = args.root.resolve()
    try:
        policy = load_policy(root, args.policy)
        receipt, details = scan_repository(root, policy)
        write_json(args.receipt, receipt)
        if args.summary:
            append_summary(args.summary, receipt)
    except (OSError, ValueError, subprocess.SubprocessError, json.JSONDecodeError):
        print(
            "The public-boundary intake is ready for local configuration review.",
            file=sys.stderr,
        )
        return 2

    print_aggregate(receipt)
    if args.details:
        print_details(details)
    if receipt["evidence"]["finding_count"] and policy["standing"] == "enforcing":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
