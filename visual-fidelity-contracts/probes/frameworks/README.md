# Framework lifecycle probes

Framework APIs change the spelling of lifecycle work while the ownership questions stay recognizable. Use the browser mechanism as the reference, then record the exact framework, package, router, renderer, and adapter versions that carry the behavior.

## Executable bounded adapters in the reference lab

| Adapter | Version | Executed mechanism | Evidence standing |
|---|---:|---|---|
| `event-target-lifetime` | 0.1.0 | listener setup, replay, and idempotent release | bounded platform adapter |
| `immutable-external-store` | 0.1.0 | coherent snapshot update and unsubscribe | bounded platform adapter |
| `revision-cache` | 0.1.0 | keyed invalidation beside browser-owned draft state | bounded platform adapter |
| `deferred-delivery` | 0.1.0 | cancellation and late-result eligibility by identity, revision, and owner generation | bounded platform adapter |
| `react-strict-mode-effect-replay` | React 19.2.0 + React DOM 19.2.0 | development StrictMode setup, cleanup, replay, and final unmount | version-pinned browser adapter |
| `react-use-sync-external-store` | React 19.2.0 + React DOM 19.2.0 | coherent immutable snapshot update, subscription, and release | version-pinned browser adapter |

The platform adapters make each mechanism executable with a small implementation maintained here. The React adapters run the same ownership questions through the supported React DOM client and record exact package, mode, event, snapshot, and release receipts. Additional framework standing begins when a receiving adapter runs the fitting probe and records its named framework, renderer, package, mode, and environment versions.

## VF-F1 · Effect replay and cleanup

**Question:** Does each setup return or register the cleanup for the resources that setup acquired?

**Exercise:** Run the framework’s development replay behavior and an actual entity replacement. Connect each counter to a live disposable resource, then count active listeners, subscriptions, requests, observers, and timers after each transition.

**Expected observation:** One mounted owner holds one active set of resources. Final unmount returns every ledger and live-adapter count to zero. Cleanup remains safe when invoked more than once.

**Transfer receipt:** framework and renderer versions; development and production modes; component key; setup owner; cleanup entry point; counters; replay result.

## VF-F2 · Coherent external-store snapshots

**Question:** Does one immutable snapshot represent one store revision across render, subscription, server rendering, and hydration?

**Exercise:** Read related fields during a store update, deliver a notification, and compare consecutive snapshots by identity and revision.

**Expected observation:** Related values share one revision. Snapshot identity stays stable until the next store update. Server and client initial snapshots express the same accepted state.

**Transfer receipt:** store and adapter versions; snapshot schema; revision field; notification order; server snapshot; client snapshot; observed coherence.

## VF-F3 · Server cache, invalidation, and local UI state

**Question:** Which state belongs to the server cache, and which state belongs to the current browser interaction?

**Exercise:** Enter a local draft, invalidate the server query, reconcile the fresh record, and inspect the draft and accepted server revision independently.

**Expected observation:** Fresh server data updates the server-owned record while local draft work remains available. The query key and invalidation event appear in the receipt.

**Transfer receipt:** cache library and adapter versions; query key; invalidation trigger; server revision; local draft owner; reconcile result; recovery path.

## VF-F4 · Server/client composition and package compatibility

**Question:** Which runtime owns markup, hydration, navigation, refs, events, form participation, and compatibility across package versions?

**Exercise:** Record the server contract version in markup, compare it before enhancement, navigate through the named router, and exercise focus, events, and form behavior through the packaged component boundary.

**Expected observation:** Server and client agree on the named contract. Navigation preserves intended state. The package documents ref, event, form, focus, and release ownership for its supported version range.

**Transfer receipt:** framework and router versions; rendering mode; cache policy; package and semantic version; server contract; client contract; navigation event; compatibility result.

## Evidence boundary

The [browser and framework lifecycle lab](../../labs/lifecycle-lab/) supplies executable platform evidence, deterministic mechanism models, and two React 19.2.0 browser adapters. Those adapters establish the named StrictMode and external-store behavior through React DOM 19.2.0. Each additional framework result gains runtime standing when its named adapter runs these probes and records the corresponding receipt.
