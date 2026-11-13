import "../../tools/node-runtime-admission.mjs";

import {
  loadPublicRouteReferenceBinding,
} from "../../tools/public-route-reference-contract.mjs";
import { loadExternalReferenceBinding } from "../../tools/external-reference-contract.mjs";

const EXACT_ROUTE_TOKEN =
  /^\{\{(PUBLIC_URL_(?:PAGE|ASSET|IFRAME|SCHEMA|SKILL|EXTERNAL)_[A-Z0-9_]+)\}\}$/u;

let authorityPromise;

export function loadSourceRouteAuthority() {
  authorityPromise ??= Promise.all([loadPublicRouteReferenceBinding(), loadExternalReferenceBinding()])
    .then(([route, external]) => ({
      resolveToken: (key) => key.startsWith('PUBLIC_URL_EXTERNAL_')
        ? external.destinations.get(key) : route.destinations.resolveToken(key),
      entries: () => [...route.destinations.entries(), ...external.destinations.entries()][Symbol.iterator](),
    }));
  return authorityPromise;
}

export function resolveSourceRouteValue(value, authority) {
  const match = typeof value === "string" ? EXACT_ROUTE_TOKEN.exec(value) : null;
  return match === null ? value : authority.resolveToken(match[1]);
}
