import assert from "node:assert/strict";

export function assertImmutableSkillCoordinate(revision, path, digest) {
  assert.match(revision, /^[a-f0-9]{40}$/u, "skill revision is one full Git object identifier");
  assert.match(
    path,
    /^\.agents\/skills\/[a-z0-9-]+\/SKILL\.md$/u,
    "skill path stays inside the public repository skill surface",
  );
  assert.match(digest, /^[a-f0-9]{64}$/u, "skill digest is one lowercase SHA-256 value");
}
