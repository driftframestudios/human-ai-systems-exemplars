from __future__ import annotations

import unittest
from dataclasses import replace
from datetime import UTC, datetime, timedelta

from lims_eln_reference.custody import (
    CustodyAggregate,
    CustodyConcurrencyConflict,
    CustodyError,
    InMemoryCustodyUnitOfWork,
    LocationPath,
    TransferCommand,
    plan_transfer,
)
from lims_eln_reference.domain import (
    Actor,
    ApprovalState,
    CommandId,
    Specimen,
    SpecimenId,
    SpecimenState,
)
from lims_eln_reference.lifecycle import (
    AuthorizationDenied,
    ConcurrencyConflict,
    IllegalTransition,
    RequiredEvidenceMissing,
    TransitionCommand,
    transition,
)


NOW = datetime(2026, 7, 28, 14, 30, tzinfo=UTC)
TECH = Actor(
    "actor-tech-001",
    "tenant-a",
    frozenset({"lab_technologist"}),
)
REVIEWER = Actor(
    "actor-review-001",
    "tenant-a",
    frozenset({"scientific_reviewer"}),
)


def received() -> Specimen:
    return Specimen(
        SpecimenId("SYN-001"),
        "tenant-a",
        SpecimenState.RECEIVED,
    )


def command(
    command_id: str,
    version: int,
    target: SpecimenState,
    actor: Actor = TECH,
    **kwargs,
) -> TransitionCommand:
    return TransitionCommand(
        command_id=CommandId(command_id),
        expected_version=version,
        target=target,
        actor=actor,
        occurred_at=kwargs.pop("occurred_at", NOW),
        **kwargs,
    )


class LifecycleTests(unittest.TestCase):
    def test_transition_is_attributable_and_versioned(self) -> None:
        updated = transition(
            received(),
            command("cmd-extract", 0, SpecimenState.EXTRACTED),
        )
        self.assertEqual(updated.state, SpecimenState.EXTRACTED)
        self.assertEqual(updated.version, 1)
        self.assertEqual(updated.events[-1].actor_id, TECH.subject_id)

    def test_exact_replay_returns_same_aggregate(self) -> None:
        cmd = command("cmd-extract", 0, SpecimenState.EXTRACTED)
        updated = transition(received(), cmd)
        self.assertIs(transition(updated, cmd), updated)

    def test_replay_requires_identical_actor(self) -> None:
        cmd = command("cmd-extract", 0, SpecimenState.EXTRACTED)
        updated = transition(received(), cmd)
        changed_actor = command(
            "cmd-extract",
            0,
            SpecimenState.EXTRACTED,
            Actor(
                "actor-tech-002",
                "tenant-a",
                frozenset({"lab_technologist"}),
            ),
        )
        with self.assertRaises(ConcurrencyConflict):
            transition(updated, changed_actor)

    def test_replay_requires_identical_time(self) -> None:
        cmd = command("cmd-extract", 0, SpecimenState.EXTRACTED)
        updated = transition(received(), cmd)
        with self.assertRaises(ConcurrencyConflict):
            transition(
                updated,
                command(
                    "cmd-extract",
                    0,
                    SpecimenState.EXTRACTED,
                    occurred_at=NOW + timedelta(seconds=1),
                ),
            )

    def test_reused_identifier_with_new_target_is_rejected(self) -> None:
        updated = transition(
            received(),
            command("cmd-1", 0, SpecimenState.EXTRACTED),
        )
        with self.assertRaises(ConcurrencyConflict):
            transition(
                updated,
                command(
                    "cmd-1",
                    1,
                    SpecimenState.VOIDED,
                    reason_code="DAMAGED",
                ),
            )

    def test_stale_expected_version_is_rejected(self) -> None:
        with self.assertRaises(ConcurrencyConflict):
            transition(
                received(),
                command("cmd-stale", 7, SpecimenState.EXTRACTED),
            )

    def test_skip_requires_reason(self) -> None:
        specimen = replace(
            received(),
            state=SpecimenState.EXTRACTED,
            version=3,
        )
        with self.assertRaises(RequiredEvidenceMissing):
            transition(
                specimen,
                command("cmd-skip", 3, SpecimenState.SKIPPED),
            )

    def test_release_requires_approvals_and_signature(self) -> None:
        pending = replace(
            received(),
            state=SpecimenState.REVIEW_PENDING,
            version=4,
        )
        with self.assertRaises(RequiredEvidenceMissing):
            transition(
                pending,
                command(
                    "cmd-release",
                    4,
                    SpecimenState.RELEASED,
                    REVIEWER,
                    signature_meaning="I approve release",
                ),
            )
        approved = replace(
            pending,
            qc_approval=ApprovalState.APPROVED,
            scientific_approval=ApprovalState.APPROVED,
        )
        released = transition(
            approved,
            command(
                "cmd-release",
                4,
                SpecimenState.RELEASED,
                REVIEWER,
                signature_meaning="I approve release",
            ),
        )
        self.assertEqual(released.state, SpecimenState.RELEASED)

    def test_release_requires_reviewer_role(self) -> None:
        approved = replace(
            received(),
            state=SpecimenState.REVIEW_PENDING,
            version=4,
            qc_approval=ApprovalState.APPROVED,
            scientific_approval=ApprovalState.APPROVED,
        )
        with self.assertRaises(AuthorizationDenied):
            transition(
                approved,
                command(
                    "cmd-release",
                    4,
                    SpecimenState.RELEASED,
                    TECH,
                    signature_meaning="I approve release",
                ),
            )

    def test_cross_tenant_actor_is_rejected(self) -> None:
        actor = Actor(
            "actor-other",
            "tenant-b",
            frozenset({"lab_technologist"}),
        )
        with self.assertRaises(AuthorizationDenied):
            transition(
                received(),
                command(
                    "cmd-cross-tenant",
                    0,
                    SpecimenState.EXTRACTED,
                    actor,
                ),
            )

    def test_terminal_state_closes_transition(self) -> None:
        released = replace(
            received(),
            state=SpecimenState.RELEASED,
            version=5,
        )
        with self.assertRaises(IllegalTransition):
            transition(
                released,
                command(
                    "cmd-after-release",
                    5,
                    SpecimenState.VOIDED,
                    reason_code="CORRECTION",
                ),
            )


class CustodyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.source = LocationPath(
            "SITE-A", "R1", "FREEZER-2", "BOX-7/A1"
        )
        self.destination = LocationPath(
            "SITE-A", "R2", "ROBOT-1", "DECK/B3"
        )
        self.initial = CustodyAggregate(
            SpecimenId("SYN-001"),
            "tenant-a",
            self.source,
        )

    def transfer_command(self, **changes) -> TransferCommand:
        values = {
            "command_id": CommandId("move-001"),
            "expected_version": 0,
            "source": self.source,
            "destination": self.destination,
            "actor": TECH,
            "occurred_at": NOW,
            "reason_code": "ASSAY_PREPARATION",
        }
        values.update(changes)
        return TransferCommand(**values)

    def test_transfer_plans_state_event_and_outbox(self) -> None:
        transfer = plan_transfer(self.initial, self.transfer_command())
        self.assertIsNotNone(transfer)
        assert transfer is not None
        self.assertEqual(transfer.aggregate.current, self.destination)
        self.assertEqual(transfer.aggregate.version, 1)
        self.assertEqual(
            transfer.outbox.payload["destination"],
            self.destination.canonical(),
        )

    def test_transfer_commit_keeps_one_visible_boundary(self) -> None:
        uow = InMemoryCustodyUnitOfWork(self.initial)
        transfer = plan_transfer(uow.load(self.initial.specimen_id), self.transfer_command())
        assert transfer is not None
        uow.commit(transfer)
        self.assertEqual(len(uow.events), 1)
        self.assertEqual(len(uow.outbox), 1)
        self.assertEqual(uow.aggregate.version, 1)

    def test_exact_transfer_replay_has_no_second_effect(self) -> None:
        cmd = self.transfer_command()
        transfer = plan_transfer(self.initial, cmd)
        assert transfer is not None
        self.assertIsNone(plan_transfer(transfer.aggregate, cmd))

    def test_transfer_replay_requires_identical_reason(self) -> None:
        cmd = self.transfer_command()
        transfer = plan_transfer(self.initial, cmd)
        assert transfer is not None
        with self.assertRaises(CustodyConcurrencyConflict):
            plan_transfer(
                transfer.aggregate,
                self.transfer_command(reason_code="DIFFERENT_REASON"),
            )

    def test_transfer_replay_requires_identical_actor(self) -> None:
        cmd = self.transfer_command()
        transfer = plan_transfer(self.initial, cmd)
        assert transfer is not None
        other = Actor(
            "actor-tech-002",
            "tenant-a",
            frozenset({"lab_technologist"}),
        )
        with self.assertRaises(CustodyConcurrencyConflict):
            plan_transfer(
                transfer.aggregate,
                self.transfer_command(actor=other),
            )

    def test_source_must_remain_current(self) -> None:
        moved = replace(self.initial, current=self.destination, version=1)
        with self.assertRaises(CustodyConcurrencyConflict):
            plan_transfer(
                moved,
                self.transfer_command(expected_version=1),
            )

    def test_cross_tenant_transfer_is_rejected(self) -> None:
        actor = Actor(
            "actor-other",
            "tenant-b",
            frozenset({"lab_technologist"}),
        )
        with self.assertRaises(CustodyError):
            plan_transfer(self.initial, self.transfer_command(actor=actor))


if __name__ == "__main__":
    unittest.main()

