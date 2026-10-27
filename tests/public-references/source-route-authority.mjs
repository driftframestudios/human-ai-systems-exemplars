import "../../tools/node-runtime-admission.mjs";

import {
  loadPublicRouteReferenceBinding,
} from "../../tools/public-route-reference-contract.mjs";

const EXACT_ROUTE_TOKEN =
  /^\{\{(PUBLIC_URL_(?:PAGE|ASSET|IFRAME|SCHEMA|SKILL)_[A-Z0-9_]+)\}\}$/u;

let authorityPromise;

export function loadSourceRouteAuthority() {
  authorityPromise ??= loadPublicRouteReferenceBinding()
    .then(({ destinations }) => destinations);
  return authorityPromise;
}

export function resolveSourceRouteValue(value, authority) {
  const match = typeof value === "string" ? EXACT_ROUTE_TOKEN.exec(value) : null;
  return match === null ? value : authority.resolveToken(match[1]);
}
