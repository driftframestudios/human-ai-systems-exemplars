import { createHash } from "node:crypto";

// Observed at the author-host root on 2026-10-04 UTC. This pins the entire
// addition after replacing only its two quoted, constrained metadata values.
// Matching this shape establishes source preservation, not script provenance
// or runtime safety. A changed edge program receives a separate review.
const OBSERVED_ADDITION_BYTES = 938;
const OBSERVED_SHAPE_SHA256 = "8ce3a7fd90ece85e368e4640ba7fd9b68a3ed68e00951068a51a8fae15d553de";
const BODY_END = Buffer.from("</body>");
const PARAMETERS = /window\.__CF\$cv\$params=\{r:'([0-9a-f]{16})',t:'([A-Za-z0-9+/]{14}==)'\};/;

function matchesObservedAddition(bytes) {
  if (bytes.length !== OBSERVED_ADDITION_BYTES) return false;
  const text = bytes.toString("latin1");
  const match = PARAMETERS.exec(text);
  if (!match) return false;
  const timestamp = Buffer.from(match[2], "base64");
  if (timestamp.toString("base64") !== match[2] || !/^[0-9]{10}$/.test(timestamp.toString("latin1"))) return false;
  const shape = text.slice(0, match.index)
    + "window.__CF$cv$params={r:'{request}',t:'{time}'};"
    + text.slice(match.index + match[0].length);
  return createHash("sha256").update(shape, "latin1").digest("hex") === OBSERVED_SHAPE_SHA256;
}

/** Compare owned byte buffers without decoding or rewriting authored HTML.
 * Worst-case time is O(source + response); auxiliary work is bounded by the
 * observed addition size. Buffer views stay read-only and caller-owned.
 */
export function compareCatalogSource(authored, received) {
  if (!Buffer.isBuffer(authored) || !Buffer.isBuffer(received)) {
    throw new TypeError("Catalog comparison requires authored and received byte buffers");
  }
  if (authored.equals(received)) {
    return { classification: "exact-byte-parity", exactByteParity: true, authoredBytesPreserved: true, addedBytes: 0 };
  }
  const boundary = authored.indexOf(BODY_END);
  const addedBytes = received.length - authored.length;
  const boundedInsertion = boundary >= 0 && boundary === authored.lastIndexOf(BODY_END) && addedBytes > 0
    && received.subarray(0, boundary).equals(authored.subarray(0, boundary))
    && received.subarray(boundary + addedBytes).equals(authored.subarray(boundary));
  if (!boundedInsertion) {
    return { classification: "unexplained-difference", exactByteParity: false, authoredBytesPreserved: null, addedBytes: null };
  }
  const addition = received.subarray(boundary, boundary + addedBytes);
  return {
    classification: matchesObservedAddition(addition) ? "observed-edge-addition" : "unclassified-boundary-addition",
    exactByteParity: false,
    authoredBytesPreserved: true,
    addedBytes,
  };
}
