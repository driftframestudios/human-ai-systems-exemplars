#!/usr/bin/env node
import './node-runtime-admission.mjs';

import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { link, lstat, open, rm } from "node:fs/promises";
import { dirname, extname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { verifyBetterleaksInstall } from "./install-betterleaks.mjs";
import {
  assertSingleSuppressionSurface,
  executeSecretScan,
  runSyntheticCanary,
} from "./scan-secret-material.mjs";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BETTERLEAKS_CONFIG_PATH = join(REPOSITORY_ROOT, ".betterleaks.toml");
const MAX_CACHEABLE_OBJECT_BYTES = 512_000_000;
const MAX_PROCESS_OUTPUT_BYTES = 128 * 1024 * 1024;
const MAX_WIDTH = 1_920;
const MAX_HEIGHT = 1_080;
const STRUCTURAL_FORMAT_TAGS = new Set([
  "compatible_brands",
  "encoder",
  "major_brand",
  "minor_version",
]);
const STRUCTURAL_STREAM_TAGS = new Set([
  "encoder",
  "handler_name",
  "language",
  "vendor_id",
]);
const PUBLIC_METADATA_KEYS = new Set([
  ...STRUCTURAL_FORMAT_TAGS,
  ...STRUCTURAL_STREAM_TAGS,
]);
const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9 ._:+,/()-]{0,127}$/u;

export class MediaPreparationError extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "MediaPreparationError";
    this.code = code;
  }
}

function mediaError(code, message, cause) {
  return new MediaPreparationError(code, message, cause ? { cause } : undefined);
}

function appendBounded(chunks, chunk, state) {
  state.bytes += chunk.byteLength;
  if (state.bytes > state.maximum) {
    state.exceeded = true;
    return;
  }
  chunks.push(chunk);
}

export function runMediaCommand(
  binary,
  argumentsList,
  {
    cwd = REPOSITORY_ROOT,
    input,
    maxOutputBytes = MAX_PROCESS_OUTPUT_BYTES,
    signal = null,
    terminationGraceMs = 2_000,
  } = {},
) {
  return new Promise((resolvePromise, rejectPromise) => {
    if (signal?.aborted) {
      rejectPromise(mediaError("MEDIA_TOOL_INTERRUPTED", "local media work was interrupted"));
      return;
    }
    let child;
    try {
      child = spawn(binary, argumentsList, {
        cwd,
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (error) {
      rejectPromise(mediaError(
        "MEDIA_TOOL_UNAVAILABLE",
        "a required local media executable could not start",
        error,
      ));
      return;
    }
    const stdout = [];
    const stderr = [];
    const state = {
      bytes: 0,
      exceeded: false,
      inputError: null,
      interrupted: false,
      maximum: maxOutputBytes,
      terminationRequested: false,
    };
    let settled = false;
    let terminationTimer = null;

    const settle = (operation, value) => {
      if (settled) return;
      settled = true;
      if (terminationTimer !== null) clearTimeout(terminationTimer);
      signal?.removeEventListener("abort", interrupt);
      operation(value);
    };
    const terminate = () => {
      if (state.terminationRequested) return;
      state.terminationRequested = true;
      child.kill("SIGTERM");
      terminationTimer = setTimeout(() => child.kill("SIGKILL"), terminationGraceMs);
      terminationTimer.unref?.();
    };
    const interrupt = () => {
      if (state.terminationRequested) return;
      state.interrupted = true;
      terminate();
    };
    signal?.addEventListener("abort", interrupt, { once: true });
    if (signal?.aborted) interrupt();

    child.once("error", (error) => {
      settle(
        rejectPromise,
        mediaError(
          state.interrupted ? "MEDIA_TOOL_INTERRUPTED" : "MEDIA_TOOL_UNAVAILABLE",
          state.interrupted
            ? "local media work was interrupted"
            : "a required local media executable could not start",
          error,
        ),
      );
    });
    const append = (chunks, chunk) => {
      const alreadyExceeded = state.exceeded;
      appendBounded(chunks, chunk, state);
      if (!alreadyExceeded && state.exceeded) terminate();
    };
    child.stdout.on("data", (chunk) => append(stdout, chunk));
    child.stderr.on("data", (chunk) => append(stderr, chunk));
    child.stdin.on("error", (error) => {
      if (error?.code === "EPIPE") return;
      state.inputError = error;
      terminate();
    });
    child.once("close", (code, signal) => {
      if (state.interrupted) {
        settle(
          rejectPromise,
          mediaError("MEDIA_TOOL_INTERRUPTED", "local media work was interrupted"),
        );
        return;
      }
      if (state.inputError) {
        settle(
          rejectPromise,
          mediaError(
            "MEDIA_TOOL_INPUT",
            "local media input could not be delivered",
            state.inputError,
          ),
        );
        return;
      }
      if (state.exceeded) {
        settle(
          rejectPromise,
          mediaError(
            "MEDIA_TOOL_OUTPUT_BOUNDARY",
            "a local media tool exceeded the bounded diagnostic capture",
          ),
        );
        return;
      }
      settle(resolvePromise, {
        code,
        signal,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });

    if (input === undefined) child.stdin.end();
    else child.stdin.end(input);
  });
}

function safeToken(value, fallback = "unknown") {
  if (typeof value !== "string") return fallback;
  const normalized = value.normalize("NFKC").trim();
  return SAFE_TOKEN.test(normalized) ? normalized : fallback;
}

function safeInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function ratioValue(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d+)(?:\/|:)(\d+)$/u.exec(value);
  if (!match || Number(match[2]) === 0) return null;
  return Number(match[1]) / Number(match[2]);
}

export function buildFfprobeArguments(sourcePath) {
  return [
    "-v",
    "error",
    "-show_format",
    "-show_streams",
    "-show_chapters",
    "-of",
    "json",
    sourcePath,
  ];
}

export function buildStrictDecodeArguments(sourcePath) {
  return [
    "-hide_banner",
    "-nostdin",
    "-v",
    "error",
    "-xerror",
    "-err_detect",
    "explode",
    "-max_error_rate",
    "0",
    "-i",
    sourcePath,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-f",
    "null",
    "-",
  ];
}

function commonMuxArguments(sourcePath) {
  return [
    "-hide_banner",
    "-nostdin",
    "-v",
    "error",
    "-xerror",
    "-max_error_rate",
    "0",
    "-y",
    "-i",
    sourcePath,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-map_metadata",
    "-1",
    "-map_metadata:s",
    "-1",
    "-map_chapters",
    "-1",
  ];
}

export function buildCopyRemuxArguments({ sourcePath, targetPath }) {
  return [
    ...commonMuxArguments(sourcePath),
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-movflags",
    "+faststart",
    targetPath,
  ];
}

export function buildEncodeArguments({
  sourcePath,
  targetPath,
  hasAudio = true,
  audioChannels = 2,
  audioSampleRate = 48_000,
  videoColor = {},
} = {}) {
  const normalizedChannels = audioChannels === 1 ? 1 : 2;
  const normalizedSampleRate = audioSampleRate === 44_100 ? 44_100 : 48_000;
  const argumentsList = [
    ...commonMuxArguments(sourcePath),
    "-vf",
    // FFmpeg 6.1 predates scale=reset_sar. Derive both dimensions from the
    // displayed aspect ratio before assigning square pixels so anamorphic
    // sources retain their displayed geometry across supported toolchains.
    "scale=w='max(2,trunc(min(min(1920,iw),min(1080,ih)*dar)/2)*2)':h='max(2,trunc(min(min(1080,ih),min(1920,iw)/dar)/2)*2)',setsar=1",
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "slow",
    "-crf",
    "20",
    "-maxrate",
    "8M",
    "-bufsize",
    "16M",
    "-tag:v",
    "avc1",
  ];
  const colorOptions = [
    ["color_range", "-color_range"],
    ["color_primaries", "-color_primaries"],
    ["color_transfer", "-color_trc"],
    ["color_space", "-colorspace"],
  ];
  for (const [field, option] of colorOptions) {
    const value = videoColor?.[field];
    if (
      typeof value === "string"
      && value !== "unknown"
      && /^[a-z0-9][a-z0-9_.-]{0,31}$/u.test(value)
    ) {
      argumentsList.push(option, value);
    }
  }
  if (["tv", "pc"].includes(videoColor?.color_range)) {
    argumentsList.push(
      "-bsf:v",
      `h264_metadata=video_full_range_flag=${videoColor.color_range === "pc" ? 1 : 0}`,
    );
  }
  if (hasAudio) {
    argumentsList.push(
      "-c:a",
      "aac",
      "-b:a",
      normalizedChannels === 1 ? "128k" : "192k",
      "-ar",
      String(normalizedSampleRate),
      "-ac:a",
      String(normalizedChannels),
    );
  } else {
    argumentsList.push("-an");
  }
  argumentsList.push("-movflags", "+faststart", targetPath);
  return argumentsList;
}

export function buildPacketHashProbeArguments(sourcePath, streamSpecifier) {
  if (!/^[va]:0$/u.test(streamSpecifier)) {
    throw mediaError(
      "MEDIA_PACKET_STREAM",
      "packet comparison is limited to the selected first video or first audio stream",
    );
  }
  return [
    "-v",
    "error",
    "-select_streams",
    streamSpecifier,
    "-show_packets",
    "-show_entries",
    "packet=data_hash,pts_time,dts_time,duration_time",
    "-show_data_hash",
    "sha256",
    "-of",
    "json",
    sourcePath,
  ];
}

async function commandJson(binary, argumentsList, commandRunner, failureCode) {
  let result;
  try {
    result = await commandRunner(binary, argumentsList);
  } catch (error) {
    if (error instanceof MediaPreparationError) throw error;
    throw mediaError(failureCode, "the bounded media inspection did not complete", error);
  }
  if (result.signal || result.code !== 0) {
    throw mediaError(failureCode, "the bounded media inspection did not complete");
  }
  try {
    const parsed = JSON.parse(result.stdout);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch (error) {
    throw mediaError(
      "MEDIA_INSPECTION_REPORT_INVALID",
      "the local media inspector returned an invalid structured report",
      error,
    );
  }
}

async function probeMedia(sourcePath, { ffprobeBinary, commandRunner }) {
  return commandJson(
    ffprobeBinary,
    buildFfprobeArguments(sourcePath),
    commandRunner,
    "MEDIA_INSPECTION_FAILED",
  );
}

async function strictDecode(sourcePath, { ffmpegBinary, commandRunner }) {
  let result;
  try {
    result = await commandRunner(ffmpegBinary, buildStrictDecodeArguments(sourcePath));
  } catch (error) {
    if (error instanceof MediaPreparationError) throw error;
    throw mediaError("MEDIA_DECODE_FAILED", "strict media decoding did not complete", error);
  }
  if (result.signal || result.code !== 0) {
    throw mediaError("MEDIA_DECODE_FAILED", "strict media decoding did not complete");
  }
  return true;
}

function streamGroups(probe) {
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  return {
    all: streams,
    video: streams.filter(({ codec_type: type }) => type === "video"),
    audio: streams.filter(({ codec_type: type }) => type === "audio"),
    subtitle: streams.filter(({ codec_type: type }) => type === "subtitle"),
    data: streams.filter(({ codec_type: type }) => type === "data"),
    attachment: streams.filter(({ codec_type: type }) => type === "attachment"),
  };
}

function hasHdrSignal(video) {
  const transfer = String(video?.color_transfer ?? "").toLowerCase();
  const primaries = String(video?.color_primaries ?? "").toLowerCase();
  const colorSpace = String(video?.color_space ?? "").toLowerCase();
  const pixelFormat = String(video?.pix_fmt ?? "").toLowerCase();
  return (
    transfer === "smpte2084"
    || transfer === "arib-std-b67"
    || primaries.startsWith("bt2020")
    || colorSpace.startsWith("bt2020")
    || /(?:p10|p12|10le|12le)/u.test(pixelFormat)
  );
}

function hasRotation(video) {
  const tagRotation = Number(video?.tags?.rotate);
  if (Number.isFinite(tagRotation) && tagRotation % 360 !== 0) return true;
  return (Array.isArray(video?.side_data_list) ? video.side_data_list : []).some((entry) => {
    const rotation = Number(entry?.rotation);
    return Number.isFinite(rotation) && rotation % 360 !== 0;
  });
}

function hasVariableFrameRate(video) {
  const average = ratioValue(video?.avg_frame_rate);
  const nominal = ratioValue(video?.r_frame_rate);
  return average !== null && nominal !== null && Math.abs(average - nominal) > 0.01;
}

function sourceFrameRate(video) {
  return ratioValue(video?.avg_frame_rate) ?? ratioValue(video?.r_frame_rate);
}

export function selectPreparationStrategy(probe) {
  const groups = streamGroups(probe);
  const video = groups.video[0];
  const audio = groups.audio[0];
  const holds = [];

  if (!video) holds.push("missing-video-stream");
  if (groups.video.length > 1) holds.push("multiple-video-streams");
  if (groups.audio.length > 1) holds.push("multiple-audio-streams");
  if (groups.subtitle.length > 0) holds.push("subtitle-streams-present");
  if (groups.data.length > 0) holds.push("data-streams-present");
  if (groups.attachment.length > 0) holds.push("attachment-streams-present");
  const recognizedStreamCount = (
    groups.video.length
    + groups.audio.length
    + groups.subtitle.length
    + groups.data.length
    + groups.attachment.length
  );
  if (recognizedStreamCount !== groups.all.length) holds.push("unknown-stream-type-present");

  if (video) {
    const fieldOrder = String(video.field_order ?? "").toLowerCase();
    if (fieldOrder && !["progressive", "unknown"].includes(fieldOrder)) {
      holds.push("interlaced-video");
    } else if (fieldOrder !== "progressive") {
      holds.push("scan-type-unconfirmed");
    }
    if (hasHdrSignal(video)) holds.push("hdr-video");
    if (hasRotation(video)) holds.push("rotation-metadata-present");
    if (video?.disposition?.attached_pic === 1) holds.push("attached-picture-video");
    if (/^(?:abgr|argb|ayuv|bgra|gbrap|pal\d|rgba|vuya|ya\d|yuva)/iu.test(String(video.pix_fmt ?? ""))) {
      holds.push("alpha-video");
    }
    if (hasVariableFrameRate(video)) holds.push("variable-frame-rate");
    const frameRate = sourceFrameRate(video);
    if (frameRate === null || frameRate <= 0) holds.push("frame-rate-unconfirmed");
    else if (frameRate > 90) holds.push("frame-rate-above-90");
    const duration = observedDuration(probe, video);
    if (duration === null || duration <= 0) holds.push("duration-unconfirmed");
    const width = safeInteger(video.width);
    const height = safeInteger(video.height);
    if (width === null || width < 1 || height === null || height < 1) {
      holds.push("geometry-unconfirmed");
    }
  }

  if (audio) {
    const channels = safeInteger(audio.channels);
    if (channels === null) holds.push("audio-channel-count-unconfirmed");
    else if (channels < 1 || channels > 2) holds.push("multichannel-audio");
  }

  if (holds.length > 0) {
    return { strategy: "hold", reasons: [...new Set(holds)].sort() };
  }

  const width = safeInteger(video.width);
  const height = safeInteger(video.height);
  // Containers omit a pixel-aspect declaration for ordinary square pixels.
  // Preserve those already compatible streams instead of introducing a
  // generation loss solely to write an explicit 1:1 declaration.
  const sampleAspectRatio = String(video.sample_aspect_ratio ?? "").toLowerCase();
  const copyReadyPixelAspect = ["", "n/a", "unknown", "1:1", "1/1"].includes(
    sampleAspectRatio,
  );
  const copyReadyVideo = (
    video.codec_name === "h264"
    && String(video.profile ?? "").toLowerCase() === "high"
    && video.pix_fmt === "yuv420p"
    && String(video.field_order).toLowerCase() === "progressive"
    && width !== null
    && height !== null
    && width > 0
    && height > 0
    && width <= MAX_WIDTH
    && height <= MAX_HEIGHT
    && width % 2 === 0
    && height % 2 === 0
    && copyReadyPixelAspect
  );
  const audioRate = audio ? safeInteger(audio.sample_rate) : null;
  const copyReadyAudio = !audio || (
    audio.codec_name === "aac"
    && String(audio.profile ?? "").toLowerCase() === "lc"
    && [1, 2].includes(safeInteger(audio.channels))
    && [44_100, 48_000].includes(audioRate)
  );

  if (copyReadyVideo && copyReadyAudio) {
    return { strategy: "copy-remux", reasons: [] };
  }

  const conversionReasons = [];
  if (!copyReadyVideo) conversionReasons.push("video-conversion-required");
  if (!copyReadyAudio) conversionReasons.push("audio-conversion-required");
  return { strategy: "encode", reasons: conversionReasons };
}

function sanitizeTagKey(key) {
  if (typeof key !== "string") return "nonstandard-key";
  const normalized = key.normalize("NFKC").trim().toLowerCase();
  if (PUBLIC_METADATA_KEYS.has(normalized)) return normalized;
  return `custom-key-${createHash("sha256").update(normalized || key).digest("hex").slice(0, 12)}`;
}

function tagClass(key) {
  const normalized = String(key).toLowerCase();
  if (/(?:location|gps|iso6709|latitude|longitude)/u.test(normalized)) return "location";
  if (/(?:creation|date|time|year)/u.test(normalized)) return "date-time";
  if (/(?:make|model|device|serial|software)/u.test(normalized)) return "device-tool";
  if (/(?:artist|author|composer|copyright|publisher|owner)/u.test(normalized)) {
    return "authorship-rights";
  }
  if (/(?:title|comment|description|synopsis|show|episode|album|genre)/u.test(normalized)) {
    return "descriptive";
  }
  if (normalized === "language") return "language";
  if (/(?:encoder|handler_name|vendor_id|major_brand|minor_version|compatible_brands)/u.test(normalized)) {
    return "structural-tool";
  }
  return "other";
}

function keysAndClasses(tags) {
  const rawKeys = tags && typeof tags === "object" && !Array.isArray(tags)
    ? Object.keys(tags)
    : [];
  return {
    keys: [...new Set(rawKeys.map(sanitizeTagKey))].sort(),
    classes: [...new Set(rawKeys.map(tagClass))].sort(),
  };
}

function authoredKeys(keys, structuralKeys) {
  return keys.filter((key) => !structuralKeys.has(key));
}

export function summarizeMetadata(probe, { metadataScan = null } = {}) {
  const format = keysAndClasses(probe?.format?.tags);
  const streams = (Array.isArray(probe?.streams) ? probe.streams : []).map((stream, ordinal) => {
    const summary = keysAndClasses(stream?.tags);
    return {
      ordinal,
      type: safeToken(stream?.codec_type),
      keys: summary.keys,
      classes: summary.classes,
      authoredKeys: authoredKeys(summary.keys, STRUCTURAL_STREAM_TAGS),
    };
  });
  const chapters = (Array.isArray(probe?.chapters) ? probe.chapters : []).map((chapter, ordinal) => {
    const summary = keysAndClasses(chapter?.tags);
    return { ordinal, keys: summary.keys, classes: summary.classes };
  });
  const scanStatus = metadataScan?.status === "clean" ? "clean" : "not-run";
  return {
    rawValuesReported: false,
    format: {
      keys: format.keys,
      classes: format.classes,
      authoredKeys: authoredKeys(format.keys, STRUCTURAL_FORMAT_TAGS),
    },
    streams,
    chapters,
    structuralMuxerEncoderTag: {
      present: format.keys.includes("encoder"),
      classification: "tool-generated-structural-tag",
    },
    toolCoverage: [
      {
        tool: "ffprobe",
        status: "complete",
        scope: "container-stream-chapter-and-standard-tag-keys",
      },
      {
        tool: "Betterleaks",
        status: scanStatus,
        scope: "metadata-values-via-standard-input",
      },
      {
        tool: "format-aware-metadata-reader",
        status: "not-run",
        scope: "vendor-atoms-gps-families-and-embedded-artwork",
      },
    ],
  };
}

export function metadataValuePayload(probe) {
  const streams = (Array.isArray(probe?.streams) ? probe.streams : []).map((stream) => ({
    type: stream?.codec_type ?? null,
    tags: stream?.tags ?? {},
  }));
  const chapters = (Array.isArray(probe?.chapters) ? probe.chapters : []).map((chapter) => ({
    tags: chapter?.tags ?? {},
  }));
  return `${JSON.stringify({ format: probe?.format?.tags ?? {}, streams, chapters })}\n`;
}

export async function scanMetadataWithBetterleaks(
  probe,
  {
    installVerifier = verifyBetterleaksInstall,
    secretScanner = executeSecretScan,
    canaryRunner = runSyntheticCanary,
    suppressionInspector = assertSingleSuppressionSurface,
    repositoryRoot = REPOSITORY_ROOT,
    configPath = BETTERLEAKS_CONFIG_PATH,
    signal = null,
  } = {},
) {
  assertOperationActive(signal);
  await suppressionInspector(repositoryRoot);
  assertOperationActive(signal);
  const installation = await installVerifier({ repositoryRoot, signal });
  assertOperationActive(signal);
  const canary = await canaryRunner({
    binaryPath: installation.binaryPath,
    configPath,
    signal,
  });
  assertOperationActive(signal);
  if (canary?.detected !== true || canary?.redacted !== true) {
    throw mediaError(
      "MEDIA_METADATA_SCANNER_CANARY",
      "the metadata scanner did not prove detection and redaction",
    );
  }
  const result = await secretScanner({
    binaryPath: installation.binaryPath,
    configPath,
    cwd: repositoryRoot,
    scannerArguments: ["stdin"],
    input: metadataValuePayload(probe),
    signal,
    scope: "media metadata standard-input scan",
  });
  assertOperationActive(signal);
  return {
    status: result.findings.length === 0 ? "clean" : "findings",
    findingCount: result.findings.length,
    version: safeToken(installation.version),
    canaryPassed: true,
  };
}

function sanitizedMetadataScan(scan) {
  const findingCount = safeInteger(scan?.findingCount);
  const statusIsConsistent = (
    (scan?.status === "clean" && findingCount === 0)
    || (scan?.status === "findings" && findingCount !== null && findingCount > 0)
  );
  if (findingCount === null || !statusIsConsistent || scan?.canaryPassed !== true) {
    throw mediaError(
      "MEDIA_METADATA_SCAN_CONTRACT",
      "the metadata scanner returned an incomplete safety receipt",
    );
  }
  return {
    tool: "Betterleaks",
    status: scan.status,
    findingCount,
    version: safeToken(scan?.version),
    canaryPassed: scan?.canaryPassed === true,
  };
}

function technicalSummary(probe) {
  const groups = streamGroups(probe);
  const video = groups.video[0];
  const audio = groups.audio[0];
  return {
    container: safeToken(probe?.format?.format_name),
    durationSeconds: safeNumber(probe?.format?.duration),
    streamCounts: {
      video: groups.video.length,
      audio: groups.audio.length,
      subtitle: groups.subtitle.length,
      data: groups.data.length,
      attachment: groups.attachment.length,
    },
    chapterCount: Array.isArray(probe?.chapters) ? probe.chapters.length : 0,
    video: video ? {
      codec: safeToken(video.codec_name),
      profile: safeToken(video.profile),
      pixelFormat: safeToken(video.pix_fmt),
      width: safeInteger(video.width),
      height: safeInteger(video.height),
      fieldOrder: safeToken(video.field_order),
      sampleAspectRatio: safeToken(video.sample_aspect_ratio),
      averageFrameRate: safeToken(video.avg_frame_rate),
      colorPrimaries: safeToken(video.color_primaries),
      colorTransfer: safeToken(video.color_transfer),
      colorSpace: safeToken(video.color_space),
      colorRange: safeToken(video.color_range),
    } : null,
    audio: audio ? {
      codec: safeToken(audio.codec_name),
      channels: safeInteger(audio.channels),
      channelLayout: safeToken(audio.channel_layout),
      sampleRate: safeInteger(audio.sample_rate),
    } : null,
  };
}

function observedDuration(probe, selectedVideo) {
  return safeNumber(selectedVideo?.duration) ?? safeNumber(probe?.format?.duration);
}

function taggedDurationSeconds(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/u.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 3_600 + Number(match[2]) * 60 + Number(match[3]);
}

function observedAudioDuration(probe, audio) {
  return (
    safeNumber(audio?.duration)
    ?? taggedDurationSeconds(audio?.tags?.DURATION)
    ?? taggedDurationSeconds(audio?.tags?.duration)
    ?? safeNumber(probe?.format?.duration)
  );
}

function observedStreamStart(probe, stream) {
  return safeNumber(stream?.start_time) ?? safeNumber(probe?.format?.start_time);
}

function displayAspectRatio(video) {
  const width = safeInteger(video?.width);
  const height = safeInteger(video?.height);
  if (!width || !height) return null;
  const sampleAspectRatio = ratioValue(video?.sample_aspect_ratio) ?? 1;
  return width * sampleAspectRatio / height;
}

function approximatelyEqual(left, right, tolerance) {
  return left !== null && right !== null && Math.abs(left - right) <= tolerance;
}

function expectedPreparedGeometry(video) {
  const width = safeInteger(video?.width);
  const height = safeInteger(video?.height);
  const aspect = displayAspectRatio(video);
  if (!width || !height || aspect === null || aspect <= 0) return null;
  const boxWidth = Math.min(width, MAX_WIDTH);
  const boxHeight = Math.min(height, MAX_HEIGHT);
  const boxAspect = boxWidth / boxHeight;
  const unconstrainedWidth = boxAspect > aspect ? boxHeight * aspect : boxWidth;
  const unconstrainedHeight = boxAspect > aspect ? boxHeight : boxWidth / aspect;
  const even = (value) => Math.max(2, Math.floor(value / 2) * 2);
  return { width: even(unconstrainedWidth), height: even(unconstrainedHeight) };
}

export function comparePreparedMedia(sourceProbe, outputProbe) {
  const source = streamGroups(sourceProbe);
  const output = streamGroups(outputProbe);
  const sourceVideo = source.video[0];
  const outputVideo = output.video[0];
  const sourceAudio = source.audio[0];
  const outputAudio = output.audio[0];
  const sourceRate = sourceFrameRate(sourceVideo);
  const outputRate = sourceFrameRate(outputVideo);
  const sourceDuration = observedDuration(sourceProbe, sourceVideo);
  const outputDuration = observedDuration(outputProbe, outputVideo);
  const durationToleranceSeconds = Math.max(0.1, sourceRate ? 2 / sourceRate : 0.1);
  const sourceVideoStart = observedStreamStart(sourceProbe, sourceVideo);
  const outputVideoStart = observedStreamStart(outputProbe, outputVideo);
  const sourceAudioStart = observedStreamStart(sourceProbe, sourceAudio);
  const outputAudioStart = observedStreamStart(outputProbe, outputAudio);
  const sourceAudioDuration = observedAudioDuration(sourceProbe, sourceAudio);
  const outputAudioDuration = observedAudioDuration(outputProbe, outputAudio);
  const sourceAspect = displayAspectRatio(sourceVideo);
  const outputAspect = displayAspectRatio(outputVideo);
  const sourceWidth = safeInteger(sourceVideo?.width);
  const sourceHeight = safeInteger(sourceVideo?.height);
  const outputWidth = safeInteger(outputVideo?.width);
  const outputHeight = safeInteger(outputVideo?.height);
  const expectedGeometry = expectedPreparedGeometry(sourceVideo);
  const audioPresenceMatches = Boolean(sourceAudio) === Boolean(outputAudio);
  const expectedAudioRate = sourceAudio
    ? [44_100, 48_000].includes(safeInteger(sourceAudio.sample_rate))
      ? safeInteger(sourceAudio.sample_rate)
      : 48_000
    : null;
  const colorFields = ["color_primaries", "color_transfer", "color_space", "color_range"];
  const declaredColorFields = colorFields.filter((field) => {
    const value = sourceVideo?.[field];
    return typeof value === "string" && value.length > 0 && value !== "unknown";
  });
  const colorMatches = declaredColorFields.every(
    (field) => outputVideo?.[field] === sourceVideo?.[field],
  );
  const checks = {
    duration: {
      sourceSeconds: sourceDuration,
      outputSeconds: outputDuration,
      toleranceSeconds: durationToleranceSeconds,
      passed: approximatelyEqual(sourceDuration, outputDuration, durationToleranceSeconds),
    },
    cadence: {
      sourceFramesPerSecond: sourceRate,
      outputFramesPerSecond: outputRate,
      passed: approximatelyEqual(sourceRate, outputRate, 0.01),
    },
    displayAspectRatio: {
      source: sourceAspect,
      output: outputAspect,
      passed: (
        sourceAspect !== null
        && outputAspect !== null
        && Math.abs(sourceAspect - outputAspect) <= Math.max(0.001, sourceAspect * 0.005)
      ),
    },
    selectedGeometry: {
      sourceWidth,
      sourceHeight,
      expectedWidth: expectedGeometry?.width ?? null,
      expectedHeight: expectedGeometry?.height ?? null,
      outputWidth,
      outputHeight,
      passed: (
        expectedGeometry !== null
        && outputWidth !== null
        && outputHeight !== null
        && Math.abs(outputWidth - expectedGeometry.width) <= 2
        && Math.abs(outputHeight - expectedGeometry.height) <= 2
      ),
    },
    audio: {
      presenceMatches: audioPresenceMatches,
      channelsMatch: !sourceAudio || safeInteger(outputAudio?.channels) === safeInteger(sourceAudio.channels),
      expectedSampleRate: expectedAudioRate,
      outputSampleRate: outputAudio ? safeInteger(outputAudio.sample_rate) : null,
      passed: (
        audioPresenceMatches
        && (!sourceAudio || (
          safeInteger(outputAudio?.channels) === safeInteger(sourceAudio.channels)
          && safeInteger(outputAudio?.sample_rate) === expectedAudioRate
        ))
      ),
    },
    synchronization: {
      applicable: Boolean(sourceAudio),
      sourceStartOffsetSeconds: sourceAudio
        && sourceVideoStart !== null
        && sourceAudioStart !== null
        ? sourceAudioStart - sourceVideoStart
        : null,
      outputStartOffsetSeconds: outputAudio
        && outputVideoStart !== null
        && outputAudioStart !== null
        ? outputAudioStart - outputVideoStart
        : null,
      sourceEndOffsetSeconds: sourceAudio
        && sourceVideoStart !== null
        && sourceDuration !== null
        && sourceAudioStart !== null
        && sourceAudioDuration !== null
        ? sourceAudioStart + sourceAudioDuration - (sourceVideoStart + sourceDuration)
        : null,
      outputEndOffsetSeconds: outputAudio
        && outputVideoStart !== null
        && outputDuration !== null
        && outputAudioStart !== null
        && outputAudioDuration !== null
        ? outputAudioStart + outputAudioDuration - (outputVideoStart + outputDuration)
        : null,
      passed: !sourceAudio || (
        approximatelyEqual(
          sourceAudioStart !== null && sourceVideoStart !== null
            ? sourceAudioStart - sourceVideoStart
            : null,
          outputAudioStart !== null && outputVideoStart !== null
            ? outputAudioStart - outputVideoStart
            : null,
          durationToleranceSeconds,
        )
        && approximatelyEqual(sourceAudioDuration, outputAudioDuration, durationToleranceSeconds)
        && approximatelyEqual(
          sourceAudioStart !== null
            && sourceAudioDuration !== null
            && sourceVideoStart !== null
            && sourceDuration !== null
            ? sourceAudioStart + sourceAudioDuration - (sourceVideoStart + sourceDuration)
            : null,
          outputAudioStart !== null
            && outputAudioDuration !== null
            && outputVideoStart !== null
            && outputDuration !== null
            ? outputAudioStart + outputAudioDuration - (outputVideoStart + outputDuration)
            : null,
          durationToleranceSeconds,
        )
      ),
    },
    declaredColor: {
      fieldCount: declaredColorFields.length,
      passed: colorMatches,
    },
  };
  return {
    passed: Object.values(checks).every(({ passed }) => passed),
    checks,
  };
}

function assertOperationActive(signal) {
  if (signal?.aborted) {
    throw mediaError(
      "MEDIA_TOOL_INTERRUPTED",
      "local media inspection or preparation was interrupted",
    );
  }
}

function assertCacheableOutputSize(sizeBytes) {
  if (sizeBytes > MAX_CACHEABLE_OBJECT_BYTES) {
    throw mediaError(
      "MEDIA_OUTPUT_SIZE",
      "the prepared output exceeds the current cacheable-object size boundary",
    );
  }
}

async function sha256File(filePath, { signal = null } = {}) {
  assertOperationActive(signal);
  const hash = createHash("sha256");
  let sizeBytes = 0;
  try {
    for await (const chunk of createReadStream(filePath, signal ? { signal } : undefined)) {
      assertOperationActive(signal);
      hash.update(chunk);
      sizeBytes += chunk.byteLength;
    }
  } catch (error) {
    if (signal?.aborted || error?.name === "AbortError") {
      throw mediaError(
        "MEDIA_TOOL_INTERRUPTED",
        "local media inspection or preparation was interrupted",
        error,
      );
    }
    throw error;
  }
  assertOperationActive(signal);
  return { sha256: hash.digest("hex"), sizeBytes };
}

async function assertRegularSource(sourcePath) {
  let source;
  try {
    source = await lstat(sourcePath);
  } catch (error) {
    throw mediaError("MEDIA_SOURCE_UNAVAILABLE", "the selected source is not an available regular file", error);
  }
  if (!source.isFile() || source.isSymbolicLink()) {
    throw mediaError("MEDIA_SOURCE_BOUNDARY", "the selected source must be a regular file");
  }
  return {
    device: source.dev,
    inode: source.ino,
    size: source.size,
    modifiedMilliseconds: source.mtimeMs,
  };
}

async function assertUnusedOutput(outputPath) {
  try {
    await lstat(outputPath);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw mediaError(
      "MEDIA_OUTPUT_UNAVAILABLE",
      "the selected output destination could not be inspected",
      error,
    );
  }
  throw mediaError(
    "MEDIA_OUTPUT_EXISTS",
    "the selected output already exists; verify it against the source after an interrupted or unknown prior outcome, and choose a new version only when verification fails",
  );
}

async function promotePreparedOutput(temporaryPath, outputPath, { signal = null } = {}) {
  // This is the local commit boundary: an observed interruption before this
  // point leaves the selected output absent, while the hard-link itself is atomic.
  assertOperationActive(signal);
  try {
    // The sibling hard-link creation is atomic and fails rather than replacing
    // a destination that appeared after the earlier availability check.
    await link(temporaryPath, outputPath);
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw mediaError(
        "MEDIA_OUTPUT_EXISTS",
        "the selected output already exists; verify it against the source after an interrupted or unknown prior outcome, and choose a new version only when verification fails",
        error,
      );
    }
    throw mediaError(
      "MEDIA_OUTPUT_PROMOTION",
      "the verified output could not be promoted without replacing existing bytes",
      error,
    );
  }
}

async function assertSourceUnchanged(sourcePath, identity, digest, { signal = null } = {}) {
  assertOperationActive(signal);
  const currentIdentity = await assertRegularSource(sourcePath);
  const identityMatches = (
    currentIdentity.device === identity.device
    && currentIdentity.inode === identity.inode
    && currentIdentity.size === identity.size
    && currentIdentity.modifiedMilliseconds === identity.modifiedMilliseconds
  );
  const currentDigest = await sha256File(sourcePath, { signal });
  if (
    !identityMatches
    || currentDigest.sizeBytes !== digest.sizeBytes
    || currentDigest.sha256 !== digest.sha256
  ) {
    throw mediaError(
      "MEDIA_SOURCE_CHANGED",
      "the selected source changed during bounded inspection or preparation",
    );
  }
}

function readUInt64(buffer, offset) {
  const value = buffer.readBigUInt64BE(offset);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw mediaError("MEDIA_MP4_BOX_SIZE", "an MP4 box exceeds the safe parser size boundary");
  }
  return Number(value);
}

export function parseMp4TopLevelBoxes(buffer, { fileSize = buffer.byteLength, startOffset = 0 } = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw mediaError("MEDIA_MP4_INPUT", "the MP4 box parser requires Buffer bytes");
  }
  const boxes = [];
  let cursor = 0;
  while (cursor < buffer.byteLength) {
    if (buffer.byteLength - cursor < 8) {
      throw mediaError("MEDIA_MP4_TRUNCATED", "the MP4 contains a truncated top-level box header");
    }
    const shortSize = buffer.readUInt32BE(cursor);
    const type = buffer.toString("ascii", cursor + 4, cursor + 8);
    if (!/^[\x20-\x7e]{4}$/u.test(type)) {
      throw mediaError("MEDIA_MP4_BOX_TYPE", "the MP4 contains an invalid top-level box type");
    }
    let headerSize = 8;
    let size = shortSize;
    if (shortSize === 1) {
      if (buffer.byteLength - cursor < 16) {
        throw mediaError("MEDIA_MP4_TRUNCATED", "the MP4 contains a truncated extended box header");
      }
      headerSize = 16;
      size = readUInt64(buffer, cursor + 8);
    } else if (shortSize === 0) {
      size = fileSize - (startOffset + cursor);
    }
    if (size < headerSize) {
      throw mediaError("MEDIA_MP4_BOX_SIZE", "the MP4 contains an invalid top-level box size");
    }
    if (cursor + size > buffer.byteLength) {
      throw mediaError("MEDIA_MP4_TRUNCATED", "the MP4 contains a truncated top-level box");
    }
    boxes.push({ type, offset: startOffset + cursor, size, headerSize });
    cursor += size;
    if (shortSize === 0) break;
  }
  return boxes;
}

export async function readMp4TopLevelBoxes(filePath) {
  const file = await open(filePath, "r");
  try {
    const details = await file.stat();
    const boxes = [];
    let offset = 0;
    const header = Buffer.alloc(16);
    while (offset < details.size) {
      const headerRead = await file.read(header, 0, 8, offset);
      if (headerRead.bytesRead !== 8) {
        throw mediaError("MEDIA_MP4_TRUNCATED", "the MP4 contains a truncated top-level box header");
      }
      const shortSize = header.readUInt32BE(0);
      const type = header.toString("ascii", 4, 8);
      if (!/^[\x20-\x7e]{4}$/u.test(type)) {
        throw mediaError("MEDIA_MP4_BOX_TYPE", "the MP4 contains an invalid top-level box type");
      }
      let headerSize = 8;
      let size = shortSize;
      if (shortSize === 1) {
        const extendedRead = await file.read(header, 8, 8, offset + 8);
        if (extendedRead.bytesRead !== 8) {
          throw mediaError("MEDIA_MP4_TRUNCATED", "the MP4 contains a truncated extended box header");
        }
        headerSize = 16;
        size = readUInt64(header, 8);
      } else if (shortSize === 0) {
        size = details.size - offset;
      }
      if (size < headerSize || offset + size > details.size) {
        throw mediaError("MEDIA_MP4_BOX_SIZE", "the MP4 contains an invalid top-level box size");
      }
      boxes.push({ type, offset, size, headerSize });
      offset += size;
      if (shortSize === 0) break;
    }
    return boxes;
  } finally {
    await file.close();
  }
}

export function verifyFastStartBoxes(boxes) {
  const moov = boxes.find(({ type }) => type === "moov");
  const mdat = boxes.find(({ type }) => type === "mdat");
  if (!moov || !mdat) {
    throw mediaError("MEDIA_MP4_REQUIRED_BOX", "the MP4 must contain both moov and mdat boxes");
  }
  if (moov.offset >= mdat.offset) {
    throw mediaError("MEDIA_MP4_NOT_FASTSTART", "the MP4 moov box must precede the first mdat box");
  }
  return {
    passed: true,
    moovBeforeMdat: true,
    topLevelBoxTypes: boxes.map(({ type }) => type),
  };
}

function packetTime(value) {
  if (value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function packetReport(filePath, streamSpecifier, { ffprobeBinary, commandRunner }) {
  const report = await commandJson(
    ffprobeBinary,
    buildPacketHashProbeArguments(filePath, streamSpecifier),
    commandRunner,
    "MEDIA_PACKET_HASH_FAILED",
  );
  const packets = Array.isArray(report.packets) ? report.packets : [];
  if (packets.length === 0) {
    throw mediaError("MEDIA_PACKET_HASH_INVALID", "the selected stream returned no packet digests");
  }
  const hashes = packets.map(({ data_hash: hash }) => String(hash ?? "").toLowerCase());
  if (hashes.some((hash) => !/^sha256:[a-f0-9]{64}$/u.test(hash))) {
    throw mediaError("MEDIA_PACKET_HASH_INVALID", "the packet digest report was incomplete");
  }
  return {
    hashes,
    timing: packets.map((packet) => ({
      pts: packetTime(packet.pts_time),
      dts: packetTime(packet.dts_time),
      duration: packetTime(packet.duration_time),
    })),
  };
}

export function comparePacketHashes(sourceHashes, outputHashes) {
  return (
    sourceHashes.length === outputHashes.length
    && sourceHashes.every((hash, index) => hash === outputHashes[index])
  );
}

function comparePacketTiming(sourceTiming, outputTiming) {
  if (sourceTiming.length !== outputTiming.length || sourceTiming.length === 0) return false;
  const firstSourcePts = sourceTiming.find(({ pts }) => pts !== null)?.pts ?? 0;
  const firstOutputPts = outputTiming.find(({ pts }) => pts !== null)?.pts ?? 0;
  const firstSourceDts = sourceTiming.find(({ dts }) => dts !== null)?.dts ?? 0;
  const firstOutputDts = outputTiming.find(({ dts }) => dts !== null)?.dts ?? 0;
  const equalTime = (left, right) => (
    (left === null && right === null)
    || (left !== null && right !== null && Math.abs(left - right) <= 0.000_001)
  );
  return sourceTiming.every((sourcePacket, index) => {
    const outputPacket = outputTiming[index];
    return (
      equalTime(
        sourcePacket.pts === null ? null : sourcePacket.pts - firstSourcePts,
        outputPacket.pts === null ? null : outputPacket.pts - firstOutputPts,
      )
      && equalTime(
        sourcePacket.dts === null ? null : sourcePacket.dts - firstSourceDts,
        outputPacket.dts === null ? null : outputPacket.dts - firstOutputDts,
      )
      && equalTime(sourcePacket.duration, outputPacket.duration)
    );
  });
}

function outputMetadataIsBounded(metadata) {
  return (
    metadata.format.authoredKeys.length === 0
    && metadata.streams.every(({ authoredKeys: keys }) => keys.length === 0)
    && metadata.chapters.length === 0
  );
}

function assertPreparedProbe(probe, metadata) {
  const disposition = selectPreparationStrategy(probe);
  if (disposition.strategy !== "copy-remux") {
    throw mediaError(
      "MEDIA_OUTPUT_PROFILE",
      "the prepared output does not meet the progressive H.264/AAC delivery profile",
    );
  }
  if (!outputMetadataIsBounded(metadata)) {
    throw mediaError(
      "MEDIA_OUTPUT_METADATA",
      "the prepared output retains authored metadata or chapters",
    );
  }
}

function temporaryOutputPath(targetPath, idFactory) {
  const target = parse(targetPath);
  return join(
    target.dir,
    `.${target.name}.${process.pid}.${idFactory()}.tmp${target.ext || ".mp4"}`,
  );
}

async function inspectRaw(
  sourcePath,
  {
    commandRunner,
    ffmpegBinary,
    ffprobeBinary,
    metadataScanner,
    maximumSizeBytes = null,
    signal = null,
  },
) {
  assertOperationActive(signal);
  const identity = await assertRegularSource(sourcePath);
  if (maximumSizeBytes !== null && identity.size > maximumSizeBytes) {
    assertCacheableOutputSize(identity.size);
  }
  const digest = await sha256File(sourcePath, { signal });
  const probe = await probeMedia(sourcePath, { ffprobeBinary, commandRunner });
  assertOperationActive(signal);
  await strictDecode(sourcePath, { ffmpegBinary, commandRunner });
  assertOperationActive(signal);
  let metadataScan;
  try {
    metadataScan = sanitizedMetadataScan(await metadataScanner(probe, { signal }));
  } catch (error) {
    if (signal?.aborted) assertOperationActive(signal);
    if (error instanceof MediaPreparationError) throw error;
    throw mediaError(
      "MEDIA_METADATA_SCAN_FAILED",
      "the metadata secret-material inspection did not complete",
      error,
    );
  }
  assertOperationActive(signal);
  if (metadataScan.status !== "clean") {
    throw mediaError(
      "MEDIA_METADATA_SECRET_CANDIDATES",
      `the metadata inspection found ${metadataScan.findingCount} secret-shaped candidate${metadataScan.findingCount === 1 ? "" : "s"}`,
    );
  }
  await assertSourceUnchanged(sourcePath, identity, digest, { signal });
  const metadata = summarizeMetadata(probe, { metadataScan });
  return {
    probe,
    identity,
    report: {
      digest,
      decodedStrictly: true,
      technical: technicalSummary(probe),
      metadata,
      metadataScan,
      preparation: selectPreparationStrategy(probe),
    },
  };
}

function mediaOptions(options = {}) {
  return {
    commandRunner: options.commandRunner
      ?? ((binary, argumentsList) => runMediaCommand(binary, argumentsList, {
        signal: options.signal ?? null,
      })),
    ffmpegBinary: options.ffmpegBinary ?? "ffmpeg",
    ffprobeBinary: options.ffprobeBinary ?? "ffprobe",
    metadataScanner: options.metadataScanner ?? scanMetadataWithBetterleaks,
    signal: options.signal ?? null,
    temporaryRemover: options.temporaryRemover ?? rm,
  };
}

export async function inspectR2ProgressiveVideo({ sourcePath, ...options } = {}) {
  if (typeof sourcePath !== "string" || sourcePath.length === 0) {
    throw mediaError("MEDIA_SOURCE_ARGUMENT", "inspect requires one source file");
  }
  const { report } = await inspectRaw(sourcePath, mediaOptions(options));
  return {
    schema: "r2-progressive-video-preparation/v1",
    operation: "inspect",
    ok: report.preparation.strategy !== "hold",
    source: report,
  };
}

async function runFfmpeg(argumentsList, { ffmpegBinary, commandRunner, signal }) {
  let result;
  try {
    result = await commandRunner(ffmpegBinary, argumentsList);
  } catch (error) {
    if (error instanceof MediaPreparationError) throw error;
    throw mediaError("MEDIA_PREPARATION_FAILED", "FFmpeg preparation did not complete", error);
  }
  if (result.signal || result.code !== 0) {
    throw mediaError("MEDIA_PREPARATION_FAILED", "FFmpeg preparation did not complete");
  }
  assertOperationActive(signal);
}

async function verifyPacketPreservation(sourcePath, outputPath, hasAudio, options) {
  const streamSpecifiers = hasAudio ? ["v:0", "a:0"] : ["v:0"];
  const streams = [];
  for (const stream of streamSpecifiers) {
    const [sourcePackets, outputPackets] = await Promise.all([
      packetReport(sourcePath, stream, options),
      packetReport(outputPath, stream, options),
    ]);
    assertOperationActive(options.signal);
    const hashesPassed = comparePacketHashes(sourcePackets.hashes, outputPackets.hashes);
    const timingPassed = comparePacketTiming(sourcePackets.timing, outputPackets.timing);
    const passed = hashesPassed && timingPassed;
    if (!passed) {
      throw mediaError(
        "MEDIA_PACKET_HASH_MISMATCH",
        "copy-remux packet payloads or timing differ from the selected source streams",
      );
    }
    streams.push({
      stream,
      packetCount: sourcePackets.hashes.length,
      hashesPassed,
      timingPassed,
      passed,
    });
  }
  return { applicable: true, passed: true, streams };
}

async function verifyPreparedFile(outputPath, options) {
  assertOperationActive(options.signal);
  const identity = await assertRegularSource(outputPath);
  assertCacheableOutputSize(identity.size);
  const probe = await probeMedia(outputPath, options);
  assertOperationActive(options.signal);
  await strictDecode(outputPath, options);
  assertOperationActive(options.signal);
  const metadata = summarizeMetadata(probe);
  assertPreparedProbe(probe, metadata);
  const boxes = await readMp4TopLevelBoxes(outputPath);
  assertOperationActive(options.signal);
  const fastStart = verifyFastStartBoxes(boxes);
  const digest = await sha256File(outputPath, { signal: options.signal });
  assertCacheableOutputSize(digest.sizeBytes);
  await assertSourceUnchanged(outputPath, identity, digest, options);
  return {
    identity,
    probe,
    report: {
      digest,
      decodedStrictly: true,
      technical: technicalSummary(probe),
      metadata,
      fastStart,
    },
  };
}

export async function prepareR2ProgressiveVideo({
  sourcePath,
  outputPath,
  semanticId = null,
  assetVersion = null,
  idFactory = randomUUID,
  ...providedOptions
} = {}) {
  if (typeof sourcePath !== "string" || sourcePath.length === 0) {
    throw mediaError("MEDIA_SOURCE_ARGUMENT", "prepare requires one source file");
  }
  if (typeof outputPath !== "string" || outputPath.length === 0) {
    throw mediaError("MEDIA_OUTPUT_ARGUMENT", "prepare requires one output file");
  }
  if (resolve(sourcePath) === resolve(outputPath)) {
    throw mediaError("MEDIA_OUTPUT_BOUNDARY", "the output must be distinct from the private source");
  }
  if (extname(outputPath).toLowerCase() !== ".mp4") {
    throw mediaError("MEDIA_OUTPUT_CONTAINER", "the prepared output must use an .mp4 filename");
  }
  await assertUnusedOutput(outputPath);
  if ((semanticId === null) !== (assetVersion === null)) {
    throw mediaError(
      "MEDIA_PUBLICATION_IDENTITY",
      "semantic ID and asset version must be supplied together",
    );
  }
  if (semanticId !== null && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(semanticId)) {
    throw mediaError("MEDIA_PUBLICATION_IDENTITY", "semantic ID must be a lowercase ASCII slug");
  }
  if (
    assetVersion !== null
    && !/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u.test(assetVersion)
  ) {
    throw mediaError(
      "MEDIA_PUBLICATION_IDENTITY",
      "asset version must use canonical v<major>.<minor>.<patch> form",
    );
  }

  const options = mediaOptions(providedOptions);
  const source = await inspectRaw(sourcePath, options);
  if (source.report.preparation.strategy === "hold") {
    throw mediaError(
      "MEDIA_EXPLICIT_HANDLING_REQUIRED",
      `source-specific handling is required for: ${source.report.preparation.reasons.join(", ")}`,
    );
  }

  const temporaryPath = temporaryOutputPath(outputPath, idFactory);
  const groups = streamGroups(source.probe);
  const audio = groups.audio[0];
  const strategy = source.report.preparation.strategy;
  const argumentsList = strategy === "copy-remux"
    ? buildCopyRemuxArguments({ sourcePath, targetPath: temporaryPath })
    : buildEncodeArguments({
      sourcePath,
      targetPath: temporaryPath,
      hasAudio: Boolean(audio),
      audioChannels: safeInteger(audio?.channels) ?? 2,
      audioSampleRate: safeInteger(audio?.sample_rate) ?? 48_000,
      videoColor: groups.video[0],
    });

  let result = null;
  let primaryError = null;
  try {
    await runFfmpeg(argumentsList, options);
    const output = await verifyPreparedFile(temporaryPath, options);
    const semanticPreservation = comparePreparedMedia(source.probe, output.probe);
    if (!semanticPreservation.passed) {
      throw mediaError(
        "MEDIA_OUTPUT_SEMANTICS",
        "the prepared output did not preserve duration, cadence, geometry, color, or selected audio intent",
      );
    }
    const packetPreservation = strategy === "copy-remux"
      ? await verifyPacketPreservation(sourcePath, temporaryPath, Boolean(audio), options)
      : { applicable: false, passed: null, streams: [] };
    await assertSourceUnchanged(sourcePath, source.identity, source.report.digest, options);
    await assertSourceUnchanged(temporaryPath, output.identity, output.report.digest, options);
    await promotePreparedOutput(temporaryPath, outputPath, options);
    result = {
      schema: "r2-progressive-video-preparation/v1",
      operation: "prepare",
      ok: true,
      strategy,
      source: source.report,
      output: output.report,
      semanticPreservation,
      packetPreservation,
      atomicPromotion: true,
      publicationIdentity: semanticId === null ? null : { semanticId, assetVersion },
    };
  } catch (error) {
    primaryError = error;
  }

  let cleanupComplete = true;
  try {
    await options.temporaryRemover(temporaryPath, { force: true });
  } catch {
    cleanupComplete = false;
  }
  const cleanup = {
    complete: cleanupComplete,
    recovery: cleanupComplete ? null : "inspect-and-remove-the-exact-temporary-sibling",
  };
  if (primaryError) {
    primaryError.temporaryCleanup = cleanup;
    throw primaryError;
  }
  return { ...result, temporaryCleanup: cleanup };
}

export async function verifyR2ProgressiveVideo({
  mediaPath,
  sourcePath = null,
  ...providedOptions
} = {}) {
  if (typeof mediaPath !== "string" || mediaPath.length === 0) {
    throw mediaError("MEDIA_VERIFY_ARGUMENT", "verify requires one prepared MP4 file");
  }
  const options = mediaOptions(providedOptions);
  const inspected = await inspectRaw(mediaPath, {
    ...options,
    maximumSizeBytes: MAX_CACHEABLE_OBJECT_BYTES,
  });
  const boxes = await readMp4TopLevelBoxes(mediaPath);
  assertOperationActive(options.signal);
  const fastStart = verifyFastStartBoxes(boxes);
  assertPreparedProbe(inspected.probe, inspected.report.metadata);
  let packetPreservation = { applicable: false, passed: null, streams: [] };
  let semanticPreservation = { applicable: false, passed: null, checks: {} };
  if (sourcePath !== null) {
    const sourceIdentity = await assertRegularSource(sourcePath);
    const sourceDigest = await sha256File(sourcePath, { signal: options.signal });
    const sourceProbe = await probeMedia(sourcePath, options);
    assertOperationActive(options.signal);
    await strictDecode(sourcePath, options);
    assertOperationActive(options.signal);
    await assertSourceUnchanged(sourcePath, sourceIdentity, sourceDigest, options);
    semanticPreservation = {
      applicable: true,
      ...comparePreparedMedia(sourceProbe, inspected.probe),
    };
    if (!semanticPreservation.passed) {
      throw mediaError(
        "MEDIA_OUTPUT_SEMANTICS",
        "the prepared output did not preserve duration, cadence, geometry, color, or selected audio intent",
      );
    }
    if (selectPreparationStrategy(sourceProbe).strategy === "copy-remux") {
      packetPreservation = await verifyPacketPreservation(
        sourcePath,
        mediaPath,
        streamGroups(sourceProbe).audio.length > 0,
        options,
      );
    }
    await assertSourceUnchanged(sourcePath, sourceIdentity, sourceDigest, options);
  }
  await assertSourceUnchanged(mediaPath, inspected.identity, inspected.report.digest, options);
  return {
    schema: "r2-progressive-video-preparation/v1",
    operation: "verify",
    ok: true,
    output: { ...inspected.report, fastStart },
    semanticPreservation,
    packetPreservation,
  };
}

export function parsePrepareCliArguments(argumentsList) {
  const [operation, ...rest] = argumentsList;
  if (["--help", "-h"].includes(operation)) return { operation: "help" };
  if (operation === "inspect" && rest.length === 1) {
    return { operation, sourcePath: rest[0] };
  }
  if (operation === "prepare" && rest.length === 2) {
    return { operation, sourcePath: rest[0], outputPath: rest[1] };
  }
  if (operation === "verify") {
    if (rest.length === 1) return { operation, mediaPath: rest[0], sourcePath: null };
    if (rest.length === 3 && rest[1] === "--source") {
      return { operation, mediaPath: rest[0], sourcePath: rest[2] };
    }
  }
  if (["inspect", "prepare", "verify"].includes(operation) && rest[0]?.startsWith("--")) {
    const values = new Map();
    const accepted = new Set([
      "--against",
      "--asset-version",
      "--output",
      "--semantic-id",
      "--source",
    ]);
    for (let index = 0; index < rest.length; index += 2) {
      const name = rest[index];
      const value = rest[index + 1];
      if (!accepted.has(name) || value === undefined || value.startsWith("--") || values.has(name)) {
        throw mediaError("MEDIA_ARGUMENTS", "media helper received an unknown, duplicate, or incomplete option");
      }
      values.set(name, value);
    }
    if (operation === "inspect" && values.size === 1 && values.has("--source")) {
      return { operation, sourcePath: values.get("--source") };
    }
    if (
      operation === "prepare"
      && values.has("--source")
      && values.has("--output")
      && [...values.keys()].every((name) => [
        "--source",
        "--output",
        "--semantic-id",
        "--asset-version",
      ].includes(name))
    ) {
      return {
        operation,
        sourcePath: values.get("--source"),
        outputPath: values.get("--output"),
        semanticId: values.get("--semantic-id") ?? null,
        assetVersion: values.get("--asset-version") ?? null,
      };
    }
    if (
      operation === "verify"
      && values.has("--source")
      && [...values.keys()].every((name) => ["--source", "--against"].includes(name))
    ) {
      return {
        operation,
        mediaPath: values.get("--source"),
        sourcePath: values.get("--against") ?? null,
      };
    }
  }
  throw mediaError(
    "MEDIA_ARGUMENTS",
    "use inspect <source>, prepare <source> <output.mp4>, or verify <output.mp4> [--source <source>]",
  );
}

function usage() {
  return [
    "Usage:",
    "  node tools/prepare-r2-progressive-video.mjs inspect --source <source>",
    "  node tools/prepare-r2-progressive-video.mjs prepare --source <source> --output <output.mp4> [--semantic-id <id> --asset-version <vX.Y.Z>]",
    "  node tools/prepare-r2-progressive-video.mjs verify --source <output.mp4> [--against <source>]",
    "",
    "The output path must be unused. The JSON receipt omits paths, metadata values, and tool diagnostics.",
    "",
  ].join("\n");
}

export function mediaCliFailureMessage(error) {
  const lines = [
    error instanceof MediaPreparationError
      ? error.message
      : "MEDIA_PREPARATION_UNEXPECTED: media preparation did not complete",
  ];
  if (error?.temporaryCleanup?.complete === false) {
    lines.push(
      "MEDIA_TEMPORARY_CLEANUP_INCOMPLETE: inspect and remove the exact hidden temporary sibling before retrying",
    );
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parsePrepareCliArguments(process.argv.slice(2));
  if (options.operation === "help") {
    process.stdout.write(usage());
    return;
  }
  const result = options.operation === "inspect"
    ? await inspectR2ProgressiveVideo(options)
    : options.operation === "prepare"
      ? await prepareR2ProgressiveVideo(options)
      : await verifyR2ProgressiveVideo(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.ok !== true) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(mediaCliFailureMessage(error));
    process.exitCode = 1;
  });
}
