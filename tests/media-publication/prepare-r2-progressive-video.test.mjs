import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildCopyRemuxArguments,
  buildEncodeArguments,
  buildPacketHashProbeArguments,
  buildStrictDecodeArguments,
  comparePreparedMedia,
  comparePacketHashes,
  inspectR2ProgressiveVideo,
  metadataValuePayload,
  parseMp4TopLevelBoxes,
  parsePrepareCliArguments,
  prepareR2ProgressiveVideo,
  scanMetadataWithBetterleaks,
  selectPreparationStrategy,
  summarizeMetadata,
  verifyFastStartBoxes,
} from "../../tools/prepare-r2-progressive-video.mjs";

function fittingProbe() {
  return {
    format: {
      format_name: "mov,mp4,m4a,3gp,3g2,mj2",
      duration: "2.000000",
      tags: {
        major_brand: "isom",
        title: "raw source title",
      },
    },
    streams: [
      {
        index: 0,
        codec_type: "video",
        codec_name: "h264",
        profile: "High",
        pix_fmt: "yuv420p",
        width: 1_920,
        height: 1_080,
        field_order: "progressive",
        sample_aspect_ratio: "1:1",
        start_time: "0.000000",
        duration: "2.000000",
        avg_frame_rate: "24/1",
        r_frame_rate: "24/1",
        tags: { handler_name: "VideoHandler" },
        disposition: { attached_pic: 0 },
      },
      {
        index: 1,
        codec_type: "audio",
        codec_name: "aac",
        profile: "LC",
        sample_rate: "48000",
        channels: 2,
        channel_layout: "stereo",
        start_time: "0.000000",
        duration: "2.000000",
        tags: { language: "eng" },
      },
    ],
    chapters: [],
  };
}

function clone(value) {
  return structuredClone(value);
}

function box(type, payload = Buffer.alloc(0), { extended = false } = {}) {
  const header = Buffer.alloc(extended ? 16 : 8);
  header.writeUInt32BE(extended ? 1 : header.length + payload.length, 0);
  header.write(type, 4, 4, "ascii");
  if (extended) header.writeBigUInt64BE(BigInt(header.length + payload.length), 8);
  return Buffer.concat([header, payload]);
}

test("selects copy-remux only for the already fitting first video and optional audio", () => {
  assert.deepEqual(selectPreparationStrategy(fittingProbe()), {
    strategy: "copy-remux",
    reasons: [],
  });

  const videoOnly = fittingProbe();
  videoOnly.streams.pop();
  assert.equal(selectPreparationStrategy(videoOnly).strategy, "copy-remux");

  const implicitSquarePixels = fittingProbe();
  delete implicitSquarePixels.streams[0].sample_aspect_ratio;
  assert.equal(
    selectPreparationStrategy(implicitSquarePixels).strategy,
    "copy-remux",
    "an omitted pixel-aspect declaration retains the container's square-pixel default",
  );

  const anamorphicPixels = fittingProbe();
  anamorphicPixels.streams[0].sample_aspect_ratio = "4:3";
  assert.deepEqual(selectPreparationStrategy(anamorphicPixels), {
    strategy: "encode",
    reasons: ["video-conversion-required"],
  });

  const baseline = clone(fittingProbe());
  baseline.streams[0].profile = "Baseline";
  assert.deepEqual(selectPreparationStrategy(baseline), {
    strategy: "encode",
    reasons: ["video-conversion-required"],
  });

  const ordinaryAudioConversion = clone(fittingProbe());
  ordinaryAudioConversion.streams[1].codec_name = "pcm_s16le";
  ordinaryAudioConversion.streams[1].sample_rate = "32000";
  assert.deepEqual(selectPreparationStrategy(ordinaryAudioConversion), {
    strategy: "encode",
    reasons: ["audio-conversion-required"],
  });

  const unknownAacProfile = clone(fittingProbe());
  delete unknownAacProfile.streams[1].profile;
  assert.deepEqual(selectPreparationStrategy(unknownAacProfile), {
    strategy: "encode",
    reasons: ["audio-conversion-required"],
  });
});

test("holds source conditions that need an explicit media decision", () => {
  const cases = [
    ["multiple audio", (probe) => probe.streams.push(clone(probe.streams[1])), "multiple-audio-streams"],
    ["subtitles", (probe) => probe.streams.push({ codec_type: "subtitle" }), "subtitle-streams-present"],
    ["data", (probe) => probe.streams.push({ codec_type: "data" }), "data-streams-present"],
    ["HDR", (probe) => { probe.streams[0].color_transfer = "smpte2084"; }, "hdr-video"],
    ["interlaced", (probe) => { probe.streams[0].field_order = "tt"; }, "interlaced-video"],
    ["multichannel", (probe) => { probe.streams[1].channels = 6; }, "multichannel-audio"],
    ["rotation", (probe) => { probe.streams[0].tags.rotate = "90"; }, "rotation-metadata-present"],
    ["alpha", (probe) => { probe.streams[0].pix_fmt = "yuva420p"; }, "alpha-video"],
    ["packed alpha", (probe) => { probe.streams[0].pix_fmt = "ayuv64le"; }, "alpha-video"],
    ["unknown stream", (probe) => probe.streams.push({ codec_type: "unknown" }), "unknown-stream-type-present"],
  ];

  for (const [label, mutate, expectedReason] of cases) {
    const probe = clone(fittingProbe());
    mutate(probe);
    const result = selectPreparationStrategy(probe);
    assert.equal(result.strategy, "hold", label);
    assert.ok(result.reasons.includes(expectedReason), label);
  }
});

test("builds deterministic explicit maps, metadata removal, faststart, and strict decode", () => {
  const remux = buildCopyRemuxArguments({
    sourcePath: "/private/source.mov",
    targetPath: "/public/.temporary.mp4",
  });
  assert.deepEqual(
    remux.filter((argument, index) => remux[index - 1] === "-map"),
    ["0:v:0", "0:a:0?"],
  );
  assert.ok(remux.includes("-map_metadata"));
  assert.ok(remux.includes("-map_metadata:s"));
  assert.ok(remux.includes("-map_chapters"));
  assert.deepEqual(remux.slice(-3), ["-movflags", "+faststart", "/public/.temporary.mp4"]);
  assert.equal(remux[remux.indexOf("-c:v") + 1], "copy");
  assert.equal(remux[remux.indexOf("-c:a") + 1], "copy");

  const encode = buildEncodeArguments({
    sourcePath: "source.mov",
    targetPath: "temporary.mp4",
    hasAudio: true,
    audioChannels: 1,
    audioSampleRate: 44_100,
    videoColor: {
      color_range: "tv",
      color_primaries: "bt709",
    },
  });
  assert.equal(encode[encode.indexOf("-c:v") + 1], "libx264");
  assert.equal(encode[encode.indexOf("-profile:v") + 1], "high");
  assert.equal(encode[encode.indexOf("-pix_fmt") + 1], "yuv420p");
  assert.equal(encode[encode.indexOf("-ar") + 1], "44100");
  assert.equal(encode[encode.indexOf("-ac:a") + 1], "1");
  assert.equal(encode[encode.indexOf("-color_range") + 1], "tv");
  assert.equal(encode[encode.indexOf("-color_primaries") + 1], "bt709");
  assert.equal(
    encode[encode.indexOf("-bsf:v") + 1],
    "h264_metadata=video_full_range_flag=0",
  );
  assert.match(encode[encode.indexOf("-vf") + 1], /force_divisible_by=2/u);

  const decode = buildStrictDecodeArguments("candidate.mp4");
  assert.ok(decode.includes("-xerror"));
  assert.equal(decode[decode.indexOf("-err_detect") + 1], "explode");
  assert.deepEqual(
    decode.filter((argument, index) => decode[index - 1] === "-map"),
    ["0:v:0", "0:a:0?"],
  );
  assert.deepEqual(
    buildPacketHashProbeArguments("candidate.mp4", "v:0").slice(-1),
    ["candidate.mp4"],
  );
  assert.throws(
    () => buildPacketHashProbeArguments("candidate.mp4", "s:0"),
    /MEDIA_PACKET_STREAM/u,
  );
});

test("metadata receipts expose keys, classes, and coverage without raw values", async () => {
  const probe = fittingProbe();
  const rawSensitiveValue = "metadata-value-must-remain-inside-the-scanner-boundary";
  probe.format.tags.comment = rawSensitiveValue;
  probe.streams[0].tags.location = "+12.3456-098.7654/";
  const report = summarizeMetadata(probe, {
    metadataScan: { status: "clean" },
  });
  const serialized = JSON.stringify(report);

  assert.equal(report.rawValuesReported, false);
  assert.ok(report.format.keys.includes("comment"));
  assert.ok(report.format.classes.includes("descriptive"));
  assert.ok(report.streams[0].classes.includes("location"));
  assert.equal(report.structuralMuxerEncoderTag.classification, "tool-generated-structural-tag");
  assert.doesNotMatch(serialized, new RegExp(rawSensitiveValue, "u"));
  assert.doesNotMatch(serialized, /12\.3456/u);

  let scannerInput = null;
  let suppressionInspected = false;
  let canaryProved = false;
  const scan = await scanMetadataWithBetterleaks(probe, {
    suppressionInspector: async () => { suppressionInspected = true; },
    installVerifier: async () => ({
      binaryPath: "/owned/betterleaks",
      version: "1.8.1",
    }),
    canaryRunner: async () => {
      canaryProved = true;
      return { detected: true, redacted: true };
    },
    secretScanner: async (options) => {
      scannerInput = options.input;
      assert.deepEqual(options.scannerArguments, ["stdin"]);
      return { findings: [] };
    },
  });
  assert.equal(suppressionInspected, true);
  assert.equal(canaryProved, true);
  assert.match(scannerInput, new RegExp(rawSensitiveValue, "u"));
  assert.deepEqual(scan, {
    status: "clean",
    findingCount: 0,
    version: "1.8.1",
    canaryPassed: true,
  });
  assert.match(metadataValuePayload(probe), /"comment"/u);
});

test("parses MP4 top-level boxes and requires moov before mdat", () => {
  const fastStart = Buffer.concat([
    box("ftyp", Buffer.from("isom")),
    box("free"),
    box("moov", Buffer.alloc(4), { extended: true }),
    box("mdat", Buffer.alloc(8)),
  ]);
  const boxes = parseMp4TopLevelBoxes(fastStart);
  assert.deepEqual(boxes.map(({ type }) => type), ["ftyp", "free", "moov", "mdat"]);
  assert.equal(boxes[2].headerSize, 16);
  assert.equal(verifyFastStartBoxes(boxes).passed, true);

  const lateMoov = parseMp4TopLevelBoxes(Buffer.concat([box("ftyp"), box("mdat"), box("moov")]));
  assert.throws(() => verifyFastStartBoxes(lateMoov), /MEDIA_MP4_NOT_FASTSTART/u);
  assert.throws(
    () => parseMp4TopLevelBoxes(Buffer.from([0, 0, 0, 8, 0x6d, 0x6f])),
    /MEDIA_MP4_TRUNCATED/u,
  );
});

test("compares ordered packet payload hashes exactly", () => {
  const first = `sha256:${"a".repeat(64)}`;
  const second = `sha256:${"b".repeat(64)}`;
  assert.equal(comparePacketHashes([first, second], [first, second]), true);
  assert.equal(comparePacketHashes([first, second], [second, first]), false);
  assert.equal(comparePacketHashes([first], [first, second]), false);
});

test("compares duration, cadence, geometry, color, and selected audio intent", () => {
  const source = fittingProbe();
  source.streams[0].color_primaries = "bt709";
  const matchingOutput = clone(source);
  matchingOutput.format.duration = "2.020000";
  const accepted = comparePreparedMedia(source, matchingOutput);
  assert.equal(accepted.passed, true);
  assert.equal(accepted.checks.duration.passed, true);
  assert.equal(accepted.checks.declaredColor.fieldCount, 1);

  const changed = clone(matchingOutput);
  changed.format.duration = "3.000000";
  changed.streams[0].duration = "3.000000";
  changed.streams[0].avg_frame_rate = "30/1";
  changed.streams[0].r_frame_rate = "30/1";
  changed.streams[0].color_primaries = "bt2020";
  changed.streams[1].start_time = "0.500000";
  const rejected = comparePreparedMedia(source, changed);
  assert.equal(rejected.passed, false);
  assert.equal(rejected.checks.duration.passed, false);
  assert.equal(rejected.checks.cadence.passed, false);
  assert.equal(rejected.checks.declaredColor.passed, false);
  assert.equal(rejected.checks.synchronization.passed, false);
});

test("parses the inspect, prepare, and source-bound verify CLI shapes", () => {
  assert.deepEqual(parsePrepareCliArguments(["inspect", "source.mov"]), {
    operation: "inspect",
    sourcePath: "source.mov",
  });
  assert.deepEqual(parsePrepareCliArguments(["prepare", "source.mov", "output.mp4"]), {
    operation: "prepare",
    sourcePath: "source.mov",
    outputPath: "output.mp4",
  });
  assert.deepEqual(
    parsePrepareCliArguments(["verify", "output.mp4", "--source", "source.mov"]),
    {
      operation: "verify",
      mediaPath: "output.mp4",
      sourcePath: "source.mov",
    },
  );
  assert.deepEqual(
    parsePrepareCliArguments([
      "prepare",
      "--source",
      "source.mov",
      "--output",
      "output.mp4",
      "--semantic-id",
      "impact-map",
      "--asset-version",
      "v0.1.0",
    ]),
    {
      operation: "prepare",
      sourcePath: "source.mov",
      outputPath: "output.mp4",
      semanticId: "impact-map",
      assetVersion: "v0.1.0",
    },
  );
  assert.deepEqual(parsePrepareCliArguments(["verify", "--source", "output.mp4"]), {
    operation: "verify",
    mediaPath: "output.mp4",
    sourcePath: null,
  });
  assert.throws(() => parsePrepareCliArguments(["prepare", "only-one"]), /MEDIA_ARGUMENTS/u);
});

test("copy-remuxes a synthetic fitting source atomically and verifies packet identity", async (context) => {
  const availability = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (availability.error || availability.status !== 0) {
    context.skip("ffmpeg is unavailable");
    return;
  }
  const directory = await mkdtemp(join(tmpdir(), "r2-progressive-video-test-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = join(directory, "private-source.mp4");
  const outputPath = join(directory, "public-output.mp4");
  const rawMetadataValue = "metadata-value-must-not-cross-receipt";
  const generated = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostdin",
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=320x240:rate=24:duration=0.5",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=1000:sample_rate=48000:duration=0.5",
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ar",
      "48000",
      "-ac",
      "1",
      "-metadata",
      `comment=${rawMetadataValue}`,
      "-movflags",
      "+faststart",
      "-shortest",
      sourcePath,
    ],
    { encoding: "utf8" },
  );
  if (generated.error || generated.status !== 0) {
    context.skip("the installed ffmpeg cannot create the H.264/AAC synthetic fixture");
    return;
  }
  const previousOutput = Buffer.from("previous incomplete output");
  await writeFile(outputPath, previousOutput);
  const metadataScanner = async () => ({
    status: "clean",
    findingCount: 0,
    version: "test-double",
    canaryPassed: true,
  });

  await assert.rejects(
    prepareR2ProgressiveVideo({ sourcePath, outputPath, metadataScanner }),
    /MEDIA_OUTPUT_EXISTS/u,
  );
  assert.deepEqual(await readFile(outputPath), previousOutput);
  await rm(outputPath);

  const result = await prepareR2ProgressiveVideo({ sourcePath, outputPath, metadataScanner });
  assert.equal(result.ok, true);
  assert.equal(result.atomicPromotion, true);
  assert.equal(result.strategy, "copy-remux");
  assert.equal(result.packetPreservation.passed, true);
  assert.equal(result.semanticPreservation.passed, true);
  assert.equal(result.output.fastStart.moovBeforeMdat, true);
  assert.match(result.output.digest.sha256, /^[a-f0-9]{64}$/u);
  assert.equal(result.output.digest.sizeBytes, (await stat(outputPath)).size);
  assert.notDeepEqual(await readFile(outputPath), previousOutput);
  assert.deepEqual(
    (await readdir(directory)).filter((name) => name.includes(".tmp")),
    [],
  );
  assert.doesNotMatch(JSON.stringify(result), new RegExp(rawMetadataValue, "u"));
  assert.doesNotMatch(JSON.stringify(result), /private-source\.mp4/u);

  const inspection = await inspectR2ProgressiveVideo({
    sourcePath: outputPath,
    metadataScanner,
  });
  assert.equal(inspection.source.preparation.strategy, "copy-remux");
  assert.deepEqual(inspection.source.metadata.format.authoredKeys, []);
  await assert.rejects(
    inspectR2ProgressiveVideo({
      sourcePath: outputPath,
      metadataScanner: async () => ({ status: "clean" }),
    }),
    /MEDIA_METADATA_SCAN_FAILED/u,
  );
  assert.equal(
    createHash("sha256").update(await readFile(outputPath)).digest("hex"),
    result.output.digest.sha256,
  );
});

test("encodes an ordinary synthetic conversion while preserving declared color and timing", async (context) => {
  const availability = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (availability.error || availability.status !== 0) {
    context.skip("ffmpeg is unavailable");
    return;
  }
  const directory = await mkdtemp(join(tmpdir(), "r2-progressive-encode-test-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = join(directory, "ordinary-source.mkv");
  const outputPath = join(directory, "accepted-output.mp4");
  const generated = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostdin",
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=320x240:rate=24:duration=0.5",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=600:sample_rate=32000:duration=0.5",
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "libx264",
      "-profile:v",
      "baseline",
      "-pix_fmt",
      "yuv420p",
      "-color_range",
      "tv",
      "-c:a",
      "pcm_s16le",
      "-shortest",
      sourcePath,
    ],
    { encoding: "utf8" },
  );
  if (generated.error || generated.status !== 0) {
    context.skip("the installed ffmpeg cannot create the encode-branch fixture");
    return;
  }

  const result = await prepareR2ProgressiveVideo({
    sourcePath,
    outputPath,
    metadataScanner: async () => ({
      status: "clean",
      findingCount: 0,
      version: "test-double",
      canaryPassed: true,
    }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.strategy, "encode");
  assert.equal(result.semanticPreservation.passed, true);
  assert.equal(result.output.technical.video.profile, "High");
  assert.equal(result.output.technical.video.colorRange, "tv");
  assert.equal(result.output.technical.audio.codec, "aac");
  assert.equal(result.output.technical.audio.sampleRate, 48_000);
  assert.deepEqual(result.packetPreservation, {
    applicable: false,
    passed: null,
    streams: [],
  });
});
