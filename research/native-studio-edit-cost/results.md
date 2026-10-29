# Native Studio edit-cost measurements

Accepted source: `3f714dcb43770a1c2f4a85594e92e44139b1fbd5`. Epoch: `epoch-01`.

Each entry gives the median of five separate run statistics, followed by their full range. Values are milliseconds; all per-run summaries remain in results.json.

| Fixture | Source task | Median trace | p95 trace |
| --- | --- | ---: | ---: |
| example | direct | 0.033 (0.031–0.042) | 0.036 (0.036–0.061) |
| example | explicit | 0.014 (0.013–0.017) | 0.018 (0.017–0.029) |
| example | deferred | 0.016 (0.014–0.019) | 0.022 (0.017–0.024) |
| example | preview | 0.073 (0.072–0.077) | 0.086 (0.082–0.095) |
| example | import | 0.016 (0.014–0.018) | 0.019 (0.017–0.023) |
| example | rate-replacement | 0.011 (0.010–0.012) | 0.013 (0.012–0.014) |
| medium | direct | 0.647 (0.626–0.681) | 0.689 (0.673–0.786) |
| medium | explicit | 0.217 (0.211–0.230) | 0.247 (0.236–0.257) |
| medium | deferred | 0.219 (0.211–0.232) | 0.260 (0.239–0.305) |
| medium | preview | 1.301 (1.287–1.380) | 1.512 (1.360–1.527) |
| medium | import | 0.301 (0.297–0.341) | 0.335 (0.329–0.379) |
| medium | rate-replacement | 0.212 (0.210–0.238) | 0.243 (0.235–0.270) |
| caps | direct | 4.184 (4.019–4.294) | 4.378 (4.167–4.478) |
| caps | explicit | 1.398 (1.360–1.438) | 1.478 (1.426–1.518) |
| caps | deferred | 1.410 (1.343–1.433) | 1.453 (1.409–1.516) |
| caps | preview | 8.885 (8.756–9.616) | 9.657 (9.494–10.568) |
| caps | import | 1.820 (1.772–1.908) | 1.908 (1.874–2.132) |
| caps | rate-replacement | 1.390 (1.342–1.426) | 1.443 (1.428–1.511) |
| near-byte | direct | 5.875 (5.627–6.077) | 6.331 (6.095–6.773) |
| near-byte | explicit | 1.941 (1.882–1.989) | 2.121 (1.995–2.336) |
| near-byte | deferred | 1.930 (1.892–2.014) | 2.209 (1.993–2.273) |
| near-byte | preview | 12.328 (11.980–12.619) | 13.789 (12.851–17.026) |
| near-byte | import | 3.347 (3.189–3.394) | 3.563 (3.377–3.881) |
| near-byte | rate-replacement | 1.933 (1.829–2.012) | 2.209 (2.050–2.323) |

| Engine | Viewport | Fixture | Action | Median handler | p95 handler | p95 frame opportunity |
| --- | --- | --- | --- | ---: | ---: | ---: |
| chromium | desktop | example | input | 0.100 (0.100–0.100) | 0.200 (0.200–0.200) | 4.700 (4.400–5.000) |
| chromium | desktop | example | apply | 1.300 (1.300–1.300) | 1.500 (1.500–1.600) | 6.200 (5.900–6.500) |
| chromium | desktop | medium | input | 0.300 (0.300–0.300) | 0.400 (0.400–0.500) | 4.700 (4.600–4.800) |
| chromium | desktop | medium | apply | 1.800 (1.800–1.800) | 2.000 (1.900–2.000) | 6.200 (6.100–6.300) |
| chromium | desktop | caps | input | 1.300 (1.300–1.400) | 1.600 (1.500–1.600) | 5.300 (5.200–5.300) |
| chromium | desktop | caps | apply | 4.200 (4.200–4.300) | 4.600 (4.500–5.000) | 6.100 (6.000–6.700) |
| chromium | desktop | near-byte | input | 2.100 (2.100–2.200) | 2.400 (2.300–2.400) | 7.700 (7.400–7.700) |
| chromium | desktop | near-byte | apply | 6.000 (5.900–6.000) | 6.500 (6.400–6.600) | 6.600 (6.500–6.700) |
| chromium | narrow | example | input | 0.100 (0.100–0.100) | 0.200 (0.200–0.200) | 5.000 (4.900–5.200) |
| chromium | narrow | example | apply | 1.300 (1.300–1.300) | 1.500 (1.500–1.500) | 6.500 (6.300–7.100) |
| chromium | narrow | medium | input | 0.300 (0.300–0.300) | 0.400 (0.400–0.400) | 5.000 (4.800–5.200) |
| chromium | narrow | medium | apply | 1.800 (1.800–1.900) | 2.000 (2.000–2.100) | 6.400 (6.200–6.800) |
| chromium | narrow | caps | input | 1.300 (1.300–1.300) | 1.600 (1.500–1.600) | 5.200 (4.800–5.400) |
| chromium | narrow | caps | apply | 4.200 (4.200–4.300) | 4.800 (4.700–4.900) | 6.200 (6.100–6.600) |
| chromium | narrow | near-byte | input | 2.100 (2.100–2.200) | 2.400 (2.300–2.500) | 8.000 (7.700–8.300) |
| chromium | narrow | near-byte | apply | 6.000 (5.900–6.000) | 6.400 (6.300–6.600) | 6.600 (6.500–6.700) |
| firefox | desktop | example | input | 0.000 (0.000–0.000) | 1.000 (1.000–1.000) | 4.000 (4.000–5.000) |
| firefox | desktop | example | apply | 1.000 (1.000–1.000) | 2.000 (2.000–2.000) | 6.000 (5.000–6.000) |
| firefox | desktop | medium | input | 0.500 (0.000–1.000) | 1.000 (1.000–2.000) | 4.000 (4.000–6.000) |
| firefox | desktop | medium | apply | 3.000 (2.500–3.000) | 4.000 (3.000–4.000) | 6.000 (6.000–6.000) |
| firefox | desktop | caps | input | 2.000 (2.000–2.000) | 4.000 (3.000–6.000) | 8.000 (7.000–8.000) |
| firefox | desktop | caps | apply | 7.000 (7.000–8.000) | 10.000 (10.000–11.000) | 10.000 (10.000–12.000) |
| firefox | desktop | near-byte | input | 2.000 (2.000–2.000) | 5.000 (3.000–7.000) | 8.000 (6.000–9.000) |
| firefox | desktop | near-byte | apply | 8.000 (8.000–8.000) | 12.000 (11.000–13.000) | 12.000 (11.000–13.000) |
| firefox | narrow | example | input | 0.000 (0.000–0.000) | 1.000 (1.000–1.000) | 5.000 (4.000–6.000) |
| firefox | narrow | example | apply | 1.000 (1.000–1.000) | 2.000 (2.000–2.000) | 6.000 (6.000–6.000) |
| firefox | narrow | medium | input | 0.000 (0.000–1.000) | 1.000 (1.000–2.000) | 4.000 (4.000–6.000) |
| firefox | narrow | medium | apply | 2.000 (2.000–2.000) | 3.000 (3.000–4.000) | 6.000 (5.000–6.000) |
| firefox | narrow | caps | input | 2.000 (2.000–2.000) | 3.000 (3.000–5.000) | 8.000 (7.000–8.000) |
| firefox | narrow | caps | apply | 7.500 (7.000–8.000) | 11.000 (9.000–12.000) | 11.000 (10.000–12.000) |
| firefox | narrow | near-byte | input | 2.000 (2.000–2.000) | 4.000 (3.000–5.000) | 7.000 (6.000–8.000) |
| firefox | narrow | near-byte | apply | 8.000 (8.000–8.000) | 11.000 (10.000–12.000) | 11.000 (10.000–13.000) |
| webkit | desktop | example | input | 0.000 (0.000–0.000) | 1.000 (1.000–1.000) | 12.000 (12.000–13.000) |
| webkit | desktop | example | apply | 2.000 (2.000–2.000) | 2.000 (2.000–2.000) | 14.000 (13.000–14.000) |
| webkit | desktop | medium | input | 1.000 (0.000–1.000) | 1.000 (1.000–1.000) | 12.000 (12.000–12.000) |
| webkit | desktop | medium | apply | 4.000 (4.000–4.000) | 5.000 (5.000–5.000) | 14.000 (14.000–14.000) |
| webkit | desktop | caps | input | 2.000 (2.000–2.000) | 3.000 (2.000–3.000) | 12.000 (12.000–13.000) |
| webkit | desktop | caps | apply | 12.000 (12.000–12.000) | 13.000 (13.000–13.000) | 14.000 (14.000–14.000) |
| webkit | desktop | near-byte | input | 2.000 (2.000–3.000) | 3.000 (3.000–3.000) | 10.000 (9.000–10.000) |
| webkit | desktop | near-byte | apply | 13.000 (13.000–14.000) | 14.000 (14.000–14.000) | 14.000 (14.000–15.000) |
| webkit | narrow | example | input | 0.000 (0.000–0.000) | 1.000 (1.000–1.000) | 12.000 (12.000–12.000) |
| webkit | narrow | example | apply | 2.000 (2.000–2.000) | 2.000 (2.000–2.000) | 14.000 (13.000–14.000) |
| webkit | narrow | medium | input | 1.000 (0.000–1.000) | 1.000 (1.000–1.000) | 12.000 (12.000–13.000) |
| webkit | narrow | medium | apply | 4.000 (4.000–4.000) | 5.000 (5.000–5.000) | 13.000 (13.000–14.000) |
| webkit | narrow | caps | input | 2.000 (2.000–2.000) | 2.000 (2.000–3.000) | 12.000 (12.000–12.000) |
| webkit | narrow | caps | apply | 12.000 (12.000–12.000) | 12.000 (12.000–13.000) | 14.000 (13.000–14.000) |
| webkit | narrow | near-byte | input | 2.000 (2.000–2.500) | 3.000 (3.000–3.000) | 10.000 (10.000–11.000) |
| webkit | narrow | near-byte | apply | 13.000 (13.000–13.000) | 13.000 (13.000–13.000) | 14.000 (14.000–14.000) |

Values retain measured timer overhead and zero observations. Frame opportunity measures callback opportunity rather than painted pixels.

These synthetic fixtures describe the pinned implementation on one local environment.

Publication remains held.
