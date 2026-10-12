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
import shutil
import subprocess
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
    if manifest.get("version") != "0.4.0":
        raise ValueError("Expected About visual-sequence manifest version 0.4.0.")

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
    if output.get("palette_strategy") != "per_frame":
        raise ValueError("output.palette_strategy must select per_frame.")
    if output.get("dither") not in {"none", "floyd_steinberg"}:
        raise ValueError(
            "output.dither must select none or floyd_steinberg."
        )

    progressive_video = manifest.get("progressive_video")
    if not isinstance(progressive_video, dict):
        raise ValueError("The manifest requires a progressive_video object.")
    video_width = require_integer(
        progressive_video.get("width"),
        field="progressive_video.width",
        minimum=2,
    )
    video_height = require_integer(
        progressive_video.get("height"),
        field="progressive_video.height",
        minimum=2,
    )
    if video_width % 2 or video_height % 2:
        raise ValueError(
            "progressive_video dimensions must be even for yuv420p encoding."
        )
    frames_per_second = require_integer(
        progressive_video.get("frames_per_second"),
        field="progressive_video.frames_per_second",
        minimum=1,
        maximum=60,
    )
    if progressive_video.get("codec") != "libx264":
        raise ValueError("progressive_video.codec must select libx264.")
    if progressive_video.get("preset") not in {
        "medium",
        "slow",
        "slower",
        "veryslow",
    }:
        raise ValueError(
            "progressive_video.preset must select a quality-oriented x264 preset."
        )
    require_integer(
        progressive_video.get("crf"),
        field="progressive_video.crf",
        minimum=0,
        maximum=51,
    )
    if progressive_video.get("pixel_format") != "yuv420p":
        raise ValueError("progressive_video.pixel_format must select yuv420p.")
    if progressive_video.get("audio") is not False:
        raise ValueError("progressive_video.audio must declare this sequence silent.")
    if progressive_video.get("fast_start") is not True:
        raise ValueError("progressive_video.fast_start must remain enabled.")
    for field, duration_ms in {
        "output.hold_ms": hold_ms,
        "output.transition_frame_ms": transition_frame_ms,
    }.items():
        if duration_ms * frames_per_second % 1000:
            raise ValueError(
                f"{field} must map to whole progressive-video frames at "
                f"{frames_per_second} fps."
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
    frame_stages: list[str] = []
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
        stage = frame.get("stage")
        if stage not in {"problem", "solution", "implementation"}:
            raise ValueError(
                f"Frame {frame_id!r} stage must select problem, solution, or "
                "implementation."
            )
        frame_stages.append(stage)
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

    if frame_stages[0] != "implementation":
        raise ValueError(
            "The About visual sequence must open with a finished implementation view."
        )
    if any(
        current == following
        for current, following in zip(frame_stages, frame_stages[1:])
    ):
        raise ValueError(
            "Adjacent frames must move among problem, solution, and implementation "
            "spaces."
        )

    return manifest


def load_manifest(path: Path, repository_root: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as source:
        manifest = json.load(source)
    return validate_manifest(manifest, repository_root=repository_root)


def load_stills(
    manifest: dict[str, Any],
    repository_root: Path,
    *,
    size: tuple[int, int] | None = None,
) -> list[Image.Image]:
    output = manifest["output"]
    target_size = size or (int(output["width"]), int(output["height"]))
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
            rgb_source = image.convert("RGB")
            # The sequence owns its timing and one-shot behavior. Source-carrier
            # playback metadata must not silently turn the fallback into a loop.
            rgb_source.info.clear()
            fitted = ImageOps.fit(
                rgb_source,
                target_size,
                method=Image.Resampling.LANCZOS,
                centering=centering,
            )
            fitted.info.clear()
            stills.append(fitted)
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


def quantize_frames(
    frames: list[Image.Image],
    colors: int,
    *,
    dither: str,
) -> list[Image.Image]:
    """Give each held view its own palette so interface colors remain legible."""

    dither_method = (
        Image.Dither.FLOYDSTEINBERG
        if dither == "floyd_steinberg"
        else Image.Dither.NONE
    )
    return [
        frame.quantize(
            colors=colors,
            method=Image.Quantize.MEDIANCUT,
            dither=dither_method,
        )
        for frame in frames
    ]


def encode_progressive_video(
    manifest: dict[str, Any],
    repository_root: Path,
    mp4_output: Path,
) -> None:
    """Encode the same accepted sequence as a deterministic, silent H.264 MP4."""

    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise RuntimeError(
            "ffmpeg is required when --mp4-output is requested. Install ffmpeg "
            "and rerun the accepted sequence build."
        )

    video = manifest["progressive_video"]
    size = (int(video["width"]), int(video["height"]))
    stills = load_stills(manifest, repository_root, size=size)
    frames, durations = build_frames(stills, manifest)
    authored_duration_seconds = sum(durations) / 1000

    mp4_output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="about-style-cycle-video-") as temporary:
        temporary_root = Path(temporary)
        concat_path = temporary_root / "frames.txt"
        temporary_output = temporary_root / mp4_output.name
        concat_lines: list[str] = []

        for index, (frame, duration_ms) in enumerate(zip(frames, durations)):
            frame_path = temporary_root / f"frame-{index:03d}.png"
            frame.save(frame_path, format="PNG", compress_level=6)
            concat_lines.extend(
                [
                    f"file '{frame_path.name}'",
                    f"duration {duration_ms / 1000:.3f}",
                ]
            )

        # The concat demuxer applies the final duration only when the final file is
        # repeated. The explicit -t below trims that repeated sample to the exact
        # authored duration.
        concat_lines.append(f"file '{frame_path.name}'")
        concat_path.write_text("\n".join(concat_lines) + "\n", encoding="utf-8")

        command = [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-fflags",
            "+bitexact",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_path),
            "-t",
            f"{authored_duration_seconds:.3f}",
            "-vf",
            (
                f"fps={int(video['frames_per_second'])}:round=near,"
                f"format={video['pixel_format']}"
            ),
            "-an",
            "-sn",
            "-dn",
            "-map_metadata",
            "-1",
            "-map_chapters",
            "-1",
            "-c:v",
            str(video["codec"]),
            "-preset",
            str(video["preset"]),
            "-crf",
            str(video["crf"]),
            "-profile:v",
            "high",
            "-level:v",
            "4.0",
            "-pix_fmt",
            str(video["pixel_format"]),
            "-movflags",
            "+faststart",
            "-flags:v",
            "+bitexact",
            "-threads",
            "1",
            "-f",
            "mp4",
            str(temporary_output),
        ]
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
        )
        if completed.returncode:
            details = completed.stderr.strip() or "ffmpeg returned no diagnostics."
            raise RuntimeError(f"ffmpeg could not encode the About sequence: {details}")
        temporary_output.replace(mp4_output)

def build(
    manifest_path: Path,
    repository_root: Path,
    gif_output: Path,
    poster_output: Path,
    mp4_output: Path | None = None,
) -> None:
    output_paths = [gif_output, poster_output]
    if mp4_output is not None:
        output_paths.append(mp4_output)
    if len(set(output_paths)) != len(output_paths):
        raise ValueError("GIF, poster, and MP4 outputs must use distinct paths.")

    manifest = load_manifest(manifest_path, repository_root)
    stills = load_stills(manifest, repository_root)
    video_profile = manifest["progressive_video"]
    poster_size = (
        int(video_profile["width"]),
        int(video_profile["height"]),
    )
    poster_still = load_stills(
        manifest,
        repository_root,
        size=poster_size,
    )[0]
    frames, durations = build_frames(stills, manifest)
    quantized = quantize_frames(
        frames,
        int(manifest["output"]["palette_colors"]),
        dither=str(manifest["output"]["dither"]),
    )

    with tempfile.TemporaryDirectory(prefix="about-style-cycle-") as temporary:
        temporary_root = Path(temporary)
        temporary_gif = temporary_root / "sequence.gif"
        temporary_poster = temporary_root / "poster.jpg"
        temporary_mp4 = temporary_root / "sequence.mp4" if mp4_output else None

        quantized[0].save(
            temporary_gif,
            save_all=True,
            append_images=quantized[1:],
            duration=durations,
            disposal=2,
            optimize=True,
        )
        poster_still.save(
            temporary_poster,
            format="JPEG",
            quality=90,
            subsampling=0,
            optimize=True,
            progressive=True,
        )

        # Encode every requested carrier before promoting any destination. An
        # encoder failure therefore leaves the previously accepted family intact.
        if temporary_mp4 is not None:
            encode_progressive_video(manifest, repository_root, temporary_mp4)

        staged_outputs = [
            (temporary_gif, gif_output),
            (temporary_poster, poster_output),
        ]
        if temporary_mp4 is not None and mp4_output is not None:
            staged_outputs.append((temporary_mp4, mp4_output))

        for _, target in staged_outputs:
            target.parent.mkdir(parents=True, exist_ok=True)
        for staged, target in staged_outputs:
            staged.replace(target)

    print(
        f"GIF {stills[0].width}x{stills[0].height} · {len(frames)} frames · "
        f"{sum(durations) / 1000:.2f}s · {gif_output.stat().st_size} bytes · "
        f"sha256 {sha256(gif_output)}"
    )
    print(
        f"Poster {poster_still.width}x{poster_still.height} · "
        f"{poster_output.stat().st_size} bytes · "
        f"sha256 {sha256(poster_output)}"
    )
    if mp4_output is not None:
        video = manifest["progressive_video"]
        print(
            f"MP4 {int(video['width'])}x{int(video['height'])} · "
            f"{int(video['frames_per_second'])} fps · "
            f"{sum(durations) / 1000:.2f}s · {mp4_output.stat().st_size} bytes · "
            f"sha256 {sha256(mp4_output)}"
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
    parser.add_argument(
        "--mp4-output",
        type=Path,
        help=(
            "Optionally encode a 1280x720 silent H.264 carrier from the same "
            "accepted sources. The MP4 is intended for versioned remote delivery."
        ),
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
        args.mp4_output.resolve() if args.mp4_output else None,
    )


if __name__ == "__main__":
    main()
