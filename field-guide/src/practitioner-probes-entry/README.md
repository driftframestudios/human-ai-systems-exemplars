# Practitioner Probes Entry

```yaml
folder_contract:
  id: "driftframe-constellation.field-guide.practitioner-probes-entry.v0.1"
  status: "active_reader_entry_stub"
  source_truth_status: "package_owned_reader_entry"
  refactor_pass: "DCP-043-practitioner-probes-namespace-and-narrative-refactor"
```

This folder is the Field Guide reader entry for practitioner probes. It explains
probe concepts for readers while package-owned probe material remains in
`packages/practitioner-probes/`.

Source rules:

- Probe schemas remain in `packages/schema/src/schemas/propensity-probe/`.
- Probe implementation and registry material belongs in
  `packages/practitioner-probes/`.
- `packages/field-guide/src/propensity-probes-entry/` is a compatibility stub
  for the historical reader-entry path.
- Reader-facing extracts must preserve source-band and source-of-truth-band
  references.
- Promote planning prose here after publication-boundary review passes.
