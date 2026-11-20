import {
  StrictMode,
  act,
  createElement,
  useEffect,
  useSyncExternalStore
} from 'react';
import { createRoot } from 'react-dom/client';

const reactVersion = '19.2.0';
const rendererVersion = '19.2.0';

async function withActEnvironment(exercise) {
  const previous = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    return await exercise();
  } finally {
    if (previous === undefined) delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    else globalThis.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}

function targetOrDetachedElement(target) {
  if (target instanceof Element) return target;
  return document.createElement('div');
}

export async function exerciseStrictModeEffectReplay(target) {
  return withActEnvironment(async () => {
    const events = [];
    let setups = 0;
    let cleanups = 0;
    let activeResources = 0;
    let mounted = false;
    const container = targetOrDetachedElement(target);
    const root = createRoot(container);

    function EffectOwner() {
      useEffect(() => {
        setups += 1;
        activeResources += 1;
        events.push(`setup:${setups}:active:${activeResources}`);
        return () => {
          cleanups += 1;
          activeResources -= 1;
          events.push(`cleanup:${cleanups}:active:${activeResources}`);
        };
      }, []);
      return createElement('span', null, 'Lifecycle owner mounted');
    }

    try {
      await act(async () => {
        root.render(createElement(StrictMode, null, createElement(EffectOwner)));
      });
      mounted = true;
      const afterMount = { setups, cleanups, activeResources };
      await act(async () => root.unmount());
      mounted = false;
      return {
        adapter: 'react-strict-mode-effect-replay',
        runtime: `react@${reactVersion}`,
        renderer: `react-dom@${rendererVersion}`,
        mode: 'development StrictMode browser DOM',
        afterMount,
        afterUnmount: { setups, cleanups, activeResources },
        events
      };
    } finally {
      if (mounted) await act(async () => root.unmount());
    }
  });
}

export async function exerciseExternalStoreCoherence(target) {
  return withActEnvironment(async () => {
    let snapshot = Object.freeze({ revision: 1, label: 'ready', count: 1 });
    const listeners = new Set();
    const renders = [];
    let subscriptions = 0;
    let releases = 0;
    let mounted = false;
    const container = targetOrDetachedElement(target);
    const root = createRoot(container);

    const subscribe = (listener) => {
      subscriptions += 1;
      listeners.add(listener);
      return () => {
        if (listeners.delete(listener)) releases += 1;
      };
    };
    const getSnapshot = () => snapshot;

    function StoreReader() {
      const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
      renders.push(value);
      return createElement('span', null, `${value.revision}:${value.label}:${value.count}`);
    }

    try {
      await act(async () => root.render(createElement(StoreReader)));
      mounted = true;
      await act(async () => {
        snapshot = Object.freeze({ revision: 2, label: 'accepted', count: 2 });
        for (const listener of listeners) listener();
      });
      const visibleText = container.textContent;
      await act(async () => root.unmount());
      mounted = false;
      return {
        adapter: 'react-use-sync-external-store',
        runtime: `react@${reactVersion}`,
        renderer: `react-dom@${rendererVersion}`,
        snapshots: renders.map(value => ({ ...value })),
        visibleText,
        subscriptions,
        releases,
        activeSubscriptions: listeners.size
      };
    } finally {
      if (mounted) await act(async () => root.unmount());
    }
  });
}
