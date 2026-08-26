# Registered samples

Each directory contains one manifest that links a human question to production
boundaries, executable source, tests, receipts, qualification state, and the
populations affected by the design.

The implementation remains centralized under `src/`. This keeps one source of
executable truth while the manifests provide multiple evaluative entry points.

| ID | Focus |
|---|---|
| `FMI-LIMS-S01` | Specimen lifecycle and exact replay |
| `FMI-LIMS-S02` | Custody and transactional outbox |
| `FMI-LIMS-S03` | Instrument ingress and quarantine |
| `FMI-LIMS-S04` | Portable LIMS port and artifact integrity |
| `FMI-LIMS-S05` | Sapio record graph and managed ELN |
| `FMI-LIMS-S06` | Benchling event ingress |
| `FMI-LIMS-S07` | LabKey migration and WebDAV parity |
| `FMI-LIMS-S08` | Migration, cutover, retry, and restore |
| `FMI-LIMS-S09` | Evidence, tenant boundary, and end-to-end composition |

