import './node-runtime-admission.mjs';
import { lstat, readdir, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

const publicMaterialFindings = Object.freeze([
  { pattern: /https?:\/\/[^\s)]*notion\.(?:so|site)/iu, label: "a direct Notion route" },
  { pattern: /::fragments/iu, label: "an internal fragments marker" },
  { pattern: /~loamthreads?/iu, label: "an internal loamthreads marker" },
  { pattern: /^::[a-z0-9_-]+::/imu, label: "an internal house-annotation marker" },
  { pattern: /\bInternal\s+[—–:-]\s*/u, label: "an internal-only title marker" },
  { pattern: /\/Users\/[^/\s]+/u, label: "a user-specific filesystem path" },
  { pattern: /@driftframe\//iu, label: "an internal house locator" },
  { pattern: /source_band:\s*public_possible/iu, label: "a public-possible source band" },
  {
    pattern: /https?:\/\/github\.com\/driftframestudios\/[^/\s]+\/(?:issues|pull)\/\d+/iu,
    label: "a gated repository Issue or pull-request route",
  },
]);

function boundaryRequirement(condition, message) {
  if (!condition) throw new Error(`Publication boundary: ${message}`);
}

function staysWithin(root, candidate) {
  const remainder = relative(root, candidate);
  return remainder === "" || (
    !remainder.startsWith(`..${sep}`) &&
    remainder !== ".." &&
    !isAbsolute(remainder)
  );
}

export async function resolvePublicationFile(repositoryRoot, relativePath) {
  boundaryRequirement(
    typeof relativePath === "string" && relativePath.length > 0,
    "publication paths must be non-empty strings",
  );
  boundaryRequirement(!relativePath.includes("\\"), `${relativePath} must use forward slashes`);
  boundaryRequirement(!relativePath.startsWith("/"), `${relativePath} must remain repository-relative`);
  boundaryRequirement(
    !relativePath.split("/").includes(".."),
    `${relativePath} must remain inside the repository`,
  );

  const lexicalRoot = resolve(repositoryRoot);
  const lexicalPath = resolve(lexicalRoot, relativePath);
  boundaryRequirement(
    staysWithin(lexicalRoot, lexicalPath),
    `${relativePath} must remain inside the repository`,
  );

  let cursor = lexicalRoot;
  for (const part of relativePath.split("/")) {
    cursor = resolve(cursor, part);
    const entry = await lstat(cursor);
    boundaryRequirement(
      !entry.isSymbolicLink(),
      `${relativePath} must be source-owned rather than traverse a symbolic link`,
    );
  }

  const [physicalRoot, physicalPath] = await Promise.all([
    realpath(lexicalRoot),
    realpath(lexicalPath),
  ]);
  boundaryRequirement(
    staysWithin(physicalRoot, physicalPath),
    `${relativePath} must remain physically inside the repository`,
  );

  const file = await lstat(lexicalPath);
  boundaryRequirement(file.isFile(), `${relativePath} must be a regular file`);
  return lexicalPath;
}

export function assertPublicMaterial(source, sourcePath = "public material") {
  const text = Buffer.isBuffer(source) ? source.toString("utf8") : String(source);
  for (const finding of publicMaterialFindings) {
    boundaryRequirement(
      !finding.pattern.test(text),
      `${sourcePath} contains ${finding.label} and needs a source-owned public adaptation`,
    );
  }
}

export function assertTermsAbsent(source, terms, sourcePath = "public material") {
  const text = (Buffer.isBuffer(source) ? source.toString("utf8") : String(source))
    .toLocaleLowerCase("en-US");
  for (const term of terms) {
    boundaryRequirement(
      !text.includes(term.toLocaleLowerCase("en-US")),
      `${sourcePath} names material outside the public-ready selection`,
    );
  }
}

export function serializeJsonForHtmlScript(value, space = 2) {
  return JSON.stringify(value, null, space)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export async function assertExactFileInventory(root, expectedRelativePaths) {
  const expected = [...new Set(expectedRelativePaths)].sort();
  boundaryRequirement(
    expected.length === expectedRelativePaths.length,
    "the expected artifact inventory must not contain duplicate paths",
  );

  const actual = [];
  async function visit(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      boundaryRequirement(
        !entry.isSymbolicLink(),
        `${relativePath} must be an owned artifact entry rather than a symbolic link`,
      );
      if (entry.isDirectory()) {
        await visit(resolve(directory, entry.name), relativePath);
      } else {
        boundaryRequirement(entry.isFile(), `${relativePath} must be a regular artifact file`);
        actual.push(relativePath);
      }
    }
  }
  await visit(resolve(root));
  actual.sort();
  boundaryRequirement(
    JSON.stringify(actual) === JSON.stringify(expected),
    `artifact inventory differs; expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
  );
  return actual;
}
