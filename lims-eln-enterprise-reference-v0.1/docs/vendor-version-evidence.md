# Vendor-version evidence

Reviewed 2026-07-28.

## Sapio

- Final PyPI release: `sapiopylib==2026.6.3.307`.
- Official tutorials: <https://github.com/sapiosciences/sapio-py-tutorials>
- Package index: <https://pypi.org/project/sapiopylib/>
- License: MPL-2.0.

Sapio documents platform-to-SDK compatibility as a deployment concern. The
reference therefore requires a tenant release, SDK version, and schema
fingerprint in one compatibility manifest.

## Benchling

- Stable PyPI release: `benchling-sdk==1.25.0`.
- Package index: <https://pypi.org/project/benchling-sdk/>
- Events guide: <https://docs.benchling.com/docs/events-getting-started>
- Event reference: <https://docs.benchling.com/docs/events-reference>
- Webhook security: <https://docs.benchling.com/docs/webhook-verification>

Benchling states that event payloads may be stale. The reference commits a
durable inbox and processing job, then retrieves current resource state when
freshness matters.

## LabKey

- Stable PyPI release observed: `labkey==4.2.0`.
- Upstream `develop` branch `pyproject.toml` declares `4.3.0`.
- Package index: <https://pypi.org/project/labkey/>
- Repository: <https://github.com/LabKey/labkey-api-python>

The reference records these as distinct release states. A tenant-approved pin
uses a published artifact or explicitly reviewed source revision; a development
branch declaration does not silently become the production dependency.

