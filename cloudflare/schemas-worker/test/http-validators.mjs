import '../../../tools/node-runtime-admission.mjs';
// RFC 9110 sections 8.8.3 and 13.1.2: validate entity-tag syntax and compare
// opaque values literally, allowing the optional weak marker on either side.
function opaqueETag(value) {
  if (typeof value !== "string") return null;
  const start = value.startsWith("W/") ? 2 : 0;
  if (value.length - start < 2 || value[start] !== '"' || value.at(-1) !== '"') return null;
  for (let index = start + 1; index < value.length - 1; index += 1) {
    const code = value.charCodeAt(index);
    if (!(code === 0x21 || (code >= 0x23 && code <= 0x7e) || (code >= 0x80 && code <= 0xff))) return null;
  }
  return value.slice(start);
}

export function weakETagMatches(left, right) {
  const opaqueLeft = opaqueETag(left);
  return opaqueLeft !== null && opaqueLeft === opaqueETag(right);
}
