import { WorkerEntrypoint } from "cloudflare:workers";

import gateway, { fetchCachedMediaObject } from "./index.js";

export class CachedMediaObject extends WorkerEntrypoint {
  async fetch(request) {
    return fetchCachedMediaObject(request, this.env);
  }
}

export default gateway;
