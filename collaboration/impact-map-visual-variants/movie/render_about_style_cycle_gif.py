#!/usr/bin/env python3
"""Build the calm, visitor-controlled About-page GIF and its still poster.

The source film is expansive and audio-bearing. This derivative keeps four
recognizable visual treatments, removes the source title-banner region, holds
each state long enough to inspect, and joins the states with eased crossfades.
The receiving page displays the poster until a visitor requests motion.
"""

from __future__ import annotations

import argparse
import hashlib
import tempfile
from pathlib import Path

import av
from PIL import Image


SOURCE_WIDTH = 1920
SOURCE_HEIGHT = 1080
OUTPUT_WIDTH = 640
OUTPUT_HEIGHT = 360
OUTPUT_FPS = 6
PALETTE_COLORS = 96
HOLD_SECONDS = 1.5
TRANSITION_SECONDS = 1.0
FRAME_DURATION_PATTERN_MS = (170, 170, 160)

# Each time lands on a settled frame between the source film's internal title
# banners: warm paper, cobalt, sea glass, and coral presentation treatments.
KEYFRAME_SECONDS = (5.0, 20.0, 40.0, 65.0)

# Stable 16:9 crop. It removes the source film's title-banner band and keeps
# the changing relationship map in the same visual field throughout the loop.
SOURCE_CROP = (160, 120, 1760, 1020)


def smoothstep(value: float) -> float:
    """Return an eased 0..1 interpolation without abrupt velocity changes."""

    return value * value * (3 - (2 * value))


def read_keyframes(source: Path) -> list[Image.Image]:
    selected: list[Image.Image] = []
    target_index = 0

    with av.open(str(source)) as container:
        stream = container.streams.video[0]
        if (stream.width, stream.height) != (SOURCE_WIDTH, SOURCE_HEIGHT):
            raise ValueError(
                "Expected the style-cycle source to be "
                f"{SOURCE_WIDTH}x{SOURCE_HEIGHT}; received "
                f"{stream.width}x{stream.height}."
            )

        duration = float(stream.duration * stream.time_base)
        if duration < KEYFRAME_SECONDS[-1]:
            raise ValueError(
                f"Source duration {duration:.2f}s does not reach the final "
                f"{KEYFRAME_SECONDS[-1]:.2f}s keyframe."
            )

        for frame in container.decode(stream):
            timestamp = float(frame.time or 0)
            if timestamp + 1e-6 < KEYFRAME_SECONDS[target_index]:
                continue

            image = frame.to_image().convert("RGB")
            image = image.crop(SOURCE_CROP)
            image = image.resize(
                (OUTPUT_WIDTH, OUTPUT_HEIGHT),
                Image.Resampling.LANCZOS,
            )
            selected.append(image)
            target_index += 1
            if target_index == len(KEYFRAME_SECONDS):
                break

    if len(selected) != len(KEYFRAME_SECONDS):
        raise ValueError(
            f"Expected {len(KEYFRAME_SECONDS)} keyframes; decoded {len(selected)}."
        )
    return selected


def build_loop(keyframes: list[Image.Image]) -> list[Image.Image]:
    hold_frames = round(HOLD_SECONDS * OUTPUT_FPS)
    transition_frames = round(TRANSITION_SECONDS * OUTPUT_FPS)
    frames: list[Image.Image] = []

    for index, current in enumerate(keyframes):
        following = keyframes[(index + 1) % len(keyframes)]
        frames.extend(current.copy() for _ in range(hold_frames))
        for step in range(1, transition_frames + 1):
            progress = smoothstep(step / transition_frames)
            frames.append(Image.blend(current, following, progress))

    return frames


def shared_palette(frames: list[Image.Image]) -> Image.Image:
    samples = [
        frames[index]
        for index in range(0, len(frames), max(1, len(frames) // 12))
    ]
    atlas = Image.new("RGB", (OUTPUT_WIDTH, OUTPUT_HEIGHT * len(samples)))
    for index, sample in enumerate(samples):
        atlas.paste(sample, (0, index * OUTPUT_HEIGHT))
    return atlas.quantize(
        colors=PALETTE_COLORS,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    )


def quantize_frames(frames: list[Image.Image]) -> list[Image.Image]:
    palette = shared_palette(frames)
    return [
        frame.quantize(palette=palette, dither=Image.Dither.NONE)
        for frame in frames
    ]


def write_gif(frames: list[Image.Image], output: Path) -> float:
    # GIF delays use 10 ms units. Repeating 170, 170, 160 ms gives six
    # frames per second without shortening the full loop.
    durations_ms = [
        FRAME_DURATION_PATTERN_MS[index % len(FRAME_DURATION_PATTERN_MS)]
        for index in range(len(frames))
    ]
    frames[0].save(
        output,
        save_all=True,
        append_images=frames[1:],
        duration=durations_ms,
        loop=0,
        disposal=2,
        optimize=True,
    )
    return sum(durations_ms) / 1000


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build(source: Path, gif_output: Path, poster_output: Path) -> None:
    if not source.is_file():
        raise FileNotFoundError(f"Source film not found: {source}")

    gif_output.parent.mkdir(parents=True, exist_ok=True)
    poster_output.parent.mkdir(parents=True, exist_ok=True)
    keyframes = read_keyframes(source)
    frames = quantize_frames(build_loop(keyframes))

    with tempfile.TemporaryDirectory(prefix="about-style-cycle-") as temporary:
        temporary_root = Path(temporary)
        temporary_gif = temporary_root / gif_output.name
        temporary_poster = temporary_root / poster_output.name

        loop_seconds = write_gif(frames, temporary_gif)
        keyframes[0].save(
            temporary_poster,
            format="JPEG",
            quality=88,
            optimize=True,
            progressive=True,
        )

        temporary_gif.replace(gif_output)
        temporary_poster.replace(poster_output)

    print(
        f"GIF {OUTPUT_WIDTH}x{OUTPUT_HEIGHT} · {len(frames)} frames · "
        f"{loop_seconds:.1f}s · {gif_output.stat().st_size} bytes · "
        f"sha256 {sha256(gif_output)}"
    )
    print(
        f"Poster {OUTPUT_WIDTH}x{OUTPUT_HEIGHT} · "
        f"{poster_output.stat().st_size} bytes · "
        f"sha256 {sha256(poster_output)}"
    )


def parse_args() -> argparse.Namespace:
    here = Path(__file__).resolve().parent
    repository_root = here.parents[2]
    media_root = repository_root / "context-canvas-project-surface" / "img" / "media"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=here / "impact-map-style-cycle-movie.mp4",
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
    build(
        args.source.resolve(),
        args.gif_output.resolve(),
        args.poster_output.resolve(),
    )


if __name__ == "__main__":
    main()
