from __future__ import annotations

from dataclasses import dataclass

from .domain import Specimen
from .instrument import IngestionReceipt, InstrumentInbox
from .ports import CanonicalLimsPort, MutationReceipt, UpsertSpecimenCommand


@dataclass(frozen=True, slots=True)
class AccessionOutcome:
    mutation: MutationReceipt
    instrument_receipt: IngestionReceipt | None = None


class LaboratoryWorkflow:
    """Small composition root for the executable end-to-end scenario."""

    def __init__(
        self,
        *,
        lims: CanonicalLimsPort,
        instrument_inbox: InstrumentInbox,
    ) -> None:
        self._lims = lims
        self._instrument_inbox = instrument_inbox

    def accession(
        self,
        *,
        specimen: Specimen,
        site_id: str,
        source_revision: int,
        idempotency_key: str,
    ) -> AccessionOutcome:
        mutation = self._lims.upsert_specimen(
            UpsertSpecimenCommand(
                tenant_id=specimen.tenant_id,
                site_id=site_id,
                external_identity=str(specimen.specimen_id),
                source_revision=source_revision,
                idempotency_key=idempotency_key,
                specimen=specimen,
            )
        )
        return AccessionOutcome(mutation=mutation)

    def ingest_instrument(
        self,
        *,
        tenant_id: str,
        raw: bytes,
        received_at,
    ) -> IngestionReceipt:
        return self._instrument_inbox.ingest(
            tenant_id,
            raw,
            received_at,
        )

