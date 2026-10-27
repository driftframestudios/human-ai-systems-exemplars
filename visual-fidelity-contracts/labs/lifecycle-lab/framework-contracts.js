export const FRAMEWORK_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'react-effect',
    family: 'React effects and development replay',
    platformMechanism: 'Acquire resources during setup and release the same owned resources during cleanup.',
    transferQuestion: 'Which named React version runs this setup-cleanup-setup sequence, and what counter proves one active resource?',
    localEvidence: 'react-strict-mode-effect-replay runs through React 19.2.0 and React DOM 19.2.0 and records setup, cleanup, replay, and final release.',
    adapterId: 'react-strict-mode-effect-replay',
    runtimeStanding: 'framework-runtime-observation',
  }),
  Object.freeze({
    id: 'external-store',
    family: 'External-store snapshot adapters',
    platformMechanism: 'Return one immutable snapshot per revision and notify subscribers after the accepted snapshot changes.',
    transferQuestion: 'Which store adapter supplies coherent server and client snapshots for the named package version?',
    localEvidence: 'react-use-sync-external-store runs through React 19.2.0 and React DOM 19.2.0 and records coherent snapshots, subscription, and release.',
    adapterId: 'react-use-sync-external-store',
    runtimeStanding: 'framework-runtime-observation',
  }),
  Object.freeze({
    id: 'server-cache',
    family: 'Server cache and invalidation libraries',
    platformMechanism: 'Reconcile fresh server records while browser-owned draft state keeps its separate owner.',
    transferQuestion: 'Which query key, invalidation event, and named package version establish the server-state boundary?',
    localEvidence: 'revision-cache@0.1.0 executes invalidation beside a separately owned local draft.',
    adapterId: 'revision-cache',
    runtimeStanding: 'platform-mechanism-model',
  }),
  Object.freeze({
    id: 'next-runtime',
    family: 'Next.js server and client composition',
    platformMechanism: 'Name the contract version in server markup and confirm the same version before client enhancement.',
    transferQuestion: 'Which Next.js version, router mode, cache policy, and navigation event own the observed behavior?',
    localEvidence: 'The platform specimen compares server-authored markup with the client contract; a Next.js receipt remains version-specific.',
    adapterId: 'server-client-contract',
    runtimeStanding: 'platform-mechanism-model',
  }),
  Object.freeze({
    id: 'component-package',
    family: 'Reusable component packages',
    platformMechanism: 'Assign refs, events, form participation, focus return, and release behavior to explicit owners.',
    transferQuestion: 'Which package and semantic version preserve those ownership contracts for consuming applications?',
    localEvidence: 'Native dialog, event ownership, and inline SVG scenarios provide the platform reference; package compatibility remains version-specific.',
    adapterId: 'native-component-boundary',
    runtimeStanding: 'platform-mechanism-model',
  }),
]);

export const FRAMEWORK_EVIDENCE_STANDING = Object.freeze({
  standing: 'mixed-runtime-evidence',
  meaning: 'Two React 19.2.0 adapters carry framework-runtime observations. The remaining rows retain platform-mechanism standing until a named adapter records its executable receipt.',
});
