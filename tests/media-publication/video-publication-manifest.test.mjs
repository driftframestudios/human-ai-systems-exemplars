import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const manifestPath = resolve(
  repositoryRoot,
  "planning/media-publication/video-publication-manifest.v0.1.json",
);
const sha256Pattern = /^[a-f0-9]{64}$/u;
const simpleReleaseStandings = new Set(["candidate", "held", "not_applicable", "pending"]);
const evidencedReleaseStandings = new Set(["accepted", "observed"]);
const posterMediaTypes = new Set(["image/avif", "image/jpeg", "image/png", "image/webp"]);
const accessibilityBranches = new Set([
  "audio_captions_transcript",
  "verified_silent_visual_sequence",
]);

function normalizedMediaType(value) {
  return value.split(";", 1)[0].trim().toLowerCase();
}

function assertNonemptyString(value, label) {
  assert.equal(typeof value, "string", `${label} is a string`);
  assert.ok(value.trim().length > 0, `${label} is nonempty`);
}

function assertPositiveInteger(value, label) {
  assert.ok(Number.isSafeInteger(value) && value > 0, `${label} is a positive integer`);
}

function assertRepositoryRelativePath(value, label) {
  assertNonemptyString(value, label);
  assert.equal(value, value.trim(), `${label} has no surrounding whitespace`);
  assert.doesNotMatch(value, /^(?:[a-z][a-z0-9+.-]*:|[\\/])/iu, `${label} is relative`);
  assert.doesNotMatch(value, /[\\\u0000-\u001f\u007f]/u, `${label} uses portable characters`);
  const segments = value.split("/");
  assert.ok(
    segments.every((segment) => segment.length > 0 && segment !== "." && segment !== ".."),
    `${label} has normalized path segments`,
  );
  return value;
}

function assertReleaseStanding(value, label) {
  if (typeof value === "string") {
    assert.ok(simpleReleaseStandings.has(value), `${label} uses the bounded simple vocabulary`);
    return null;
  }
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} is structured`);
  assert.ok(
    evidencedReleaseStandings.has(value.standing),
    `${label}.standing carries an evidenced state`,
  );
  assert.match(value.observed_on, /^\d{4}-\d{2}-\d{2}$/u, `${label}.observed_on`);
  assertNonemptyString(value.observation_owner, `${label}.observation_owner`);
  assertRepositoryRelativePath(value.evidence, `${label}.evidence`);
  assertNonemptyString(value.receiver, `${label}.receiver`);
  return value.evidence;
}

test("the bounded video manifest binds each carrier to one semantic family and visitor receiver", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.id, "media-publication.video-families.v0.1");
  assert.equal(manifest.standing, "bounded_publication_descriptor");
  assert.equal(manifest.public_origin, "https://vik.guru");
  assert.equal(manifest.route_prefix, "/v1-cdn/video/");
  assert.ok(Array.isArray(manifest.families) && manifest.families.length > 0);

  const identities = new Set();
  for (const family of manifest.families) {
    const identity = `${family.semantic_id}@${family.asset_version}`;
    assert.ok(!identities.has(identity), `duplicate video identity: ${identity}`);
    identities.add(identity);
    assert.match(family.semantic_id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
    assert.match(family.asset_version, /^v\d+\.\d+\.\d+$/u);
    assertNonemptyString(family.source.standing, `${identity} source standing`);
    assert.ok(family.source.repository_coordinate === null
      || typeof family.source.repository_coordinate === "string");
    if (family.source.repository_coordinate === null) {
      assertNonemptyString(
        family.source.coordinate_standing,
        `${identity} external source-coordinate standing`,
      );
    } else {
      assertRepositoryRelativePath(
        family.source.repository_coordinate,
        `${identity} repository source coordinate`,
      );
    }
    assert.match(family.source.sha256, sha256Pattern);

    const expectedPrefix = `${manifest.route_prefix}${family.semantic_id}/${family.asset_version}/`;
    const expectedObjectPrefix = `v1/video/${family.semantic_id}/${family.asset_version}/`;
    assert.ok(family.carriers && typeof family.carriers === "object");
    for (const [role, carrier] of Object.entries(family.carriers)) {
      assert.ok(carrier.public_path.startsWith(expectedPrefix), `${identity} ${role} public path`);
      assert.ok(carrier.object_key.startsWith(expectedObjectPrefix), `${identity} ${role} object key`);
      const publicFilename = carrier.public_path.slice(expectedPrefix.length);
      assert.match(
        publicFilename,
        /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u,
        `${identity} ${role} public filename`,
      );
      assert.equal(
        carrier.object_key,
        `${expectedObjectPrefix}${publicFilename}`,
        `${identity} ${role} public path and object key agree`,
      );
      assertNonemptyString(carrier.media_type, `${identity} ${role} media type`);
      assert.match(carrier.sha256, sha256Pattern);
      assertPositiveInteger(carrier.bytes, `${identity} ${role} bytes`);
      const mediaType = normalizedMediaType(carrier.media_type);
      if (mediaType.startsWith("video/") || mediaType.startsWith("image/")) {
        assertPositiveInteger(carrier.width, `${identity} ${role} width`);
        assertPositiveInteger(carrier.height, `${identity} ${role} height`);
      }
      if (mediaType === "text/vtt") {
        assertNonemptyString(carrier.language, `${identity} ${role} language`);
      }
    }

    const { movie, poster } = family.carriers;
    assert.ok(movie && poster, `${identity} carries a movie and poster`);
    assert.equal(normalizedMediaType(movie.media_type), "video/mp4", `${identity} movie type`);
    assert.ok(
      posterMediaTypes.has(normalizedMediaType(poster.media_type)),
      `${identity} poster uses an admitted passive image type`,
    );
    assert.equal(movie.sha256, family.source.sha256);
    assert.equal(poster.source_master_sha256, movie.sha256);
    assert.ok(poster.timestamp_seconds >= 0);
    assert.ok(poster.timestamp_seconds < movie.duration_seconds);
    assert.ok(poster.width <= movie.width, `${identity} poster width stays source-or-smaller`);
    assert.ok(poster.height <= movie.height, `${identity} poster height stays source-or-smaller`);
    const ratioDelta = Math.abs((poster.width / poster.height) - (movie.width / movie.height));
    const explicitCrop = poster.composition?.kind === "crop"
      && typeof poster.composition.reason === "string"
      && poster.composition.reason.trim().length > 0;
    assert.ok(
      ratioDelta <= 0.002 || explicitCrop,
      `${identity} poster preserves display ratio or records its crop`,
    );
    assert.ok(
      poster.derivation && typeof poster.derivation === "object" && !Array.isArray(poster.derivation),
      `${identity} poster derivation is structured`,
    );
    assertNonemptyString(poster.derivation.frame_decoder, `${identity} poster frame decoder`);
    assertNonemptyString(poster.derivation.image_encoder, `${identity} poster image encoder`);
    assert.ok(
      poster.derivation.settings
      && typeof poster.derivation.settings === "object"
      && !Array.isArray(poster.derivation.settings)
      && Object.keys(poster.derivation.settings).length > 0,
      `${identity} poster derivation settings are recorded`,
    );
    assertNonemptyString(poster.selection_reason, `${identity} poster selection reason`);
    assert.ok(poster.review && typeof poster.review === "object" && !Array.isArray(poster.review));
    for (const field of [
      "standing",
      "review_owner",
      "selected_by",
      "visible_content_standing",
      "rights_standing",
    ]) {
      assertNonemptyString(poster.review[field], `${identity} poster review.${field}`);
    }
    const posterEvidence = assertRepositoryRelativePath(
      poster.review.evidence,
      `${identity} poster review.evidence`,
    );
    await readFile(resolve(repositoryRoot, posterEvidence), "utf8");
    assertNonemptyString(movie.audio_standing, `${identity} audio standing`);
    assertNonemptyString(family.accessibility.accessible_name, `${identity} accessible name`);
    assertNonemptyString(
      family.accessibility.meaningful_visual_information,
      `${identity} visual-information standing`,
    );
    assert.ok(
      accessibilityBranches.has(family.accessibility.branch),
      `${identity} selects one accessibility branch`,
    );
    const accessibilityIds = [
      family.accessibility.standing_text_id,
      family.accessibility.figure_caption_id,
    ].filter(Boolean);
    if (family.accessibility.branch === "verified_silent_visual_sequence") {
      assert.equal(movie.audio_standing, "verified_silent");
      assert.equal(
        family.accessibility.captions_standing,
        "not_applicable_verified_silent_source",
      );
      assertNonemptyString(
        family.accessibility.visual_sequence_id,
        `${identity} visual-sequence ID`,
      );
      accessibilityIds.push(family.accessibility.visual_sequence_id);
      assert.equal(
        Object.entries(family.carriers).some(([role]) => role.startsWith("captions")),
        false,
        `${identity} silent branch omits an empty captions carrier`,
      );
    } else {
      assert.notEqual(movie.audio_standing, "verified_silent");
      assertNonemptyString(family.accessibility.captions_standing, `${identity} caption standing`);
      assertNonemptyString(family.accessibility.transcript_id, `${identity} transcript ID`);
      accessibilityIds.push(family.accessibility.transcript_id);
      assert.ok(
        Object.entries(family.carriers).some(
          ([role, carrier]) => role.startsWith("captions")
            && normalizedMediaType(carrier.media_type) === "text/vtt",
        ),
        `${identity} audio branch carries reviewed captions`,
      );
    }
    assertNonemptyString(family.delivery.adapter, `${identity} delivery adapter`);
    for (const [role, standing] of Object.entries(family.release)) {
      const evidence = assertReleaseStanding(standing, `${identity} release.${role}`);
      if (evidence) {
        await readFile(resolve(repositoryRoot, evidence), "utf8");
      }
    }

    const visitorPage = assertRepositoryRelativePath(
      family.visitor_page,
      `${identity} visitor page`,
    );
    const page = await readFile(resolve(repositoryRoot, visitorPage), "utf8");
    for (const carrier of Object.values(family.carriers)) {
      assert.ok(
        page.includes(new URL(carrier.public_path, manifest.public_origin).href),
        `${identity} page references ${carrier.public_path}`,
      );
    }
    assert.ok(page.includes(`aria-label="${family.accessibility.accessible_name}"`));
    for (const id of accessibilityIds) {
      assert.ok(page.includes(`id="${id}"`), `${identity} page owns #${id}`);
    }
    if (family.accessibility.visual_sequence_relationship === "aria-details") {
      assert.ok(
        page.includes(`aria-details="${family.accessibility.visual_sequence_id}"`),
        `${identity} page associates its structured visual sequence`,
      );
    }
  }

  const current = manifest.families.find(
    (family) => family.semantic_id === "choose-your-player" && family.asset_version === "v0.1.0",
  );
  assert.ok(current, "the first accepted Choose Your Player family remains described");
  assert.equal(current.source.repository_coordinate, null);
  assert.equal(
    current.source.coordinate_standing,
    "externally_held_master_digest_bound_to_accepted_public_carrier",
  );
  assert.equal(current.carriers.poster.width, current.carriers.movie.width);
  assert.equal(current.carriers.poster.height, current.carriers.movie.height);
  assert.equal(current.carriers.movie.audio_standing, "verified_silent");
  assert.equal(current.accessibility.branch, "verified_silent_visual_sequence");
  assert.equal(current.accessibility.captions_standing, "not_applicable_verified_silent_source");
  assert.equal(current.accessibility.visual_sequence_relationship, "aria-details");
  assert.equal(current.release.transport.standing, "accepted");
  assert.equal(current.release.transport.observed_on, "2026-10-09");
  assert.equal(
    current.release.transport.evidence,
    "planning/media-publication/exercises/choose-your-player-native-video-receiver.v0.1.md",
  );
  assert.equal(current.release.visitor_source, "candidate");
  assert.equal(current.release.local_browser.standing, "observed");
  assert.equal(current.release.local_browser.observed_on, "2026-10-09");
  assert.equal(
    current.release.local_browser.evidence,
    "planning/media-publication/exercises/choose-your-player-native-video-receiver.v0.1.md",
  );
  assert.equal(current.release.local_browser.rerunnable_repository_check, "pending");
  assert.equal(current.release.deployed_page, "pending");
  assert.equal(current.release.physical_safari_ios, "pending");
  assert.equal(current.release.human_page_release, "pending");

  const aboutSequence = manifest.families.find(
    (family) => (
      family.semantic_id === "about-problem-to-system-sequence"
      && family.asset_version === "v0.1.0"
    ),
  );
  assert.ok(aboutSequence, "the plate-first About sequence has one versioned R2 family");
  assert.equal(
    aboutSequence.source.repository_coordinate,
    "collaboration/impact-map-visual-variants/movie/about-style-cycle-sequence.json",
  );
  assert.equal(aboutSequence.carriers.movie.width, 1280);
  assert.equal(aboutSequence.carriers.movie.height, 720);
  assert.equal(aboutSequence.carriers.movie.frame_rate, "25/1");
  assert.equal(aboutSequence.carriers.movie.duration_seconds, 16.4);
  assert.equal(aboutSequence.carriers.movie.audio_standing, "verified_silent");
  assert.equal(aboutSequence.carriers.poster.timestamp_seconds, 0);
  assert.equal(aboutSequence.accessibility.branch, "verified_silent_visual_sequence");
  assert.equal(aboutSequence.release.transport.standing, "accepted");
  assert.equal(aboutSequence.release.transport.observed_on, "2026-10-12");
  assert.equal(aboutSequence.release.local_browser.standing, "observed");
  assert.equal(
    aboutSequence.release.local_browser.rerunnable_repository_check,
    "npm run test:about-media-browser",
  );
  assert.equal(aboutSequence.release.deployed_page, "pending");
  assert.equal(aboutSequence.release.physical_safari_ios, "pending");
  assert.equal(aboutSequence.release.human_page_release, "pending");

  const batchFamilies = manifest.families.filter(
    (family) => ![
      "choose-your-player",
      "about-problem-to-system-sequence",
    ].includes(family.semantic_id),
  );
  assert.equal(batchFamilies.length, 11);
  for (const family of batchFamilies) {
    assert.equal(family.release.local_browser.standing, "observed");
    assert.equal(family.release.local_browser.observed_on, "2026-10-10");
    assert.equal(
      family.release.local_browser.receiver,
      "deterministic_passive_poster_fixture_across_narrow_medium_wide_viewports",
    );
    assert.equal(
      family.release.local_browser.rerunnable_repository_check,
      "npm run test:video-receivers-browser",
    );
    assert.equal(family.release.deployed_page, "pending");
    assert.equal(family.release.physical_safari_ios, "pending");
    assert.equal(family.release.human_page_release, "pending");
  }
});
