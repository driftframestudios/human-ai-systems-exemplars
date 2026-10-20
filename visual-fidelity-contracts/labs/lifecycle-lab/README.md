# Browser and framework lifecycle lab

This lab shows what happens when a screen starts work, replaces it, encounters a controlled failure, and cleans up. A visitor can compare the accepted result, active resources, event order, and recovery guidance at each lifecycle step.

## Start here

Open [`index.html`](./index.html) through the repository’s static server. The source HTML preserves the eight scenario questions, framework mapping, and receipt fields when JavaScript is unavailable. The module layer adds deterministic transitions, executable bounded adapters, live resource counts, and a browser-supplied runtime receipt.

The fastest useful sequence is:

1. Run **Entity replacement and late delivery**. Entity B keeps eligibility to update the accepted view after entity A delivers late.
2. Select **Exercise controlled fault** and run it again. The late entity A result changes accepted state, so the expected observation identifies the eligibility gap.
3. Choose **Restore verified baseline**. Listener and subscription counts return to one; request count returns to zero.
4. Open and close the replacement dialog. Keyboard focus returns to the opening button.
5. Compare the two inline SVG specimens. Each instance owns its labels, gradient, clip path, and direct references.

Same-root re-entry queries the complete receiving markup and attaches a buffered
successor controller before releasing the current owner. Promotion installs one
replacement listener and resource group, then projects the admitted baseline. A
rejected successor leaves the incumbent operational. Final release invalidates
the active owner generation before deferred work can settle, including the
controlled stale-delivery fault.

## What owns what

| Concern | Owner | Transition boundary | Observable result |
|---|---|---|---|
| Listener and subscription lifetime | lifecycle controller and bounded platform adapters | cleanup and final `destroy()` | live adapter counts and active ledger entries |
| Request eligibility | identity, revision, owner generation, and `AbortController` signal | candidate replacement, settlement, or delivery | accepted identity, zero settled request records, and event log |
| Local draft | browser interaction | explicit draft update | draft survives server revalidation |
| Dialog focus | dialog invoker | dialog close | active element returns to invoker |
| History selection | serialized history entry | `popstate` restoration | select value, URL, and reading agree |
| Inline SVG references | each SVG instance | document insertion | unique IDs and local references |
| Enhancement contract | server and client version | pre-enhancement comparison | named version receipt |
| Browser event group | enhancement owner | registered infrastructure disposer | zero infrastructure owners after `destroy()` |

## Source map

- [`scenario-data.js`](./scenario-data.js) names each question, controlled fault, and expected observation.
- [`framework-adapters/react-19.2.0.mjs`](./framework-adapters/react-19.2.0.mjs) exercises effect cleanup and coherent external-store snapshots through the supported React DOM client.
- [`lifecycle-model.js`](./lifecycle-model.js) owns deterministic transitions, cancellation, resource accounting, reset, and teardown.
- [`lifecycle-lab.js`](./lifecycle-lab.js) connects native controls, dialog focus, browser history, SVG instances, and page release.
- [`platform-adapters.js`](./platform-adapters.js) supplies versioned event-target, external-store, revision-cache, and deferred-delivery mechanisms with executable release behavior.
- [`framework-contracts.js`](./framework-contracts.js) maps browser mechanisms to framework transfer questions.
- [`styles.css`](./styles.css) supplies cascade layers, container queries, overflow ownership, print, forced-colors, reduced-motion, and color-scheme behavior.
- [`sandbox-specimen.html`](./sandbox-specimen.html) keeps a static embedded reading inside an explicit sandbox and CSP boundary.

## Evidence standing

The browser scenarios execute versioned platform mechanisms. The page records its exact browser user agent, platform, language, contract version, and bounded adapter versions at runtime. Automation records the Playwright package and exact browser-engine versions used for verification.

The platform adapters carry mechanism-contract standing. The version-pinned React 19.2.0 adapter adds framework-runtime standing for development StrictMode effect replay and `useSyncExternalStore` snapshot coherence through React DOM 19.2.0. Its browser receipt records the packages, mode, setup, cleanup, subscriptions, releases, snapshots, and visible result. Other framework mappings earn runtime standing when their own adapter records the named framework, renderer, versions, environment, owner, release path, fault, expected observation, and result.

The embedded reading uses an opaque-origin iframe sandbox, while both the parent and child declare content policies. Browser checks exercise the opaque embedded boundary and the inline-script policies on the parent and standalone child documents. Deployment headers remain a carrier-level receipt.

Run the focused evidence with:

```sh
node --test tests/visual-fidelity-contracts/lifecycle*.test.mjs
```

The platform-lab browser evidence exercises Chromium, Firefox, and WebKit;
script-independent reading; keyboard focus; browser history; enhancement
transactional teardown and re-entry; retained incumbent behavior after rejected
successor admission; owner-generation invalidation; inline SVG identity, labels, transforms, clipping, and
paint order; 320-pixel layout; enlarged text; print; forced colors; reduced
motion; CSP; and sandbox isolation. The React 19.2.0 adapter receipt currently
establishes its two named runtime behaviors in Chromium.

The adapter follows the supported React routes for
[`<StrictMode>`](https://react.dev/reference/react/StrictMode),
[`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore),
and [`createRoot`](https://react.dev/reference/react-dom/client/createRoot).
