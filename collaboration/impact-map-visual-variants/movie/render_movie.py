#!/usr/bin/env python3
"""Render the Impact Map narrative sequence as a scored 1080p movie."""

from __future__ import annotations

import argparse
import bisect
import math
import random
import subprocess
import tempfile
import time
from array import array
from fractions import Fraction
from functools import lru_cache
from pathlib import Path

import av
from PIL import Image, ImageDraw


WIDTH = 1920
HEIGHT = 1080
FPS = 30
SAMPLE_RATE = 48_000
BPM = 120
BEAT_SECONDS = 60 / BPM
SCENE_BEATS = (8, 10, 8, 8, 8, 8, 10, 10, 10)
SCENE_STARTS = tuple(
    sum(SCENE_BEATS[:index]) * BEAT_SECONDS for index in range(len(SCENE_BEATS))
)
DURATION = sum(SCENE_BEATS) * BEAT_SECONDS
TOTAL_FRAMES = round(DURATION * FPS)
TRANSITION_SECONDS = 2 * BEAT_SECONDS
MASK_STEPS = 29
BACKGROUND = Image.new("RGB", (WIDTH, HEIGHT), "#fbfaf7")
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")


MOVIE_CSS = """
  <style id="movie-rendering-surface">
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
    }
    html, body {
      width: 1920px !important;
      height: 1080px !important;
      min-height: 1080px !important;
      margin: 0 !important;
      overflow: hidden !important;
      background: #fbfaf7 !important;
    }
    body { display: block !important; }
    main {
      width: 1920px !important;
      max-width: none !important;
      height: 1080px !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .masthead,
    .narrative-controls,
    #impact-map,
    #axonometric-map,
    #mobile-map {
      display: none !important;
    }
    #map-shell {
      display: block !important;
      width: 1920px !important;
      height: 1080px !important;
      min-height: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      overflow: hidden !important;
    }
    #narrative-sequence {
      display: block !important;
      width: 1920px !important;
      height: 1080px !important;
    }
    .narrative-stage {
      width: 1920px !important;
      height: 1080px !important;
      aspect-ratio: auto !important;
    }
    #narrative-map {
      display: block !important;
      width: 1920px !important;
      height: 1080px !important;
    }
  </style>
"""


INIT_NEEDLE = """      const initialVariant = variants[location.hash.slice(1)] ? location.hash.slice(1) : 'warm';
      render(initialVariant);
      setView('branch');"""


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def prepare_frame_html(source: Path, target: Path, frame_index: int) -> None:
    html = source.read_text(encoding="utf-8")
    if INIT_NEEDLE not in html:
        raise RuntimeError("The narrative initializer in index.html has changed.")
    html = html.replace("</head>", MOVIE_CSS + "\n</head>", 1)
    html = html.replace(
        INIT_NEEDLE,
        """      render('warm');
      setView('narrative');
      setNarrativeFrame(%d);
      document.documentElement.dataset.movieReady = 'true';""" % frame_index,
        1,
    )
    target.write_text(html, encoding="utf-8")


def render_keyframes(source: Path, build_dir: Path) -> list[Path]:
    if not CHROME.exists():
        raise RuntimeError(f"Chrome was not found at {CHROME}")

    keyframes: list[Path] = []

    for frame_index in range(len(SCENE_BEATS)):
        profile = build_dir / f"chrome-profile-{frame_index + 1:02d}"
        profile.mkdir(parents=True, exist_ok=True)
        html_path = build_dir / f"scene-{frame_index + 1:02d}.html"
        png_path = build_dir / f"scene-{frame_index + 1:02d}.png"
        prepare_frame_html(source, html_path, frame_index)
        command = [
            str(CHROME),
            "--headless=new",
            "--disable-gpu",
            "--disable-background-networking",
            "--disable-component-update",
            "--disable-extensions",
            "--disable-sync",
            "--hide-scrollbars",
            "--no-default-browser-check",
            "--no-first-run",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=900",
            "--window-size=1920,1080",
            "--force-device-scale-factor=1",
            f"--user-data-dir={profile}",
            f"--screenshot={png_path}",
            html_path.as_uri(),
        ]
        process = subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        captured = False
        for _ in range(120):
            if png_path.exists() and png_path.stat().st_size > 0:
                time.sleep(0.2)
                captured = True
                break
            if process.poll() is not None:
                break
            time.sleep(0.1)
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=2)
        if not captured:
            raise RuntimeError(f"Chrome could not render scene {frame_index + 1}.")
        with Image.open(png_path) as rendered:
            if rendered.size != (WIDTH, HEIGHT):
                raise RuntimeError(
                    f"Scene {frame_index + 1} rendered at {rendered.size}, expected {(WIDTH, HEIGHT)}."
                )
        keyframes.append(png_path)
        print(f"Rendered scene {frame_index + 1:02d} / {len(SCENE_BEATS):02d}")

    return keyframes


def quantized_progress(progress: float) -> float:
    if progress <= 0:
        return 0.0
    if progress >= 1:
        return 1.0
    return math.floor(progress * MASK_STEPS) / MASK_STEPS


def wet_paint_mask(progress: float, transition_index: int) -> Image.Image:
    q = quantized_progress(progress)
    mask = Image.new("L", (WIDTH, HEIGHT), 0)
    if q <= 0:
        return mask
    if q >= 0.965:
        return Image.new("L", (WIDTH, HEIGHT), 255)

    draw = ImageDraw.Draw(mask)
    rng = random.Random(41_000 + transition_index)
    sample_count = 72
    boundary: list[tuple[int, int]] = []
    for sample in range(sample_count + 1):
        x = round(sample * WIDTH / sample_count)
        wave = math.sin(sample * 0.61 + transition_index * 0.9) * 0.026
        roughness = rng.uniform(-0.045, 0.065)
        local = clamp(q * 1.29 - 0.105 + wave + roughness)
        boundary.append((x, round(local * HEIGHT)))

    polygon = [(0, 0), (WIDTH, 0), *reversed(boundary)]
    draw.polygon(polygon, fill=255)

    rng = random.Random(52_000 + transition_index)
    for drip in range(23):
        x = rng.randint(18, WIDTH - 18)
        sample = min(sample_count, round(x / WIDTH * sample_count))
        edge_y = boundary[sample][1]
        trigger = 0.08 + rng.random() * 0.58
        if q <= trigger or edge_y <= 0:
            continue
        width = rng.randint(8, 25)
        length = round((34 + rng.random() * 122) * (0.65 + q * 0.55))
        bottom = min(HEIGHT, edge_y + length)
        draw.rounded_rectangle(
            (x - width // 2, max(0, edge_y - 7), x + width // 2, bottom),
            radius=max(4, width // 2),
            fill=255,
        )
        if bottom < HEIGHT:
            draw.ellipse((x - width // 2, bottom - width, x + width // 2, bottom + 2), fill=255)
    return mask


def dry_brush_mask(progress: float, transition_index: int) -> Image.Image:
    q = quantized_progress(progress)
    mask = Image.new("L", (WIDTH, HEIGHT), 0)
    if q <= 0:
        return mask
    if q >= 0.965:
        return Image.new("L", (WIDTH, HEIGHT), 255)

    draw = ImageDraw.Draw(mask)
    rng = random.Random(73_000 + transition_index)
    columns = 36
    rows = 21
    cell_w = math.ceil(WIDTH / columns)
    cell_h = math.ceil(HEIGHT / rows)
    reverse = transition_index % 4 == 3

    for row in range(rows):
        for column in range(columns):
            x_ratio = column / max(1, columns - 1)
            if reverse:
                x_ratio = 1 - x_ratio
            y_ratio = row / max(1, rows - 1)
            arrival = 0.04 + 0.65 * x_ratio + 0.23 * y_ratio + rng.uniform(-0.085, 0.075)
            if q < arrival:
                continue
            x0 = column * cell_w - rng.randint(0, 5)
            y0 = row * cell_h + rng.randint(-5, 5)
            x1 = min(WIDTH, x0 + cell_w + rng.randint(4, 24))
            y1 = min(HEIGHT, y0 + cell_h - rng.randint(0, 7))
            draw.rectangle((x0, y0, x1, y1), fill=255)

    rng = random.Random(84_000 + transition_index)
    for streak in range(74):
        y = round((streak + 0.5) * HEIGHT / 74) + rng.randint(-7, 7)
        direction = 1 if not reverse else -1
        extent = clamp((q - 0.055 - streak / 74 * 0.19) / 0.73)
        length = round(WIDTH * extent)
        thickness = rng.randint(3, 15)
        if length <= 0:
            continue
        if direction > 0:
            draw.rounded_rectangle((0, y, length, y + thickness), radius=thickness // 2, fill=255)
        else:
            draw.rounded_rectangle((WIDTH - length, y, WIDTH, y + thickness), radius=thickness // 2, fill=255)
    return mask


def transition_mask(progress: float, transition_index: int) -> Image.Image:
    if transition_index % 2 == 0:
        return wet_paint_mask(progress, transition_index)
    return dry_brush_mask(progress, transition_index)


def movie_frame(stills: list[Image.Image], frame_index: int) -> Image.Image:
    time_seconds = frame_index / FPS
    scene_index = max(0, bisect.bisect_right(SCENE_STARTS, time_seconds) - 1)
    image = stills[scene_index]

    if scene_index < len(stills) - 1:
        boundary = SCENE_STARTS[scene_index + 1]
        transition_start = boundary - TRANSITION_SECONDS
        if time_seconds >= transition_start:
            progress = (time_seconds - transition_start) / TRANSITION_SECONDS
            mask = transition_mask(progress, scene_index)
            image = Image.composite(stills[scene_index + 1], image, mask)

    if time_seconds < 0.5:
        image = Image.blend(BACKGROUND, image, clamp(time_seconds / 0.5))

    fade_out_start = DURATION - 1.35
    if time_seconds > fade_out_start:
        image = Image.blend(image, BACKGROUND, clamp((time_seconds - fade_out_start) / 1.25))
    return image


def midi_frequency(midi_note: int) -> float:
    return 440.0 * 2 ** ((midi_note - 69) / 12)


@lru_cache(maxsize=None)
def guitar_wave(midi_note: int) -> array:
    duration = 0.72
    count = round(SAMPLE_RATE * duration)
    frequency = midi_frequency(midi_note)
    output = array("f", [0.0]) * count
    phases = (0.0, 0.21, 0.43, 0.78, 1.06)
    strengths = (1.0, 0.46, 0.23, 0.12, 0.065)
    for index in range(count):
        time = index / SAMPLE_RATE
        attack = min(1.0, time / 0.009)
        envelope = attack * math.exp(-5.0 * time / duration)
        phase = 2 * math.pi * frequency * time
        sample = 0.0
        for harmonic, (phase_shift, strength) in enumerate(zip(phases, strengths), start=1):
            sample += strength * math.sin(phase * harmonic + phase_shift)
        output[index] = sample * envelope * 0.48
    return output


@lru_cache(maxsize=None)
def bass_wave(midi_note: int) -> array:
    duration = 0.58
    count = round(SAMPLE_RATE * duration)
    frequency = midi_frequency(midi_note)
    output = array("f", [0.0]) * count
    for index in range(count):
        time = index / SAMPLE_RATE
        attack = min(1.0, time / 0.018)
        envelope = attack * math.exp(-4.2 * time / duration)
        phase = 2 * math.pi * frequency * time
        output[index] = (
            math.sin(phase) + 0.28 * math.sin(phase * 2 + 0.12) + 0.08 * math.sin(phase * 3)
        ) * envelope * 0.68
    return output


@lru_cache(maxsize=None)
def electric_piano_wave(midi_note: int) -> array:
    duration = 1.16
    count = round(SAMPLE_RATE * duration)
    frequency = midi_frequency(midi_note)
    output = array("f", [0.0]) * count
    for index in range(count):
        time = index / SAMPLE_RATE
        attack = min(1.0, time / 0.016)
        envelope = attack * math.exp(-3.7 * time / duration)
        phase = 2 * math.pi * frequency * time
        bell = math.sin(phase * 2.01 + 1.9 * math.sin(phase * 0.503))
        output[index] = (math.sin(phase) + 0.22 * bell + 0.075 * math.sin(phase * 3.99)) * envelope * 0.62
    return output


@lru_cache(maxsize=None)
def glass_wave(midi_note: int) -> array:
    duration = 0.8
    count = round(SAMPLE_RATE * duration)
    frequency = midi_frequency(midi_note)
    output = array("f", [0.0]) * count
    for index in range(count):
        time = index / SAMPLE_RATE
        attack = min(1.0, time / 0.004)
        envelope = attack * math.exp(-6.0 * time / duration)
        phase = 2 * math.pi * frequency * time
        output[index] = (
            math.sin(phase) + 0.44 * math.sin(phase * 2.76) + 0.18 * math.sin(phase * 4.11)
        ) * envelope * 0.45
    return output


@lru_cache(maxsize=None)
def shaker_wave(variation: int) -> array:
    duration = 0.055
    count = round(SAMPLE_RATE * duration)
    output = array("f", [0.0]) * count
    rng = random.Random(91_000 + variation)
    previous = 0.0
    for index in range(count):
        time = index / SAMPLE_RATE
        white = rng.uniform(-1.0, 1.0)
        high = white - previous * 0.91
        previous = white
        envelope = math.exp(-8.2 * time / duration)
        output[index] = high * envelope * 0.34
    return output


@lru_cache(maxsize=None)
def rim_wave(variation: int) -> array:
    duration = 0.09
    count = round(SAMPLE_RATE * duration)
    output = array("f", [0.0]) * count
    rng = random.Random(93_000 + variation)
    for index in range(count):
        time = index / SAMPLE_RATE
        envelope = math.exp(-12.0 * time / duration)
        tone = math.sin(2 * math.pi * 1_720 * time) + 0.48 * math.sin(2 * math.pi * 2_460 * time)
        output[index] = (tone * 0.32 + rng.uniform(-1, 1) * 0.16) * envelope
    return output


@lru_cache(maxsize=None)
def surdo_wave(variation: int) -> array:
    duration = 0.34
    count = round(SAMPLE_RATE * duration)
    output = array("f", [0.0]) * count
    for index in range(count):
        time = index / SAMPLE_RATE
        frequency = 86 - 28 * clamp(time / duration)
        envelope = min(1.0, time / 0.008) * math.exp(-5.3 * time / duration)
        phase = 2 * math.pi * frequency * time
        output[index] = (math.sin(phase) + 0.16 * math.sin(phase * 2)) * envelope * (0.8 + variation * 0.04)
    return output


@lru_cache(maxsize=None)
def brush_wave(variation: int) -> array:
    duration = TRANSITION_SECONDS
    count = round(SAMPLE_RATE * duration)
    output = array("f", [0.0]) * count
    rng = random.Random(97_000 + variation)
    smooth = 0.0
    for index in range(count):
        time = index / SAMPLE_RATE
        white = rng.uniform(-1.0, 1.0)
        smooth = smooth * 0.82 + white * 0.18
        high = white - smooth
        envelope = math.sin(math.pi * clamp(time / duration)) ** 1.4
        pulses = 0.68 + 0.32 * math.sin(2 * math.pi * (12 + variation) * time) ** 2
        output[index] = high * envelope * pulses * 0.22
    return output


class StereoMix:
    def __init__(self) -> None:
        self.sample_count = round(DURATION * SAMPLE_RATE)
        self.left = array("f", [0.0]) * self.sample_count
        self.right = array("f", [0.0]) * self.sample_count

    def add(self, waveform: array, start_seconds: float, gain: float, pan: float = 0.0) -> None:
        start = max(0, round(start_seconds * SAMPLE_RATE))
        if start >= self.sample_count:
            return
        end = min(self.sample_count, start + len(waveform))
        pan = clamp(pan, -1.0, 1.0)
        angle = (pan + 1) * math.pi / 4
        left_gain = gain * math.cos(angle)
        right_gain = gain * math.sin(angle)
        left = self.left
        right = self.right
        for target, sample in zip(range(start, end), waveform):
            left[target] += sample * left_gain
            right[target] += sample * right_gain

    def add_room(self) -> None:
        dry_left = array("f", self.left)
        dry_right = array("f", self.right)
        for delay_seconds, gain, cross in ((0.061, 0.085, 0.35), (0.113, 0.052, 0.5)):
            delay = round(delay_seconds * SAMPLE_RATE)
            for index in range(delay, self.sample_count):
                source = index - delay
                self.left[index] += (dry_left[source] * (1 - cross) + dry_right[source] * cross) * gain
                self.right[index] += (dry_right[source] * (1 - cross) + dry_left[source] * cross) * gain

    def finish(self) -> None:
        self.add_room()
        fade_in = round(0.55 * SAMPLE_RATE)
        fade_out = round(1.75 * SAMPLE_RATE)
        square_sum = 0.0
        peak = 0.0
        for index in range(self.sample_count):
            fade = 1.0
            if index < fade_in:
                fade *= index / fade_in
            if index >= self.sample_count - fade_out:
                fade *= (self.sample_count - index - 1) / fade_out
            left = math.tanh(self.left[index] * 1.75) * fade
            right = math.tanh(self.right[index] * 1.75) * fade
            self.left[index] = left
            self.right[index] = right
            square_sum += left * left + right * right
            peak = max(peak, abs(left), abs(right))

        rms = math.sqrt(square_sum / (self.sample_count * 2)) or 1.0
        gain = min(0.891 / max(peak, 1e-9), 0.112 / rms)
        for index in range(self.sample_count):
            self.left[index] *= gain
            self.right[index] *= gain


CHORDS = {
    "C69": ((52, 57, 62, 67), 36),
    "G13": ((53, 59, 64, 69), 31),
    "G13sus": ((53, 57, 60, 64), 31),
    "Em9": ((55, 62, 66, 71), 40),
    "A7sus": ((55, 62, 64, 69), 33),
    "A7b9": ((55, 61, 64, 70), 33),
    "Dm9": ((53, 60, 64, 69), 38),
    "Cmaj9": ((52, 59, 62, 67), 36),
    "A13": ((55, 61, 66, 71), 33),
    "Fmaj9": ((57, 64, 67, 72), 41),
    "Fm6": ((56, 60, 62, 65), 41),
    "C/G": ((48, 55, 60, 64), 31),
}


PROGRESSION = (
    ("C69", None),
    ("C69", "G13sus"),
    ("Em9", None),
    ("A7sus", "A7b9"),
    ("Dm9", None),
    ("G13", None),
    ("Cmaj9", None),
    ("A13", None),
    ("Dm9", None),
    ("G13", None),
    ("Fmaj9", None),
    ("Fm6", "G13sus"),
    ("Em9", None),
    ("A13", None),
    ("Dm9", "G13"),
    ("C69", "A7b9"),
    ("Dm9", "G13"),
    ("Fmaj9", "Fm6"),
    ("C/G", "G13sus"),
    ("C69", None),
)


def current_chord(bar: tuple[str, str | None], sixteenth_step: int) -> str:
    return bar[1] if bar[1] and sixteenth_step >= 8 else bar[0]


def generate_soundtrack() -> StereoMix:
    mix = StereoMix()
    bar_seconds = 4 * BEAT_SECONDS
    sixteenth = bar_seconds / 16
    guitar_steps = (0, 3, 6, 10, 13)
    guitar_strengths = (0.86, 0.54, 0.68, 0.9, 0.59)

    for bar_index, bar in enumerate(PROGRESSION):
        bar_start = bar_index * bar_seconds
        dynamics = 0.75 if bar_index < 2 else (1.0 if 12 <= bar_index <= 17 else 0.9)

        for hit_index, step in enumerate(guitar_steps):
            chord_name = current_chord(bar, step)
            notes, _ = CHORDS[chord_name]
            start = bar_start + step * sixteenth
            for note_index, midi_note in enumerate(notes):
                mix.add(
                    guitar_wave(midi_note),
                    start + note_index * 0.0045,
                    0.073 * guitar_strengths[hit_index] * dynamics,
                    -0.2 + note_index * 0.035,
                )

        first_name = bar[0]
        second_name = bar[1] or first_name
        first_root = CHORDS[first_name][1]
        second_root = CHORDS[second_name][1]
        mix.add(bass_wave(first_root), bar_start, 0.2 * dynamics, -0.05)
        mix.add(bass_wave(second_root + 7), bar_start + 2 * BEAT_SECONDS, 0.145 * dynamics, -0.04)
        next_root = CHORDS[PROGRESSION[(bar_index + 1) % len(PROGRESSION)][0]][1]
        mix.add(bass_wave(next_root - 1), bar_start + 15 * sixteenth, 0.07 * dynamics, -0.03)

        for step in range(16):
            swing = 0.014 if step % 2 else 0.0
            shaker_gain = (0.032 if step % 2 == 0 else 0.021) * dynamics
            mix.add(
                shaker_wave((bar_index * 16 + step) % 9),
                bar_start + step * sixteenth + swing,
                shaker_gain,
                0.34,
            )

        rim_steps = (3, 6, 10, 13) if bar_index % 2 == 0 else (2, 7, 10, 14)
        for hit_index, step in enumerate(rim_steps):
            mix.add(rim_wave((bar_index + hit_index) % 5), bar_start + step * sixteenth, 0.092 * dynamics, 0.2)

        mix.add(surdo_wave(bar_index % 3), bar_start, 0.135 * dynamics, -0.12)
        mix.add(surdo_wave((bar_index + 1) % 3), bar_start + 8 * sixteenth, 0.095 * dynamics, -0.1)

    motif_notes = (64, 67, 69, 74, 72)
    motif_offsets = (0.0, 0.47, 0.96, 1.51, 2.1)
    for scene_index, scene_start in enumerate(SCENE_STARTS):
        if scene_index == 0:
            start = 1.0
        else:
            start = scene_start + 0.55
        transpose = (0, 0, 2, 0, -2, 0, 0, 2, 0)[scene_index]
        scene_gain = 0.045 if scene_index < 2 else (0.057 if scene_index < 7 else 0.066)
        for note_index, (midi_note, offset) in enumerate(zip(motif_notes, motif_offsets)):
            mix.add(
                electric_piano_wave(midi_note + transpose),
                start + offset,
                scene_gain * (1.0 if note_index in (0, 3) else 0.78),
                0.15,
            )

    for transition_index, boundary in enumerate(SCENE_STARTS[1:]):
        transition_start = boundary - TRANSITION_SECONDS
        pan = -0.45 if transition_index % 2 == 0 else 0.45
        mix.add(brush_wave(transition_index), transition_start, 0.052, pan)
        chime_note = 79 + (transition_index % 4) * 2
        mix.add(glass_wave(chime_note), boundary - 0.03, 0.072, -pan * 0.55)

    cadence_start = SCENE_STARTS[-1] + 2.65
    for index, midi_note in enumerate((67, 69, 72, 74, 76)):
        mix.add(glass_wave(midi_note), cadence_start + index * 0.19, 0.046, -0.18 + index * 0.09)

    mix.finish()
    print("Synthesized 20-bar bossa-nova score")
    return mix


def pcm_bytes(mix: StereoMix, start: int, sample_count: int) -> bytes:
    interleaved = array("h")
    end = min(mix.sample_count, start + sample_count)
    for index in range(start, end):
        left = round(clamp(mix.left[index], -1.0, 1.0) * 32767)
        right = round(clamp(mix.right[index], -1.0, 1.0) * 32767)
        interleaved.append(left)
        interleaved.append(right)
    return interleaved.tobytes()


def encode_movie(stills: list[Image.Image], mix: StereoMix, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    container = av.open(str(output), "w")
    container.metadata["title"] = "Impact Map — Narrative Movie"
    container.metadata["artist"] = "Driftframe Studios"
    container.metadata["comment"] = "Programmatic visual transitions and synthesized score"

    video_stream = container.add_stream("libx264", rate=FPS)
    video_stream.width = WIDTH
    video_stream.height = HEIGHT
    video_stream.pix_fmt = "yuv420p"
    video_stream.bit_rate = 8_000_000
    video_stream.options = {"crf": "18", "preset": "medium"}

    audio_stream = container.add_stream("aac", rate=SAMPLE_RATE)
    audio_stream.bit_rate = 192_000
    audio_stream.codec_context.layout = "stereo"

    samples_per_frame = SAMPLE_RATE // FPS
    for frame_index in range(TOTAL_FRAMES):
        image = movie_frame(stills, frame_index)
        video_frame = av.VideoFrame.from_image(image)
        video_frame.pts = frame_index
        video_frame.time_base = Fraction(1, FPS)
        for packet in video_stream.encode(video_frame):
            container.mux(packet)

        audio_start = frame_index * samples_per_frame
        audio_frame = av.AudioFrame(format="s16", layout="stereo", samples=samples_per_frame)
        audio_frame.sample_rate = SAMPLE_RATE
        audio_frame.pts = audio_start
        audio_frame.time_base = Fraction(1, SAMPLE_RATE)
        audio_frame.planes[0].update(pcm_bytes(mix, audio_start, samples_per_frame))
        for packet in audio_stream.encode(audio_frame):
            container.mux(packet)

        if frame_index % (FPS * 5) == 0:
            print(f"Encoded {frame_index / FPS:04.0f}s / {DURATION:.0f}s")

    for packet in video_stream.encode():
        container.mux(packet)
    for packet in audio_stream.encode():
        container.mux(packet)
    container.close()
    print(f"Wrote {output}")


def parse_args() -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=script_dir.parent / "index.html",
        help="Impact Map HTML source",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=script_dir / "impact-map-narrative-movie.mp4",
        help="MP4 destination",
    )
    parser.add_argument(
        "--keep-build",
        action="store_true",
        help="Keep rendered keyframes in a temporary folder for inspection",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = args.source.resolve()
    output = args.output.resolve()
    if not source.exists():
        raise SystemExit(f"Source file not found: {source}")

    if args.keep_build:
        build_dir = Path(tempfile.mkdtemp(prefix="impact-map-movie-"))
        print(f"Keeping render materials at {build_dir}")
        keyframe_paths = render_keyframes(source, build_dir)
        stills = [Image.open(path).convert("RGB") for path in keyframe_paths]
        mix = generate_soundtrack()
        encode_movie(stills, mix, output)
        return

    with tempfile.TemporaryDirectory(prefix="impact-map-movie-") as temporary:
        build_dir = Path(temporary)
        keyframe_paths = render_keyframes(source, build_dir)
        stills = [Image.open(path).convert("RGB") for path in keyframe_paths]
        mix = generate_soundtrack()
        encode_movie(stills, mix, output)


if __name__ == "__main__":
    main()
