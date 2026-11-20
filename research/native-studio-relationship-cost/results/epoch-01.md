# Native Studio relationship-cost observations

Source: `cf16539e2871d948b0539f679fcbb0915c0fde0c`. Freeze: `4226d0c9f0a5c6a18165b1da82366fe14446471933adf253a1ad1281b702d77f`.

The complete population contains 60 source runs (12,000 traces) and 135 browser runs (6,750 pairs). Each cell retains five sequential runs. Publication remains held.

One or more observed runs exceed a prospective local threshold. Review the named phase and run variation before selecting a localized change and a new comparison.

Thresholds use the worst per-run processing median (16 ms), processing p95 (50 ms), and rendering-opportunity p95 (100 ms). Per-phase run ranges retain variation; these thresholds are local engineering comparison targets.

Browser processing covers explicit receiver commands and synthetic DOM events. Model time covers intercepted state APIs; template preparation remains within its full UI span. Rendering opportunity is elapsed time to a subsequent animation frame, including observer bookkeeping, and carries its own population. Trusted input delay, completed paint, and heap allocation require separate observations.

All durations below are milliseconds. Each duration cell reads **median / nearest-rank p95 / min–max**. Different phases and rounds remain separate. Selection contains 50 pairs and 100 same-labelled phase observations per run.

## Clock observations

Source empty timer pair: 0.000 / 0.000 / 0.000–0.001 (1000 observations). Smallest observed advancing delta: 0.000.

Browser clock summaries accompany each run below. Quantized zero values remain in every summary; clock overhead is reported separately.

## source · small · prepare

Population: people=4, teams=2, work=4, practices=2, contributions=2, connections=4, references=60, inputUtf8Bytes=4288.

| Run | Phase | Observations | Processing |
| --- | --- | ---: | --- |
| 1 | prepare | 200 | 0.042 / 0.059 / 0.039–0.082 |
| 2 | prepare | 200 | 0.034 / 0.042 / 0.033–0.054 |
| 3 | prepare | 200 | 0.037 / 0.042 / 0.033–0.057 |
| 4 | prepare | 200 | 0.034 / 0.040 / 0.033–0.165 |
| 5 | prepare | 200 | 0.036 / 0.039 / 0.032–0.051 |

Per-run ranges:

- prepare: processing median 0.034–0.042; p95 0.039–0.059.

## source · small · connection

Population: people=4, teams=2, work=4, practices=2, contributions=2, connections=4, references=60, inputUtf8Bytes=4288.

| Run | Phase | Observations | Processing |
| --- | --- | ---: | --- |
| 1 | open | 200 | 0.012 / 0.024 / 0.009–0.052 |
| 1 | raw | 200 | 0.008 / 0.011 / 0.005–0.021 |
| 1 | preview | 200 | 0.055 / 0.080 / 0.046–0.115 |
| 1 | cached-preview | 200 | 0.006 / 0.007 / 0.003–0.016 |
| 1 | apply | 200 | 0.050 / 0.066 / 0.042–0.137 |
| 1 | undo | 200 | 0.001 / 0.002 / 0.001–0.003 |
| 2 | open | 200 | 0.008 / 0.016 / 0.007–0.034 |
| 2 | raw | 200 | 0.004 / 0.007 / 0.004–0.014 |
| 2 | preview | 200 | 0.043 / 0.056 / 0.041–0.085 |
| 2 | cached-preview | 200 | 0.003 / 0.004 / 0.003–0.008 |
| 2 | apply | 200 | 0.041 / 0.052 / 0.039–0.098 |
| 2 | undo | 200 | 0.001 / 0.001 / 0.000–0.001 |
| 3 | open | 200 | 0.008 / 0.023 / 0.007–0.074 |
| 3 | raw | 200 | 0.005 / 0.008 / 0.004–0.015 |
| 3 | preview | 200 | 0.045 / 0.070 / 0.041–0.124 |
| 3 | cached-preview | 200 | 0.003 / 0.005 / 0.002–0.005 |
| 3 | apply | 200 | 0.043 / 0.060 / 0.039–0.092 |
| 3 | undo | 200 | 0.000 / 0.001 / 0.000–0.021 |
| 4 | open | 200 | 0.006 / 0.011 / 0.006–0.017 |
| 4 | raw | 200 | 0.004 / 0.005 / 0.004–0.016 |
| 4 | preview | 200 | 0.042 / 0.053 / 0.040–0.075 |
| 4 | cached-preview | 200 | 0.003 / 0.003 / 0.002–0.004 |
| 4 | apply | 200 | 0.041 / 0.049 / 0.038–0.069 |
| 4 | undo | 200 | 0.000 / 0.001 / 0.000–0.001 |
| 5 | open | 200 | 0.008 / 0.014 / 0.007–0.027 |
| 5 | raw | 200 | 0.004 / 0.007 / 0.004–0.013 |
| 5 | preview | 200 | 0.045 / 0.060 / 0.040–0.096 |
| 5 | cached-preview | 200 | 0.003 / 0.005 / 0.003–0.014 |
| 5 | apply | 200 | 0.043 / 0.053 / 0.038–0.070 |
| 5 | undo | 200 | 0.000 / 0.001 / 0.000–0.001 |

Per-run ranges:

- open: processing median 0.006–0.012; p95 0.011–0.024.
- raw: processing median 0.004–0.008; p95 0.005–0.011.
- preview: processing median 0.042–0.055; p95 0.053–0.080.
- cached-preview: processing median 0.003–0.006; p95 0.003–0.007.
- apply: processing median 0.041–0.050; p95 0.049–0.066.
- undo: processing median 0.000–0.001; p95 0.001–0.002.

## source · small-template · template

Population: people=4, teams=2, work=4, practices=2, contributions=2, connections=4, references=60, inputUtf8Bytes=4288.

| Run | Phase | Observations | Processing |
| --- | --- | ---: | --- |
| 1 | template-prepare | 200 | 0.065 / 0.093 / 0.053–0.151 |
| 1 | template-apply | 200 | 0.049 / 0.060 / 0.041–0.077 |
| 1 | undo | 200 | 0.001 / 0.002 / 0.001–0.003 |
| 2 | template-prepare | 200 | 0.052 / 0.066 / 0.049–0.153 |
| 2 | template-apply | 200 | 0.041 / 0.050 / 0.039–0.067 |
| 2 | undo | 200 | 0.001 / 0.001 / 0.000–0.002 |
| 3 | template-prepare | 200 | 0.053 / 0.068 / 0.049–0.124 |
| 3 | template-apply | 200 | 0.043 / 0.052 / 0.040–0.197 |
| 3 | undo | 200 | 0.001 / 0.001 / 0.001–0.003 |
| 4 | template-prepare | 200 | 0.050 / 0.058 / 0.048–0.088 |
| 4 | template-apply | 200 | 0.041 / 0.047 / 0.039–0.062 |
| 4 | undo | 200 | 0.000 / 0.001 / 0.000–0.003 |
| 5 | template-prepare | 200 | 0.054 / 0.064 / 0.048–0.092 |
| 5 | template-apply | 200 | 0.044 / 0.053 / 0.039–0.060 |
| 5 | undo | 200 | 0.000 / 0.001 / 0.000–0.002 |

Per-run ranges:

- template-prepare: processing median 0.050–0.065; p95 0.058–0.093.
- template-apply: processing median 0.041–0.049; p95 0.047–0.060.
- undo: processing median 0.000–0.001; p95 0.001–0.002.

## source · representative · prepare

Population: people=32, teams=8, work=64, practices=32, contributions=32, connections=64, references=1280, inputUtf8Bytes=56471.

| Run | Phase | Observations | Processing |
| --- | --- | ---: | --- |
| 1 | prepare | 200 | 0.450 / 0.550 / 0.428–0.711 |
| 2 | prepare | 200 | 0.451 / 0.490 / 0.419–0.678 |
| 3 | prepare | 200 | 0.465 / 0.526 / 0.424–0.755 |
| 4 | prepare | 200 | 0.462 / 0.507 / 0.424–0.522 |
| 5 | prepare | 200 | 0.471 / 0.502 / 0.427–0.752 |

Per-run ranges:

- prepare: processing median 0.450–0.471; p95 0.490–0.550.

## source · representative · connection

Population: people=32, teams=8, work=64, practices=32, contributions=32, connections=64, references=1280, inputUtf8Bytes=56471.

| Run | Phase | Observations | Processing |
| --- | --- | ---: | --- |
| 1 | open | 200 | 0.027 / 0.039 / 0.025–0.075 |
| 1 | raw | 200 | 0.005 / 0.007 / 0.004–0.009 |
| 1 | preview | 200 | 0.455 / 0.543 / 0.439–0.908 |
| 1 | cached-preview | 200 | 0.003 / 0.004 / 0.003–0.005 |
| 1 | apply | 200 | 0.452 / 0.533 / 0.435–0.859 |
| 1 | undo | 200 | 0.003 / 0.004 / 0.003–0.007 |
| 2 | open | 200 | 0.027 / 0.040 / 0.025–0.056 |
| 2 | raw | 200 | 0.004 / 0.006 / 0.004–0.009 |
| 2 | preview | 200 | 0.453 / 0.512 / 0.435–0.561 |
| 2 | cached-preview | 200 | 0.003 / 0.003 / 0.003–0.004 |
| 2 | apply | 200 | 0.453 / 0.504 / 0.430–0.649 |
| 2 | undo | 200 | 0.003 / 0.004 / 0.002–0.006 |
| 3 | open | 200 | 0.029 / 0.037 / 0.025–0.054 |
| 3 | raw | 200 | 0.005 / 0.006 / 0.004–0.018 |
| 3 | preview | 200 | 0.478 / 0.515 / 0.439–0.685 |
| 3 | cached-preview | 200 | 0.003 / 0.004 / 0.003–0.015 |
| 3 | apply | 200 | 0.477 / 0.510 / 0.438–0.556 |
| 3 | undo | 200 | 0.003 / 0.004 / 0.002–0.005 |
| 4 | open | 200 | 0.027 / 0.033 / 0.024–0.084 |
| 4 | raw | 200 | 0.004 / 0.005 / 0.004–0.022 |
| 4 | preview | 200 | 0.478 / 0.510 / 0.438–1.149 |
| 4 | cached-preview | 200 | 0.003 / 0.003 / 0.002–0.007 |
| 4 | apply | 200 | 0.476 / 0.510 / 0.434–1.035 |
| 4 | undo | 200 | 0.003 / 0.005 / 0.002–0.017 |
| 5 | open | 200 | 0.027 / 0.032 / 0.024–0.052 |
| 5 | raw | 200 | 0.004 / 0.006 / 0.004–0.020 |
| 5 | preview | 200 | 0.484 / 0.507 / 0.439–0.536 |
| 5 | cached-preview | 200 | 0.003 / 0.003 / 0.003–0.019 |
| 5 | apply | 200 | 0.483 / 0.503 / 0.437–0.533 |
| 5 | undo | 200 | 0.003 / 0.003 / 0.002–0.005 |

Per-run ranges:

- open: processing median 0.027–0.029; p95 0.032–0.040.
- raw: processing median 0.004–0.005; p95 0.005–0.007.
- preview: processing median 0.453–0.484; p95 0.507–0.543.
- cached-preview: processing median 0.003–0.003; p95 0.003–0.004.
- apply: processing median 0.452–0.483; p95 0.503–0.533.
- undo: processing median 0.003–0.003; p95 0.003–0.005.

## source · representative-template · template

Population: people=32, teams=8, work=64, practices=32, contributions=32, connections=64, references=1280, inputUtf8Bytes=56471.

| Run | Phase | Observations | Processing |
| --- | --- | ---: | --- |
| 1 | template-prepare | 200 | 0.493 / 0.579 / 0.470–0.762 |
| 1 | template-apply | 200 | 0.467 / 0.537 / 0.450–0.827 |
| 1 | undo | 200 | 0.003 / 0.005 / 0.002–0.009 |
| 2 | template-prepare | 200 | 0.490 / 0.531 / 0.466–0.747 |
| 2 | template-apply | 200 | 0.473 / 0.535 / 0.448–1.021 |
| 2 | undo | 200 | 0.003 / 0.005 / 0.002–0.009 |
| 3 | template-prepare | 200 | 0.516 / 0.618 / 0.470–0.768 |
| 3 | template-apply | 200 | 0.495 / 0.555 / 0.452–1.049 |
| 3 | undo | 200 | 0.003 / 0.005 / 0.002–0.014 |
| 4 | template-prepare | 200 | 0.513 / 0.572 / 0.469–0.781 |
| 4 | template-apply | 200 | 0.496 / 0.542 / 0.452–0.888 |
| 4 | undo | 200 | 0.003 / 0.005 / 0.002–0.009 |
| 5 | template-prepare | 200 | 0.515 / 0.554 / 0.470–0.674 |
| 5 | template-apply | 200 | 0.498 / 0.523 / 0.451–0.793 |
| 5 | undo | 200 | 0.003 / 0.003 / 0.002–0.006 |

Per-run ranges:

- template-prepare: processing median 0.490–0.516; p95 0.531–0.618.
- template-apply: processing median 0.467–0.498; p95 0.523–0.555.
- undo: processing median 0.003–0.003; p95 0.003–0.005.

## source · caps · prepare

Population: people=128, teams=32, work=256, practices=128, contributions=128, connections=256, references=8192, inputUtf8Bytes=265067.

| Run | Phase | Observations | Processing |
| --- | --- | ---: | --- |
| 1 | prepare | 200 | 2.233 / 2.551 / 2.093–4.061 |
| 2 | prepare | 200 | 2.304 / 2.651 / 2.140–3.449 |
| 3 | prepare | 200 | 2.294 / 2.601 / 2.133–3.285 |
| 4 | prepare | 200 | 2.386 / 2.736 / 2.189–4.076 |
| 5 | prepare | 200 | 2.490 / 2.971 / 2.198–3.373 |

Per-run ranges:

- prepare: processing median 2.233–2.490; p95 2.551–2.971.

## source · caps · connection

Population: people=128, teams=32, work=256, practices=128, contributions=128, connections=256, references=8192, inputUtf8Bytes=265067.

| Run | Phase | Observations | Processing |
| --- | --- | ---: | --- |
| 1 | open | 200 | 0.099 / 0.120 / 0.088–0.234 |
| 1 | raw | 200 | 0.006 / 0.009 / 0.005–0.020 |
| 1 | preview | 200 | 2.320 / 2.915 / 2.149–4.548 |
| 1 | cached-preview | 200 | 0.003 / 0.005 / 0.003–0.013 |
| 1 | apply | 200 | 2.350 / 2.873 / 2.155–4.265 |
| 1 | undo | 200 | 0.011 / 0.016 / 0.009–0.037 |
| 2 | open | 200 | 0.097 / 0.119 / 0.087–0.237 |
| 2 | raw | 200 | 0.006 / 0.009 / 0.005–0.024 |
| 2 | preview | 200 | 2.337 / 2.732 / 2.152–4.048 |
| 2 | cached-preview | 200 | 0.003 / 0.004 / 0.003–0.005 |
| 2 | apply | 200 | 2.349 / 2.758 / 2.171–4.363 |
| 2 | undo | 200 | 0.010 / 0.013 / 0.009–0.045 |
| 3 | open | 200 | 0.101 / 0.118 / 0.087–0.526 |
| 3 | raw | 200 | 0.006 / 0.009 / 0.004–0.024 |
| 3 | preview | 200 | 2.392 / 2.791 / 2.189–8.407 |
| 3 | cached-preview | 200 | 0.003 / 0.004 / 0.003–0.023 |
| 3 | apply | 200 | 2.382 / 2.788 / 2.178–4.151 |
| 3 | undo | 200 | 0.011 / 0.014 / 0.009–0.040 |
| 4 | open | 200 | 0.098 / 0.118 / 0.087–0.234 |
| 4 | raw | 200 | 0.006 / 0.009 / 0.004–0.026 |
| 4 | preview | 200 | 2.403 / 2.721 / 2.262–4.070 |
| 4 | cached-preview | 200 | 0.003 / 0.005 / 0.003–0.020 |
| 4 | apply | 200 | 2.423 / 2.776 / 2.219–3.416 |
| 4 | undo | 200 | 0.010 / 0.014 / 0.009–0.051 |
| 5 | open | 200 | 0.099 / 0.126 / 0.086–0.255 |
| 5 | raw | 200 | 0.005 / 0.008 / 0.004–0.021 |
| 5 | preview | 200 | 2.414 / 2.817 / 2.207–3.444 |
| 5 | cached-preview | 200 | 0.003 / 0.005 / 0.003–0.019 |
| 5 | apply | 200 | 2.417 / 2.817 / 2.233–3.937 |
| 5 | undo | 200 | 0.011 / 0.013 / 0.009–0.040 |

Per-run ranges:

- open: processing median 0.097–0.101; p95 0.118–0.126.
- raw: processing median 0.005–0.006; p95 0.008–0.009.
- preview: processing median 2.320–2.414; p95 2.721–2.915.
- cached-preview: processing median 0.003–0.003; p95 0.004–0.005.
- apply: processing median 2.349–2.423; p95 2.758–2.873.
- undo: processing median 0.010–0.011; p95 0.013–0.016.

## source · caps-template · template

Population: people=128, teams=32, work=254, practices=128, contributions=128, connections=254, references=8168, inputUtf8Bytes=264059.

| Run | Phase | Observations | Processing |
| --- | --- | ---: | --- |
| 1 | template-prepare | 200 | 2.706 / 3.105 / 2.257–6.698 |
| 1 | template-apply | 200 | 2.366 / 2.938 / 2.204–3.433 |
| 1 | undo | 200 | 0.011 / 0.016 / 0.009–0.405 |
| 2 | template-prepare | 200 | 2.657 / 3.049 / 2.290–3.656 |
| 2 | template-apply | 200 | 2.386 / 2.906 / 2.225–4.385 |
| 2 | undo | 200 | 0.011 / 0.014 / 0.009–0.042 |
| 3 | template-prepare | 200 | 2.729 / 3.297 / 2.313–4.443 |
| 3 | template-apply | 200 | 2.460 / 3.091 / 2.249–4.389 |
| 3 | undo | 200 | 0.011 / 0.016 / 0.009–0.050 |
| 4 | template-prepare | 200 | 2.781 / 3.134 / 2.394–3.567 |
| 4 | template-apply | 200 | 2.452 / 2.981 / 2.297–4.635 |
| 4 | undo | 200 | 0.011 / 0.015 / 0.009–0.043 |
| 5 | template-prepare | 200 | 2.809 / 3.280 / 2.381–4.599 |
| 5 | template-apply | 200 | 2.481 / 3.122 / 2.304–3.478 |
| 5 | undo | 200 | 0.011 / 0.016 / 0.009–0.042 |

Per-run ranges:

- template-prepare: processing median 2.657–2.809; p95 3.049–3.297.
- template-apply: processing median 2.366–2.481; p95 2.906–3.122.
- undo: processing median 0.011–0.011; p95 0.014–0.016.

## source · byte-pressure · prepare

Population: people=128, teams=32, work=256, practices=128, contributions=128, connections=256, references=8192, inputUtf8Bytes=3679669.

| Run | Phase | Observations | Processing |
| --- | --- | ---: | --- |
| 1 | prepare | 200 | 5.811 / 6.718 / 5.538–7.646 |
| 2 | prepare | 200 | 6.180 / 7.499 / 5.639–19.246 |
| 3 | prepare | 200 | 6.008 / 7.019 / 5.707–7.925 |
| 4 | prepare | 200 | 6.034 / 7.103 / 5.759–7.814 |
| 5 | prepare | 200 | 6.142 / 7.266 / 5.859–17.427 |

Per-run ranges:

- prepare: processing median 5.811–6.180; p95 6.718–7.499.

## source · byte-pressure · connection

Population: people=128, teams=32, work=256, practices=128, contributions=128, connections=256, references=8192, inputUtf8Bytes=3679669.

| Run | Phase | Observations | Processing |
| --- | --- | ---: | --- |
| 1 | open | 200 | 0.177 / 0.290 / 0.158–0.416 |
| 1 | raw | 200 | 0.010 / 0.013 / 0.006–0.035 |
| 1 | preview | 200 | 6.156 / 7.349 / 5.661–21.741 |
| 1 | cached-preview | 200 | 0.005 / 0.007 / 0.003–0.033 |
| 1 | apply | 200 | 6.166 / 7.024 / 5.648–18.413 |
| 1 | undo | 200 | 0.014 / 0.038 / 0.011–0.055 |
| 2 | open | 200 | 0.175 / 0.290 / 0.156–0.323 |
| 2 | raw | 200 | 0.008 / 0.011 / 0.005–0.015 |
| 2 | preview | 200 | 6.116 / 7.196 / 5.664–7.830 |
| 2 | cached-preview | 200 | 0.004 / 0.006 / 0.003–0.020 |
| 2 | apply | 200 | 6.151 / 6.865 / 5.642–13.228 |
| 2 | undo | 200 | 0.014 / 0.038 / 0.011–0.048 |
| 3 | open | 200 | 0.177 / 0.306 / 0.156–0.348 |
| 3 | raw | 200 | 0.008 / 0.011 / 0.006–0.032 |
| 3 | preview | 200 | 6.272 / 7.168 / 5.762–9.396 |
| 3 | cached-preview | 200 | 0.004 / 0.007 / 0.003–0.022 |
| 3 | apply | 200 | 6.219 / 7.687 / 5.784–14.442 |
| 3 | undo | 200 | 0.013 / 0.018 / 0.010–0.040 |
| 4 | open | 200 | 0.191 / 0.234 / 0.164–0.338 |
| 4 | raw | 200 | 0.011 / 0.015 / 0.007–0.042 |
| 4 | preview | 200 | 6.335 / 7.061 / 5.891–8.441 |
| 4 | cached-preview | 200 | 0.006 / 0.008 / 0.003–0.025 |
| 4 | apply | 200 | 6.367 / 7.370 / 5.835–14.705 |
| 4 | undo | 200 | 0.016 / 0.024 / 0.012–0.042 |
| 5 | open | 200 | 0.191 / 0.311 / 0.164–0.351 |
| 5 | raw | 200 | 0.010 / 0.013 / 0.006–0.038 |
| 5 | preview | 200 | 6.425 / 7.333 / 5.860–7.912 |
| 5 | cached-preview | 200 | 0.005 / 0.007 / 0.004–0.039 |
| 5 | apply | 200 | 6.391 / 7.606 / 5.838–15.933 |
| 5 | undo | 200 | 0.017 / 0.026 / 0.012–0.045 |

Per-run ranges:

- open: processing median 0.175–0.191; p95 0.234–0.311.
- raw: processing median 0.008–0.011; p95 0.011–0.015.
- preview: processing median 6.116–6.425; p95 7.061–7.349.
- cached-preview: processing median 0.004–0.006; p95 0.006–0.008.
- apply: processing median 6.151–6.391; p95 6.865–7.687.
- undo: processing median 0.013–0.017; p95 0.018–0.038.

## source · byte-pressure-template · template

Population: people=128, teams=32, work=254, practices=128, contributions=128, connections=254, references=8168, inputUtf8Bytes=3662093.

| Run | Phase | Observations | Processing |
| --- | --- | ---: | --- |
| 1 | template-prepare | 200 | 6.543 / 7.911 / 5.763–15.273 |
| 1 | template-apply | 200 | 6.061 / 6.783 / 5.635–7.382 |
| 1 | undo | 200 | 0.015 / 0.033 / 0.010–0.042 |
| 2 | template-prepare | 200 | 6.600 / 7.877 / 5.843–14.939 |
| 2 | template-apply | 200 | 6.030 / 6.874 / 5.671–7.546 |
| 2 | undo | 200 | 0.015 / 0.034 / 0.011–0.053 |
| 3 | template-prepare | 200 | 6.745 / 8.131 / 5.933–14.342 |
| 3 | template-apply | 200 | 6.100 / 6.932 / 5.762–7.914 |
| 3 | undo | 200 | 0.015 / 0.026 / 0.010–0.050 |
| 4 | template-prepare | 200 | 6.745 / 12.610 / 5.966–14.788 |
| 4 | template-apply | 200 | 6.112 / 7.053 / 5.810–17.175 |
| 4 | undo | 200 | 0.015 / 0.037 / 0.011–0.046 |
| 5 | template-prepare | 200 | 6.814 / 8.220 / 6.058–15.909 |
| 5 | template-apply | 200 | 6.225 / 6.944 / 5.920–7.570 |
| 5 | undo | 200 | 0.017 / 0.037 / 0.010–0.044 |

Per-run ranges:

- template-prepare: processing median 6.543–6.814; p95 7.877–12.610.
- template-apply: processing median 6.030–6.225; p95 6.783–7.053.
- undo: processing median 0.015–0.017; p95 0.026–0.037.

## chromium · small · selection

Population: people=4, teams=2, work=4, practices=2, contributions=2, connections=4, references=60, inputUtf8Bytes=4288.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | selection | 100 | 0.100 / 0.200 / 0.000–0.300 | 0.000 / 0.000 / 0.000–0.000 | 7.400 / 8.400 / 5.600–8.700 |
| 2 | selection | 100 | 0.100 / 0.200 / 0.000–0.300 | 0.000 / 0.000 / 0.000–0.000 | 7.450 / 8.300 / 4.700–8.400 |
| 3 | selection | 100 | 0.100 / 0.200 / 0.000–0.300 | 0.000 / 0.000 / 0.000–0.000 | 7.300 / 8.300 / 5.000–8.400 |
| 4 | selection | 100 | 0.100 / 0.200 / 0.000–0.200 | 0.000 / 0.000 / 0.000–0.000 | 7.500 / 8.400 / 5.500–8.900 |
| 5 | selection | 100 | 0.100 / 0.200 / 0.000–0.200 | 0.000 / 0.000 / 0.000–0.000 | 7.550 / 8.400 / 4.600–8.600 |

Per-run ranges:

- selection: processing median 0.100–0.100; p95 0.200–0.200. Rendering-opportunity p95 8.300–8.400.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 1139–1139 |
| 2 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 1139–1139 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | 0.100 | 70 / 0 | 1139–1139 |
| 4 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 1139–1139 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | 0.100 | 70 / 0 | 1139–1139 |

## chromium · small · connection

Population: people=4, teams=2, work=4, practices=2, contributions=2, connections=4, references=60, inputUtf8Bytes=4288.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | open | 50 | 0.300 / 0.400 / 0.200–0.400 | 0.000 / 0.100 / 0.000–0.100 | 6.300 / 6.500 / 5.400–6.500 |
| 1 | preview-input | 50 | 0.300 / 0.400 / 0.200–0.500 | 0.100 / 0.200 / 0.000–0.200 | 8.300 / 8.400 / 8.200–9.300 |
| 1 | apply-render | 50 | 2.600 / 2.900 / 2.300–3.100 | 0.100 / 0.200 / 0.000–0.300 | 8.300 / 8.400 / 7.900–8.500 |
| 1 | undo-render | 50 | 2.000 / 2.400 / 1.700–2.500 | 0.000 / 0.100 / 0.000–0.100 | 8.200 / 8.300 / 8.100–8.700 |
| 2 | open | 50 | 0.300 / 0.400 / 0.100–0.400 | 0.000 / 0.100 / 0.000–0.200 | 6.300 / 6.500 / 5.500–6.600 |
| 2 | preview-input | 50 | 0.300 / 0.400 / 0.200–0.500 | 0.100 / 0.200 / 0.000–0.200 | 8.300 / 8.400 / 8.200–8.900 |
| 2 | apply-render | 50 | 2.700 / 3.200 / 2.400–3.700 | 0.100 / 0.200 / 0.000–0.300 | 8.300 / 8.400 / 7.900–8.500 |
| 2 | undo-render | 50 | 2.000 / 2.500 / 1.700–2.600 | 0.000 / 0.000 / 0.000–0.100 | 8.200 / 8.500 / 8.100–8.800 |
| 3 | open | 50 | 0.300 / 0.400 / 0.200–0.400 | 0.000 / 0.100 / 0.000–0.100 | 6.300 / 6.600 / 5.200–6.900 |
| 3 | preview-input | 50 | 0.300 / 0.400 / 0.200–0.500 | 0.100 / 0.200 / 0.000–0.300 | 8.300 / 8.400 / 7.700–8.500 |
| 3 | apply-render | 50 | 2.700 / 2.900 / 2.300–3.300 | 0.100 / 0.200 / 0.000–0.200 | 8.300 / 8.700 / 7.600–9.100 |
| 3 | undo-render | 50 | 2.000 / 2.300 / 1.700–2.400 | 0.000 / 0.100 / 0.000–0.100 | 8.200 / 8.800 / 7.600–9.200 |
| 4 | open | 50 | 0.300 / 0.400 / 0.100–0.400 | 0.000 / 0.100 / 0.000–0.100 | 6.400 / 7.300 / 1.900–7.600 |
| 4 | preview-input | 50 | 0.300 / 0.400 / 0.200–0.500 | 0.100 / 0.200 / 0.000–0.200 | 8.300 / 8.400 / 7.300–9.300 |
| 4 | apply-render | 50 | 2.700 / 3.000 / 2.100–3.200 | 0.100 / 0.300 / 0.000–0.300 | 8.300 / 8.500 / 7.600–9.300 |
| 4 | undo-render | 50 | 1.900 / 2.300 / 1.600–2.500 | 0.000 / 0.000 / 0.000–0.100 | 8.200 / 8.300 / 7.300–9.100 |
| 5 | open | 50 | 0.300 / 0.500 / 0.200–0.500 | 0.000 / 0.100 / 0.000–0.100 | 6.300 / 6.800 / 4.700–6.900 |
| 5 | preview-input | 50 | 0.300 / 0.400 / 0.200–0.500 | 0.100 / 0.200 / 0.000–0.200 | 8.300 / 8.400 / 7.900–9.200 |
| 5 | apply-render | 50 | 2.800 / 3.200 / 2.300–3.300 | 0.100 / 0.300 / 0.000–0.300 | 8.300 / 8.400 / 7.900–8.800 |
| 5 | undo-render | 50 | 2.000 / 2.400 / 1.500–2.500 | 0.000 / 0.100 / 0.000–0.100 | 8.200 / 8.600 / 7.900–8.600 |

Per-run ranges:

- open: processing median 0.300–0.300; p95 0.400–0.500. Rendering-opportunity p95 6.500–7.300.
- preview-input: processing median 0.300–0.300; p95 0.400–0.400. Rendering-opportunity p95 8.400–8.400.
- apply-render: processing median 2.600–2.800; p95 2.900–3.200. Rendering-opportunity p95 8.400–8.700.
- undo-render: processing median 1.900–2.000; p95 2.300–2.500. Rendering-opportunity p95 8.300–8.800.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 1155–1155 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | 0.100 | 70 / 0 | 1155–1155 |
| 3 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 1155–1155 |
| 4 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 1155–1155 |
| 5 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 1155–1155 |

## chromium · small-template · template

Population: people=4, teams=2, work=4, practices=2, contributions=2, connections=4, references=60, inputUtf8Bytes=4288.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | template-preview | 50 | 0.600 / 0.700 / 0.400–0.800 | 0.000 / 0.000 / 0.000–0.000 | 7.300 / 7.800 / 7.100–8.300 |
| 1 | template-apply-render | 50 | 1.500 / 1.600 / 1.300–1.800 | 0.100 / 0.200 / 0.000–0.200 | 8.300 / 8.400 / 7.400–8.400 |
| 1 | undo-render | 50 | 0.800 / 1.000 / 0.700–1.700 | 0.000 / 0.100 / 0.000–0.100 | 8.300 / 8.500 / 7.500–9.200 |
| 2 | template-preview | 50 | 0.600 / 0.700 / 0.400–0.900 | 0.000 / 0.000 / 0.000–0.000 | 7.300 / 8.300 / 7.100–8.400 |
| 2 | template-apply-render | 50 | 1.500 / 1.700 / 1.300–1.800 | 0.100 / 0.200 / 0.000–0.200 | 8.300 / 8.400 / 7.000–8.500 |
| 2 | undo-render | 50 | 0.800 / 1.000 / 0.700–1.500 | 0.000 / 0.100 / 0.000–0.100 | 8.300 / 8.400 / 7.800–8.600 |
| 3 | template-preview | 50 | 0.600 / 0.800 / 0.500–0.800 | 0.000 / 0.000 / 0.000–0.000 | 7.300 / 7.600 / 5.900–7.700 |
| 3 | template-apply-render | 50 | 1.600 / 1.800 / 1.300–1.900 | 0.100 / 0.200 / 0.000–0.200 | 8.300 / 8.400 / 8.100–8.500 |
| 3 | undo-render | 50 | 0.800 / 1.000 / 0.700–1.000 | 0.000 / 0.000 / 0.000–0.100 | 8.300 / 8.500 / 8.000–8.500 |
| 4 | template-preview | 50 | 0.600 / 0.800 / 0.400–0.900 | 0.000 / 0.000 / 0.000–0.000 | 7.300 / 7.800 / 6.800–8.200 |
| 4 | template-apply-render | 50 | 1.600 / 1.900 / 1.300–2.100 | 0.100 / 0.200 / 0.000–0.200 | 8.300 / 8.400 / 6.900–8.700 |
| 4 | undo-render | 50 | 0.900 / 1.100 / 0.700–1.100 | 0.000 / 0.000 / 0.000–0.100 | 8.300 / 8.700 / 7.700–8.900 |
| 5 | template-preview | 50 | 0.600 / 0.700 / 0.400–0.800 | 0.000 / 0.000 / 0.000–0.000 | 7.400 / 8.000 / 6.800–8.200 |
| 5 | template-apply-render | 50 | 1.500 / 1.700 / 1.300–1.700 | 0.100 / 0.200 / 0.000–0.200 | 8.300 / 8.400 / 7.500–8.400 |
| 5 | undo-render | 50 | 0.800 / 1.000 / 0.600–1.500 | 0.000 / 0.100 / 0.000–0.100 | 8.300 / 8.400 / 7.500–8.400 |

Per-run ranges:

- template-preview: processing median 0.600–0.600; p95 0.700–0.800. Rendering-opportunity p95 7.600–8.300.
- template-apply-render: processing median 1.500–1.600; p95 1.600–1.900. Rendering-opportunity p95 8.400–8.400.
- undo-render: processing median 0.800–0.900; p95 1.000–1.100. Rendering-opportunity p95 8.400–8.700.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 1139–1139 |
| 2 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 1139–1139 |
| 3 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 1139–1139 |
| 4 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 1139–1139 |
| 5 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 1139–1139 |

## chromium · representative · selection

Population: people=32, teams=8, work=64, practices=32, contributions=32, connections=64, references=1280, inputUtf8Bytes=56471.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | selection | 100 | 0.100 / 0.200 / 0.000–0.200 | 0.000 / 0.000 / 0.000–0.000 | 7.650 / 8.400 / 5.500–8.700 |
| 2 | selection | 100 | 0.100 / 0.200 / 0.000–0.300 | 0.000 / 0.000 / 0.000–0.000 | 7.450 / 8.400 / 2.900–8.700 |
| 3 | selection | 100 | 0.100 / 0.200 / 0.000–0.300 | 0.000 / 0.000 / 0.000–0.000 | 7.350 / 8.400 / 4.900–8.500 |
| 4 | selection | 100 | 0.100 / 0.200 / 0.000–0.200 | 0.000 / 0.000 / 0.000–0.000 | 7.800 / 8.400 / 5.600–8.700 |
| 5 | selection | 100 | 0.000 / 0.200 / 0.000–0.200 | 0.000 / 0.000 / 0.000–0.000 | 7.700 / 8.400 / 5.400–8.600 |

Per-run ranges:

- selection: processing median 0.000–0.100; p95 0.200–0.200. Rendering-opportunity p95 8.400–8.400.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | 0.100 | 70 / 0 | 3088–3088 |
| 2 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 3088–3088 |
| 3 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 3088–3088 |
| 4 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 3088–3088 |
| 5 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 3088–3088 |

## chromium · representative · connection

Population: people=32, teams=8, work=64, practices=32, contributions=32, connections=64, references=1280, inputUtf8Bytes=56471.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | open | 50 | 0.300 / 0.400 / 0.200–0.500 | 0.000 / 0.100 / 0.000–0.100 | 6.300 / 6.600 / 2.200–6.700 |
| 1 | preview-input | 50 | 0.700 / 0.800 / 0.600–0.900 | 0.500 / 0.600 / 0.400–0.700 | 8.300 / 8.400 / 8.200–8.500 |
| 1 | apply-render | 50 | 5.750 / 6.200 / 5.300–6.400 | 0.600 / 0.600 / 0.400–0.600 | 8.300 / 8.400 / 8.000–8.700 |
| 1 | undo-render | 50 | 4.300 / 6.400 / 3.900–6.400 | 0.000 / 0.000 / 0.000–0.100 | 8.100 / 11.000 / 7.900–11.100 |
| 2 | open | 50 | 0.300 / 0.400 / 0.200–0.500 | 0.000 / 0.100 / 0.000–0.100 | 6.300 / 6.500 / 2.000–6.700 |
| 2 | preview-input | 50 | 0.700 / 0.800 / 0.600–1.000 | 0.500 / 0.600 / 0.400–0.700 | 8.300 / 8.400 / 8.200–9.200 |
| 2 | apply-render | 50 | 5.700 / 6.100 / 5.200–6.200 | 0.550 / 0.700 / 0.400–0.700 | 8.300 / 8.400 / 7.900–8.700 |
| 2 | undo-render | 50 | 4.300 / 6.300 / 3.900–6.500 | 0.000 / 0.100 / 0.000–0.100 | 8.100 / 10.900 / 7.900–11.000 |
| 3 | open | 50 | 0.300 / 0.400 / 0.200–0.500 | 0.000 / 0.100 / 0.000–0.100 | 6.350 / 6.600 / 2.200–6.800 |
| 3 | preview-input | 50 | 0.700 / 0.800 / 0.600–1.000 | 0.500 / 0.700 / 0.400–0.700 | 8.300 / 8.400 / 8.100–8.500 |
| 3 | apply-render | 50 | 5.700 / 6.200 / 5.400–6.400 | 0.550 / 0.600 / 0.400–0.800 | 8.300 / 8.600 / 7.800–9.500 |
| 3 | undo-render | 50 | 4.300 / 6.400 / 4.000–6.500 | 0.000 / 0.100 / 0.000–0.100 | 8.100 / 11.000 / 7.900–11.300 |
| 4 | open | 50 | 0.400 / 0.500 / 0.200–0.600 | 0.000 / 0.100 / 0.000–0.100 | 5.800 / 6.600 / 1.700–6.600 |
| 4 | preview-input | 50 | 0.800 / 0.900 / 0.600–1.000 | 0.500 / 0.600 / 0.400–0.700 | 8.300 / 8.700 / 7.600–9.100 |
| 4 | apply-render | 50 | 5.900 / 6.500 / 5.500–6.700 | 0.500 / 0.700 / 0.400–0.700 | 8.200 / 8.900 / 8.000–9.100 |
| 4 | undo-render | 50 | 4.500 / 6.400 / 4.100–6.700 | 0.000 / 0.100 / 0.000–0.100 | 8.300 / 11.400 / 7.900–11.500 |
| 5 | open | 50 | 0.300 / 0.500 / 0.200–0.500 | 0.000 / 0.100 / 0.000–0.100 | 6.400 / 6.600 / 2.200–6.600 |
| 5 | preview-input | 50 | 0.700 / 0.900 / 0.600–0.900 | 0.500 / 0.600 / 0.400–0.800 | 8.300 / 9.100 / 7.800–9.200 |
| 5 | apply-render | 50 | 5.700 / 6.000 / 5.200–6.600 | 0.500 / 0.700 / 0.400–0.700 | 8.200 / 8.400 / 7.800–9.700 |
| 5 | undo-render | 50 | 4.300 / 6.300 / 4.100–6.500 | 0.000 / 0.100 / 0.000–0.100 | 8.100 / 11.000 / 7.900–11.300 |

Per-run ranges:

- open: processing median 0.300–0.400; p95 0.400–0.500. Rendering-opportunity p95 6.500–6.600.
- preview-input: processing median 0.700–0.800; p95 0.800–0.900. Rendering-opportunity p95 8.400–9.100.
- apply-render: processing median 5.700–5.900; p95 6.000–6.500. Rendering-opportunity p95 8.400–8.900.
- undo-render: processing median 4.300–4.500; p95 6.300–6.400. Rendering-opportunity p95 10.900–11.400.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 3141–3141 |
| 2 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 3141–3141 |
| 3 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 3141–3141 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | 0.100 | 70 / 0 | 3141–3141 |
| 5 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 3141–3141 |

## chromium · representative-template · template

Population: people=32, teams=8, work=64, practices=32, contributions=32, connections=64, references=1280, inputUtf8Bytes=56471.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | template-preview | 50 | 1.100 / 1.200 / 0.900–1.300 | 0.000 / 0.000 / 0.000–0.000 | 7.300 / 8.300 / 6.900–8.400 |
| 1 | template-apply-render | 50 | 3.550 / 3.900 / 3.200–4.200 | 0.500 / 0.600 / 0.400–0.700 | 8.300 / 8.800 / 6.900–9.300 |
| 1 | undo-render | 50 | 2.350 / 2.600 / 2.100–2.700 | 0.000 / 0.100 / 0.000–0.100 | 8.100 / 8.500 / 7.200–8.500 |
| 2 | template-preview | 50 | 1.000 / 1.200 / 0.900–1.300 | 0.000 / 0.000 / 0.000–0.000 | 7.300 / 7.700 / 4.600–8.000 |
| 2 | template-apply-render | 50 | 3.500 / 3.800 / 3.200–3.900 | 0.500 / 0.600 / 0.400–0.700 | 8.300 / 8.700 / 7.300–8.900 |
| 2 | undo-render | 50 | 2.400 / 2.700 / 2.200–3.700 | 0.000 / 0.100 / 0.000–0.100 | 8.100 / 9.100 / 7.400–10.100 |
| 3 | template-preview | 50 | 1.050 / 1.200 / 0.900–1.300 | 0.000 / 0.000 / 0.000–0.000 | 7.300 / 8.400 / 6.900–8.400 |
| 3 | template-apply-render | 50 | 3.500 / 3.800 / 3.100–3.800 | 0.500 / 0.700 / 0.400–0.700 | 8.300 / 8.700 / 6.900–9.000 |
| 3 | undo-render | 50 | 2.300 / 2.600 / 2.200–2.600 | 0.000 / 0.100 / 0.000–0.100 | 8.100 / 8.900 / 7.200–9.000 |
| 4 | template-preview | 50 | 1.100 / 1.200 / 0.900–1.200 | 0.000 / 0.000 / 0.000–0.000 | 7.300 / 8.300 / 4.900–8.400 |
| 4 | template-apply-render | 50 | 3.400 / 3.600 / 3.200–3.800 | 0.500 / 0.600 / 0.400–0.700 | 8.300 / 8.500 / 7.000–9.000 |
| 4 | undo-render | 50 | 2.300 / 2.600 / 2.000–4.000 | 0.000 / 0.100 / 0.000–0.100 | 8.100 / 8.800 / 7.600–9.800 |
| 5 | template-preview | 50 | 1.100 / 1.300 / 0.800–1.300 | 0.000 / 0.000 / 0.000–0.000 | 7.300 / 7.900 / 4.400–8.100 |
| 5 | template-apply-render | 50 | 3.700 / 4.100 / 3.300–4.200 | 0.500 / 0.700 / 0.400–0.700 | 8.200 / 8.700 / 7.500–9.500 |
| 5 | undo-render | 50 | 2.500 / 2.900 / 2.200–4.200 | 0.000 / 0.000 / 0.000–0.100 | 8.100 / 8.800 / 7.000–9.100 |

Per-run ranges:

- template-preview: processing median 1.000–1.100; p95 1.200–1.300. Rendering-opportunity p95 7.700–8.400.
- template-apply-render: processing median 3.400–3.700; p95 3.600–4.100. Rendering-opportunity p95 8.500–8.800.
- undo-render: processing median 2.300–2.500; p95 2.600–2.900. Rendering-opportunity p95 8.500–9.100.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 3088–3088 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | 0.100 | 70 / 0 | 3088–3088 |
| 3 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 3088–3088 |
| 4 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 3088–3088 |
| 5 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 3088–3088 |

## chromium · caps · selection

Population: people=128, teams=32, work=256, practices=128, contributions=128, connections=256, references=8192, inputUtf8Bytes=265067.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | selection | 100 | 0.100 / 0.200 / 0.000–0.200 | 0.000 / 0.000 / 0.000–0.000 | 7.300 / 8.400 / 5.500–9.000 |
| 2 | selection | 100 | 0.100 / 0.200 / 0.000–0.200 | 0.000 / 0.000 / 0.000–0.000 | 7.300 / 8.400 / 4.700–8.600 |
| 3 | selection | 100 | 0.100 / 0.200 / 0.000–0.200 | 0.000 / 0.000 / 0.000–0.000 | 7.400 / 8.400 / 4.600–9.800 |
| 4 | selection | 100 | 0.100 / 0.200 / 0.000–0.200 | 0.000 / 0.000 / 0.000–0.000 | 7.200 / 8.400 / 5.000–8.600 |
| 5 | selection | 100 | 0.100 / 0.200 / 0.000–0.300 | 0.000 / 0.000 / 0.000–0.000 | 7.300 / 8.400 / 5.300–8.500 |

Per-run ranges:

- selection: processing median 0.100–0.100; p95 0.200–0.200. Rendering-opportunity p95 8.400–8.400.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | 0.100 | 70 / 0 | 9280–9280 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | 0.100 | 70 / 0 | 9280–9280 |
| 3 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 9280–9280 |
| 4 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 9280–9280 |
| 5 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 9280–9280 |

## chromium · caps · connection

Population: people=128, teams=32, work=256, practices=128, contributions=128, connections=256, references=8192, inputUtf8Bytes=265067.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | open | 50 | 0.700 / 1.300 / 0.500–1.400 | 0.000 / 0.100 / 0.000–0.100 | 7.250 / 8.300 / 0.700–8.800 |
| 1 | preview-input | 50 | 2.500 / 2.700 / 2.200–2.700 | 2.100 / 2.300 / 1.900–2.300 | 8.300 / 8.600 / 8.000–9.500 |
| 1 | apply-render | 50 | 16.800 / 17.500 / 16.300–17.900 | 2.200 / 2.300 / 2.000–2.900 | 22.500 / 23.300 / 21.900–23.700 |
| 1 | undo-render | 50 | 13.300 / 14.200 / 13.000–14.300 | 0.000 / 0.100 / 0.000–0.100 | 23.200 / 24.400 / 22.600–27.100 |
| 2 | open | 50 | 0.700 / 1.300 / 0.500–1.500 | 0.000 / 0.100 / 0.000–0.100 | 6.250 / 7.900 / 0.700–8.300 |
| 2 | preview-input | 50 | 2.500 / 2.800 / 2.200–2.800 | 2.100 / 2.400 / 1.900–2.400 | 8.350 / 8.900 / 8.000–9.200 |
| 2 | apply-render | 50 | 16.900 / 17.800 / 16.000–18.000 | 2.200 / 2.400 / 2.100–2.500 | 22.650 / 23.900 / 21.700–24.100 |
| 2 | undo-render | 50 | 13.500 / 14.100 / 13.100–14.200 | 0.000 / 0.100 / 0.000–0.100 | 23.500 / 24.500 / 22.800–25.100 |
| 3 | open | 50 | 0.750 / 1.300 / 0.600–1.400 | 0.000 / 0.100 / 0.000–0.100 | 6.100 / 7.700 / 0.800–8.000 |
| 3 | preview-input | 50 | 2.500 / 2.800 / 2.200–2.800 | 2.200 / 2.400 / 2.000–2.600 | 8.400 / 8.900 / 8.100–9.300 |
| 3 | apply-render | 50 | 17.000 / 18.200 / 16.500–18.200 | 2.200 / 2.400 / 2.100–2.600 | 22.900 / 24.300 / 22.200–24.500 |
| 3 | undo-render | 50 | 13.500 / 14.300 / 13.200–15.200 | 0.000 / 0.100 / 0.000–0.100 | 23.500 / 24.600 / 22.900–28.200 |
| 4 | open | 50 | 0.700 / 1.300 / 0.500–1.500 | 0.000 / 0.100 / 0.000–0.100 | 5.650 / 7.500 / 0.700–7.600 |
| 4 | preview-input | 50 | 2.400 / 2.800 / 2.200–2.900 | 2.200 / 2.300 / 2.000–2.400 | 8.400 / 9.100 / 8.000–9.600 |
| 4 | apply-render | 50 | 17.100 / 18.200 / 16.300–18.500 | 2.300 / 2.600 / 2.000–3.000 | 22.950 / 24.500 / 22.000–24.700 |
| 4 | undo-render | 50 | 13.600 / 14.900 / 13.200–17.600 | 0.000 / 0.100 / 0.000–0.100 | 23.700 / 25.700 / 22.900–30.500 |
| 5 | open | 50 | 0.800 / 1.300 / 0.500–1.400 | 0.000 / 0.100 / 0.000–0.100 | 5.300 / 7.300 / 0.800–7.600 |
| 5 | preview-input | 50 | 2.500 / 2.800 / 2.200–2.800 | 2.200 / 2.300 / 1.900–2.600 | 8.600 / 9.000 / 8.000–9.200 |
| 5 | apply-render | 50 | 17.300 / 18.300 / 16.400–18.600 | 2.200 / 2.400 / 2.000–2.600 | 23.200 / 24.500 / 22.100–24.700 |
| 5 | undo-render | 50 | 13.800 / 14.700 / 13.200–19.200 | 0.000 / 0.100 / 0.000–0.100 | 24.100 / 25.100 / 23.000–32.600 |

Per-run ranges:

- open: processing median 0.700–0.800; p95 1.300–1.300. Rendering-opportunity p95 7.300–8.300.
- preview-input: processing median 2.400–2.500; p95 2.700–2.800. Rendering-opportunity p95 8.600–9.100.
- apply-render: processing median 16.800–17.300; p95 17.500–18.300. Rendering-opportunity p95 23.300–24.500.
- undo-render: processing median 13.300–13.800; p95 14.100–14.900. Rendering-opportunity p95 24.400–25.700.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 9429–9429 |
| 2 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 9429–9429 |
| 3 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 9429–9429 |
| 4 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 9429–9429 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | 0.100 | 70 / 0 | 9429–9429 |

## chromium · caps-template · template

Population: people=128, teams=32, work=254, practices=128, contributions=128, connections=254, references=8168, inputUtf8Bytes=264059.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | template-preview | 50 | 3.100 / 3.400 / 2.800–3.500 | 0.000 / 0.000 / 0.000–0.000 | 3.300 / 3.600 / 2.900–3.600 |
| 1 | template-apply-render | 50 | 10.350 / 11.300 / 9.700–11.500 | 2.100 / 2.300 / 1.900–2.400 | 17.450 / 18.700 / 16.500–22.100 |
| 1 | undo-render | 50 | 7.500 / 8.700 / 6.900–10.700 | 0.000 / 0.100 / 0.000–0.100 | 14.500 / 17.200 / 13.900–19.500 |
| 2 | template-preview | 50 | 3.100 / 3.400 / 2.800–3.500 | 0.000 / 0.000 / 0.000–0.000 | 3.200 / 3.500 / 3.000–4.100 |
| 2 | template-apply-render | 50 | 10.700 / 11.700 / 9.800–12.100 | 2.100 / 2.400 / 1.900–2.500 | 17.800 / 19.300 / 16.600–19.700 |
| 2 | undo-render | 50 | 7.500 / 8.100 / 7.200–8.400 | 0.000 / 0.100 / 0.000–0.200 | 14.500 / 15.600 / 14.000–16.500 |
| 3 | template-preview | 50 | 3.050 / 3.500 / 2.800–4.100 | 0.000 / 0.000 / 0.000–0.000 | 3.200 / 3.700 / 3.000–4.200 |
| 3 | template-apply-render | 50 | 10.300 / 11.200 / 9.600–11.600 | 2.100 / 2.300 / 1.900–2.300 | 17.350 / 18.900 / 16.500–19.100 |
| 3 | undo-render | 50 | 7.500 / 7.900 / 7.100–9.200 | 0.000 / 0.100 / 0.000–0.100 | 14.500 / 18.700 / 13.800–19.700 |
| 4 | template-preview | 50 | 3.100 / 3.500 / 2.800–4.100 | 0.000 / 0.000 / 0.000–0.000 | 3.200 / 3.700 / 2.900–4.200 |
| 4 | template-apply-render | 50 | 10.700 / 11.900 / 9.800–16.900 | 2.100 / 2.300 / 2.000–3.300 | 18.050 / 20.000 / 16.700–25.900 |
| 4 | undo-render | 50 | 7.600 / 8.100 / 7.100–12.300 | 0.000 / 0.100 / 0.000–0.100 | 14.700 / 15.700 / 14.100–23.200 |
| 5 | template-preview | 50 | 3.150 / 3.400 / 2.900–3.600 | 0.000 / 0.000 / 0.000–0.000 | 3.300 / 3.600 / 3.000–3.800 |
| 5 | template-apply-render | 50 | 10.900 / 11.700 / 9.900–11.700 | 2.100 / 2.300 / 2.000–2.500 | 18.300 / 19.400 / 16.900–19.500 |
| 5 | undo-render | 50 | 7.700 / 8.000 / 7.400–8.200 | 0.000 / 0.100 / 0.000–0.100 | 15.000 / 15.500 / 14.400–15.700 |

Per-run ranges:

- template-preview: processing median 3.050–3.150; p95 3.400–3.500. Rendering-opportunity p95 3.500–3.700.
- template-apply-render: processing median 10.300–10.900; p95 11.200–11.900. Rendering-opportunity p95 18.700–20.000.
- undo-render: processing median 7.500–7.700; p95 7.900–8.700. Rendering-opportunity p95 15.500–18.700.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 9258–9258 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | 0.100 | 70 / 0 | 9258–9258 |
| 3 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 9258–9258 |
| 4 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 9258–9258 |
| 5 | 0.000 / 0.000 / 0.000–0.100 | 0.100 | 70 / 0 | 9258–9258 |

## firefox · small · selection

Population: people=4, teams=2, work=4, practices=2, contributions=2, connections=4, references=60, inputUtf8Bytes=4288.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 7.500 / 9.000 / 5.000–9.000 |
| 2 | selection | 100 | 0.000 / 1.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 9.000 / 1.000–10.000 |
| 3 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 8.000 / 9.000 / 4.000–9.000 |
| 4 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 7.500 / 9.000 / 2.000–9.000 |
| 5 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 8.000 / 9.000 / 4.000–10.000 |

Per-run ranges:

- selection: processing median 0.000–0.000; p95 1.000–1.000. Rendering-opportunity p95 9.000–9.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1139–1139 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 1139–1139 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1139–1139 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 1139–1139 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 1139–1139 |

## firefox · small · connection

Population: people=4, teams=2, work=4, practices=2, contributions=2, connections=4, references=60, inputUtf8Bytes=4288.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | open | 50 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 5.000 / 6.000 / 3.000–6.000 |
| 1 | preview-input | 50 | 0.000 / 2.000 / 0.000–2.000 | 0.000 / 1.000 / 0.000–2.000 | 8.000 / 9.000 / 7.000–9.000 |
| 1 | apply-render | 50 | 3.000 / 4.000 / 2.000–5.000 | 0.000 / 1.000 / 0.000–1.000 | 8.000 / 9.000 / 7.000–9.000 |
| 1 | undo-render | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 9.000 / 10.000 / 8.000–10.000 |
| 2 | open | 50 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–1.000 | 5.000 / 6.000 / 4.000–6.000 |
| 2 | preview-input | 50 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 1.000 / 0.000–1.000 | 8.000 / 9.000 / 7.000–10.000 |
| 2 | apply-render | 50 | 3.000 / 4.000 / 2.000–4.000 | 0.000 / 1.000 / 0.000–2.000 | 8.000 / 9.000 / 7.000–10.000 |
| 2 | undo-render | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 9.000 / 10.000 / 8.000–10.000 |
| 3 | open | 50 | 0.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–1.000 | 5.000 / 6.000 / 3.000–6.000 |
| 3 | preview-input | 50 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 1.000 / 0.000–1.000 | 8.000 / 9.000 / 7.000–9.000 |
| 3 | apply-render | 50 | 3.000 / 4.000 / 2.000–5.000 | 0.000 / 1.000 / 0.000–2.000 | 8.000 / 9.000 / 7.000–10.000 |
| 3 | undo-render | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–1.000 | 9.000 / 10.000 / 8.000–10.000 |
| 4 | open | 50 | 0.000 / 1.000 / 0.000–2.000 | 0.000 / 1.000 / 0.000–1.000 | 4.000 / 5.000 / 3.000–13.000 |
| 4 | preview-input | 50 | 0.500 / 1.000 / 0.000–2.000 | 0.000 / 1.000 / 0.000–1.000 | 8.000 / 9.000 / 7.000–9.000 |
| 4 | apply-render | 50 | 4.000 / 4.000 / 2.000–5.000 | 0.000 / 1.000 / 0.000–1.000 | 8.000 / 9.000 / 7.000–9.000 |
| 4 | undo-render | 50 | 1.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 9.000 / 10.000 / 8.000–10.000 |
| 5 | open | 50 | 0.500 / 1.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–1.000 | 5.000 / 6.000 / 4.000–6.000 |
| 5 | preview-input | 50 | 1.000 / 1.000 / 0.000–2.000 | 0.000 / 1.000 / 0.000–2.000 | 8.000 / 9.000 / 7.000–9.000 |
| 5 | apply-render | 50 | 3.000 / 5.000 / 2.000–5.000 | 0.000 / 1.000 / 0.000–1.000 | 8.000 / 9.000 / 7.000–9.000 |
| 5 | undo-render | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 9.000 / 10.000 / 8.000–10.000 |

Per-run ranges:

- open: processing median 0.000–0.500; p95 1.000–2.000. Rendering-opportunity p95 5.000–6.000.
- preview-input: processing median 0.000–1.000; p95 1.000–2.000. Rendering-opportunity p95 9.000–9.000.
- apply-render: processing median 3.000–4.000; p95 4.000–5.000. Rendering-opportunity p95 9.000–9.000.
- undo-render: processing median 1.000–1.000; p95 2.000–2.000. Rendering-opportunity p95 10.000–10.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1155–1155 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1155–1155 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1155–1155 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1155–1155 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1155–1155 |

## firefox · small-template · template

Population: people=4, teams=2, work=4, practices=2, contributions=2, connections=4, references=60, inputUtf8Bytes=4288.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | template-preview | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 8.000 / 5.000–8.000 |
| 1 | template-apply-render | 50 | 2.000 / 3.000 / 1.000–4.000 | 0.000 / 1.000 / 0.000–1.000 | 8.000 / 9.000 / 7.000–11.000 |
| 1 | undo-render | 50 | 1.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–1.000 | 8.000 / 9.000 / 7.000–9.000 |
| 2 | template-preview | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 8.000 / 6.000–8.000 |
| 2 | template-apply-render | 50 | 2.000 / 3.000 / 1.000–4.000 | 0.000 / 1.000 / 0.000–1.000 | 8.000 / 9.000 / 8.000–10.000 |
| 2 | undo-render | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 8.000 / 9.000 / 7.000–9.000 |
| 3 | template-preview | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 8.000 / 6.000–8.000 |
| 3 | template-apply-render | 50 | 2.000 / 3.000 / 1.000–3.000 | 0.000 / 1.000 / 0.000–1.000 | 8.000 / 9.000 / 7.000–9.000 |
| 3 | undo-render | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 8.000 / 9.000 / 7.000–9.000 |
| 4 | template-preview | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 8.000 / 1.000–8.000 |
| 4 | template-apply-render | 50 | 2.000 / 3.000 / 1.000–5.000 | 0.000 / 1.000 / 0.000–1.000 | 8.000 / 9.000 / 6.000–10.000 |
| 4 | undo-render | 50 | 1.000 / 3.000 / 0.000–3.000 | 0.000 / 0.000 / 0.000–1.000 | 8.000 / 13.000 / 7.000–20.000 |
| 5 | template-preview | 50 | 1.000 / 1.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 8.000 / 3.000–8.000 |
| 5 | template-apply-render | 50 | 2.000 / 3.000 / 1.000–3.000 | 0.000 / 1.000 / 0.000–1.000 | 8.000 / 9.000 / 6.000–9.000 |
| 5 | undo-render | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–1.000 | 8.000 / 9.000 / 7.000–9.000 |

Per-run ranges:

- template-preview: processing median 1.000–1.000; p95 1.000–2.000. Rendering-opportunity p95 8.000–8.000.
- template-apply-render: processing median 2.000–2.000; p95 3.000–3.000. Rendering-opportunity p95 9.000–9.000.
- undo-render: processing median 1.000–1.000; p95 2.000–3.000. Rendering-opportunity p95 9.000–13.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 1139–1139 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 1139–1139 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1139–1139 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1139–1139 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1139–1139 |

## firefox · representative · selection

Population: people=32, teams=8, work=64, practices=32, contributions=32, connections=64, references=1280, inputUtf8Bytes=56471.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 9.000 / 4.000–9.000 |
| 2 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 9.000 / 3.000–9.000 |
| 3 | selection | 100 | 0.000 / 1.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 9.000 / 4.000–10.000 |
| 4 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 9.000 / 3.000–9.000 |
| 5 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 9.000 / 4.000–10.000 |

Per-run ranges:

- selection: processing median 0.000–0.000; p95 1.000–1.000. Rendering-opportunity p95 9.000–9.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 3088–3088 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 3088–3088 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3088–3088 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3088–3088 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3088–3088 |

## firefox · representative · connection

Population: people=32, teams=8, work=64, practices=32, contributions=32, connections=64, references=1280, inputUtf8Bytes=56471.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | open | 50 | 0.000 / 1.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 5.000 / 6.000 / 2.000–6.000 |
| 1 | preview-input | 50 | 1.000 / 2.000 / 0.000–3.000 | 1.000 / 2.000 / 0.000–2.000 | 9.000 / 10.000 / 7.000–10.000 |
| 1 | apply-render | 50 | 8.500 / 10.000 / 7.000–11.000 | 1.000 / 2.000 / 0.000–2.000 | 9.000 / 12.000 / 8.000–13.000 |
| 1 | undo-render | 50 | 3.000 / 5.000 / 3.000–5.000 | 0.000 / 0.000 / 0.000–1.000 | 15.000 / 16.000 / 10.000–22.000 |
| 2 | open | 50 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–1.000 | 5.000 / 6.000 / 4.000–6.000 |
| 2 | preview-input | 50 | 1.000 / 3.000 / 0.000–3.000 | 1.000 / 2.000 / 0.000–2.000 | 9.000 / 10.000 / 8.000–10.000 |
| 2 | apply-render | 50 | 9.000 / 9.000 / 8.000–10.000 | 1.000 / 2.000 / 0.000–2.000 | 9.000 / 11.000 / 8.000–14.000 |
| 2 | undo-render | 50 | 4.000 / 4.000 / 2.000–5.000 | 0.000 / 0.000 / 0.000–1.000 | 14.000 / 15.000 / 10.000–16.000 |
| 3 | open | 50 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 5.000 / 6.000 / 4.000–6.000 |
| 3 | preview-input | 50 | 1.000 / 2.000 / 0.000–3.000 | 1.000 / 2.000 / 0.000–2.000 | 9.000 / 9.000 / 7.000–10.000 |
| 3 | apply-render | 50 | 9.000 / 10.000 / 8.000–11.000 | 1.000 / 2.000 / 0.000–3.000 | 9.000 / 12.000 / 8.000–13.000 |
| 3 | undo-render | 50 | 4.000 / 4.000 / 2.000–5.000 | 0.000 / 0.000 / 0.000–1.000 | 14.000 / 16.000 / 9.000–23.000 |
| 4 | open | 50 | 0.000 / 1.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 5.000 / 6.000 / 1.000–6.000 |
| 4 | preview-input | 50 | 1.000 / 2.000 / 0.000–2.000 | 1.000 / 2.000 / 0.000–2.000 | 9.000 / 10.000 / 8.000–10.000 |
| 4 | apply-render | 50 | 8.000 / 9.000 / 7.000–11.000 | 1.000 / 2.000 / 0.000–2.000 | 9.000 / 13.000 / 8.000–14.000 |
| 4 | undo-render | 50 | 4.000 / 5.000 / 3.000–6.000 | 0.000 / 0.000 / 0.000–1.000 | 14.000 / 16.000 / 9.000–16.000 |
| 5 | open | 50 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–1.000 | 5.000 / 6.000 / 1.000–6.000 |
| 5 | preview-input | 50 | 1.000 / 2.000 / 0.000–3.000 | 1.000 / 2.000 / 0.000–2.000 | 9.000 / 10.000 / 8.000–10.000 |
| 5 | apply-render | 50 | 9.000 / 10.000 / 7.000–10.000 | 1.000 / 2.000 / 0.000–2.000 | 10.000 / 11.000 / 8.000–13.000 |
| 5 | undo-render | 50 | 3.500 / 4.000 / 2.000–5.000 | 0.000 / 0.000 / 0.000–0.000 | 14.000 / 15.000 / 9.000–15.000 |

Per-run ranges:

- open: processing median 0.000–0.000; p95 1.000–1.000. Rendering-opportunity p95 6.000–6.000.
- preview-input: processing median 1.000–1.000; p95 2.000–3.000. Rendering-opportunity p95 9.000–10.000.
- apply-render: processing median 8.000–9.000; p95 9.000–10.000. Rendering-opportunity p95 11.000–13.000.
- undo-render: processing median 3.000–4.000; p95 4.000–5.000. Rendering-opportunity p95 15.000–16.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–1.000 | unobserved | 70 / 0 | 3141–3141 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3141–3141 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 3141–3141 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3141–3141 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 3141–3141 |

## firefox · representative-template · template

Population: people=32, teams=8, work=64, practices=32, contributions=32, connections=64, references=1280, inputUtf8Bytes=56471.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | template-preview | 50 | 1.000 / 2.000 / 0.000–3.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 8.000 / 5.000–8.000 |
| 1 | template-apply-render | 50 | 5.000 / 5.000 / 4.000–6.000 | 1.000 / 2.000 / 0.000–2.000 | 8.000 / 9.000 / 7.000–10.000 |
| 1 | undo-render | 50 | 3.000 / 4.000 / 2.000–4.000 | 0.000 / 0.000 / 0.000–0.000 | 8.000 / 9.000 / 7.000–9.000 |
| 2 | template-preview | 50 | 1.000 / 2.000 / 0.000–3.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 8.000 / 1.000–8.000 |
| 2 | template-apply-render | 50 | 5.000 / 6.000 / 3.000–6.000 | 1.000 / 2.000 / 0.000–3.000 | 8.000 / 9.000 / 7.000–10.000 |
| 2 | undo-render | 50 | 3.000 / 4.000 / 2.000–5.000 | 0.000 / 0.000 / 0.000–1.000 | 8.000 / 9.000 / 7.000–9.000 |
| 3 | template-preview | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 8.000 / 2.000–8.000 |
| 3 | template-apply-render | 50 | 5.000 / 6.000 / 3.000–7.000 | 1.000 / 2.000 / 0.000–2.000 | 8.000 / 9.000 / 6.000–10.000 |
| 3 | undo-render | 50 | 3.000 / 4.000 / 3.000–5.000 | 0.000 / 1.000 / 0.000–1.000 | 8.000 / 9.000 / 6.000–9.000 |
| 4 | template-preview | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 8.000 / 5.000–8.000 |
| 4 | template-apply-render | 50 | 5.000 / 6.000 / 4.000–6.000 | 1.000 / 2.000 / 0.000–2.000 | 8.000 / 10.000 / 7.000–12.000 |
| 4 | undo-render | 50 | 3.000 / 4.000 / 2.000–5.000 | 0.000 / 0.000 / 0.000–1.000 | 8.000 / 9.000 / 6.000–9.000 |
| 5 | template-preview | 50 | 1.000 / 3.000 / 1.000–3.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 8.000 / 6.000–8.000 |
| 5 | template-apply-render | 50 | 5.000 / 5.000 / 4.000–6.000 | 1.000 / 1.000 / 0.000–2.000 | 8.000 / 9.000 / 8.000–10.000 |
| 5 | undo-render | 50 | 4.000 / 4.000 / 2.000–5.000 | 0.000 / 0.000 / 0.000–0.000 | 8.000 / 9.000 / 7.000–9.000 |

Per-run ranges:

- template-preview: processing median 1.000–1.000; p95 2.000–3.000. Rendering-opportunity p95 8.000–8.000.
- template-apply-render: processing median 5.000–5.000; p95 5.000–6.000. Rendering-opportunity p95 9.000–10.000.
- undo-render: processing median 3.000–4.000; p95 4.000–4.000. Rendering-opportunity p95 9.000–9.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3088–3088 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3088–3088 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3088–3088 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3088–3088 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3088–3088 |

## firefox · caps · selection

Population: people=128, teams=32, work=256, practices=128, contributions=128, connections=256, references=8192, inputUtf8Bytes=265067.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 9.000 / 2.000–9.000 |
| 2 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 9.000 / 2.000–10.000 |
| 3 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 9.000 / 2.000–9.000 |
| 4 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 9.000 / 4.000–9.000 |
| 5 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 7.000 / 9.000 / 2.000–9.000 |

Per-run ranges:

- selection: processing median 0.000–0.000; p95 1.000–1.000. Rendering-opportunity p95 9.000–9.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9280–9280 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 9280–9280 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9280–9280 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 9280–9280 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 9280–9280 |

## firefox · caps · connection

Population: people=128, teams=32, work=256, practices=128, contributions=128, connections=256, references=8192, inputUtf8Bytes=265067.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | open | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 10.000 / 32.000 / 0.000–100.000 |
| 1 | preview-input | 50 | 4.000 / 5.000 / 2.000–9.000 | 3.000 / 4.000 / 2.000–8.000 | 12.000 / 14.000 / 10.000–18.000 |
| 1 | apply-render | 50 | 24.000 / 26.000 / 22.000–28.000 | 3.000 / 5.000 / 2.000–7.000 | 25.000 / 27.000 / 23.000–30.000 |
| 1 | undo-render | 50 | 13.000 / 14.000 / 11.000–17.000 | 0.000 / 0.000 / 0.000–1.000 | 21.000 / 23.000 / 20.000–26.000 |
| 2 | open | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–1.000 | 9.000 / 16.000 / 1.000–90.000 |
| 2 | preview-input | 50 | 4.000 / 6.000 / 2.000–8.000 | 3.000 / 5.000 / 2.000–7.000 | 12.000 / 14.000 / 10.000–17.000 |
| 2 | apply-render | 50 | 24.000 / 28.000 / 23.000–30.000 | 3.000 / 5.000 / 2.000–8.000 | 25.000 / 30.000 / 24.000–32.000 |
| 2 | undo-render | 50 | 13.000 / 14.000 / 11.000–18.000 | 0.000 / 0.000 / 0.000–1.000 | 21.000 / 23.000 / 20.000–28.000 |
| 3 | open | 50 | 1.000 / 2.000 / 0.000–3.000 | 0.000 / 0.000 / 0.000–1.000 | 9.000 / 19.000 / 1.000–47.000 |
| 3 | preview-input | 50 | 4.000 / 6.000 / 2.000–8.000 | 3.000 / 5.000 / 2.000–8.000 | 12.000 / 14.000 / 10.000–18.000 |
| 3 | apply-render | 50 | 24.000 / 27.000 / 23.000–31.000 | 3.000 / 4.000 / 1.000–6.000 | 25.000 / 28.000 / 24.000–33.000 |
| 3 | undo-render | 50 | 13.000 / 14.000 / 11.000–19.000 | 0.000 / 0.000 / 0.000–0.000 | 22.000 / 23.000 / 20.000–28.000 |
| 4 | open | 50 | 1.000 / 2.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–1.000 | 8.000 / 15.000 / 1.000–104.000 |
| 4 | preview-input | 50 | 3.000 / 5.000 / 2.000–8.000 | 3.000 / 5.000 / 2.000–7.000 | 12.000 / 13.000 / 10.000–19.000 |
| 4 | apply-render | 50 | 24.500 / 26.000 / 22.000–29.000 | 3.000 / 5.000 / 2.000–8.000 | 26.000 / 27.000 / 24.000–32.000 |
| 4 | undo-render | 50 | 13.000 / 15.000 / 12.000–28.000 | 0.000 / 0.000 / 0.000–1.000 | 22.000 / 24.000 / 20.000–48.000 |
| 5 | open | 50 | 1.000 / 1.000 / 0.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 10.000 / 13.000 / 1.000–97.000 |
| 5 | preview-input | 50 | 3.000 / 5.000 / 2.000–9.000 | 3.000 / 5.000 / 2.000–8.000 | 12.000 / 13.000 / 10.000–19.000 |
| 5 | apply-render | 50 | 24.000 / 27.000 / 23.000–31.000 | 3.000 / 4.000 / 2.000–6.000 | 25.000 / 28.000 / 24.000–33.000 |
| 5 | undo-render | 50 | 13.000 / 14.000 / 11.000–18.000 | 0.000 / 0.000 / 0.000–0.000 | 21.000 / 24.000 / 20.000–28.000 |

Per-run ranges:

- open: processing median 1.000–1.000; p95 1.000–2.000. Rendering-opportunity p95 13.000–32.000.
- preview-input: processing median 3.000–4.000; p95 5.000–6.000. Rendering-opportunity p95 13.000–14.000.
- apply-render: processing median 24.000–24.500; p95 26.000–28.000. Rendering-opportunity p95 27.000–30.000.
- undo-render: processing median 13.000–13.000; p95 14.000–15.000. Rendering-opportunity p95 23.000–24.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 9429–9429 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9429–9429 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 9429–9429 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 9429–9429 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9429–9429 |

## firefox · caps-template · template

Population: people=128, teams=32, work=254, practices=128, contributions=128, connections=254, references=8168, inputUtf8Bytes=264059.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | template-preview | 50 | 4.000 / 6.000 / 3.000–9.000 | 0.000 / 0.000 / 0.000–0.000 | 4.000 / 7.000 / 3.000–10.000 |
| 1 | template-apply-render | 50 | 15.000 / 18.000 / 14.000–20.000 | 3.000 / 6.000 / 1.000–9.000 | 21.000 / 24.000 / 18.000–26.000 |
| 1 | undo-render | 50 | 12.000 / 13.000 / 11.000–17.000 | 0.000 / 1.000 / 0.000–1.000 | 17.000 / 19.000 / 16.000–22.000 |
| 2 | template-preview | 50 | 4.000 / 6.000 / 3.000–9.000 | 0.000 / 0.000 / 0.000–0.000 | 4.000 / 6.000 / 3.000–10.000 |
| 2 | template-apply-render | 50 | 15.000 / 18.000 / 14.000–21.000 | 3.000 / 4.000 / 1.000–7.000 | 21.000 / 23.000 / 19.000–29.000 |
| 2 | undo-render | 50 | 12.000 / 14.000 / 10.000–17.000 | 0.000 / 0.000 / 0.000–1.000 | 17.000 / 19.000 / 15.000–24.000 |
| 3 | template-preview | 50 | 4.000 / 7.000 / 3.000–9.000 | 0.000 / 0.000 / 0.000–0.000 | 4.000 / 8.000 / 3.000–10.000 |
| 3 | template-apply-render | 50 | 16.000 / 19.000 / 14.000–21.000 | 3.000 / 5.000 / 2.000–8.000 | 21.000 / 24.000 / 19.000–27.000 |
| 3 | undo-render | 50 | 12.000 / 13.000 / 11.000–17.000 | 0.000 / 0.000 / 0.000–1.000 | 17.000 / 18.000 / 16.000–22.000 |
| 4 | template-preview | 50 | 4.000 / 7.000 / 3.000–9.000 | 0.000 / 0.000 / 0.000–0.000 | 4.000 / 7.000 / 3.000–10.000 |
| 4 | template-apply-render | 50 | 15.500 / 19.000 / 14.000–22.000 | 3.000 / 6.000 / 1.000–6.000 | 21.000 / 25.000 / 20.000–28.000 |
| 4 | undo-render | 50 | 12.000 / 15.000 / 11.000–17.000 | 0.000 / 0.000 / 0.000–1.000 | 17.000 / 20.000 / 16.000–24.000 |
| 5 | template-preview | 50 | 4.000 / 7.000 / 3.000–10.000 | 0.000 / 0.000 / 0.000–0.000 | 4.000 / 7.000 / 3.000–11.000 |
| 5 | template-apply-render | 50 | 15.000 / 19.000 / 14.000–23.000 | 3.000 / 6.000 / 1.000–10.000 | 20.000 / 25.000 / 19.000–29.000 |
| 5 | undo-render | 50 | 12.000 / 15.000 / 11.000–18.000 | 0.000 / 0.000 / 0.000–1.000 | 17.000 / 20.000 / 16.000–24.000 |

Per-run ranges:

- template-preview: processing median 4.000–4.000; p95 6.000–7.000. Rendering-opportunity p95 6.000–8.000.
- template-apply-render: processing median 15.000–16.000; p95 18.000–19.000. Rendering-opportunity p95 23.000–25.000.
- undo-render: processing median 12.000–12.000; p95 13.000–15.000. Rendering-opportunity p95 18.000–20.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9258–9258 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9258–9258 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9258–9258 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9258–9258 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 9258–9258 |

## webkit · small · selection

Population: people=4, teams=2, work=4, practices=2, contributions=2, connections=4, references=60, inputUtf8Bytes=4288.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 16.000 / 18.000 / 12.000–18.000 |
| 2 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 16.000 / 18.000 / 13.000–18.000 |
| 3 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 16.000 / 17.000 / 12.000–18.000 |
| 4 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 16.000 / 18.000 / 11.000–18.000 |
| 5 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 16.000 / 18.000 / 13.000–18.000 |

Per-run ranges:

- selection: processing median 0.000–0.000; p95 1.000–1.000. Rendering-opportunity p95 17.000–18.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1139–1139 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 1139–1139 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1139–1139 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 1139–1139 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 1139–1139 |

## webkit · small · connection

Population: people=4, teams=2, work=4, practices=2, contributions=2, connections=4, references=60, inputUtf8Bytes=4288.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | open | 50 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–1.000 | 12.000 / 13.000 / 11.000–14.000 |
| 1 | preview-input | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 1.000 / 0.000–1.000 | 17.000 / 17.000 / 15.000–18.000 |
| 1 | apply-render | 50 | 5.000 / 6.000 / 5.000–6.000 | 0.000 / 1.000 / 0.000–1.000 | 17.000 / 17.000 / 16.000–17.000 |
| 1 | undo-render | 50 | 2.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–1.000 | 17.000 / 17.000 / 16.000–17.000 |
| 2 | open | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–1.000 | 13.000 / 13.000 / 12.000–14.000 |
| 2 | preview-input | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 1.000 / 0.000–1.000 | 17.000 / 17.000 / 15.000–17.000 |
| 2 | apply-render | 50 | 5.000 / 6.000 / 4.000–6.000 | 0.000 / 1.000 / 0.000–1.000 | 17.000 / 18.000 / 16.000–18.000 |
| 2 | undo-render | 50 | 2.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 17.000 / 17.000 / 14.000–17.000 |
| 3 | open | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–1.000 | 12.000 / 13.000 / 11.000–14.000 |
| 3 | preview-input | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 1.000 / 0.000–1.000 | 17.000 / 17.000 / 16.000–18.000 |
| 3 | apply-render | 50 | 5.000 / 6.000 / 5.000–6.000 | 0.000 / 1.000 / 0.000–1.000 | 17.000 / 18.000 / 16.000–18.000 |
| 3 | undo-render | 50 | 2.000 / 2.000 / 1.000–2.000 | 0.000 / 1.000 / 0.000–1.000 | 17.000 / 18.000 / 15.000–18.000 |
| 4 | open | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–1.000 | 12.000 / 13.000 / 11.000–14.000 |
| 4 | preview-input | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 1.000 / 0.000–1.000 | 17.000 / 18.000 / 16.000–18.000 |
| 4 | apply-render | 50 | 5.000 / 6.000 / 4.000–6.000 | 0.000 / 1.000 / 0.000–1.000 | 17.000 / 18.000 / 15.000–18.000 |
| 4 | undo-render | 50 | 2.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–1.000 | 17.000 / 17.000 / 15.000–18.000 |
| 5 | open | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–1.000 | 12.000 / 14.000 / 3.000–14.000 |
| 5 | preview-input | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 1.000 / 0.000–1.000 | 17.000 / 18.000 / 15.000–18.000 |
| 5 | apply-render | 50 | 5.000 / 6.000 / 4.000–6.000 | 0.000 / 0.000 / 0.000–2.000 | 17.000 / 17.000 / 15.000–18.000 |
| 5 | undo-render | 50 | 2.000 / 2.000 / 1.000–3.000 | 0.000 / 0.000 / 0.000–1.000 | 16.000 / 18.000 / 15.000–23.000 |

Per-run ranges:

- open: processing median 0.000–1.000; p95 1.000–1.000. Rendering-opportunity p95 13.000–14.000.
- preview-input: processing median 1.000–1.000; p95 1.000–1.000. Rendering-opportunity p95 17.000–18.000.
- apply-render: processing median 5.000–5.000; p95 6.000–6.000. Rendering-opportunity p95 17.000–18.000.
- undo-render: processing median 2.000–2.000; p95 2.000–2.000. Rendering-opportunity p95 17.000–18.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 1155–1155 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 1155–1155 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1155–1155 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1155–1155 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1155–1155 |

## webkit · small-template · template

Population: people=4, teams=2, work=4, practices=2, contributions=2, connections=4, references=60, inputUtf8Bytes=4288.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | template-preview | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 14.000 / 15.000 / 14.000–16.000 |
| 1 | template-apply-render | 50 | 2.000 / 3.000 / 1.000–3.000 | 0.000 / 0.000 / 0.000–0.000 | 16.000 / 17.000 / 16.000–18.000 |
| 1 | undo-render | 50 | 2.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 17.000 / 17.000 / 15.000–18.000 |
| 2 | template-preview | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 15.000 / 15.000 / 13.000–15.000 |
| 2 | template-apply-render | 50 | 2.000 / 2.000 / 2.000–2.000 | 0.000 / 1.000 / 0.000–1.000 | 17.000 / 18.000 / 16.000–18.000 |
| 2 | undo-render | 50 | 1.000 / 2.000 / 1.000–3.000 | 0.000 / 0.000 / 0.000–0.000 | 16.000 / 17.000 / 15.000–17.000 |
| 3 | template-preview | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 15.000 / 16.000 / 14.000–16.000 |
| 3 | template-apply-render | 50 | 2.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–1.000 | 17.000 / 18.000 / 16.000–18.000 |
| 3 | undo-render | 50 | 1.000 / 2.000 / 1.000–3.000 | 0.000 / 0.000 / 0.000–0.000 | 16.000 / 17.000 / 15.000–18.000 |
| 4 | template-preview | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 15.000 / 16.000 / 14.000–16.000 |
| 4 | template-apply-render | 50 | 2.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–1.000 | 16.000 / 17.000 / 15.000–18.000 |
| 4 | undo-render | 50 | 2.000 / 2.000 / 2.000–3.000 | 0.000 / 0.000 / 0.000–1.000 | 17.000 / 17.000 / 16.000–18.000 |
| 5 | template-preview | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 15.000 / 16.000 / 13.000–16.000 |
| 5 | template-apply-render | 50 | 2.000 / 2.000 / 1.000–3.000 | 0.000 / 0.000 / 0.000–1.000 | 16.000 / 18.000 / 15.000–18.000 |
| 5 | undo-render | 50 | 1.000 / 2.000 / 1.000–2.000 | 0.000 / 1.000 / 0.000–1.000 | 16.000 / 18.000 / 14.000–18.000 |

Per-run ranges:

- template-preview: processing median 1.000–1.000; p95 1.000–1.000. Rendering-opportunity p95 15.000–16.000.
- template-apply-render: processing median 2.000–2.000; p95 2.000–3.000. Rendering-opportunity p95 17.000–18.000.
- undo-render: processing median 1.000–2.000; p95 2.000–2.000. Rendering-opportunity p95 17.000–18.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 1139–1139 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 1139–1139 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1139–1139 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 1139–1139 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 1139–1139 |

## webkit · representative · selection

Population: people=32, teams=8, work=64, practices=32, contributions=32, connections=64, references=1280, inputUtf8Bytes=56471.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 15.500 / 17.000 / 12.000–18.000 |
| 2 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 15.000 / 17.000 / 12.000–18.000 |
| 3 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 15.500 / 17.000 / 14.000–17.000 |
| 4 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 15.500 / 17.000 / 12.000–18.000 |
| 5 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 16.000 / 17.000 / 12.000–18.000 |

Per-run ranges:

- selection: processing median 0.000–0.000; p95 1.000–1.000. Rendering-opportunity p95 17.000–17.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3088–3088 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3088–3088 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 3088–3088 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3088–3088 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 3088–3088 |

## webkit · representative · connection

Population: people=32, teams=8, work=64, practices=32, contributions=32, connections=64, references=1280, inputUtf8Bytes=56471.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | open | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 8.000 / 10.000 / 5.000–10.000 |
| 1 | preview-input | 50 | 1.000 / 1.000 / 1.000–2.000 | 1.000 / 1.000 / 0.000–1.000 | 17.000 / 17.000 / 16.000–18.000 |
| 1 | apply-render | 50 | 14.000 / 15.000 / 13.000–15.000 | 1.000 / 1.000 / 0.000–2.000 | 18.000 / 19.000 / 17.000–20.000 |
| 1 | undo-render | 50 | 6.000 / 6.000 / 5.000–6.000 | 0.000 / 0.000 / 0.000–1.000 | 19.000 / 20.000 / 18.000–21.000 |
| 2 | open | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 8.000 / 10.000 / 5.000–10.000 |
| 2 | preview-input | 50 | 1.000 / 2.000 / 1.000–2.000 | 1.000 / 1.000 / 0.000–1.000 | 17.000 / 18.000 / 12.000–18.000 |
| 2 | apply-render | 50 | 14.000 / 16.000 / 14.000–16.000 | 1.000 / 1.000 / 0.000–1.000 | 18.000 / 20.000 / 17.000–21.000 |
| 2 | undo-render | 50 | 6.000 / 6.000 / 5.000–7.000 | 0.000 / 0.000 / 0.000–1.000 | 19.000 / 21.000 / 18.000–22.000 |
| 3 | open | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–1.000 | 8.000 / 10.000 / 5.000–10.000 |
| 3 | preview-input | 50 | 1.000 / 2.000 / 1.000–2.000 | 1.000 / 1.000 / 0.000–1.000 | 17.000 / 17.000 / 15.000–18.000 |
| 3 | apply-render | 50 | 15.000 / 16.000 / 14.000–16.000 | 1.000 / 1.000 / 0.000–2.000 | 18.000 / 20.000 / 17.000–20.000 |
| 3 | undo-render | 50 | 6.000 / 6.000 / 5.000–7.000 | 0.000 / 0.000 / 0.000–0.000 | 19.000 / 21.000 / 18.000–21.000 |
| 4 | open | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 1.000 / 0.000–1.000 | 8.000 / 10.000 / 5.000–10.000 |
| 4 | preview-input | 50 | 1.000 / 1.000 / 0.000–1.000 | 1.000 / 1.000 / 0.000–1.000 | 17.000 / 17.000 / 13.000–18.000 |
| 4 | apply-render | 50 | 14.000 / 15.000 / 14.000–15.000 | 1.000 / 1.000 / 0.000–1.000 | 18.000 / 19.000 / 17.000–19.000 |
| 4 | undo-render | 50 | 6.000 / 6.000 / 5.000–6.000 | 0.000 / 0.000 / 0.000–0.000 | 19.000 / 20.000 / 18.000–20.000 |
| 5 | open | 50 | 1.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 10.500 / 12.000 / 5.000–13.000 |
| 5 | preview-input | 50 | 1.000 / 2.000 / 1.000–2.000 | 1.000 / 1.000 / 0.000–1.000 | 17.000 / 18.000 / 15.000–18.000 |
| 5 | apply-render | 50 | 15.000 / 16.000 / 14.000–16.000 | 1.000 / 1.000 / 0.000–1.000 | 18.000 / 20.000 / 17.000–21.000 |
| 5 | undo-render | 50 | 6.000 / 7.000 / 5.000–7.000 | 0.000 / 0.000 / 0.000–1.000 | 16.000 / 17.000 / 15.000–19.000 |

Per-run ranges:

- open: processing median 1.000–1.000; p95 1.000–1.000. Rendering-opportunity p95 10.000–12.000.
- preview-input: processing median 1.000–1.000; p95 1.000–2.000. Rendering-opportunity p95 17.000–18.000.
- apply-render: processing median 14.000–15.000; p95 15.000–16.000. Rendering-opportunity p95 19.000–20.000.
- undo-render: processing median 6.000–6.000; p95 6.000–7.000. Rendering-opportunity p95 17.000–21.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 3141–3141 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3141–3141 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 3141–3141 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3141–3141 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 3141–3141 |

## webkit · representative-template · template

Population: people=32, teams=8, work=64, practices=32, contributions=32, connections=64, references=1280, inputUtf8Bytes=56471.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | template-preview | 50 | 1.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 15.000 / 16.000 / 4.000–16.000 |
| 1 | template-apply-render | 50 | 6.000 / 7.000 / 6.000–7.000 | 0.000 / 1.000 / 0.000–1.000 | 16.000 / 17.000 / 15.000–17.000 |
| 1 | undo-render | 50 | 6.000 / 6.000 / 5.000–6.000 | 0.000 / 1.000 / 0.000–1.000 | 17.000 / 18.000 / 16.000–18.000 |
| 2 | template-preview | 50 | 1.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 15.000 / 16.000 / 12.000–16.000 |
| 2 | template-apply-render | 50 | 6.000 / 7.000 / 6.000–8.000 | 1.000 / 1.000 / 0.000–1.000 | 16.000 / 17.000 / 15.000–18.000 |
| 2 | undo-render | 50 | 5.000 / 6.000 / 5.000–6.000 | 0.000 / 0.000 / 0.000–1.000 | 16.000 / 17.000 / 15.000–18.000 |
| 3 | template-preview | 50 | 1.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 14.000 / 15.000 / 14.000–15.000 |
| 3 | template-apply-render | 50 | 7.000 / 7.000 / 6.000–7.000 | 1.000 / 1.000 / 1.000–1.000 | 17.000 / 17.000 / 16.000–17.000 |
| 3 | undo-render | 50 | 5.000 / 6.000 / 5.000–6.000 | 0.000 / 0.000 / 0.000–0.000 | 16.000 / 17.000 / 15.000–17.000 |
| 4 | template-preview | 50 | 1.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 14.000 / 15.000 / 13.000–16.000 |
| 4 | template-apply-render | 50 | 6.000 / 7.000 / 6.000–7.000 | 1.000 / 1.000 / 0.000–1.000 | 17.000 / 17.000 / 16.000–18.000 |
| 4 | undo-render | 50 | 5.000 / 6.000 / 5.000–6.000 | 0.000 / 0.000 / 0.000–0.000 | 16.000 / 17.000 / 15.000–17.000 |
| 5 | template-preview | 50 | 1.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 14.000 / 15.000 / 8.000–16.000 |
| 5 | template-apply-render | 50 | 7.000 / 7.000 / 6.000–7.000 | 1.000 / 1.000 / 1.000–1.000 | 17.000 / 17.000 / 16.000–17.000 |
| 5 | undo-render | 50 | 6.000 / 6.000 / 5.000–6.000 | 0.000 / 0.000 / 0.000–0.000 | 16.000 / 17.000 / 16.000–17.000 |

Per-run ranges:

- template-preview: processing median 1.000–1.000; p95 2.000–2.000. Rendering-opportunity p95 15.000–16.000.
- template-apply-render: processing median 6.000–7.000; p95 7.000–7.000. Rendering-opportunity p95 17.000–17.000.
- undo-render: processing median 5.000–6.000; p95 6.000–6.000. Rendering-opportunity p95 17.000–18.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3088–3088 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 3088–3088 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 3088–3088 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 3088–3088 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 3088–3088 |

## webkit · caps · selection

Population: people=128, teams=32, work=256, practices=128, contributions=128, connections=256, references=8192, inputUtf8Bytes=265067.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 15.000 / 17.000 / 12.000–18.000 |
| 2 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 15.500 / 17.000 / 11.000–18.000 |
| 3 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 16.000 / 17.000 / 13.000–18.000 |
| 4 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 15.500 / 17.000 / 12.000–18.000 |
| 5 | selection | 100 | 0.000 / 1.000 / 0.000–1.000 | 0.000 / 0.000 / 0.000–0.000 | 15.000 / 17.000 / 12.000–18.000 |

Per-run ranges:

- selection: processing median 0.000–0.000; p95 1.000–1.000. Rendering-opportunity p95 17.000–17.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9280–9280 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 9280–9280 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 9280–9280 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9280–9280 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9280–9280 |

## webkit · caps · connection

Population: people=128, teams=32, work=256, practices=128, contributions=128, connections=256, references=8192, inputUtf8Bytes=265067.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | open | 50 | 1.000 / 2.000 / 1.000–2.000 | 0.000 / 1.000 / 0.000–1.000 | 11.000 / 13.000 / 10.000–14.000 |
| 1 | preview-input | 50 | 3.000 / 4.000 / 3.000–4.000 | 3.000 / 3.000 / 2.000–4.000 | 11.000 / 16.000 / 6.000–18.000 |
| 1 | apply-render | 50 | 71.000 / 72.000 / 69.000–73.000 | 3.000 / 4.000 / 2.000–4.000 | 73.000 / 76.000 / 71.000–84.000 |
| 1 | undo-render | 50 | 45.000 / 46.000 / 44.000–53.000 | 0.000 / 0.000 / 0.000–1.000 | 70.000 / 73.000 / 68.000–78.000 |
| 2 | open | 50 | 1.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–1.000 | 11.000 / 13.000 / 10.000–14.000 |
| 2 | preview-input | 50 | 4.000 / 4.000 / 3.000–4.000 | 3.000 / 3.000 / 2.000–4.000 | 10.500 / 15.000 / 5.000–16.000 |
| 2 | apply-render | 50 | 70.000 / 72.000 / 69.000–73.000 | 3.000 / 4.000 / 2.000–4.000 | 72.000 / 75.000 / 71.000–76.000 |
| 2 | undo-render | 50 | 45.000 / 46.000 / 43.000–46.000 | 0.000 / 1.000 / 0.000–1.000 | 69.000 / 72.000 / 67.000–76.000 |
| 3 | open | 50 | 1.000 / 2.000 / 1.000–2.000 | 0.000 / 1.000 / 0.000–1.000 | 11.000 / 14.000 / 11.000–14.000 |
| 3 | preview-input | 50 | 4.000 / 4.000 / 3.000–4.000 | 3.000 / 4.000 / 2.000–4.000 | 9.000 / 16.000 / 5.000–18.000 |
| 3 | apply-render | 50 | 71.000 / 73.000 / 68.000–80.000 | 3.000 / 4.000 / 2.000–8.000 | 73.000 / 78.000 / 70.000–83.000 |
| 3 | undo-render | 50 | 45.000 / 46.000 / 44.000–59.000 | 0.000 / 0.000 / 0.000–1.000 | 70.000 / 74.000 / 67.000–84.000 |
| 4 | open | 50 | 1.000 / 2.000 / 1.000–2.000 | 0.000 / 0.000 / 0.000–0.000 | 11.000 / 13.000 / 10.000–14.000 |
| 4 | preview-input | 50 | 4.000 / 4.000 / 3.000–4.000 | 3.000 / 3.000 / 2.000–4.000 | 9.000 / 16.000 / 5.000–18.000 |
| 4 | apply-render | 50 | 70.000 / 72.000 / 68.000–73.000 | 3.000 / 4.000 / 2.000–4.000 | 73.000 / 75.000 / 71.000–77.000 |
| 4 | undo-render | 50 | 45.000 / 46.000 / 43.000–47.000 | 0.000 / 0.000 / 0.000–1.000 | 69.000 / 75.000 / 67.000–76.000 |
| 5 | open | 50 | 1.000 / 2.000 / 1.000–2.000 | 0.000 / 1.000 / 0.000–1.000 | 11.000 / 14.000 / 10.000–19.000 |
| 5 | preview-input | 50 | 4.000 / 4.000 / 3.000–5.000 | 3.000 / 4.000 / 2.000–4.000 | 9.500 / 15.000 / 5.000–18.000 |
| 5 | apply-render | 50 | 71.000 / 74.000 / 69.000–79.000 | 3.000 / 4.000 / 2.000–8.000 | 73.000 / 79.000 / 71.000–82.000 |
| 5 | undo-render | 50 | 45.000 / 47.000 / 44.000–53.000 | 0.000 / 0.000 / 0.000–0.000 | 69.000 / 79.000 / 68.000–118.000 |

Per-run ranges:

- open: processing median 1.000–1.000; p95 2.000–2.000. Rendering-opportunity p95 13.000–14.000.
- preview-input: processing median 3.000–4.000; p95 4.000–4.000. Rendering-opportunity p95 15.000–16.000.
- apply-render: processing median 70.000–71.000; p95 72.000–74.000. Rendering-opportunity p95 75.000–79.000.
- undo-render: processing median 45.000–45.000; p95 46.000–47.000. Rendering-opportunity p95 72.000–79.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9429–9429 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9429–9429 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9429–9429 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9429–9429 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9429–9429 |

## webkit · caps-template · template

Population: people=128, teams=32, work=254, practices=128, contributions=128, connections=254, references=8168, inputUtf8Bytes=264059.

| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |
| --- | --- | ---: | --- | --- | --- |
| 1 | template-preview | 50 | 4.000 / 4.000 / 3.000–4.000 | 0.000 / 0.000 / 0.000–0.000 | 5.000 / 5.000 / 4.000–5.000 |
| 1 | template-apply-render | 50 | 45.000 / 47.000 / 44.000–47.000 | 3.000 / 3.000 / 2.000–3.000 | 64.500 / 80.000 / 61.000–81.000 |
| 1 | undo-render | 50 | 43.000 / 44.000 / 42.000–45.000 | 0.000 / 0.000 / 0.000–1.000 | 60.000 / 63.000 / 58.000–63.000 |
| 2 | template-preview | 50 | 4.000 / 4.000 / 3.000–4.000 | 0.000 / 0.000 / 0.000–0.000 | 5.000 / 5.000 / 4.000–10.000 |
| 2 | template-apply-render | 50 | 45.000 / 47.000 / 44.000–48.000 | 3.000 / 3.000 / 2.000–4.000 | 65.500 / 79.000 / 61.000–80.000 |
| 2 | undo-render | 50 | 43.000 / 45.000 / 42.000–46.000 | 0.000 / 0.000 / 0.000–0.000 | 60.000 / 63.000 / 58.000–66.000 |
| 3 | template-preview | 50 | 4.000 / 4.000 / 3.000–4.000 | 0.000 / 0.000 / 0.000–0.000 | 5.000 / 5.000 / 4.000–13.000 |
| 3 | template-apply-render | 50 | 45.000 / 46.000 / 44.000–46.000 | 3.000 / 3.000 / 2.000–4.000 | 64.000 / 80.000 / 62.000–81.000 |
| 3 | undo-render | 50 | 43.000 / 45.000 / 41.000–46.000 | 0.000 / 0.000 / 0.000–0.000 | 60.000 / 63.000 / 56.000–64.000 |
| 4 | template-preview | 50 | 4.000 / 4.000 / 3.000–4.000 | 0.000 / 0.000 / 0.000–0.000 | 5.000 / 5.000 / 4.000–5.000 |
| 4 | template-apply-render | 50 | 46.000 / 48.000 / 44.000–48.000 | 3.000 / 3.000 / 2.000–4.000 | 65.000 / 80.000 / 61.000–91.000 |
| 4 | undo-render | 50 | 43.000 / 46.000 / 41.000–94.000 | 0.000 / 0.000 / 0.000–1.000 | 60.000 / 67.000 / 57.000–113.000 |
| 5 | template-preview | 50 | 4.000 / 4.000 / 3.000–4.000 | 0.000 / 0.000 / 0.000–0.000 | 5.000 / 6.000 / 4.000–6.000 |
| 5 | template-apply-render | 50 | 45.000 / 48.000 / 44.000–49.000 | 3.000 / 3.000 / 2.000–3.000 | 67.000 / 79.000 / 61.000–80.000 |
| 5 | undo-render | 50 | 43.000 / 45.000 / 42.000–45.000 | 0.000 / 0.000 / 0.000–1.000 | 60.000 / 63.000 / 58.000–66.000 |

Per-run ranges:

- template-preview: processing median 4.000–4.000; p95 4.000–4.000. Rendering-opportunity p95 5.000–6.000.
- template-apply-render: processing median 45.000–46.000; p95 46.000–48.000. Rendering-opportunity p95 79.000–80.000.
- undo-render: processing median 43.000–43.000; p95 44.000–46.000. Rendering-opportunity p95 63.000–67.000.

| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |
| --- | --- | --- | --- | --- |
| 1 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 9258–9258 |
| 2 | 0.000 / 0.000 / 0.000–0.000 | 1.000 | 70 / 0 | 9258–9258 |
| 3 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9258–9258 |
| 4 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9258–9258 |
| 5 | 0.000 / 0.000 / 0.000–0.000 | unobserved | 70 / 0 | 9258–9258 |

## Threshold review

| Domain | Engine | Population | Trace | Phase | Metric | Worst run ms | Target ms | Result |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| browser | chromium | caps | connection | apply-render | processing-median | 17.300 | 16.000 | exceeds |
| browser | firefox | caps | connection | apply-render | processing-median | 24.500 | 16.000 | exceeds |
| browser | webkit | caps | connection | apply-render | processing-median | 71.000 | 16.000 | exceeds |
| browser | webkit | caps | connection | apply-render | processing-p95 | 74.000 | 50.000 | exceeds |
| browser | webkit | caps | connection | undo-render | processing-median | 45.000 | 16.000 | exceeds |
| browser | webkit | caps-template | template | template-apply-render | processing-median | 46.000 | 16.000 | exceeds |
| browser | webkit | caps-template | template | undo-render | processing-median | 43.000 | 16.000 | exceeds |

The companion JSON retains every run summary, phase range, numeric call/resource observation, browser version and threshold result. Raw samples and machine-specific metadata remain with the local collection owner.
