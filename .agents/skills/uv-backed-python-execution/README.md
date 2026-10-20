# uv-backed Python execution

Run a repository's named Python check with the interpreter and dependencies it
declares while leaving the host Python installation unchanged. This skill makes
the runtime coordinates and evidence boundary clear enough to interpret the
result or resume from one owned environment problem.

## Start here

- [Read the authoritative skill contract](SKILL.md)
- [Return to the repository skills catalog](../README.md)

## Use it when

Use this skill when the repository authorizes `uv` and Python version, lockfile,
existing environment, cache location, or hosted-runner behavior makes the
validation runtime unclear.

## What it returns

- the exact named check and `uv` command;
- `uv`, Python, and materially relevant dependency versions;
- whether dependencies came from a checked lock or this run's resolution;
- tracked source state before and after; and
- one owned recovery action when the environment cannot complete the check.

## Concrete example

| Part | Example |
| --- | --- |
| Situation | macOS supplies Python 3.9, the repository requires Python 3.12, carries a current `uv.lock`, and the default cache cannot receive writes. |
| Use | Select Python 3.12 through `uv run --managed-python --locked`, place cache and managed interpreter state in authorized temporary locations, and run the named test. |
| Observable return | The test result is bound to the uv-managed Python and checked lock, the system Python stays unchanged, source state is recorded, and the return names operating systems or optional groups left unobserved. |

## Command shapes

Use the repository's exact paths, Python version, and named check.

```sh
uv run --project <repository-root> --locked --python <version> -- <named-check>
```

For an authorized buildable project without a lock:

```sh
uv run --isolated --no-project \
  --python <version> \
  --managed-python \
  --with-editable <repository-root> \
  -- <named-check>
```

The second route records the dependency versions resolved for that run. It
establishes observed behavior rather than dependency-byte reproducibility.

## Working route

1. Read runtime guidance, `pyproject.toml`, `.python-version`, `uv.lock`, dependency groups, and relevant workflows.
2. Choose the locked-project or one-run dependency route and an authorized cache location.
3. Record source state and run the named check through `uv`.
4. Capture only the coordinates required to interpret the result.
5. Classify a failure as runtime, lock, dependency, filesystem, network, private source, or repository behavior.
6. Return the result or one changed-signal condition for another attempt.

This skill follows repository runtime policy. A separately granted task owns
dependency-manager conversion, lock updates, or global-package changes.
