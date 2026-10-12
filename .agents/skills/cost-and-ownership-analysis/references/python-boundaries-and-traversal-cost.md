# Python boundaries and traversal cost

Use this reference when a Python implementation makes representation, admission,
traversal or allocation part of the receiving decision.

## Representation and admission

- Dataclasses give internal records names and ownership. Explicit constructors or
  validation enforce their invariants; annotations describe the intended types.
- A frozen record can contain mutable children. Tuples, owned copies or a declared
  read-only contract establish the required depth of immutability.
- External manifests and configuration receive runtime validation at admission.
  Simple bounded inputs can use explicit checks. Pydantic earns a place when
  reusable schemas, structured diagnostics or multiple receivers need it; the
  coercion policy remains explicit. Python APIs and Rust-backed validation costs
  are separate from application-level callback and copying costs.
- Package/module configuration owns imports. Test location remains independent
  of module identity; a development dependency stays in the isolated environment.

## Cost worksheet

Name source characters, tokens/cells, edits, emitted characters, unique dependency
bytes and case count separately. Describe parser cost as a library term until
the admitted grammar and version justify a tighter bound. A forward cursor's
total advancement bounds its scans; repeated materialization needs an additional
term. Include sorting, hashing, escaping and explicit serialization. Peak memory
and cumulative allocation remain separate from elapsed time.

## Material exercises

| Case | Distinction to establish | Fitting evidence |
| --- | --- | --- |
| Nested loops advance one cursor | Total traversal differs from indentation depth | Cursor invariant and bounded adversarial fixtures |
| A long caption is copied onto many rows | Output expansion can dominate source size | Emitted-size term plus measured allocation |
| A typed record receives a wrong runtime shape | Annotation and admission have distinct roles | Boundary fixture with a domain-specific result |
| A source edit preserves unrelated content | Character positions and encoded bytes have distinct units | Unicode/newline fixtures and outside-edit byte comparison |
| Generated examples find a defect | A minimized example becomes a durable regression | Explicit fixture and an independently meaningful oracle |

These are exercise specifications. Execution results belong with the receiving
task. Parametrization organizes named cases; property generation explores a
declared grammar. Neither case counts nor framework selection establish a bound
or a material behavior by themselves.

Sources: [Python dataclasses](https://docs.python.org/3.12/library/dataclasses.html),
[HTMLParser](https://docs.python.org/3.12/library/html.parser.html),
[Pydantic validation](https://pydantic.dev/docs/validation/latest/get-started/why/),
[Hypothesis](https://hypothesis.readthedocs.io/en/latest/reference/api.html).
