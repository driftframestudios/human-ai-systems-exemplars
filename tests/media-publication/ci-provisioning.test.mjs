import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { browserLaunchOptions } from "../../tools/core-architecture-browser-helper.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const cacheAction = "55cc8345863c7cc4c66a329aec7e433d2d1c52a9";

async function source(relativePath) {
  return readFile(join(root, relativePath), "utf8");
}

test("the native-video receiver selects the hosted Chrome channel explicitly", () => {
  assert.deepEqual(browserLaunchOptions({}), { headless: true });
  assert.deepEqual(
    browserLaunchOptions({ PLAYWRIGHT_BROWSER_CHANNEL: " chrome " }),
    { headless: true, channel: "chrome" },
  );
  assert.throws(
    () => browserLaunchOptions({ PLAYWRIGHT_BROWSER_CHANNEL: "chromium" }),
    /Set PLAYWRIGHT_BROWSER_CHANNEL to chrome/u,
  );
});

test("the APT plan parser selects candidate versions for fresh installs and upgrades", () => {
  const parser = join(root, ".github/dependencies/apt-install-plan.awk");
  const accepted = spawnSync("awk", ["-f", parser], {
    encoding: "utf8",
    input: [
      "Inst ffmpeg (7:6.1.1-3ubuntu5 Ubuntu:24.04/noble-updates [amd64])",
      "Inst libavcodec60 [7:6.1.1-3ubuntu4] (7:6.1.1-3ubuntu5 Ubuntu:24.04/noble-updates [amd64])",
    ].join("\n"),
  });
  assert.ifError(accepted.error);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(
    accepted.stdout,
    "ffmpeg=7:6.1.1-3ubuntu5\nlibavcodec60=7:6.1.1-3ubuntu5\n",
  );

  const malformed = spawnSync("awk", ["-f", parser], {
    encoding: "utf8",
    input: "Inst ffmpeg [7:6.1.1-3ubuntu4]\n",
  });
  assert.ifError(malformed.error);
  assert.equal(malformed.status, 2);
  assert.match(malformed.stderr, /has no candidate version/u);
});

test("the media job reuses a verified package closure and preserves its behavior proof", async () => {
  const workflow = await source(".github/workflows/prototype-unit-tests.yml");
  const marker = "\n  media-publication:\n";
  const start = workflow.indexOf(marker);
  assert.ok(start >= 0, "media-publication job remains discoverable");
  const mediaJob = workflow.slice(start);

  assert.match(mediaJob, /runs-on: ubuntu-24\.04/u);
  assert.match(mediaJob, /timeout-minutes: 30/u);
  assert.match(mediaJob, /node-version: "22\.23\.4"/u);
  assert.match(mediaJob, /persist-credentials: false/u);
  assert.match(mediaJob, /apt-get update/u);
  assert.match(mediaJob, /apt-get --simulate install --no-install-recommends/u);
  assert.match(mediaJob, /awk -f \.github\/dependencies\/apt-install-plan\.awk/u);
  assert.match(mediaJob, /Dir::Cache::archives=/u);
  assert.match(mediaJob, /chown _apt:root "\$MEDIA_APT_ARCHIVES\/partial"/u);
  assert.match(mediaJob, /chmod 0700 "\$MEDIA_APT_ARCHIVES\/partial"/u);
  assert.match(mediaJob, /install --download-only --yes --no-install-recommends/u);
  assert.match(mediaJob, /install --no-download --yes --no-install-recommends/u);
  assert.match(mediaJob, /sha256sum "\$plan"/u);

  assert.match(mediaJob, new RegExp(`actions/cache/restore@${cacheAction}`, "u"));
  assert.match(mediaJob, new RegExp(`actions/cache/save@${cacheAction}`, "u"));
  assert.match(mediaJob, /media-apt-v1-\$\{\{ runner\.os \}\}-\$\{\{ runner\.arch \}\}/u);
  assert.match(mediaJob, /steps\.media-apt-plan\.outputs\.digest/u);
  assert.match(mediaJob, /steps\.media-runtime\.outputs\.image-version/u);
  assert.match(mediaJob, /steps\.restore-media-apt\.outputs\.cache-matched-key/u);
  assert.match(mediaJob, /APT_PLAN_DIGEST/u);
  assert.match(mediaJob, /cancelled\) cache_standing="cancelled"/u);
  assert.match(mediaJob, /skipped\) cache_standing="skipped"/u);
  assert.match(mediaJob, /continue-on-error: true/u);
  assert.match(mediaJob, /github\.event_name == 'workflow_dispatch'/u);
  assert.match(mediaJob, /github\.ref == 'refs\/heads\/main'/u);

  assert.doesNotMatch(mediaJob, /playwright -- install/u);
  assert.match(mediaJob, /PLAYWRIGHT_BROWSER_CHANNEL: chrome/u);
  assert.match(mediaJob, /google-chrome --version/u);
  assert.match(mediaJob, /MEDIA_TEST_REQUIRE_FFMPEG: "true"/u);
  assert.match(mediaJob, /npm run test:media-publication/u);
  assert.match(mediaJob, /npm run test:video-receivers-browser/u);
  assert.match(mediaJob, /npm run dry-run:r2-video-delivery/u);
  assert.match(mediaJob, /if: always\(\)/u);

  const restoreAt = mediaJob.indexOf("actions/cache/restore@");
  const testAt = mediaJob.indexOf("npm run test:media-publication");
  const compileAt = mediaJob.indexOf("npm run dry-run:r2-video-delivery");
  const saveAt = mediaJob.indexOf("actions/cache/save@");
  const receiptAt = mediaJob.indexOf("Record the media lane receipt");
  assert.ok(restoreAt < testAt, "the package closure restores before behavior proof");
  assert.ok(testAt < compileAt, "the media behavior proof precedes Worker compilation");
  assert.ok(compileAt < saveAt, "trusted cache publication follows every required proof");
  assert.ok(saveAt < receiptAt, "the final receipt records cache publication standing");

  const prototypeJob = workflow.slice(0, start);
  assert.match(prototypeJob, /install --with-deps chromium/u);
  assert.match(prototypeJob, /install --with-deps firefox/u);
  assert.match(prototypeJob, /install --with-deps webkit/u);
});

test("the media package manifest and policy records carry one reviewable cache identity", async () => {
  const manifest = (await source(".github/dependencies/media-apt-packages.txt"))
    .split(/\r?\n/u)
    .map(line => line.replace(/\s*#.*$/u, "").trim())
    .filter(Boolean);
  assert.deepEqual(manifest, ["ffmpeg"]);

  const policy = await source(".github/ACTIONS-POLICY.md");
  assert.ok(
    policy.includes(`| \`actions/cache\` | \`v6.1.0\` | \`${cacheAction}\` |`),
    "the reviewed cache action remains in the immutable action inventory",
  );
  assert.match(policy, /verified APT archive closure/u);
  assert.match(policy, /Google Chrome channel/u);

  const automation = await source(".github/AUTOMATION.md");
  assert.match(automation, /media 30 minutes/u);
  assert.match(automation, /Exact hit, compatible restore, miss, or\s+unavailable/u);
  assert.match(automation, /native-video receivers through the hosted\s+Google Chrome channel/u);
});
