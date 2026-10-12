#!/usr/bin/env python3
"""Build the visitor-controlled About visual sequence and still poster.

The sequence alternates repository-rendered problem-shaping artifacts with
working system views. An original assembly-relay transition uses a restrained
pixel grid and directional slice boundary inspired by Codrops studies, while
keeping every source still undistorted and available for a full hold.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import tempfile
from pathlib import Path
from typing import Any

from PIL import Image, ImageColor, ImageOps


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
FRAME_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def require_integer(
    value: Any,
    *,
    field: str,
    minimum: int,
    maximum: int | None = None,
) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{field} must be an integer.")
    if value < minimum or (maximum is not None and value > maximum):
        range_description = (
            f"between {minimum} and {maximum}"
            if maximum is not None
            else f"at least {minimum}"
        )
        raise ValueError(f"{field} must be {range_description}; received {value}.")
    return value


def require_finite_number(value: Any, *, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a finite number.")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"{field} must be a finite number.")
    return number


def resolve_repository_source(repository_root: Path, source_path: str) -> Path:
    if not isinstance(source_path, str) or not source_path.strip():
        raise ValueError("Each frame requires a non-empty source_path.")
    if "\\" in source_path or Path(source_path).as_posix() != source_path:
        raise ValueError(
            f"Frame source_path must use normalized POSIX separators: {source_path!r}."
        )
    relative_source = Path(source_path)
    if (
        relative_source == Path(".")
        or relative_source.is_absolute()
        or ".." in relative_source.parts
    ):
        raise ValueError(
            f"Frame source_path must stay within the repository: {source_path!r}."
        )
    resolved_root = repository_root.resolve()
    resolved_source = (resolved_root / relative_source).resolve()
    if not resolved_source.is_relative_to(resolved_root):
        raise ValueError(
            f"Frame source_path resolves outside the repository: {source_path!r}."
        )
    return resolved_source


def validate_manifest(
    manifest: Any,
    *,
    repository_root: Path,
) -> dict[str, Any]:
    if not isinstance(manifest, dict):
        raise ValueError("The About visual-sequence manifest must be a JSON object.")
    if manifest.get("version") != "0.2.0":
        raise ValueError("Expected About visual-sequence manifest version 0.2.0.")

    output = manifest.get("output")
    if not isinstance(output, dict):
        raise ValueError("The manifest requires an output object.")
    width = require_integer(output.get("width"), field="output.width", minimum=1)
    height = require_integer(output.get("height"), field="output.height", minimum=1)
    hold_ms = require_integer(
        output.get("hold_ms"), field="output.hold_ms", minimum=1
    )
    transition_frame_ms = require_integer(
        output.get("transition_frame_ms"),
        field="output.transition_frame_ms",
        minimum=1,
    )
    if hold_ms % 10 or transition_frame_ms % 10:
        raise ValueError(
            "GIF hold and transition timings must use whole 10 ms centiseconds."
        )
    require_integer(
        output.get("palette_colors"),
        field="output.palette_colors",
        minimum=2,
        maximum=256,
    )

    transition = manifest.get("transition")
    if not isinstance(transition, dict):
        raise ValueError("The manifest requires a transition object.")
    if transition.get("id") != "assembly_relay":
        raise ValueError("transition.id must select the supported assembly_relay.")
    columns = require_integer(
        transition.get("grid_columns"),
        field="transition.grid_columns",
        minimum=1,
        maximum=width,
    )
    rows = require_integer(
        transition.get("grid_rows"),
        field="transition.grid_rows",
        minimum=1,
        maximum=height,
    )
    if columns * rows < 2:
        raise ValueError("The transition grid requires at least two cells.")

    progress = transition.get("progress")
    if not isinstance(progress, list) or not progress:
        raise ValueError("transition.progress must contain at least one boundary value.")
    progress_values = [
        require_finite_number(value, field=f"transition.progress[{index}]")
        for index, value in enumerate(progress)
    ]
    if any(value <= 0 or value >= 1 for value in progress_values):
        raise ValueError("Every transition.progress value must fall between 0 and 1.")
    if any(
        current >= following
        for current, following in zip(progress_values, progress_values[1:])
    ):
        raise ValueError("transition.progress values must increase strictly.")

    colors = transition.get("colors")
    if not isinstance(colors, list) or not colors:
        raise ValueError("transition.colors must contain at least one RGB color.")
    normalized_colors: list[tuple[int, int, int]] = []
    for index, color in enumerate(colors):
        if not isinstance(color, str) or not color.strip():
            raise ValueError(f"transition.colors[{index}] must be a color string.")
        try:
            parsed_color = ImageColor.getrgb(color)
        except ValueError as error:
            raise ValueError(
                f"transition.colors[{index}] is invalid: {color!r}."
            ) from error
        if len(parsed_color) != 3:
            raise ValueError(
                f"transition.colors[{index}] must resolve to an RGB color."
            )
        normalized_colors.append(parsed_color)
    if len(set(normalized_colors)) != len(normalized_colors):
        raise ValueError("transition.colors must contain distinct RGB colors.")

    inspiration = transition.get("inspiration")
    if not isinstance(inspiration, list) or not inspiration:
        raise ValueError("transition.inspiration must contain at least one HTTPS URL.")
    if any(
        not isinstance(url, str) or not url.startswith("https://")
        for url in inspiration
    ):
        raise ValueError("Every transition.inspiration entry must be an HTTPS URL.")
    if len(set(inspiration)) != len(inspiration):
        raise ValueError("transition.inspiration entries must be distinct.")

    frames = manifest.get("frames")
    if not isinstance(frames, list) or len(frames) < 2:
        raise ValueError("The About visual sequence requires at least two frames.")
    frame_ids: set[str] = set()
    for index, frame in enumerate(frames):
        if not isinstance(frame, dict):
            raise ValueError(f"frames[{index}] must be an object.")
        frame_id = frame.get("id")
        if not isinstance(frame_id, str) or not FRAME_ID_PATTERN.fullmatch(frame_id):
            raise ValueError(
                f"frames[{index}].id must be a lowercase hyphenated identifier."
            )
        if frame_id in frame_ids:
            raise ValueError(f"Frame id must be unique: {frame_id!r}.")
        frame_ids.add(frame_id)
        if not isinstance(frame.get("label"), str) or not frame["label"].strip():
            raise ValueError(f"Frame {frame_id!r} requires a non-empty label.")
        resolve_repository_source(repository_root, frame.get("source_path"))
        expected_digest = frame.get("sha256")
        if not isinstance(expected_digest, str) or not SHA256_PATTERN.fullmatch(
            expected_digest
        ):
            raise ValueError(
                f"Frame {frame_id!r} requires a lowercase 64-character sha256."
            )
        centering = frame.get("centering")
        if not isinstance(centering, list) or len(centering) != 2:
            raise ValueError(
                f"Frame {frame_id!r} centering must contain two coordinates."
            )
        coordinates = [
            require_finite_number(
                value,
                field=f"Frame {frame_id!r} centering[{coordinate_index}]",
            )
            for coordinate_index, value in enumerate(centering)
        ]
        if any(value < 0 or value > 1 for value in coordinates):
            raise ValueError(
                f"Frame {frame_id!r} centering coordinates must fall from 0 to 1."
            )

    return manifest


def load_manifest(path: Path, repository_root: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as source:
        manifest = json.load(source)
    return validate_manifest(manifest, repository_root=repository_root)


def load_stills(
    manifest: dict[str, Any],
    repository_root: Path,
) -> list[Image.Image]:
    output = manifest["output"]
    size = (int(output["width"]), int(output["height"]))
    stills: list[Image.Image] = []

    for frame in manifest["frames"]:
        source = resolve_repository_source(repository_root, frame["source_path"])
        if not source.is_file():
            raise FileNotFoundError(
                f"Accepted source for {frame['id']!r} is unavailable at "
                f"{frame['source_path']!r}. Restore or deliberately refresh the "
                "accepted source bytes before rebuilding."
            )
        actual_digest = sha256(source)
        expected_digest = frame["sha256"]
        if actual_digest != expected_digest:
            raise ValueError(
                f"Accepted source digest changed for {frame['id']!r} at "
                f"{frame['source_path']!r}: expected {expected_digest}, received "
                f"{actual_digest}. Deliberately refresh the accepted source and "
                "manifest digest together."
            )
        centering = tuple(float(value) for value in frame["centering"])
        with Image.open(source) as image:
            stills.append(
                ImageOps.fit(
                    image.convert("RGB"),
                    size,
                    method=Image.Resampling.LANCZOS,
                    centering=centering,
                )
            )
    return stills


def assembly_relay(
    current: Image.Image,
    following: Image.Image,
    *,
    columns: int,
    rows: int,
    colors: list[str],
    progress_points: list[float],
    reverse: bool,
) -> list[Image.Image]:
    """Reveal one still through a deterministic diagonal grid boundary."""

    width, height = current.size
    palette = [ImageColor.getrgb(color) for color in colors]
    cells = [(column, row) for row in range(rows) for column in range(columns)]
    cells.sort(
        key=lambda cell: (
            ((columns - 1 - cell[0]) if reverse else cell[0]) + cell[1],
            cell[1],
            cell[0],
        )
    )
    rank = {cell: index for index, cell in enumerate(cells)}
    transitions: list[Image.Image] = []

    for progress in progress_points:
        boundary = progress * len(cells)
        frame = current.copy()
        for row in range(rows):
            top = round(row * height / rows)
            bottom = round((row + 1) * height / rows)
            for column in range(columns):
                left = round(column * width / columns)
                right = round((column + 1) * width / columns)
                cell_rank = rank[(column, row)]
                box = (left, top, right, bottom)
                if cell_rank < boundary - 2:
                    frame.paste(following.crop(box), box)
                elif cell_rank < boundary + 2:
                    color = palette[(column + row) % len(palette)]
                    frame.paste(color, box)
        transitions.append(frame)
    return transitions


def build_frames(
    stills: list[Image.Image],
    manifest: dict[str, Any],
) -> tuple[list[Image.Image], list[int]]:
    output = manifest["output"]
    transition = manifest["transition"]
    hold_ms = int(output["hold_ms"])
    transition_ms = int(output["transition_frame_ms"])
    frames: list[Image.Image] = []
    durations: list[int] = []

    for index, still in enumerate(stills):
        frames.append(still.copy())
        durations.append(hold_ms)
        if index == len(stills) - 1:
            continue
        relay = assembly_relay(
            still,
            stills[index + 1],
            columns=int(transition["grid_columns"]),
            rows=int(transition["grid_rows"]),
            colors=list(transition["colors"]),
            progress_points=[float(value) for value in transition["progress"]],
            reverse=bool(index % 2),
        )
        frames.extend(relay)
        durations.extend([transition_ms] * len(relay))

    return frames, durations


def quantize_frames(frames: list[Image.Image], colors: int) -> list[Image.Image]:
    sample_step = max(1, len(frames) // 12)
    samples = frames[::sample_step]
    width, height = frames[0].size
    atlas = Image.new("RGB", (width, height * len(samples)))
    for index, sample in enumerate(samples):
        atlas.paste(sample, (0, index * height))
    palette = atlas.quantize(
        colors=colors,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    )
    return [
        frame.quantize(palette=palette, dither=Image.Dither.NONE)
        for frame in frames
    ]


def build(
    manifest_path: Path,
    repository_root: Path,
    gif_output: Path,
    poster_output: Path,
) -> None:
    manifest = load_manifest(manifest_path, repository_root)
    stills = load_stills(manifest, repository_root)
    frames, durations = build_frames(stills, manifest)
    quantized = quantize_frames(frames, int(manifest["output"]["palette_colors"]))

    gif_output.parent.mkdir(parents=True, exist_ok=True)
    poster_output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="about-style-cycle-") as temporary:
        temporary_root = Path(temporary)
        temporary_gif = temporary_root / gif_output.name
        temporary_poster = temporary_root / poster_output.name

        quantized[0].save(
            temporary_gif,
            save_all=True,
            append_images=quantized[1:],
            duration=durations,
            disposal=2,
            optimize=True,
        )
        stills[0].save(
            temporary_poster,
            format="JPEG",
            quality=88,
            optimize=True,
            progressive=True,
        )

        temporary_gif.replace(gif_output)
        temporary_poster.replace(poster_output)

    print(
        f"GIF {stills[0].width}x{stills[0].height} · {len(frames)} frames · "
        f"{sum(durations) / 1000:.2f}s · {gif_output.stat().st_size} bytes · "
        f"sha256 {sha256(gif_output)}"
    )
    print(
        f"Poster {stills[0].width}x{stills[0].height} · "
        f"{poster_output.stat().st_size} bytes · "
        f"sha256 {sha256(poster_output)}"
    )


def parse_args() -> argparse.Namespace:
    here = Path(__file__).resolve().parent
    repository_root = here.parents[2]
    media_root = repository_root / "context-canvas-project-surface" / "img" / "media"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest",
        type=Path,
        default=here / "about-style-cycle-sequence.json",
    )
    parser.add_argument(
        "--gif-output",
        type=Path,
        default=media_root / "impact-map-style-cycle-calm.gif",
    )
    parser.add_argument(
        "--poster-output",
        type=Path,
        default=media_root / "impact-map-style-cycle-poster.jpg",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    here = Path(__file__).resolve().parent
    build(
        args.manifest.resolve(),
        here.parents[2],
        args.gif_output.resolve(),
        args.poster_output.resolve(),
    )


if __name__ == "__main__":
    main()
