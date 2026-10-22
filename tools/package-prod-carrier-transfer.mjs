import './node-runtime-admission.mjs';
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify, TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";
import { deflateRawSync, inflateRawSync } from "node:zlib";

const execFileAsync = promisify(execFile);
const toolPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(toolPath), "..");
const toolRepositoryPath = "tools/package-prod-carrier-transfer.mjs";
const carrierRoot = "deployment/cpanel/carrier";
const manifestPath = "deployment-manifest.json";
const indexPath = "deployment-files.tsv";
const receiptId = "cpanel-carrier.transfer-envelope.v1";
const manifestId = "prod-projection.deployment-manifest.v1";
const toolVersion = "1.0.0";
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const indexHeader =
  "deployment_manifest_sha256\tsource_sha\tsurface\tprojected_path\tbytes\tsha256\tmedia_type";
const zipSignatures = Object.freeze({
  local: 0x04034b50,
  central: 0x02014b50,
  end: 0x06054b50,
});
const defaultLimits = Object.freeze({
  maxArchiveBytes: 256 * 1024 * 1024,
  maxEntries: 10_000,
  maxExpandedBytes: 1024 * 1024 * 1024,
  maxEntryBytes: 256 * 1024 * 1024,
});
const maxReceiptBytes = 1024 * 1024;
const maxCarrierMetadataBytes = 4 * 1024 * 1024;

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function assertPlainObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object.`);
  }
  return value;
}

function assertExactKeys(value, expected, label) {
  assertPlainObject(value, label);
  const actual = Object.keys(value).sort();
  const selected = [...expected].sort();
  if (
    actual.length !== selected.length ||
    actual.some((key, index) => key !== selected[index])
  ) {
    fail(`${label} must contain exactly: ${selected.join(", ")}.`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    fail(`${label} must be one nonempty, trimmed string.`);
  }
  return value;
}

function assertDigest(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    fail(`${label} must be one lowercase SHA-256 digest.`);
  }
  return value;
}

function assertGitSha(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(value)) {
    fail(`${label} must be one full Git object identifier.`);
  }
  return value;
}

function assertSafeInteger(value, label, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(`${label} must be an integer from ${minimum} through ${maximum}.`);
  }
  return value;
}

function assertProductionTag(value) {
  const tag = assertString(value, "Production tag");
  if (!/^production-v[0-9]+\.[0-9]+\.[0-9]+(?:[-.][A-Za-z0-9]+)*$/.test(tag)) {
    fail("Production tag must use the production-vMAJOR.MINOR.PATCH form.");
  }
  return tag;
}

function assertPortableRelativePath(value, label) {
  const relativePath = assertString(value, label);
  if (
    relativePath.startsWith("/") ||
    relativePath.includes("\\") ||
    relativePath.includes("\0") ||
    relativePath !== relativePath.normalize("NFC") ||
    path.posix.normalize(relativePath) !== relativePath ||
    relativePath.split("/").some((component) => component === "" || component === "." || component === "..")
  ) {
    fail(`${label} must stay relative, normalized, and portable: ${relativePath}.`);
  }
  if (Buffer.byteLength(relativePath, "utf8") > 4096) {
    fail(`${label} exceeds the portable path-length boundary: ${relativePath}.`);
  }
  for (const component of relativePath.split("/")) {
    if (Buffer.byteLength(component, "utf8") > 255) {
      fail(`${label} component exceeds the portable path-length boundary: ${relativePath}.`);
    }
    if (
      /[\u0000-\u001f\u007f<>:"\\|?*]/u.test(component) ||
      /[. ]$/u.test(component) ||
      /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(component)
    ) {
      fail(`${label} must stay portable across cPanel and local filesystems: ${relativePath}.`);
    }
  }
  return relativePath;
}

function portablePathKey(value) {
  return value.normalize("NFC").toLowerCase();
}

async function git(root, args, options = {}) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: root,
    encoding: options.encoding ?? null,
    maxBuffer: options.maxBuffer ?? defaultLimits.maxArchiveBytes,
    env: {
      PATH: process.env.PATH,
      LANG: "C",
      LC_ALL: "C",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_TERMINAL_PROMPT: "0",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_NO_REPLACE_OBJECTS: "1",
    },
  });
  return stdout;
}

function parseTreeRecords(bytes) {
  const records = [];
  let source;
  try {
    source = utf8Decoder.decode(bytes);
  } catch {
    fail("Production carrier tree contains a path that is not valid UTF-8.");
  }
  for (const rawRecord of source.split("\0")) {
    if (rawRecord.length === 0) continue;
    const tab = rawRecord.indexOf("\t");
    if (tab < 1) fail("Production carrier tree returned a malformed entry.");
    const [mode, type, object] = rawRecord.slice(0, tab).split(" ");
    const sourcePath = rawRecord.slice(tab + 1);
    if (!mode || !type || !object || !sourcePath) {
      fail("Production carrier tree returned an incomplete entry.");
    }
    records.push({ mode, type, object, sourcePath });
  }
  return records;
}

function parseManifest(bytes, expectedSourceSha) {
  let manifest;
  try {
    manifest = JSON.parse(utf8Decoder.decode(bytes));
  } catch {
    fail("Production carrier manifest must contain UTF-8 JSON.");
  }
  assertPlainObject(manifest, "Production carrier manifest");
  if (
    manifest.id !== manifestId ||
    manifest.version !== "1" ||
    manifest.source_sha !== expectedSourceSha ||
    !Array.isArray(manifest.outputs)
  ) {
    fail("Production carrier manifest identity, source, or outputs differ from the tagged carrier.");
  }
  if (manifest.outputs.length > defaultLimits.maxEntries) {
    fail("Production carrier manifest exceeds the output-count boundary.");
  }
  assertPlainObject(manifest.surfaces, "Production carrier manifest surfaces");
  for (const surface of ["primary", "iframe"]) {
    const record = assertPlainObject(
      manifest.surfaces[surface],
      `Production carrier ${surface} surface`,
    );
    assertSafeInteger(record.files, `Production carrier ${surface} file count`);
    assertSafeInteger(record.bytes, `Production carrier ${surface} byte count`);
  }
  return manifest;
}

function parseCarrierIndex(bytes) {
  let source;
  try {
    source = utf8Decoder.decode(bytes);
  } catch {
    fail("Production carrier index must contain UTF-8 text.");
  }
  if (!source.endsWith("\n")) fail("Production carrier index must end with one newline.");
  const lines = source.trimEnd().split("\n");
  if (lines.shift() !== indexHeader) {
    fail("Production carrier index header differs from the v1 contract.");
  }
  if (lines.length > defaultLimits.maxEntries) {
    fail("Production carrier index exceeds the row-count boundary.");
  }
  const rows = lines.map((line, index) => {
    const fields = line.split("\t");
    if (fields.length !== 7) {
      fail(`Production carrier index row ${index + 1} must contain seven fields.`);
    }
    const [manifestSha256, sourceSha, surface, projectedPath, byteText, digest, mediaType] = fields;
    if (!/^(?:0|[1-9][0-9]*)$/u.test(byteText)) {
      fail(`Production carrier index row ${index + 1} requires one canonical byte count.`);
    }
    return {
      manifestSha256,
      sourceSha,
      surface,
      projectedPath: assertPortableRelativePath(projectedPath, "Production carrier indexed path"),
      bytes: assertSafeInteger(
        Number(byteText),
        `Production carrier index row ${index + 1} bytes`,
        { maximum: defaultLimits.maxEntryBytes },
      ),
      digest,
      mediaType,
    };
  });
  for (let index = 1; index < rows.length; index += 1) {
    if (compareUtf8(rows[index - 1].projectedPath, rows[index].projectedPath) >= 0) {
      fail("Production carrier index paths must be unique and sorted by UTF-8 bytes.");
    }
  }
  return rows;
}

function verifyCarrierClosure({ files, manifest, manifestBytes, indexBytes, sourceSha }) {
  const manifestDigest = sha256(manifestBytes);
  const indexDigest = sha256(indexBytes);
  const rows = parseCarrierIndex(indexBytes);
  const outputs = new Map();
  for (const [index, output] of manifest.outputs.entries()) {
    assertPlainObject(output, `Production carrier manifest output ${index + 1}`);
    const projectedPath = assertPortableRelativePath(
      output.projected_path,
      `Production carrier manifest output ${index + 1} path`,
    );
    if (outputs.has(projectedPath)) {
      fail(`Production carrier manifest repeats ${projectedPath}.`);
    }
    outputs.set(projectedPath, output);
  }
  if (rows.length !== outputs.size) {
    fail("Production carrier index and manifest output counts differ.");
  }
  const indexed = new Set();
  const totals = {
    primary: { files: 0, bytes: 0 },
    iframe: { files: 0, bytes: 0 },
  };
  for (const row of rows) {
    if (
      row.manifestSha256 !== manifestDigest ||
      row.sourceSha !== sourceSha ||
      !["primary", "iframe"].includes(row.surface) ||
      indexed.has(portablePathKey(row.projectedPath))
    ) {
      fail(`Production carrier index metadata differs at ${row.projectedPath}.`);
    }
    const output = outputs.get(row.projectedPath);
    const bytes = files.get(row.projectedPath);
    if (
      !output ||
      !Buffer.isBuffer(bytes) ||
      output.surface !== row.surface ||
      output.bytes !== row.bytes ||
      output.sha256 !== row.digest ||
      output.media_type !== row.mediaType ||
      row.bytes !== bytes.byteLength ||
      assertDigest(row.digest, `Production carrier digest for ${row.projectedPath}`) !== sha256(bytes)
    ) {
      fail(`Production carrier bytes or metadata differ at ${row.projectedPath}.`);
    }
    indexed.add(portablePathKey(row.projectedPath));
    totals[row.surface].files += 1;
    totals[row.surface].bytes += bytes.byteLength;
  }
  const publicPaths = [...files.keys()]
    .filter((relativePath) => ![manifestPath, indexPath].includes(relativePath));
  if (
    publicPaths.length !== indexed.size ||
    publicPaths.some((relativePath) => !indexed.has(portablePathKey(relativePath)))
  ) {
    fail("Production carrier contains an unindexed or missing public file.");
  }
  for (const surface of ["primary", "iframe"]) {
    if (
      manifest.surfaces[surface].files !== totals[surface].files ||
      manifest.surfaces[surface].bytes !== totals[surface].bytes
    ) {
      fail(`Production carrier ${surface} totals differ from its manifest.`);
    }
  }
  return { manifestDigest, indexDigest, totals, rows };
}

export async function loadTaggedProductionCarrier({
  repository = repositoryRoot,
  productionTag,
} = {}) {
  const root = path.resolve(repository);
  const tag = assertProductionTag(productionTag);
  const tagRef = `refs/tags/${tag}`;
  let tagObject;
  try {
    tagObject = (await git(root, ["rev-parse", "--verify", tagRef], { encoding: "utf8" })).trim();
  } catch {
    fail(`Production tag is unavailable: ${tag}.`);
  }
  const tagType = (await git(root, ["cat-file", "-t", tagObject], { encoding: "utf8" })).trim();
  if (tagType !== "tag") fail(`Production tag must be annotated: ${tag}.`);
  const releaseSha = (await git(
    root,
    ["rev-parse", "--verify", `${tagObject}^{commit}`],
    { encoding: "utf8" },
  )).trim();
  assertGitSha(releaseSha, "Production release SHA");
  const parentLine = (await git(root, ["rev-list", "--parents", "-n", "1", releaseSha], {
    encoding: "utf8",
  })).trim().split(/\s+/u);
  if (parentLine.length < 2 || parentLine[0] !== releaseSha) {
    fail("Production release must have a source first parent.");
  }
  const sourceSha = assertGitSha(parentLine[1], "Production source SHA");
  const changedBytes = await git(root, [
    "diff",
    "--no-renames",
    "--name-only",
    "-z",
    sourceSha,
    releaseSha,
    "--",
  ]);
  let changedSource;
  try {
    changedSource = utf8Decoder.decode(changedBytes);
  } catch {
    fail("Production release diff contains a path that is not valid UTF-8.");
  }
  const changedPaths = changedSource.split("\0").filter(Boolean);
  if (
    changedPaths.length === 0 ||
    changedPaths.some((sourcePath) => !sourcePath.startsWith(`${carrierRoot}/`))
  ) {
    fail("Production release must differ from its first parent only inside the carrier root.");
  }
  for (const requiredPath of [`${carrierRoot}/${manifestPath}`, `${carrierRoot}/${indexPath}`]) {
    if (!changedPaths.includes(requiredPath)) {
      fail(`Production release must regenerate its carrier record: ${requiredPath}.`);
    }
  }

  const treeBytes = await git(root, [
    "ls-tree",
    "-r",
    "-z",
    "--full-tree",
    releaseSha,
    "--",
    carrierRoot,
  ]);
  const records = parseTreeRecords(treeBytes);
  if (records.length < 3) fail("Production carrier tree is incomplete.");
  if (records.length > defaultLimits.maxEntries) {
    fail("Production carrier exceeds the entry-count boundary.");
  }
  const files = new Map();
  let totalBytes = 0;
  for (const record of records) {
    if (
      record.mode !== "100644" ||
      record.type !== "blob" ||
      !record.sourcePath.startsWith(`${carrierRoot}/`)
    ) {
      fail(`Production carrier entry must be a regular non-executable blob: ${record.sourcePath}.`);
    }
    const relativePath = assertPortableRelativePath(
      record.sourcePath.slice(carrierRoot.length + 1),
      "Production carrier path",
    );
    const key = portablePathKey(relativePath);
    if ([...files.keys()].some((candidate) => portablePathKey(candidate) === key)) {
      fail(`Production carrier repeats a normalized path: ${relativePath}.`);
    }
    const bytes = await git(root, ["cat-file", "blob", record.object]);
    assertSafeInteger(bytes.byteLength, `Production carrier ${relativePath} bytes`, {
      maximum: defaultLimits.maxEntryBytes,
    });
    totalBytes += bytes.byteLength;
    if (totalBytes > defaultLimits.maxExpandedBytes) {
      fail("Production carrier exceeds the expanded-byte boundary.");
    }
    files.set(relativePath, bytes);
  }
  const manifestBytes = files.get(manifestPath);
  const indexBytes = files.get(indexPath);
  if (!Buffer.isBuffer(manifestBytes) || !Buffer.isBuffer(indexBytes)) {
    fail("Production carrier requires its manifest and file index.");
  }
  if (
    manifestBytes.byteLength > maxCarrierMetadataBytes ||
    indexBytes.byteLength > maxCarrierMetadataBytes
  ) {
    fail("Production carrier manifest or file index exceeds the metadata-byte boundary.");
  }
  const manifest = parseManifest(manifestBytes, sourceSha);
  const closure = verifyCarrierClosure({
    files,
    manifest,
    manifestBytes,
    indexBytes,
    sourceSha,
  });
  return {
    repository: root,
    productionTag: tag,
    tagObject: assertGitSha(tagObject, "Production tag object"),
    releaseSha,
    sourceSha,
    changedPaths,
    files,
    manifest,
    ...closure,
    totalBytes,
  };
}

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  crcTable[index] = value >>> 0;
}

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = (value >>> 8) ^ crcTable[(value ^ byte) & 0xff];
  return (value ^ 0xffffffff) >>> 0;
}

function createLocalHeader({ name, method, crc, compressedSize, expandedSize }) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(zipSignatures.local, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(method, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(33, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressedSize, 18);
  header.writeUInt32LE(expandedSize, 22);
  header.writeUInt16LE(name.byteLength, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function createCentralHeader({
  name,
  method,
  crc,
  compressedSize,
  expandedSize,
  localOffset,
  mode,
}) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(zipSignatures.central, 0);
  header.writeUInt16LE((3 << 8) | 20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(method, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(33, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(compressedSize, 20);
  header.writeUInt32LE(expandedSize, 24);
  header.writeUInt16LE(name.byteLength, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE((mode << 16) >>> 0, 38);
  header.writeUInt32LE(localOffset, 42);
  return header;
}

function createEndRecord(entryCount, centralSize, centralOffset) {
  const end = Buffer.alloc(22);
  end.writeUInt32LE(zipSignatures.end, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entryCount, 8);
  end.writeUInt16LE(entryCount, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);
  return end;
}

export function createDeterministicZip(entries) {
  if (!Array.isArray(entries) || entries.length < 1) {
    fail("Carrier archive requires at least one file entry.");
  }
  if (entries.length > 0xffff || entries.length > defaultLimits.maxEntries) {
    fail("Carrier archive exceeds the entry-count boundary.");
  }
  const normalized = entries.map((entry, index) => {
    assertPlainObject(entry, `Carrier archive entry ${index + 1}`);
    const entryPath = assertPortableRelativePath(entry.path, `Carrier archive entry ${index + 1} path`);
    if (!Buffer.isBuffer(entry.bytes)) {
      fail(`Carrier archive entry ${entryPath} requires exact Buffer bytes.`);
    }
    assertSafeInteger(entry.bytes.byteLength, `Carrier archive entry ${entryPath} bytes`, {
      maximum: defaultLimits.maxEntryBytes,
    });
    const name = Buffer.from(entryPath, "utf8");
    if (name.byteLength > 0xffff) {
      fail(`Carrier archive entry path exceeds the ZIP filename boundary: ${entryPath}.`);
    }
    return { path: entryPath, bytes: entry.bytes, name, mode: entry.mode ?? 0o100644 };
  }).sort((left, right) => compareUtf8(left.path, right.path));
  const seen = new Set();
  const locals = [];
  const centrals = [];
  let localOffset = 0;
  let centralBytes = 0;
  let expandedBytes = 0;
  for (const entry of normalized) {
    const key = portablePathKey(entry.path);
    if (seen.has(key)) fail(`Carrier archive repeats a normalized path: ${entry.path}.`);
    seen.add(key);
    if (entry.mode !== 0o100644) {
      fail(`Carrier archive entry must be one non-executable regular file: ${entry.path}.`);
    }
    expandedBytes += entry.bytes.byteLength;
    if (expandedBytes > defaultLimits.maxExpandedBytes) {
      fail("Carrier archive exceeds the expanded-byte boundary.");
    }
    const name = entry.name;
    const compressed = deflateRawSync(entry.bytes, { level: 9 });
    const checksum = crc32(entry.bytes);
    const localHeader = createLocalHeader({
      name,
      method: 8,
      crc: checksum,
      compressedSize: compressed.byteLength,
      expandedSize: entry.bytes.byteLength,
    });
    const centralHeader = createCentralHeader({
      name,
      method: 8,
      crc: checksum,
      compressedSize: compressed.byteLength,
      expandedSize: entry.bytes.byteLength,
      localOffset,
      mode: entry.mode,
    });
    localOffset += localHeader.byteLength + name.byteLength + compressed.byteLength;
    centralBytes += centralHeader.byteLength + name.byteLength;
    if (
      localOffset > 0xffffffff ||
      localOffset + centralBytes + 22 > defaultLimits.maxArchiveBytes
    ) {
      fail("Carrier archive exceeds the compressed-byte boundary.");
    }
    locals.push(localHeader, name, compressed);
    centrals.push(centralHeader, name);
  }
  const centralDirectory = Buffer.concat(centrals);
  if (centralDirectory.byteLength > 0xffffffff) {
    fail("Carrier archive requires an unsupported ZIP64 central directory.");
  }
  const archive = Buffer.concat([
    ...locals,
    centralDirectory,
    createEndRecord(normalized.length, centralDirectory.byteLength, localOffset),
  ]);
  if (archive.byteLength > defaultLimits.maxArchiveBytes) {
    fail("Carrier archive exceeds the compressed-byte boundary.");
  }
  return archive;
}

function readArchivePath(bytes, offset, length, label) {
  const end = offset + length;
  if (offset < 0 || length < 1 || end > bytes.byteLength) {
    fail(`${label} is truncated.`);
  }
  let value;
  try {
    value = utf8Decoder.decode(bytes.subarray(offset, end));
  } catch {
    fail(`${label} must use UTF-8.`);
  }
  return assertPortableRelativePath(value, label);
}

function resolveLimits(overrides = {}) {
  const limits = { ...defaultLimits, ...overrides };
  for (const [key, value] of Object.entries(limits)) {
    assertSafeInteger(value, `Carrier archive ${key}`, { minimum: 1 });
  }
  return limits;
}

export function inspectCarrierZip(archive, {
  expectedFiles,
  rootDirectory,
  limits: limitOverrides,
} = {}) {
  if (!Buffer.isBuffer(archive)) fail("Carrier archive verification requires Buffer bytes.");
  const limits = resolveLimits(limitOverrides);
  if (archive.byteLength > limits.maxArchiveBytes || archive.byteLength < 22) {
    fail("Carrier archive exceeds its compressed-byte boundary or is truncated.");
  }
  const endOffset = archive.byteLength - 22;
  if (archive.readUInt32LE(endOffset) !== zipSignatures.end) {
    fail("Carrier archive must end with one comment-free ZIP record.");
  }
  const disk = archive.readUInt16LE(endOffset + 4);
  const centralDisk = archive.readUInt16LE(endOffset + 6);
  const diskEntries = archive.readUInt16LE(endOffset + 8);
  const entryCount = archive.readUInt16LE(endOffset + 10);
  const centralSize = archive.readUInt32LE(endOffset + 12);
  const centralOffset = archive.readUInt32LE(endOffset + 16);
  const commentLength = archive.readUInt16LE(endOffset + 20);
  if (
    disk !== 0 ||
    centralDisk !== 0 ||
    diskEntries !== entryCount ||
    commentLength !== 0 ||
    entryCount < 1 ||
    entryCount > limits.maxEntries ||
    centralOffset + centralSize !== endOffset
  ) {
    fail("Carrier archive central-directory bounds differ from the supported single-disk ZIP contract.");
  }
  const expected = expectedFiles instanceof Map
    ? new Map([...expectedFiles].map(([entryPath, bytes]) => [
        portablePathKey(assertPortableRelativePath(entryPath, "Expected archive path")),
        { path: entryPath, bytes },
      ]))
    : null;
  const selectedRoot = rootDirectory === undefined
    ? null
    : assertPortableRelativePath(rootDirectory, "Carrier archive root directory");
  const files = new Map();
  const ranges = [];
  let cursor = centralOffset;
  let expandedBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > endOffset || archive.readUInt32LE(cursor) !== zipSignatures.central) {
      fail(`Carrier archive central entry ${index + 1} is malformed.`);
    }
    const madeBy = archive.readUInt16LE(cursor + 4);
    const needed = archive.readUInt16LE(cursor + 6);
    const flags = archive.readUInt16LE(cursor + 8);
    const method = archive.readUInt16LE(cursor + 10);
    const modifiedTime = archive.readUInt16LE(cursor + 12);
    const modifiedDate = archive.readUInt16LE(cursor + 14);
    const checksum = archive.readUInt32LE(cursor + 16);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const uncompressedSize = archive.readUInt32LE(cursor + 24);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const entryCommentLength = archive.readUInt16LE(cursor + 32);
    const entryDisk = archive.readUInt16LE(cursor + 34);
    const internalAttributes = archive.readUInt16LE(cursor + 36);
    const externalAttributes = archive.readUInt32LE(cursor + 38);
    const localOffset = archive.readUInt32LE(cursor + 42);
    const entryPath = readArchivePath(
      archive,
      cursor + 46,
      nameLength,
      `Carrier archive entry ${index + 1} path`,
    );
    cursor += 46 + nameLength + extraLength + entryCommentLength;
    const unixMode = externalAttributes >>> 16;
    if (
      madeBy !== ((3 << 8) | 20) ||
      needed !== 20 ||
      flags !== 0x0800 ||
      method !== 8 ||
      modifiedTime !== 0 ||
      modifiedDate !== 33 ||
      extraLength !== 0 ||
      entryCommentLength !== 0 ||
      entryDisk !== 0 ||
      internalAttributes !== 0 ||
      externalAttributes !== ((0o100644 << 16) >>> 0) ||
      uncompressedSize > limits.maxEntryBytes
    ) {
      fail(`Carrier archive entry must be one bounded regular UTF-8 file: ${entryPath}.`);
    }
    if (selectedRoot && !entryPath.startsWith(`${selectedRoot}/`)) {
      fail(`Carrier archive entry escaped ${selectedRoot}: ${entryPath}.`);
    }
    const key = portablePathKey(entryPath);
    if (files.has(key)) fail(`Carrier archive repeats a normalized path: ${entryPath}.`);
    if (localOffset + 30 > centralOffset || archive.readUInt32LE(localOffset) !== zipSignatures.local) {
      fail(`Carrier archive local entry is unavailable: ${entryPath}.`);
    }
    const localFlags = archive.readUInt16LE(localOffset + 6);
    const localNeeded = archive.readUInt16LE(localOffset + 4);
    const localMethod = archive.readUInt16LE(localOffset + 8);
    const localTime = archive.readUInt16LE(localOffset + 10);
    const localDate = archive.readUInt16LE(localOffset + 12);
    const localChecksum = archive.readUInt32LE(localOffset + 14);
    const localCompressed = archive.readUInt32LE(localOffset + 18);
    const localExpanded = archive.readUInt32LE(localOffset + 22);
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    const localPath = readArchivePath(
      archive,
      localOffset + 30,
      localNameLength,
      `Carrier archive local path for ${entryPath}`,
    );
    if (
      localNeeded !== needed ||
      localFlags !== flags ||
      localMethod !== method ||
      localTime !== 0 ||
      localDate !== 33 ||
      localChecksum !== checksum ||
      localCompressed !== compressedSize ||
      localExpanded !== uncompressedSize ||
      localExtraLength !== 0 ||
      localPath !== entryPath
    ) {
      fail(`Carrier archive local and central metadata differ for ${entryPath}.`);
    }
    const dataStart = localOffset + 30 + localNameLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > centralOffset) fail(`Carrier archive data is truncated for ${entryPath}.`);
    const compressed = archive.subarray(dataStart, dataEnd);
    let decoded;
    try {
      decoded = inflateRawSync(compressed, {
        info: true,
        maxOutputLength: Math.max(1, uncompressedSize + 1),
      });
    } catch {
      fail(`Carrier archive data cannot be decoded for ${entryPath}.`);
    }
    if (decoded.engine.bytesWritten !== compressed.byteLength) {
      fail(`Carrier archive entry contains trailing compressed data: ${entryPath}.`);
    }
    const bytes = decoded.buffer;
    if (
      bytes.byteLength !== uncompressedSize ||
      crc32(bytes) !== checksum
    ) {
      fail(`Carrier archive digest metadata differs for ${entryPath}.`);
    }
    expandedBytes += bytes.byteLength;
    if (expandedBytes > limits.maxExpandedBytes) {
      fail("Carrier archive exceeds the expanded-byte boundary.");
    }
    const expectedEntry = expected?.get(key);
    if (expected && (!expectedEntry || !Buffer.isBuffer(expectedEntry.bytes) || !bytes.equals(expectedEntry.bytes))) {
      fail(`Carrier archive bytes differ from the tagged carrier at ${entryPath}.`);
    }
    files.set(key, { path: entryPath, bytes, sha256: sha256(bytes) });
    ranges.push([localOffset, dataEnd, entryPath]);
  }
  if (cursor !== endOffset) fail("Carrier archive central directory contains trailing or missing data.");
  ranges.sort((left, right) => left[0] - right[0]);
  let rangeEnd = 0;
  for (const [start, end, entryPath] of ranges) {
    if (start !== rangeEnd || end < start) {
      fail(`Carrier archive local entries contain a gap or overlap near ${entryPath}.`);
    }
    rangeEnd = end;
  }
  if (rangeEnd !== centralOffset) fail("Carrier archive local data does not meet its central directory.");
  if (expected) {
    const missing = [...expected.keys()].filter((key) => !files.has(key));
    if (missing.length || files.size !== expected.size) {
      fail("Carrier archive membership differs from the tagged carrier.");
    }
  }
  return {
    entries: files.size,
    expandedBytes,
    archiveBytes: archive.byteLength,
    archiveSha256: sha256(archive),
  };
}

function transferRoot(productionTag) {
  return `hase-${productionTag}`;
}

function expectedArchiveFiles(carrier, rootDirectory) {
  return new Map(
    [...carrier.files.entries()].map(([relativePath, bytes]) => [
      `${rootDirectory}/${relativePath}`,
      bytes,
    ]),
  );
}

async function toolIdentity() {
  const revision = (await git(repositoryRoot, ["rev-parse", "HEAD"], { encoding: "utf8" })).trim();
  const bytes = await readFile(toolPath);
  const relativeToolPath = path.relative(repositoryRoot, toolPath).split(path.sep).join("/");
  if (relativeToolPath !== toolRepositoryPath) {
    fail("Carrier transfer tool path differs from its v1 repository contract.");
  }
  let committedBytes;
  try {
    committedBytes = await git(repositoryRoot, ["show", `${revision}:${relativeToolPath}`]);
  } catch {
    fail("Carrier transfer tool must be committed at the recorded tool revision.");
  }
  if (!bytes.equals(committedBytes)) {
    fail("Carrier transfer tool bytes must match the recorded tool revision.");
  }
  return {
    name: path.posix.basename(toolPath),
    version: toolVersion,
    revision: assertGitSha(revision, "Packaging tool revision"),
    sha256: sha256(bytes),
    node: process.versions.node,
    zlib: process.versions.zlib,
  };
}

async function verifyRecordedToolIdentity(tool) {
  let type;
  try {
    type = (await git(repositoryRoot, ["cat-file", "-t", tool.revision], {
      encoding: "utf8",
    })).trim();
  } catch {
    fail("Carrier transfer receipt tool revision is unavailable in this repository.");
  }
  if (type !== "commit") {
    fail("Carrier transfer receipt tool revision must identify one commit.");
  }
  let committedBytes;
  try {
    committedBytes = await git(repositoryRoot, ["show", `${tool.revision}:${toolRepositoryPath}`]);
  } catch {
    fail("Carrier transfer receipt tool revision does not contain the packaging tool.");
  }
  if (sha256(committedBytes) !== tool.sha256) {
    fail("Carrier transfer receipt tool digest differs from its recorded revision.");
  }
}

function serializeReceipt(receipt) {
  return Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

function validateReceipt(receipt) {
  assertExactKeys(
    receipt,
    ["id", "version", "created_at", "payload", "archive", "tool"],
    "Carrier transfer receipt",
  );
  if (receipt.id !== receiptId || receipt.version !== "1") {
    fail("Carrier transfer receipt identity differs from the v1 contract.");
  }
  if (
    typeof receipt.created_at !== "string" ||
    Number.isNaN(Date.parse(receipt.created_at)) ||
    new Date(receipt.created_at).toISOString() !== receipt.created_at
  ) {
    fail("Carrier transfer receipt requires an ISO creation time.");
  }
  assertExactKeys(
    receipt.payload,
    [
      "production_tag",
      "tag_object",
      "release_sha",
      "source_sha",
      "relationship",
      "manifest_sha256",
      "index_sha256",
      "files",
      "bytes",
      "primary",
      "iframe",
    ],
    "Carrier transfer payload",
  );
  assertProductionTag(receipt.payload.production_tag);
  assertGitSha(receipt.payload.tag_object, "Carrier transfer tag object");
  assertGitSha(receipt.payload.release_sha, "Carrier transfer release SHA");
  assertGitSha(receipt.payload.source_sha, "Carrier transfer source SHA");
  if (receipt.payload.relationship !== "source_first_parent_carrier_only") {
    fail("Carrier transfer payload relationship differs from the accepted contract.");
  }
  assertDigest(receipt.payload.manifest_sha256, "Carrier transfer manifest digest");
  assertDigest(receipt.payload.index_sha256, "Carrier transfer index digest");
  assertSafeInteger(receipt.payload.files, "Carrier transfer file count", {
    minimum: 1,
    maximum: defaultLimits.maxEntries,
  });
  assertSafeInteger(receipt.payload.bytes, "Carrier transfer byte count", {
    minimum: 1,
    maximum: defaultLimits.maxExpandedBytes,
  });
  for (const surface of ["primary", "iframe"]) {
    assertExactKeys(receipt.payload[surface], ["files", "bytes"], `Carrier transfer ${surface}`);
    assertSafeInteger(receipt.payload[surface].files, `Carrier transfer ${surface} files`, {
      minimum: 1,
      maximum: defaultLimits.maxEntries,
    });
    assertSafeInteger(receipt.payload[surface].bytes, `Carrier transfer ${surface} bytes`, {
      minimum: 1,
      maximum: defaultLimits.maxExpandedBytes,
    });
  }
  assertExactKeys(
    receipt.archive,
    ["name", "format", "root_directory", "sha256", "bytes", "expanded_bytes", "entries"],
    "Carrier transfer archive",
  );
  assertString(receipt.archive.name, "Carrier transfer archive name");
  if (path.posix.basename(receipt.archive.name) !== receipt.archive.name || !receipt.archive.name.endsWith(".zip")) {
    fail("Carrier transfer archive name must be one local ZIP filename.");
  }
  if (receipt.archive.format !== "zip") fail("Carrier transfer archive format must be zip.");
  assertPortableRelativePath(receipt.archive.root_directory, "Carrier transfer archive root");
  const expectedRoot = transferRoot(receipt.payload.production_tag);
  if (
    receipt.archive.root_directory !== expectedRoot ||
    receipt.archive.name !== `${expectedRoot}.zip`
  ) {
    fail("Carrier transfer archive name and root must derive from its production tag.");
  }
  assertDigest(receipt.archive.sha256, "Carrier transfer archive digest");
  assertSafeInteger(receipt.archive.bytes, "Carrier transfer archive bytes", {
    minimum: 1,
    maximum: defaultLimits.maxArchiveBytes,
  });
  assertSafeInteger(receipt.archive.expanded_bytes, "Carrier transfer expanded bytes", {
    minimum: 1,
    maximum: defaultLimits.maxExpandedBytes,
  });
  assertSafeInteger(receipt.archive.entries, "Carrier transfer archive entries", {
    minimum: 1,
    maximum: defaultLimits.maxEntries,
  });
  assertExactKeys(
    receipt.tool,
    ["name", "version", "revision", "sha256", "node", "zlib"],
    "Carrier transfer tool",
  );
  if (
    assertString(receipt.tool.name, "Carrier transfer tool name") !== path.posix.basename(toolPath) ||
    assertString(receipt.tool.version, "Carrier transfer tool version") !== toolVersion
  ) {
    fail("Carrier transfer tool identity differs from the v1 contract.");
  }
  assertGitSha(receipt.tool.revision, "Carrier transfer tool revision");
  assertDigest(receipt.tool.sha256, "Carrier transfer tool digest");
  assertString(receipt.tool.node, "Carrier transfer Node version");
  assertString(receipt.tool.zlib, "Carrier transfer zlib version");
  return receipt;
}

export async function createCarrierTransferEnvelope({
  repository = repositoryRoot,
  productionTag,
  createdAt = new Date().toISOString(),
} = {}) {
  const carrier = await loadTaggedProductionCarrier({ repository, productionTag });
  const rootDirectory = transferRoot(carrier.productionTag);
  const expectedFiles = expectedArchiveFiles(carrier, rootDirectory);
  const archive = createDeterministicZip(
    [...expectedFiles.entries()].map(([entryPath, bytes]) => ({
      path: entryPath,
      bytes,
      mode: 0o100644,
    })),
  );
  const inspection = inspectCarrierZip(archive, { expectedFiles, rootDirectory });
  const archiveName = `${rootDirectory}.zip`;
  const receipt = {
    id: receiptId,
    version: "1",
    created_at: new Date(createdAt).toISOString(),
    payload: {
      production_tag: carrier.productionTag,
      tag_object: carrier.tagObject,
      release_sha: carrier.releaseSha,
      source_sha: carrier.sourceSha,
      relationship: "source_first_parent_carrier_only",
      manifest_sha256: carrier.manifestDigest,
      index_sha256: carrier.indexDigest,
      files: carrier.files.size,
      bytes: carrier.totalBytes,
      primary: carrier.totals.primary,
      iframe: carrier.totals.iframe,
    },
    archive: {
      name: archiveName,
      format: "zip",
      root_directory: rootDirectory,
      sha256: inspection.archiveSha256,
      bytes: inspection.archiveBytes,
      expanded_bytes: inspection.expandedBytes,
      entries: inspection.entries,
    },
    tool: await toolIdentity(),
  };
  validateReceipt(receipt);
  return {
    carrier,
    archive,
    receipt,
    receiptBytes: serializeReceipt(receipt),
    receiptName: `${rootDirectory}.receipt.json`,
  };
}

async function assertEmptyOutputDirectory(outputDirectory) {
  await mkdir(outputDirectory, { recursive: true });
  const entries = await readdir(outputDirectory);
  if (entries.length !== 0) {
    fail(`Carrier transfer output directory must be empty: ${outputDirectory}.`);
  }
}

async function readBoundedRegularFile(filePath, label, maximumBytes) {
  const handle = await open(filePath, "r");
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.size < 1 || metadata.size > maximumBytes) {
      fail(`${label} must be one bounded regular file.`);
    }
    const bounded = Buffer.alloc(metadata.size + 1);
    let offset = 0;
    while (offset < bounded.byteLength) {
      const { bytesRead } = await handle.read(
        bounded,
        offset,
        bounded.byteLength - offset,
        offset,
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset !== metadata.size) {
      fail(`${label} changed while it was being read.`);
    }
    return bounded.subarray(0, metadata.size);
  } finally {
    await handle.close();
  }
}

export async function writeCarrierTransferEnvelope({
  repository = repositoryRoot,
  productionTag,
  outputDirectory,
  createdAt,
} = {}) {
  const destination = path.resolve(
    repository,
    outputDirectory ?? `.cpanel-transfer/${assertProductionTag(productionTag)}`,
  );
  await assertEmptyOutputDirectory(destination);
  const envelope = await createCarrierTransferEnvelope({
    repository,
    productionTag,
    createdAt,
  });
  const archivePath = path.join(destination, envelope.receipt.archive.name);
  const receiptPath = path.join(destination, envelope.receiptName);
  await writeFile(archivePath, envelope.archive, { flag: "wx", mode: 0o600 });
  await writeFile(receiptPath, envelope.receiptBytes, { flag: "wx", mode: 0o600 });
  await verifyCarrierTransferEnvelope({
    repository,
    receiptPath,
    archivePath,
    expectedProductionTag: productionTag,
  });
  return { ...envelope, archivePath, receiptPath, outputDirectory: destination };
}

export async function verifyCarrierTransferEnvelope({
  repository = repositoryRoot,
  receiptPath,
  archivePath,
  expectedProductionTag,
} = {}) {
  if (typeof receiptPath !== "string" || receiptPath.length === 0) {
    fail("Carrier transfer verification requires --receipt FILE.");
  }
  const selectedProductionTag = assertProductionTag(expectedProductionTag);
  const receiptBytes = await readBoundedRegularFile(
    receiptPath,
    "Carrier transfer receipt",
    maxReceiptBytes,
  );
  let receipt;
  try {
    receipt = JSON.parse(utf8Decoder.decode(receiptBytes));
  } catch {
    fail("Carrier transfer receipt must contain readable JSON.");
  }
  validateReceipt(receipt);
  if (receipt.payload.production_tag !== selectedProductionTag) {
    fail("Carrier transfer receipt differs from the operator-selected production tag.");
  }
  await verifyRecordedToolIdentity(receipt.tool);
  const selectedArchivePath = archivePath ?? path.join(path.dirname(receiptPath), receipt.archive.name);
  const archive = await readBoundedRegularFile(
    selectedArchivePath,
    "Carrier transfer archive",
    defaultLimits.maxArchiveBytes,
  );
  if (
    archive.byteLength !== receipt.archive.bytes ||
    sha256(archive) !== receipt.archive.sha256
  ) {
    fail("Carrier transfer archive digest or byte count differs from its receipt.");
  }
  const carrier = await loadTaggedProductionCarrier({
    repository,
    productionTag: receipt.payload.production_tag,
  });
  if (
    carrier.tagObject !== receipt.payload.tag_object ||
    carrier.releaseSha !== receipt.payload.release_sha ||
    carrier.sourceSha !== receipt.payload.source_sha ||
    carrier.manifestDigest !== receipt.payload.manifest_sha256 ||
    carrier.indexDigest !== receipt.payload.index_sha256 ||
    carrier.files.size !== receipt.payload.files ||
    carrier.totalBytes !== receipt.payload.bytes ||
    ["primary", "iframe"].some((surface) =>
      carrier.totals[surface].files !== receipt.payload[surface].files ||
      carrier.totals[surface].bytes !== receipt.payload[surface].bytes
    )
  ) {
    fail("Carrier transfer receipt differs from its immutable production tag.");
  }
  const expectedFiles = expectedArchiveFiles(carrier, receipt.archive.root_directory);
  const inspection = inspectCarrierZip(archive, {
    expectedFiles,
    rootDirectory: receipt.archive.root_directory,
  });
  if (
    inspection.entries !== receipt.archive.entries ||
    inspection.expandedBytes !== receipt.archive.expanded_bytes ||
    inspection.archiveSha256 !== receipt.archive.sha256 ||
    inspection.archiveBytes !== receipt.archive.bytes
  ) {
    fail("Carrier transfer archive inspection differs from its receipt.");
  }
  return { receipt, carrier, inspection, archivePath: selectedArchivePath };
}

function parseArguments(argv) {
  const options = { mode: null, productionTag: null, outputDirectory: null, receiptPath: null, archivePath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--build" || argument === "--verify") {
      if (options.mode !== null) fail("Choose exactly one carrier transfer mode.");
      options.mode = argument.slice(2);
      continue;
    }
    const key = {
      "--tag": "productionTag",
      "--output": "outputDirectory",
      "--receipt": "receiptPath",
      "--archive": "archivePath",
    }[argument];
    if (!key) fail(`Unknown carrier transfer argument: ${argument}.`);
    const value = argv[index + 1];
    if (!value) fail(`${argument} requires one value.`);
    options[key] = value;
    index += 1;
  }
  if (options.mode === "build" && !options.productionTag) {
    fail("Carrier transfer build requires --tag production-vMAJOR.MINOR.PATCH.");
  }
  if (options.mode === "verify" && (!options.productionTag || !options.receiptPath)) {
    fail("Carrier transfer verification requires --tag production-vMAJOR.MINOR.PATCH and --receipt FILE.");
  }
  if (options.mode === null) {
    fail("Choose --build or --verify for the carrier transfer envelope.");
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.mode === "build") {
    const result = await writeCarrierTransferEnvelope({
      productionTag: options.productionTag,
      outputDirectory: options.outputDirectory,
    });
    console.log([
      `cPanel carrier transfer built: ${result.receipt.archive.entries} files, ${result.receipt.archive.expanded_bytes} expanded bytes.`,
      `Payload: ${result.receipt.payload.production_tag} @ ${result.receipt.payload.release_sha}.`,
      `Archive: ${path.relative(repositoryRoot, result.archivePath)}.`,
      `Archive SHA-256: ${result.receipt.archive.sha256}.`,
      `Receipt: ${path.relative(repositoryRoot, result.receiptPath)}.`,
      "Host activation: none.",
    ].join("\n"));
    return;
  }
  const verification = await verifyCarrierTransferEnvelope({
    receiptPath: path.resolve(repositoryRoot, options.receiptPath),
    archivePath: options.archivePath
      ? path.resolve(repositoryRoot, options.archivePath)
      : undefined,
    expectedProductionTag: options.productionTag,
  });
  console.log([
    `cPanel carrier transfer verified: ${verification.inspection.entries} files, ${verification.inspection.expandedBytes} expanded bytes.`,
    `Payload: ${verification.receipt.payload.production_tag} @ ${verification.receipt.payload.release_sha}.`,
    `Archive SHA-256: ${verification.inspection.archiveSha256}.`,
    "Host activation: none.",
  ].join("\n"));
}

if (process.argv[1] && path.resolve(process.argv[1]) === toolPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
