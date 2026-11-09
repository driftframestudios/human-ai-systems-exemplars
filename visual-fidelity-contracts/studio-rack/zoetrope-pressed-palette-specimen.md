# Chromatic Pressed Reel Specimen

Preserve the cobalt and rose pressed treatments explored in the People mixing
desk as a reusable art-direction specimen. Their saturated faces, pale labels
and inset depth were welcomed. The live Studio uses the uniform teal/paper
selection grammar in [Zoetrope Preset Selection](zoetrope-preset-selection.md).

**Standing:** preserved specimen `0.1.0`; ID
`vfc:chromatic-pressed-reel-specimen`; captured 9 November 2026 during
[#884](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/884).
This document preserves the alternative without applying it to the current Studio.

## Exact state treatment

The option stays in its existing stationary perimeter position. Pressing changes
paint, border style and depth while preserving the target size, text position,
focus location and reel behavior. The housing and rotor retain their teal, cobalt
or rose palette.

| State | Face | Foreground | Depth |
| --- | --- | --- | --- |
| Resting | `--native-paper` (`#f8f1d9` at capture) | `--native-text` | Raised shadow |
| Teal pressed | `--native-signal` (`#56d8c9`) | `--native-text` | Inset shadow, double border |
| Cobalt pressed | `--about-cobalt` (`#2855f3`) | `--native-paper` | Same inset shadow and double border |
| Rose pressed | `--studio-rose-ink` (`#71394d`) | `--native-paper` | Same inset shadow and double border |

These are the preserved declarations, intended for an explicitly chosen receiving
variant rather than a global override:

```css
.specimen-reel .native-reel__choice {
  color: var(--native-text);
  background: var(--native-paper);
  border: .1rem solid var(--studio-screen);
  box-shadow: .13rem .16rem 0 var(--native-key-shadow);
}
.specimen-reel .native-reel__choice[aria-pressed='true'] {
  color: var(--native-text);
  background: var(--native-signal);
  border-style: double;
  box-shadow: inset .1rem .15rem .15rem
    color-mix(in srgb, var(--about-deep-teal) 50%, transparent);
}
.specimen-reel[data-reel-variant='cobalt'] .native-reel__choice[aria-pressed='true'] {
  background: var(--about-cobalt);
  color: var(--native-paper);
}
.specimen-reel[data-reel-variant='rose'] .native-reel__choice[aria-pressed='true'] {
  background: var(--studio-rose-ink);
  color: var(--native-paper);
}
```

At capture, `--native-key-shadow` is `#45534b` and `--about-deep-teal` is
`#00776b`. Existing shared tokens remain the implementation route; the literal
values above preserve this specimen's appearance for later comparison.

## Behavior and future receiver

`aria-pressed` remains the selected-state authority. The outline and inset depth
supplement color. Hover retains readable labels; keyboard focus remains visible.
Motion belongs to the decorative rotor, leaving the control targets stationary.
Forced colors uses platform button colors and a selected outline. Clear remains
a separate, legible ghost control.

A future receiver may choose this saturated-face grammar when its purpose makes
color-specific selection useful. It should use one coherent grammar throughout
that composition and verify resting, selected, hover and focus states against the
actual paint. Current Studio options retain `--canvas-paper` resting faces and
teal selected faces across every housing color. The shared
[reel controller](../../collaboration/native-investment-studio/reel-control.mjs)
owns behavior; [instrument CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-instrument.css)
owns the live uniform treatment. The receiving PR carries rendered evidence;
this specimen preserves an optional visual direction.
