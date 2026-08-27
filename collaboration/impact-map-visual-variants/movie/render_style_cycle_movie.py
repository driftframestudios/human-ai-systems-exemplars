#!/usr/bin/env python3
"""Render the expansive Impact Map style-cycle film with a synthesized score."""

from __future__ import annotations

import argparse
import bisect
import math
import random
import subprocess
import tempfile
import time
from array import array
from dataclasses import dataclass
from fractions import Fraction
from functools import lru_cache
from pathlib import Path

import av
from PIL import Image, ImageDraw, ImageFont


WIDTH = 1920
HEIGHT = 1080
FPS = 30
SAMPLE_RATE = 48_000
BPM = 96
BEAT = 60 / BPM
BAR = 4 * BEAT
DURATION = 28 * BAR
TOTAL_FRAMES = round(DURATION * FPS)
TRANSITION = 0.75
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
BACKGROUND = "#f7f3e8"
INK = "#17203e"
GOLD = "#c49a45"
FONT_BOLD = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
FONT_MONO = Path("/System/Library/Fonts/SFNSMono.ttf")
RNG_SEED = 0xB055A


@dataclass(frozen=True)
class Shot:
    name: str
    start: float
    end: float
    render: str
    banner: str
    kicker: str = ""
    crop: tuple[int, int, int, int] | None = None
    zoom: float = 1.08
    pixel_theme: str = "blue"
    overlay: str = ""


SHOTS = (
    Shot(
        "assembly",
        0,
        5,
        "warm-full",
        "A QUESTION ENTERS THE MAP",
        "Its actor, intended impact, status, and next route remain connected.",
        crop=(0, 440, 1760, 990),
        zoom=1.03,
        pixel_theme="cream",
        overlay="assemble",
    ),
    Shot(
        "warm-trace",
        5,
        10,
        "warm-full",
        "WARM EDITORIAL · TRACE BEFORE ARTIFACT",
        "The map keeps the decision chain readable before deliverable form hardens.",
        crop=(0, 430, 1760, 1040),
        zoom=1.09,
        pixel_theme="green",
    ),
    Shot(
        "warm-team",
        10,
        15,
        "warm-full",
        "TEAM ADDS · SOURCE BOUNDARY",
        "A new question appears beside the exact impact it clarifies.",
        crop=(760, 0, 1000, 750),
        zoom=1.12,
        pixel_theme="green",
        overlay="team-add",
    ),
    Shot(
        "cobalt-evidence",
        15,
        20,
        "cobalt-full",
        "HIGH-CONTRAST EVIDENCE · COMPARE THE CLAIM",
        "Ruled cards and orthogonal paths support evidence-by-evidence review.",
        crop=(310, 0, 1450, 820),
        zoom=1.1,
        pixel_theme="blue",
    ),
    Shot(
        "cobalt-zoom",
        20,
        25,
        "cobalt-full",
        "ABILITY ZOOM · PROVENANCE AT REVIEW",
        "Every minute spent reconstructing provenance is a minute away from interpretation.",
        crop=(785, 0, 975, 610),
        zoom=1.18,
        pixel_theme="blue",
        overlay="cursor-select",
    ),
    Shot(
        "routes-full",
        25,
        30,
        "routes-full",
        "ROUTE-FORWARD · QUESTIONS HAVE DESTINATIONS",
        "Route color carries an open question toward the architecture that can answer it.",
        crop=(560, 0, 1200, 1160),
        zoom=1.08,
        pixel_theme="red",
    ),
    Shot(
        "routes-narrow",
        30,
        35,
        "routes-full",
        "TEAM NARROWS · REMOVE THE DUPLICATE",
        "The surviving question keeps its status and route while the diagram closes ranks.",
        crop=(810, 640, 950, 810),
        zoom=1.12,
        pixel_theme="red",
        overlay="team-remove",
    ),
    Shot(
        "lanes-ownership",
        35,
        40,
        "lanes-full",
        "ACTOR LANES · OWNERSHIP STAYS LOCAL",
        "Lane separation exposes handoffs and the exact places where context can be lost.",
        crop=(300, 520, 1460, 850),
        zoom=1.09,
        pixel_theme="green",
    ),
    Shot(
        "lanes-ai",
        40,
        45,
        "lanes-full",
        "AI SUGGESTS · HUMAN KEEPS IT ASSUMED",
        "The collaborator extends the map provisionally; the team retains the uncertainty.",
        crop=(760, 370, 1000, 850),
        zoom=1.14,
        pixel_theme="green",
        overlay="ai-assumed",
    ),
    Shot(
        "vellum-audit",
        45,
        50,
        "vellum-full",
        "DARK REVIEW · AUDIT THE PATH",
        "High-contrast node types keep review state attached during room-scale critique.",
        crop=(300, 1030, 1460, 880),
        zoom=1.1,
        pixel_theme="cream",
    ),
    Shot(
        "vellum-reconstruct",
        50,
        55,
        "vellum-full",
        "ABILITY ZOOM · RECONSTRUCT THE CHANGE",
        "An audit trail assembled after the fact is a narrative, not evidence.",
        crop=(760, 1080, 1000, 800),
        zoom=1.16,
        pixel_theme="cream",
        overlay="pulse-path",
    ),
    Shot(
        "pop-coauthor",
        55,
        60,
        "pop-full",
        "BOLD BLUEPRINT · CO-AUTHOR AT SPEED",
        "Role-color separation keeps additions, removals, and unresolved questions trackable.",
        crop=(270, 0, 1490, 1050),
        zoom=1.08,
        pixel_theme="red",
    ),
    Shot(
        "pop-staged",
        60,
        65,
        "pop-narrative",
        "STAGED REVEAL · ONE DEPENDENCY AT A TIME",
        "A decision group can inspect one branch without losing the final trace.",
        zoom=1.06,
        pixel_theme="red",
        overlay="narrative-cycle",
    ),
    Shot(
        "portfolio-ai",
        65,
        67.5,
        "pop-axo-ai",
        "AI PROPOSES · REVIEW STATE BESIDE EVERY ASSERTION",
        "A new discoverable and deliverable enter the portfolio as a visible proposal.",
        crop=(230, 220, 1510, 930),
        zoom=1.09,
        pixel_theme="blue",
        overlay="proposal",
    ),
    Shot(
        "portfolio-team",
        67.5,
        70,
        "warm-axo-team",
        "TEAM NARROWS · ONE ACCOUNTABLE PATH SURVIVES",
        "Confidence grows when the accepted trace arrives with the result.",
        crop=(180, 170, 1560, 980),
        zoom=1.04,
        pixel_theme="cream",
        overlay="accepted",
    ),
)


RENDERS = {
    "warm-full": ("warm", "speckles", "branch", ""),
    "cobalt-full": ("cobalt", "drafting", "branch", ""),
    "routes-full": ("routes", "columns", "branch", ""),
    "lanes-full": ("lanes", "topography", "branch", ""),
    "vellum-full": ("vellum", "none", "branch", ""),
    "pop-full": ("pop", "quintile", "branch", ""),
    "pop-narrative": ("pop", "none", "narrative", "setNarrativeFrame(6);"),
    "pop-axo-ai": (
        "pop",
        "none",
        "axonometric",
        """portfolioData.lanes.find(l => l.id === 'discoverables').items.push({id:'d11',label:'Human-review state at every generated assertion'});
portfolioData.lanes.find(l => l.id === 'deliverables').items.push({id:'l9',label:'Generated Assertion Review-State Contract'});
portfolioData.links.push(['i1','d11'],['i5','d11'],['d11','l9']);""",
    ),
    "warm-axo-team": (
        "warm",
        "none",
        "axonometric",
        """portfolioData.lanes.find(l => l.id === 'discoverables').items.push({id:'d11',label:'Human-review state at every generated assertion'});
portfolioData.lanes.find(l => l.id === 'deliverables').items.push({id:'l9',label:'Generated Assertion Review-State Contract'});
portfolioData.links.push(['i1','d11'],['d11','l9']);""",
    ),
}


MOVIE_CSS = """
<style id="movie-style-cycle-surface">
  *, *::before, *::after { animation: none !important; transition: none !important; }
  html, body { width:1920px!important; height:1080px!important; min-height:1080px!important; margin:0!important; overflow:hidden!important; background:#f7f3e8!important; }
  body { display:block!important; }
  main { width:1920px!important; max-width:none!important; height:1080px!important; margin:0!important; padding:0!important; }
  .masthead, .narrative-controls { display:none!important; }
  #map-shell { display:block!important; width:1920px!important; height:1080px!important; min-height:0!important; margin:0!important; border:0!important; border-radius:0!important; box-shadow:none!important; overflow:hidden!important; }
  #impact-map, #axonometric-map, #narrative-sequence { width:1920px!important; height:1080px!important; }
  #impact-map, #axonometric-map, #narrative-map { shape-rendering:geometricPrecision; }
  .narrative-stage, #narrative-map { width:1920px!important; height:1080px!important; aspect-ratio:auto!important; }
</style>
"""


INIT_NEEDLE = """      const initialVariant = variants[location.hash.slice(1)] ? location.hash.slice(1) : 'warm';
      render(initialVariant);
      setView('branch');"""


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def smoothstep(value: float) -> float:
    value = clamp(value)
    return value * value * (3 - 2 * value)


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def prepare_html(source: Path, target: Path, render_name: str) -> None:
    variant, pattern, view, mutation = RENDERS[render_name]
    html = source.read_text(encoding="utf-8")
    if INIT_NEEDLE not in html:
        raise RuntimeError("The Impact Map initializer has changed.")
    html = html.replace("</head>", MOVIE_CSS + "\n</head>", 1)
    init = f"""      {mutation}
      activePattern = '{pattern}';
      render('{variant}');
      setView('{view}');
      document.documentElement.dataset.movieReady = 'true';"""
    html = html.replace(INIT_NEEDLE, init, 1)
    target.write_text(html, encoding="utf-8")


def render_sources(source: Path, build: Path) -> dict[str, Path]:
    if not CHROME.exists():
        raise RuntimeError(f"Chrome was not found at {CHROME}")
    rendered: dict[str, Path] = {}
    for index, render_name in enumerate(RENDERS):
        html_path = build / f"{render_name}.html"
        png_path = build / f"{render_name}.png"
        profile = build / f"chrome-{index:02d}"
        profile.mkdir(parents=True, exist_ok=True)
        prepare_html(source, html_path, render_name)
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
            if png_path.exists() and png_path.stat().st_size:
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
            raise RuntimeError(f"Chrome could not render {render_name}")
        rendered[render_name] = png_path
        print(f"Rendered source {index + 1:02d} / {len(RENDERS):02d} · {render_name}")
    return rendered


def crop_camera(source: Image.Image, shot: Shot, progress: float) -> Image.Image:
    if shot.crop:
        x, y, w, h = shot.crop
        sx = WIDTH / 1760
        sy = HEIGHT / 1940
        if "axo" in shot.render:
            sy = HEIGHT / 1240
        if "narrative" in shot.render:
            sx = WIDTH / 1600
            sy = HEIGHT / 900
        box = (round(x * sx), round(y * sy), round((x + w) * sx), round((y + h) * sy))
        base = source.crop(box)
    else:
        base = source
    target_ratio = WIDTH / HEIGHT
    ratio = base.width / base.height
    if ratio > target_ratio:
        new_width = round(base.height * target_ratio)
        left = (base.width - new_width) // 2
        base = base.crop((left, 0, left + new_width, base.height))
    elif ratio < target_ratio:
        new_height = round(base.width / target_ratio)
        top = (base.height - new_height) // 2
        base = base.crop((0, top, base.width, top + new_height))
    zoom = 1 + (shot.zoom - 1) * smoothstep(progress)
    crop_w = max(2, round(base.width / zoom))
    crop_h = max(2, round(base.height / zoom))
    drift_x = round((base.width - crop_w) * (0.42 + 0.12 * smoothstep(progress)))
    drift_y = round((base.height - crop_h) * (0.48 - 0.06 * smoothstep(progress)))
    drift_x = max(0, min(base.width - crop_w, drift_x))
    drift_y = max(0, min(base.height - crop_h, drift_y))
    base = base.crop((drift_x, drift_y, drift_x + crop_w, drift_y + crop_h))
    return base.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


THEMES = {
    "blue": ("#143c8a", "#2869dd", "#f3d27b", "#fff7d9"),
    "red": ("#7f1e2b", "#d74646", "#f0ba66", "#fff2cf"),
    "green": ("#195f38", "#2e9a58", "#e1c066", "#fff2cf"),
    "cream": ("#2b315a", "#f3d6a0", "#c1844d", "#182044"),
}


def pixel_polygon(x: int, y: int, w: int, h: int) -> list[tuple[int, int]]:
    step = 10
    return [
        (x + step * 3, y),
        (x + w - step * 3, y),
        (x + w - step * 3, y + step),
        (x + w - step, y + step),
        (x + w - step, y + step * 2),
        (x + w + step * 4, y + step * 2),
        (x + w + step * 4, y + h - step),
        (x + w - step, y + h - step),
        (x + w - step, y + h),
        (x + step, y + h),
        (x + step, y + h - step),
        (x - step * 4, y + h - step),
        (x - step * 4, y + step * 2),
        (x + step, y + step * 2),
        (x + step, y + step),
        (x + step * 3, y + step),
    ]


def draw_banner(image: Image.Image, shot: Shot, local_time: float) -> None:
    duration = shot.end - shot.start
    enter = smoothstep(local_time / 0.42)
    leave = smoothstep((duration - local_time) / 0.38)
    visibility = min(enter, leave)
    if visibility <= 0:
        return
    draw = ImageDraw.Draw(image, "RGBA")
    dark, fill, trim, text_color = THEMES[shot.pixel_theme]
    banner_w = 1510
    banner_h = 146
    x = (WIDTH - banner_w) // 2
    y_final = 54
    y = round(-banner_h - 20 + (y_final + banner_h + 20) * visibility)
    shadow = [(px + 8, py + 10) for px, py in pixel_polygon(x, y, banner_w, banner_h)]
    draw.polygon(shadow, fill=(15, 18, 38, 112))
    draw.polygon(pixel_polygon(x, y, banner_w, banner_h), fill=dark)
    draw.polygon(pixel_polygon(x + 9, y + 9, banner_w - 18, banner_h - 18), fill=fill)
    draw.rectangle((x + 46, y + 17, x + banner_w - 46, y + 25), fill=trim)
    draw.rectangle((x + 46, y + banner_h - 25, x + banner_w - 46, y + banner_h - 17), fill=trim)
    headline = font(FONT_MONO, 26)
    body = font(FONT_MONO, 20)
    draw.text((x + 76, y + 42), shot.banner, font=headline, fill=text_color, stroke_width=1, stroke_fill=dark)
    draw.text((x + 76, y + 87), shot.kicker, font=body, fill=text_color)
    sparkle_x = x + banner_w - 84
    sparkle_y = y + 72
    for dx, dy, size in ((0, 0, 15), (-27, 2, 7), (26, -10, 5), (18, 20, 4)):
        cx, cy = sparkle_x + dx, sparkle_y + dy
        draw.polygon(((cx, cy - size), (cx + size // 3, cy - size // 3), (cx + size, cy), (cx + size // 3, cy + size // 3), (cx, cy + size), (cx - size // 3, cy + size // 3), (cx - size, cy), (cx - size // 3, cy - size // 3)), fill=trim)


def draw_cursor(draw: ImageDraw.ImageDraw, x: int, y: int, color: str = "#fcf3d4") -> None:
    points = ((x, y), (x, y + 42), (x + 11, y + 32), (x + 20, y + 52), (x + 30, y + 47), (x + 20, y + 27), (x + 36, y + 26))
    draw.polygon(points, fill=color, outline="#17203e", width=3)


def draw_overlay(image: Image.Image, shot: Shot, local_time: float) -> None:
    if not shot.overlay:
        return
    draw = ImageDraw.Draw(image, "RGBA")
    duration = shot.end - shot.start
    p = smoothstep(clamp((local_time - 1.0) / max(0.1, duration - 1.8)))
    mono = font(FONT_MONO, 21)
    small = font(FONT_MONO, 17)

    if shot.overlay == "assemble":
        for index in range(5):
            x = 260 + index * 300
            y = 710 + int(math.sin(index * 1.5) * 62)
            alpha = round(210 * clamp(p * 5 - index * 0.65))
            draw.rounded_rectangle((x, y, x + 220, y + 88), radius=8, fill=(255, 246, 215, alpha), outline=(32, 58, 84, alpha), width=3)
            draw.text((x + 18, y + 30), ("GOAL", "ACTOR", "IMPACT", "QUESTION", "ROUTE")[index], font=mono, fill=(21, 36, 64, alpha))
    elif shot.overlay in ("team-add", "ai-assumed"):
        w, h = 660, 150
        x, y = 1040, 790
        rise = round((1 - p) * 120)
        fill = (210, 246, 240, 235) if shot.overlay == "team-add" else (232, 224, 255, 235)
        draw.rounded_rectangle((x, y + rise, x + w, y + h + rise), radius=12, fill=fill, outline="#1b6c70", width=4)
        draw.line((x - 140, y + 76, x, y + 76 + rise), fill="#1b6c70", width=4)
        label = "TEAM ADDS" if shot.overlay == "team-add" else "AI SUGGESTION · ASSUMED"
        draw.text((x + 22, y + 18 + rise), label, font=small, fill="#1b6c70")
        draw.text((x + 22, y + 61 + rise), "Input sources · model version · review state", font=mono, fill="#17203e")
        draw_cursor(draw, x - 72 + round(p * 74), y + 58)
    elif shot.overlay == "cursor-select":
        pulse = 18 + round(6 * math.sin(local_time * 8))
        x, y = 1452, 594
        draw.ellipse((x - pulse, y - pulse, x + pulse, y + pulse), outline=(40, 105, 221, 220), width=5)
        draw_cursor(draw, x + 34, y + 36)
    elif shot.overlay == "team-remove":
        x, y, w, h = 1110, 655, 590, 126
        alpha = round(220 * (1 - p))
        draw.rounded_rectangle((x, y, x + w, y + h), radius=12, fill=(255, 231, 222, alpha), outline=(180, 58, 66, alpha), width=4)
        draw.text((x + 24, y + 44), "DUPLICATE CONSENT QUESTION", font=mono, fill=(80, 30, 42, alpha))
        draw.line((x + 20, y + h // 2, x + w - 20, y + h // 2), fill=(180, 58, 66, alpha), width=6)
        if p > 0.55:
            draw.text((x + 120, y + 176), "route re-attached", font=small, fill="#173e67")
            draw.line((x + 50, y + 151, x + 112, y + 186), fill="#173e67", width=4)
    elif shot.overlay == "pulse-path":
        for index in range(5):
            phase = clamp(p * 1.4 - index * 0.12)
            x = 330 + round(index * 310 * phase)
            y = 825 - round(math.sin(index * 0.9) * 50)
            r = 12 + round(6 * math.sin(local_time * 7 + index))
            draw.ellipse((x-r, y-r, x+r, y+r), fill="#f4d945", outline="#f8f1c2", width=3)
    elif shot.overlay == "narrative-cycle":
        frame_index = min(8, int(p * 9))
        labels = ("GOAL", "FRACTURE", "PATHOLOGIST", "ANALYST", "COORDINATOR", "STEWARD", "CONVERGENCE", "ROUTES", "TRACE")
        x, y = 1390, 840
        draw.rounded_rectangle((x, y, x + 390, y + 84), radius=8, fill=(24, 30, 64, 230), outline="#f2d36f", width=3)
        draw.text((x + 28, y + 27), f"{frame_index + 1:02d} · {labels[frame_index]}", font=mono, fill="#fff4c7")
    elif shot.overlay in ("proposal", "accepted"):
        x, y = 1030, 710
        w, h = 720, 178
        color = "#2869dd" if shot.overlay == "proposal" else "#268256"
        draw.rounded_rectangle((x, y, x + w, y + h), radius=10, fill=(248, 241, 216, 238), outline=color, width=5)
        draw.text((x + 28, y + 23), "AI PROPOSAL" if shot.overlay == "proposal" else "TEAM-ACCEPTED PATH", font=small, fill=color)
        draw.text((x + 28, y + 66), "Human-review state at every generated assertion", font=mono, fill="#17203e")
        draw.text((x + 28, y + 112), "→ Generated Assertion Review-State Contract", font=small, fill=color)
        draw_cursor(draw, x - 55 + round(p * 60), y + 67)


def wet_mask(progress: float, seed: int) -> Image.Image:
    q = math.floor(clamp(progress) * 29) / 29
    if q <= 0:
        return Image.new("L", (WIDTH, HEIGHT), 0)
    if q >= 0.965:
        return Image.new("L", (WIDTH, HEIGHT), 255)
    mask = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(mask)
    rng = random.Random(seed)
    points = []
    samples = 72
    for index in range(samples + 1):
        x = round(index * WIDTH / samples)
        local = clamp(q * 1.28 - 0.11 + math.sin(index * 0.58 + seed) * 0.03 + rng.uniform(-0.045, 0.055))
        points.append((x, round(local * HEIGHT)))
    draw.polygon([(0, 0), (WIDTH, 0), *reversed(points)], fill=255)
    for _ in range(18):
        x = rng.randrange(20, WIDTH - 20)
        index = min(samples, round(x / WIDTH * samples))
        y = points[index][1]
        if y <= 0:
            continue
        length = rng.randrange(35, 150)
        width = rng.randrange(7, 23)
        draw.rounded_rectangle((x-width//2, y-5, x+width//2, min(HEIGHT, y+length)), radius=width//2, fill=255)
    return mask


def dry_mask(progress: float, seed: int) -> Image.Image:
    q = math.floor(clamp(progress) * 29) / 29
    if q <= 0:
        return Image.new("L", (WIDTH, HEIGHT), 0)
    if q >= 0.965:
        return Image.new("L", (WIDTH, HEIGHT), 255)
    mask = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(mask)
    rng = random.Random(seed)
    for row in range(22):
        for col in range(38):
            arrival = 0.05 + col / 37 * 0.65 + row / 21 * 0.21 + rng.uniform(-0.08, 0.075)
            if q >= arrival:
                x0 = col * 51 - rng.randrange(0, 7)
                y0 = row * 50 + rng.randrange(-5, 6)
                draw.rectangle((x0, y0, x0 + 68, y0 + rng.randrange(39, 53)), fill=255)
    return mask


def compose_frame(sources: dict[str, Image.Image], frame_index: int) -> Image.Image:
    now = frame_index / FPS
    starts = [shot.start for shot in SHOTS]
    shot_index = max(0, bisect.bisect_right(starts, now) - 1)
    shot = SHOTS[shot_index]
    local = now - shot.start
    progress = clamp(local / (shot.end - shot.start))
    image = crop_camera(sources[shot.render], shot, progress)
    draw_overlay(image, shot, local)
    draw_banner(image, shot, local)

    if shot_index > 0 and local < TRANSITION:
        previous = SHOTS[shot_index - 1]
        previous_image = crop_camera(sources[previous.render], previous, 1.0)
        draw_overlay(previous_image, previous, previous.end - previous.start - local)
        draw_banner(previous_image, previous, previous.end - previous.start - local)
        mask = wet_mask(local / TRANSITION, 3000 + shot_index) if shot_index % 2 else dry_mask(local / TRANSITION, 5000 + shot_index)
        image = Image.composite(image, previous_image, mask)

    if now < 0.55:
        image = Image.blend(Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND), image, smoothstep(now / 0.55))
    if now > DURATION - 0.75:
        image = Image.blend(image, Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND), smoothstep((now - (DURATION - 0.75)) / 0.7))
    return image


def midi_frequency(note: int) -> float:
    return 440 * 2 ** ((note - 69) / 12)


@lru_cache(maxsize=None)
def guitar(note: int) -> array:
    count = round(0.7 * SAMPLE_RATE)
    out = array("f", [0]) * count
    freq = midi_frequency(note)
    for i in range(count):
        t = i / SAMPLE_RATE
        env = min(1, t / 0.008) * math.exp(-5.2 * t / 0.7)
        phase = 2 * math.pi * freq * t
        out[i] = env * (math.sin(phase) + 0.42*math.sin(2*phase+.2) + 0.2*math.sin(3*phase+.41) + 0.1*math.sin(4*phase+.76)) * 0.5
    return out


@lru_cache(maxsize=None)
def rhodes(note: int) -> array:
    count = round(1.05 * SAMPLE_RATE)
    out = array("f", [0]) * count
    freq = midi_frequency(note)
    for i in range(count):
        t = i / SAMPLE_RATE
        env = min(1, t / 0.014) * math.exp(-3.8 * t / 1.05)
        p = 2 * math.pi * freq * t
        trem = 0.94 + 0.06 * math.sin(2 * math.pi * 5.1 * t)
        out[i] = (math.sin(p) + 0.22 * math.sin(2.01*p + 1.6*math.sin(.503*p))) * env * trem * 0.62
    return out


@lru_cache(maxsize=None)
def upright_bass(note: int, variation: int) -> array:
    duration = 0.92
    count = round(duration * SAMPLE_RATE)
    freq = midi_frequency(note)
    delay = max(2, round(SAMPLE_RATE / freq))
    rng = random.Random(RNG_SEED + note * 97 + variation)
    ring = [rng.uniform(-1, 1) for _ in range(delay)]
    smoothed = [0.18*ring[(i-1)%delay] + 0.64*ring[i] + 0.18*ring[(i+1)%delay] for i in range(delay)]
    ring = smoothed
    out = array("f", [0]) * count
    index = 0
    for i in range(count):
        t = i / SAMPLE_RATE
        current = ring[index]
        nxt = ring[(index + 1) % delay]
        ring[index] = 0.994 * 0.5 * (current + nxt)
        index = (index + 1) % delay
        attack = min(1, t / 0.01)
        release = math.exp(-2.2 * t / duration)
        finger = rng.uniform(-1, 1) * math.exp(-240*t) * 0.16
        body = current * 0.68 + 0.2*math.sin(2*math.pi*freq*t) + 0.07*math.sin(4*math.pi*freq*t)
        out[i] = math.tanh((body + finger) * 1.25) * attack * release
    return out


@lru_cache(maxsize=None)
def hat(kind: int, variation: int) -> array:
    durations = (0.04, 0.08, 0.16)
    duration = durations[kind]
    count = round(duration * SAMPLE_RATE)
    rng = random.Random(RNG_SEED + 8000 + kind * 1000 + variation)
    out = array("f", [0]) * count
    phases = [rng.random()*math.tau for _ in range(5)]
    freqs = (6100, 7730, 9960, 12200, 14100)
    low = 0.0
    for i in range(count):
        t = i / SAMPLE_RATE
        white = rng.uniform(-1, 1)
        low = low * 0.82 + white * 0.18
        high = white - low
        metal = sum(math.sin(math.tau*f*t + phase) for f,phase in zip(freqs,phases)) / 5
        env = min(1, t / 0.0008) * math.exp(-(8.5 if kind == 0 else 5.5) * t / duration)
        out[i] = (0.68*high + 0.32*metal) * env * (0.45 if kind == 0 else 0.34)
    return out


@lru_cache(maxsize=None)
def rim(variation: int) -> array:
    count = round(0.08 * SAMPLE_RATE)
    rng = random.Random(RNG_SEED + 12000 + variation)
    out = array("f", [0]) * count
    for i in range(count):
        t=i/SAMPLE_RATE; env=math.exp(-11*t/.08)
        out[i]=(0.34*math.sin(math.tau*1710*t)+0.22*math.sin(math.tau*2480*t)+rng.uniform(-1,1)*.12)*env
    return out


@lru_cache(maxsize=None)
def surdo(variation: int) -> array:
    count=round(.32*SAMPLE_RATE); out=array("f",[0])*count
    for i in range(count):
        t=i/SAMPLE_RATE; freq=88-30*clamp(t/.32); env=min(1,t/.007)*math.exp(-5*t/.32)
        out[i]=(math.sin(math.tau*freq*t)+.14*math.sin(math.tau*freq*2*t))*env*.75
    return out


@lru_cache(maxsize=None)
def brush(variation: int) -> array:
    count=round(.72*SAMPLE_RATE); rng=random.Random(RNG_SEED+16000+variation); out=array("f",[0])*count; low=0.0
    for i in range(count):
        t=i/SAMPLE_RATE; white=rng.uniform(-1,1); low=.84*low+.16*white
        out[i]=(white-low)*(math.sin(math.pi*t/.72)**1.5)*.24
    return out


class Mix:
    def __init__(self) -> None:
        self.count=round(DURATION*SAMPLE_RATE)
        self.left=array("f",[0])*self.count
        self.right=array("f",[0])*self.count
        self.bass_send=array("f",[0])*self.count

    def add(self,wave:array,start:float,gain:float,pan:float=0,bass_send:float=0) -> None:
        origin=max(0,round(start*SAMPLE_RATE)); end=min(self.count,origin+len(wave)); angle=(clamp(pan,-1,1)+1)*math.pi/4
        gl=gain*math.cos(angle); gr=gain*math.sin(angle)
        for target,sample in zip(range(origin,end),wave):
            self.left[target]+=sample*gl; self.right[target]+=sample*gr
            if bass_send: self.bass_send[target]+=sample*gain*bass_send

    def moss_reverb(self) -> None:
        delays=(2777,4217,6011,9283); buffers=[[0.0]*d for d in delays]; indices=[0]*4; states=[0.0]*4
        for i in range(self.count):
            returns=[buffers[j][indices[j]] for j in range(4)]
            wet_l=(returns[0]+returns[2])*0.075; wet_r=(returns[1]+returns[3])*0.075
            highpass=0.0 if i==0 else self.bass_send[i]-.965*self.bass_send[i-1]
            inputs=(returns[0]+returns[1]+returns[2]+returns[3], returns[0]-returns[1]+returns[2]-returns[3], returns[0]+returns[1]-returns[2]-returns[3], returns[0]-returns[1]-returns[2]+returns[3])
            for j in range(4):
                states[j]=.86*states[j]+.14*math.tanh(inputs[j]*.5)
                buffers[j][indices[j]]=highpass*.24 + states[j]*.61
                indices[j]=(indices[j]+1)%delays[j]
            self.left[i]+=wet_l*(1+.03*math.sin(math.tau*.071*i/SAMPLE_RATE))
            self.right[i]+=wet_r*(1+.03*math.sin(math.tau*.103*i/SAMPLE_RATE))

    def finish(self) -> None:
        self.moss_reverb(); fade_in=round(.45*SAMPLE_RATE); fade_out=round(1.5*SAMPLE_RATE); ss=0.0; peak=0.0
        for i in range(self.count):
            fade=min(1,i/fade_in,(self.count-i-1)/fade_out)
            l=math.tanh(self.left[i]*1.35)*fade; r=math.tanh(self.right[i]*1.35)*fade
            self.left[i]=l; self.right[i]=r; ss+=l*l+r*r; peak=max(peak,abs(l),abs(r))
        rms=math.sqrt(ss/(self.count*2)) or 1; gain=min(.78/max(peak,1e-9),.095/rms)
        for i in range(self.count): self.left[i]*=gain; self.right[i]*=gain


CHORDS={
"G69":((47,52,57,62),31),"D13sus":((48,55,59,64),38),"D13":((48,54,59,64),38),"Gmaj9":((47,54,57,62),31),"Gmaj9/B":((47,54,57,62),35),"Bm9":((50,57,61,66),35),"E13":((50,56,61,66),40),"Am9":((55,59,60,64),33),"B7#9":((45,50,63,66),35),"Em9":((55,62,66,71),40),"A13":((55,61,66,71),33),"F#7alt":((52,55,58,61),30),"Cm9":((51,58,62,67),36),"F13":((51,57,62,67),29),"Bbm9":((49,56,60,65),34),"Eb13":((49,55,60,65),39),"D13b9":((48,54,59,63),38),"E13b9":((50,56,61,65),40)}

PROGRESSION=(("G69",None),("D13sus","D13"),("Gmaj9",None),("Bm9","E13"),("Am9",None),("D13",None),("Gmaj9/B",None),("B7#9",None),("Em9",None),("A13",None),("Am9",None),("D13",None),("Gmaj9",None),("F#7alt",None),("Bm9",None),("E13",None),("Am9",None),("D13",None),("Cm9",None),("F13",None),("Bbm9",None),("Eb13","D13b9"),("Gmaj9",None),("E13b9",None),("Am9",None),("D13",None),("Gmaj9/B","D13sus"),("G69",None))


def generate_score() -> Mix:
    mix=Mix(); sixteenth=BAR/16; rng=random.Random(RNG_SEED)
    for bar_index,chord_pair in enumerate(PROGRESSION):
        bar_start=bar_index*BAR; guitar_steps=(0,3,6,10,13) if bar_index%2==0 else (0,3,7,10,14)
        for step in guitar_steps:
            chord_name=chord_pair[1] if chord_pair[1] and step>=8 else chord_pair[0]; notes,_=CHORDS[chord_name]
            for n,note in enumerate(notes): mix.add(guitar(note),bar_start+step*sixteenth+n*.0045,.062,-.2+n*.035)
        root=CHORDS[chord_pair[0]][1]; next_root=CHORDS[PROGRESSION[(bar_index+1)%28][0]][1]
        for idx,(note,step,gain) in enumerate(((root,0,.19),(root+7,7,.13),(root+12,12,.11),(next_root-1,15,.065))):
            mix.add(upright_bass(note,bar_index*4+idx),bar_start+step*sixteenth+.009,.9*gain,-.04,bass_send=.24)
        for step in range(16):
            mix.add(hat(0,(bar_index*16+step)%31),bar_start+step*sixteenth+(.011 if step%2 else 0),.026,-.28+.56*((step%4)/3))
            if (bar_index*17+step*11)%7 in (0,1,4):
                mix.add(hat(1,(bar_index*19+step)%29),bar_start+(step+.5)*sixteenth,.022,(-.65 if (step+bar_index)%2 else .65))
        if bar_index%2==0: mix.add(hat(2,bar_index%17),bar_start+15*sixteenth,.02,.52)
        for step in ((3,6,10,13) if bar_index%2==0 else (2,7,10,14)):
            mix.add(rim((bar_index+step)%7),bar_start+step*sixteenth,.075,.18)
        mix.add(surdo(bar_index%3),bar_start,.11,-.12); mix.add(surdo((bar_index+1)%3),bar_start+8*sixteenth,.075,-.1)
        if bar_index>=2:
            motif=(71,69,70,71,74,72,69,67); offsets=(1,2.5,5,6.5,9,10.5,13,14.5)
            for note,step in zip(motif,offsets):
                if rng.random()>.32: mix.add(rhodes(note+(2 if 22<=bar_index<26 else 0)),bar_start+step*sixteenth,.035,.18)
    for transition_index,shot in enumerate(SHOTS[1:]):
        start=shot.start-TRANSITION
        mix.add(brush(transition_index),start,.045,-.4 if transition_index%2 else .4)
        for glint in range(5): mix.add(hat(1,(transition_index*5+glint)%29),shot.start-.31+glint*.055,.036,-.65+glint*.325)
    mix.finish(); print("Synthesized 28-bar Mosslight Bossa score"); return mix


def pcm_bytes(mix:Mix,start:int,count:int)->bytes:
    values=array("h")
    for i in range(start,min(mix.count,start+count)):
        values.append(round(clamp(mix.left[i],-1,1)*32767)); values.append(round(clamp(mix.right[i],-1,1)*32767))
    return values.tobytes()


def encode(sources:dict[str,Image.Image],mix:Mix,output:Path)->None:
    output.parent.mkdir(parents=True,exist_ok=True); container=av.open(str(output),"w")
    container.metadata["title"]="Impact Map — Style Cycle and Collaboration Vignettes"; container.metadata["artist"]="Driftframe Studios"
    video=container.add_stream("libx264",rate=FPS); video.width=WIDTH; video.height=HEIGHT; video.pix_fmt="yuv420p"; video.bit_rate=9_000_000; video.options={"crf":"18","preset":"medium"}
    audio=container.add_stream("aac",rate=SAMPLE_RATE); audio.bit_rate=256_000; audio.codec_context.layout="stereo"; samples_per_frame=SAMPLE_RATE//FPS
    for frame_index in range(TOTAL_FRAMES):
        frame=av.VideoFrame.from_image(compose_frame(sources,frame_index)); frame.pts=frame_index; frame.time_base=Fraction(1,FPS)
        for packet in video.encode(frame): container.mux(packet)
        start=frame_index*samples_per_frame; af=av.AudioFrame(format="s16",layout="stereo",samples=samples_per_frame); af.sample_rate=SAMPLE_RATE; af.pts=start; af.time_base=Fraction(1,SAMPLE_RATE); af.planes[0].update(pcm_bytes(mix,start,samples_per_frame))
        for packet in audio.encode(af): container.mux(packet)
        if frame_index%(FPS*5)==0: print(f"Encoded {frame_index/FPS:04.0f}s / {DURATION:.0f}s")
    for packet in video.encode(): container.mux(packet)
    for packet in audio.encode(): container.mux(packet)
    container.close(); print(f"Wrote {output}")


def parse_args()->argparse.Namespace:
    here=Path(__file__).resolve().parent; parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source",type=Path,default=here.parent/"index.html"); parser.add_argument("--output",type=Path,default=here/"impact-map-style-cycle-movie.mp4"); parser.add_argument("--keep-build",action="store_true")
    return parser.parse_args()


def run(args:argparse.Namespace,build:Path)->None:
    paths=render_sources(args.source.resolve(),build); sources={name:Image.open(path).convert("RGB") for name,path in paths.items()}; score=generate_score(); encode(sources,score,args.output.resolve())


def main()->None:
    args=parse_args()
    if not args.source.exists(): raise SystemExit(f"Source file not found: {args.source}")
    if args.keep_build:
        build=Path(tempfile.mkdtemp(prefix="impact-map-style-cycle-")); print(f"Keeping render materials at {build}"); run(args,build)
    else:
        with tempfile.TemporaryDirectory(prefix="impact-map-style-cycle-") as temporary: run(args,Path(temporary))


if __name__=="__main__": main()
