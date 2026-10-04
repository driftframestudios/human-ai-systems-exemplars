"""Render the fixed-baseline discovery comparison and a conceptual selection map.

Input is the authored Issue #371 count projection. Figures describe source-file
discovery and organization; runtime cases and acceptance remain separate.
"""
import argparse
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

PAPER = "#f7f4ec"
INK = "#233c42"
TEAL = "#176d73"
SLATE = "#778689"
PALE = "#e1e9e5"
LINE = "#d4d9d2"


def save(fig, output, name):
    fig.savefig(output / (name + ".png"), dpi=170, facecolor=PAPER)
    fig.savefig(output / (name + ".svg"), facecolor=PAPER)
    plt.close(fig)


def draw_discovery(data, output):
    fig = plt.figure(figsize=(14, 11), facecolor=PAPER)
    fig.text(.06, .951, "A clearer route to the same tests", fontsize=29,
             fontfamily="DejaVu Serif", color=INK, weight="bold")
    fig.text(.06, .909, "Before / after discovery | fixed baseline of 81 root Node test modules",
             fontsize=13, color=INK)
    for x, label, value, detail in [
        (.06, "BEFORE", data["before"], "Direct root-script selection"),
        (.50, "AFTER: CANDIDATE CATALOG", data["after"], "Catalog-listed baseline modules"),
    ]:
        fig.text(x, .855, label, fontsize=10, weight="bold", color=TEAL)
        fig.text(x, .794, str(value), fontsize=41, weight="bold", color=INK)
        fig.text(x + .09, .80, "/ 81 modules", fontsize=15, color=SLATE)
        fig.text(x, .765, detail, fontsize=12, color=INK)
    fig.text(.06, .718, "By existing family", fontsize=16, weight="bold", color=INK)
    fig.text(.06, .692, "Open circle: direct root alias     Filled circle: catalog listing",
             fontsize=11, color=SLATE)

    rows = sorted(data["rows"], key=lambda row: (-row["after"], row["family"]))
    ax = fig.add_axes([.31, .16, .53, .49], facecolor=PAPER)
    labels = {
        "visualization-fidelity-atlas": "Visualization Fidelity Atlas",
        "core-architectures": "Core architectures",
        "context-canvas": "Context Canvas",
        "prod-deployment": "Production deployment",
        "public-references": "Public references",
        "investment-analysis": "Investment analysis",
        "narrative-architectures": "Narrative architectures",
        "iframe-routes": "Iframe routes", "schema-pages": "Schema pages",
    }
    for index, row in enumerate(rows):
        before, after = row["before"], row["after"]
        ax.plot([before, after], [index, index], color=LINE, linewidth=3, zorder=1)
        ax.scatter([before], [index + .10], s=62, facecolor=PAPER,
                   edgecolor=SLATE, linewidth=1.7, zorder=3)
        ax.scatter([after], [index - .10], s=53, color=TEAL, zorder=4)
        ax.text(19.0, index, str(before) + "  /  " + str(after),
                ha="left", va="center", fontsize=11, color=INK, clip_on=False)
    ax.set_yticks(range(len(rows)), [labels.get(row["family"], row["family"].replace("-", " ").title()) for row in rows])
    ax.invert_yaxis()
    ax.set_xlim(-.4, 18)
    ax.set_xticks([0, 5, 10, 15])
    ax.set_xlabel("Source modules", loc="left", labelpad=12, color=SLATE)
    ax.tick_params(axis="both", length=0, labelsize=11, colors=INK)
    ax.tick_params(axis="y", pad=17)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.grid(axis="x", color=LINE, linewidth=.7)
    ax.set_axisbelow(True)
    ax.text(19.0, -1.0, "Before / after", fontsize=10, color=SLATE, clip_on=False)
    fig.text(.06, .082, "75 nonbrowser modules + 6 browser modules remain the same baseline.",
             fontsize=12, color=INK, weight="bold")
    fig.text(.06, .056, "One new planner-test module is counted separately. No application test files moved.",
             fontsize=11, color=INK)
    fig.text(.06, .028, "Source: main@e1f00de census + Issue #371 catalog. Discovery mechanisms differ; counts describe neither executed cases nor behavioral coverage.",
             fontsize=9, color=SLATE)
    save(fig, output, "before-after-discovery")


def box(ax, x, y, w, h, face=PAPER, edge=LINE):
    patch = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.45,rounding_size=0.8",
                           linewidth=1.1, edgecolor=edge, facecolor=face, zorder=3)
    ax.add_patch(patch)


def draw_organization(data, output):
    fig = plt.figure(figsize=(14, 9), facecolor=PAPER)
    fig.text(.05, .946, "Keep the owners. Add a usable map.", fontsize=28,
             fontfamily="DejaVu Serif", color=INK, weight="bold")
    fig.text(.05, .90, "The new layer lists commands, prerequisites and holds. Execution stays with existing runners.",
             fontsize=12, color=INK)
    ax = fig.add_axes([.03, .16, .94, .68])
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 86)
    ax.axis("off")
    ax.text(2, 83, "EXISTING SOURCE GROUPS", fontsize=10, color=TEAL, weight="bold")
    ax.text(64, 83, "SEVEN SELECTABLE BUNDLES", fontsize=10, color=TEAL, weight="bold")
    for row, y in zip(data["sourceGroups"], [68, 57, 46, 35, 24, 13], strict=True):
        ax.add_patch(FancyArrowPatch((36, y + 3.5), (43, 44),
                     arrowstyle="-", linewidth=.8, color=LINE, zorder=1))
        box(ax, 2, y, 34, 8)
        ax.text(3.7, y + 4, row["label"], fontsize=10.5, color=INK, va="center")
        ax.text(34.5, y + 4, str(row["count"]), fontsize=12, color=TEAL,
                weight="bold", ha="right", va="center")
    box(ax, 43, 32, 15, 25, face=PALE, edge=TEAL)
    ax.text(50.5, 51, "PLAN ONLY", fontsize=10, color=TEAL, weight="bold", ha="center")
    ax.text(50.5, 43.5, str(data["catalogSuites"]), fontsize=26, color=INK, ha="center", weight="bold")
    ax.text(50.5, 37, "owned suites", fontsize=10, color=INK, ha="center")
    names = {
        "source-unit": "Source and unit",
        "family-integration": "Family integration",
        "focused-browser": "Focused browser",
        "visual-media": "Visual and media",
        "carrier": "Carrier",
        "live": "Live receiver",
        "research": "Research",
    }
    for row, y in zip(data["bundles"], [70, 60, 50, 40, 30, 20, 10], strict=True):
        ax.add_patch(FancyArrowPatch((58, 44), (64, y + 3.5),
                     arrowstyle="-|>", mutation_scale=9, linewidth=.85, color=SLATE, zorder=1))
        box(ax, 64, y, 34, 7)
        ax.text(65.7, y + 3.5, names[row["id"]], fontsize=11, color=INK, va="center")
        ax.text(96.5, y + 3.5, str(row["suites"]) + " suites", fontsize=10,
                color=TEAL, ha="right", va="center")
    fig.text(.05, .115, "Bundle membership overlaps. Counts on the right are not additive.",
             fontsize=12, color=INK, weight="bold")
    fig.text(.05, .081, "Left: selected baseline owner groups, counted as source files. Right: candidate catalog suites, which group one or more files.",
             fontsize=10, color=INK)
    fig.text(.05, .050, "Arrows mean discovery relationships, not automatic execution. Live routes retain explicit holds; related aliases retain their own scope.",
             fontsize=10, color=INK)
    fig.text(.05, .022, "Source: main@e1f00de census + Issue #371 metadata. Existing Node, Playwright, Python and project boundaries remain intact.",
             fontsize=9, color=SLATE)
    save(fig, output, "test-organization")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    data = json.loads(args.data.read_text(encoding="utf-8"))
    if (sum(row["before"] for row in data["rows"]) != data["before"]
            or sum(row["after"] for row in data["rows"]) != data["after"]
            or data["after"] != data["baselineTotal"]):
        raise ValueError("Family counts must reconcile with the fixed baseline.")
    args.output.mkdir(parents=True, exist_ok=True)
    with plt.rc_context({"font.family": "DejaVu Sans", "svg.fonttype": "none"}):
        draw_discovery(data, args.output)
        draw_organization(data, args.output)


if __name__ == "__main__":
    main()
