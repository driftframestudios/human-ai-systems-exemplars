import { lstat, mkdir, readFile, readdir, readlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { TextDecoder } from "node:util";

const SETTLED_THREADKEEPING = [
  {
    path: "threadkeeping/context-canvas-site-reading-precipitation.md",
    family: "sr",
  },
  {
    path: "threadkeeping/genomic-viewer-repeatability-deep-research-payload.md",
    family: "gr",
  },
  {
    path: "threadkeeping/about-career-quality-treatment-comparison.md",
    family: "cq",
  },
];

const EXCLUDED_DIRECTORIES = new Set([".git", ".visual-runs", "node_modules"]);
const textDecoder = new TextDecoder("utf-8", { fatal: true });

class ReceiptInputError extends Error {}

function escapeExpression(value) {
  return value.replace(/[.*+?^(){}|[\]\\$]/g, "\\$&");
}

function createLocatorRules() {
  const firstPartyOwner = ["driftframe", "studios"].join("");
  const escapedOwner = escapeExpression(firstPartyOwner);
  const workspaceAttachmentScheme = ["file", "upload"].join("-");
  const compactCoordinate = "[0-9a-f]{32}";
  const uuidCoordinate =
    "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const notionCoordinate = "(?:" + compactCoordinate + "|" + uuidCoordinate + ")";
  const notionTail = "(?:[/?#][^\\s<>\"']*)?";

  return [
    {
      id: "notion_routes",
      label: "exact Notion page coordinates",
      expressions: () => [
        new RegExp(
          "https?:\\/\\/app\\.notion\\.com\\/p\\/" +
            notionCoordinate +
            notionTail,
          "giu",
        ),
        new RegExp(
          "https?:\\/\\/(?:(?:www\\.)?notion\\.so|[a-z0-9-]+\\.notion\\.site)\\/" +
            "[^\\s<>\"']*?" +
            notionCoordinate +
            notionTail,
          "giu",
        ),
      ],
      identity: (value) => {
        const coordinates = rawCoordinateMatches(value);
        return coordinates.at(-1)?.replaceAll("-", "").toLowerCase() ?? value;
      },
    },
    {
      id: "workspace_attachment_routes",
      label: "workspace attachment routes",
      expressions: () => [
        new RegExp(
          escapeExpression(workspaceAttachmentScheme) + ":\\/\\/\\S+",
          "giu",
        ),
      ],
    },
    {
      id: "first_party_github_routes",
      label: "first-party repository routes",
      expressions: () => [
        new RegExp(
          "https?:\\/\\/(?:www\\.)?github\\.com\\/" + escapedOwner + "(?:\\/\\S*)?",
          "giu",
        ),
      ],
    },
    {
      id: "first_party_raw_routes",
      label: "first-party raw-content routes",
      expressions: () => [
        new RegExp(
          "https?:\\/\\/raw\\.githubusercontent\\.com\\/" + escapedOwner + "(?:\\/\\S*)?",
          "giu",
        ),
      ],
    },
    {
      id: "first_party_repository_coordinates",
      label: "first-party owner and repository coordinates",
      expressions: () => [
        new RegExp("\\b" + escapedOwner + "\\/[A-Za-z0-9._-]+\\b", "giu"),
      ],
    },
    {
      id: "absolute_workstation_paths",
      label: "absolute workstation paths",
      expressions: () => [
        /\/(?:Users|home)\/[^/\s<>"']+(?:\/[^\s<>"']*)?/gu,
        /\b[A-Za-z]:\\Users\\[^\\\s<>"']+(?:\\[^\s<>"']*)?/gu,
      ],
    },
  ];
}

const LOCATOR_RULES = createLocatorRules();

function trimLocator(value) {
  let trimmed = value;
  const markupBoundary = trimmed.search(/[<>"']/u);
  if (markupBoundary >= 0) {
    trimmed = trimmed.slice(0, markupBoundary);
  }

  while (trimmed.length > 0 && /[)\]}.,;:!?]/u.test(trimmed.at(-1))) {
    trimmed = trimmed.slice(0, -1);
  }

  return trimmed;
}

function matchesForRule(text, rule) {
  const matches = [];

  for (const expression of rule.expressions()) {
    for (const match of text.matchAll(expression)) {
      const value = trimLocator(match[0]);
      if (value.length > 0) {
        matches.push(value);
      }
    }
  }

  return matches;
}

function rawCoordinateMatches(text) {
  const values = [];
  const expressions = [
    /(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f])/giu,
    /(?<![0-9a-f])[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![0-9a-f])/giu,
  ];

  for (const expression of expressions) {
    for (const match of text.matchAll(expression)) {
      values.push(match[0]);
    }
  }

  return values;
}

function pathCarriesLocator(relativePath) {
  if (rawCoordinateMatches(relativePath).length > 0) {
    return true;
  }

  return LOCATOR_RULES.some(
    (rule) => matchesForRule(relativePath, rule).length > 0,
  );
}

function safePathReceipt(paths) {
  const safePaths = [];
  let withheldPathCount = 0;

  for (const relativePath of [...paths].sort()) {
    if (pathCarriesLocator(relativePath)) {
      withheldPathCount += 1;
    } else {
      safePaths.push(relativePath);
    }
  }

  return {
    affected_paths: safePaths,
    locator_shaped_path_count: withheldPathCount,
  };
}

function newRuleState() {
  return {
    occurrences: 0,
    identities: new Set(),
    files: new Set(),
    tuplesByPath: new Map(),
  };
}

async function listTextFiles(root) {
  const files = [];

  async function visit(directory, relativeDirectory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (entry.name === ".git") {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.posix.join(
        relativeDirectory,
        entry.name.replaceAll(path.sep, "/"),
      );

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
          await visit(absolutePath, relativePath);
        }
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        files.push({ absolutePath, relativePath });
      }
    }
  }

  await visit(root, "");
  return files;
}

async function readTextEntry(file) {
  const status = await lstat(file.absolutePath);
  let bytes;

  if (status.isSymbolicLink()) {
    bytes = Buffer.from(await readlink(file.absolutePath), "utf8");
  } else {
    bytes = await readFile(file.absolutePath);
  }

  if (bytes.includes(0)) {
    return null;
  }

  try {
    return textDecoder.decode(bytes);
  } catch {
    return null;
  }
}

async function scanTree(root) {
  const rules = Object.fromEntries(
    LOCATOR_RULES.map((rule) => [rule.id, newRuleState()]),
  );

  for (const file of await listTextFiles(root)) {
    const text = await readTextEntry(file);
    if (text === null) {
      continue;
    }

    for (const rule of LOCATOR_RULES) {
      const values = matchesForRule(text, rule);
      if (values.length === 0) {
        continue;
      }

      const state = rules[rule.id];
      state.occurrences += values.length;
      state.files.add(file.relativePath);

      let valuesForPath = state.tuplesByPath.get(file.relativePath);
      if (!valuesForPath) {
        valuesForPath = new Map();
        state.tuplesByPath.set(file.relativePath, valuesForPath);
      }

      for (const value of values) {
        state.identities.add(rule.identity ? rule.identity(value) : value);
        valuesForPath.set(value, (valuesForPath.get(value) ?? 0) + 1);
      }
    }
  }

  return { rules };
}

function publicRuleCounts(state) {
  return {
    occurrences: state.occurrences,
    identities: state.identities.size,
    files: state.files.size,
  };
}

function publicTreeCounts(tree) {
  return Object.fromEntries(
    LOCATOR_RULES.map((rule) => [
      rule.id,
      publicRuleCounts(tree.rules[rule.id]),
    ]),
  );
}

function compareCounts(baseline, candidate) {
  return Object.fromEntries(
    LOCATOR_RULES.map((rule) => {
      const base = publicRuleCounts(baseline.rules[rule.id]);
      const next = publicRuleCounts(candidate.rules[rule.id]);
      return [
        rule.id,
        {
          occurrences: next.occurrences - base.occurrences,
          identities: next.identities - base.identities,
          files: next.files - base.files,
        },
      ];
    }),
  );
}

function additionsAgainst(baseline, candidate) {
  return Object.fromEntries(
    LOCATOR_RULES.map((rule) => {
      const baseState = baseline.rules[rule.id];
      const candidateState = candidate.rules[rule.id];
      const affectedPaths = new Set();
      let occurrences = 0;

      for (const [relativePath, candidateValues] of candidateState.tuplesByPath) {
        const baselineValues = baseState.tuplesByPath.get(relativePath);

        for (const [value, candidateCount] of candidateValues) {
          const baselineCount = baselineValues?.get(value) ?? 0;
          const addedCount = Math.max(0, candidateCount - baselineCount);
          if (addedCount > 0) {
            occurrences += addedCount;
            affectedPaths.add(relativePath);
          }
        }
      }

      return [
        rule.id,
        {
          occurrences,
          ...safePathReceipt(affectedPaths),
        },
      ];
    }),
  );
}

function locatorOccurrenceCount(text) {
  return LOCATOR_RULES.reduce(
    (total, rule) => total + matchesForRule(text, rule).length,
    0,
  );
}

async function readSettledFile(root, relativePath) {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  const status = await lstat(absolutePath);
  if (!status.isFile()) {
    throw new Error("Settled Threadkeeping surface is unavailable as a file.");
  }

  const bytes = await readFile(absolutePath);
  return textDecoder.decode(bytes);
}

function inspectSettledText(text, specification) {
  const tokenExpression = /\btk-[a-z0-9]+(?:-[a-z0-9]+)*\b/giu;
  const expectedExpression = new RegExp(
    "^tk-" + escapeExpression(specification.family) + "-[0-9]{3}$",
    "iu",
  );
  const sourceKeyExpression = /source_key\s*:\s*["']([^"']+)["']/giu;
  const allTokens = [...text.matchAll(tokenExpression)].map((match) => match[0]);
  const validTokens = allTokens.filter((token) => expectedExpression.test(token));
  const invalidTokens = allTokens.filter((token) => !expectedExpression.test(token));
  const sourceKeyValues = [...text.matchAll(sourceKeyExpression)].map(
    (match) => match[1],
  );
  const invalidSourceKeys = sourceKeyValues.filter(
    (value) => !expectedExpression.test(value),
  );
  const identities = new Set(validTokens);
  const locatorOccurrences = locatorOccurrenceCount(text);
  const rawCoordinateOccurrences = rawCoordinateMatches(text).length;

  return {
    path: specification.path,
    stable_key_family: "tk-" + specification.family + "-NNN",
    key_occurrences: validTokens.length,
    key_identities: identities.size,
    key_reuses: validTokens.length - identities.size,
    invalid_key_tokens: invalidTokens.length,
    invalid_source_key_values: invalidSourceKeys.length,
    exact_locator_occurrences: locatorOccurrences,
    raw_coordinate_occurrences: rawCoordinateOccurrences,
    identities,
  };
}

async function inspectThreadkeeping(candidateRoot, baselineRoot) {
  const candidateFiles = [];
  const baselineFiles = [];
  const findings = [];

  for (const specification of SETTLED_THREADKEEPING) {
    let candidate;
    try {
      const candidateText = await readSettledFile(
        candidateRoot,
        specification.path,
      );
      candidate = inspectSettledText(candidateText, specification);
      candidateFiles.push(candidate);
    } catch {
      findings.push({
        code: "settled_surface_unavailable",
        count: 1,
        affected_paths: [specification.path],
        guidance:
          "Restore the settled Threadkeeping surface so its public-safe lineage remains available.",
      });
      continue;
    }

    if (candidate.invalid_key_tokens > 0 || candidate.invalid_source_key_values > 0) {
      findings.push({
        code: "stable_key_family_needs_alignment",
        count:
          candidate.invalid_key_tokens + candidate.invalid_source_key_values,
        affected_paths: [specification.path],
        guidance:
          "Use the file's operator-blind stable-key family and three-digit sequence.",
      });
    }

    if (
      candidate.exact_locator_occurrences > 0 ||
      candidate.raw_coordinate_occurrences > 0
    ) {
      findings.push({
        code: "settled_locator_boundary_needs_alignment",
        count:
          candidate.exact_locator_occurrences +
          candidate.raw_coordinate_occurrences,
        affected_paths: [specification.path],
        guidance:
          "Keep the public-safe source record here and pair exact lineage through the authorized resolver.",
      });
    }

    if (baselineRoot) {
      try {
        const baselineText = await readSettledFile(
          baselineRoot,
          specification.path,
        );
        const baseline = inspectSettledText(baselineText, specification);
        baselineFiles.push(baseline);

        let missingIdentityCount = 0;
        for (const identity of baseline.identities) {
          if (!candidate.identities.has(identity)) {
            missingIdentityCount += 1;
          }
        }

        candidate.baseline_key_identities = baseline.identities.size;
        candidate.preserved_baseline_key_identities =
          baseline.identities.size - missingIdentityCount;

        if (missingIdentityCount > 0) {
          findings.push({
            code: "settled_key_continuity_needs_alignment",
            count: missingIdentityCount,
            affected_paths: [specification.path],
            guidance:
              "Retain each established stable-key identity so authorized lineage and public re-entry stay paired.",
          });
        }
      } catch {
        findings.push({
          code: "baseline_settled_surface_unavailable",
          count: 1,
          affected_paths: [specification.path],
          guidance:
            "Use a baseline checkout that carries the settled Threadkeeping contract.",
        });
      }
    }
  }

  function totals(files) {
    return files.reduce(
      (result, file) => ({
        key_occurrences: result.key_occurrences + file.key_occurrences,
        key_identities: result.key_identities + file.key_identities,
        key_reuses: result.key_reuses + file.key_reuses,
        invalid_key_tokens:
          result.invalid_key_tokens +
          file.invalid_key_tokens +
          file.invalid_source_key_values,
        exact_locator_occurrences:
          result.exact_locator_occurrences + file.exact_locator_occurrences,
        raw_coordinate_occurrences:
          result.raw_coordinate_occurrences + file.raw_coordinate_occurrences,
      }),
      {
        key_occurrences: 0,
        key_identities: 0,
        key_reuses: 0,
        invalid_key_tokens: 0,
        exact_locator_occurrences: 0,
        raw_coordinate_occurrences: 0,
      },
    );
  }

  function publicFile(file) {
    const result = {
      path: file.path,
      stable_key_family: file.stable_key_family,
      key_occurrences: file.key_occurrences,
      key_identities: file.key_identities,
      key_reuses: file.key_reuses,
      invalid_key_tokens:
        file.invalid_key_tokens + file.invalid_source_key_values,
      exact_locator_occurrences: file.exact_locator_occurrences,
      raw_coordinate_occurrences: file.raw_coordinate_occurrences,
    };

    if (typeof file.baseline_key_identities === "number") {
      result.baseline_key_identities = file.baseline_key_identities;
      result.preserved_baseline_key_identities =
        file.preserved_baseline_key_identities;
    }

    return result;
  }

  return {
    receipt: {
      contract: "public-safe Threadkeeping stable-key continuity",
      candidate_totals: totals(candidateFiles),
      baseline_totals: baselineRoot ? totals(baselineFiles) : null,
      files: candidateFiles.map(publicFile),
    },
    findings,
  };
}

function parseArguments(argv) {
  const options = {
    baseline: null,
    candidate: ".",
    mode: null,
    output: "-",
    summary: null,
    baselineSha: null,
    candidateSha: null,
    candidateTree: null,
    archiveSha256: null,
    help: false,
  };

  const names = {
    "--baseline": "baseline",
    "--candidate": "candidate",
    "--mode": "mode",
    "--output": "output",
    "--summary": "summary",
    "--baseline-sha": "baselineSha",
    "--candidate-sha": "candidateSha",
    "--candidate-tree": "candidateTree",
    "--archive-sha256": "archiveSha256",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }

    const key = names[argument];
    if (!key || index + 1 >= argv.length) {
      throw new ReceiptInputError("Use a documented option with its value.");
    }

    options[key] = argv[index + 1];
    index += 1;
  }

  if (!options.mode) {
    options.mode = options.baseline ? "no-additions" : "snapshot";
  }

  if (!["snapshot", "no-additions", "strict"].includes(options.mode)) {
    throw new ReceiptInputError("Mode is snapshot, no-additions, or strict.");
  }

  if (options.mode !== "snapshot" && !options.baseline) {
    throw new ReceiptInputError("Comparison modes use a baseline directory.");
  }

  validateDigest(options.baselineSha, 40, "Baseline revision");
  validateDigest(options.candidateSha, 40, "Candidate revision");
  validateDigest(options.candidateTree, 40, "Candidate tree");
  validateDigest(options.archiveSha256, 64, "Archive digest");

  if (
    options.mode === "strict" &&
    (!options.candidateTree || !options.archiveSha256)
  ) {
    throw new ReceiptInputError(
      "Strict mode carries a candidate tree and streamed archive digest.",
    );
  }

  return options;
}

function validateDigest(value, length, label) {
  if (value && !new RegExp("^[0-9a-f]{" + length + "}$", "iu").test(value)) {
    throw new ReceiptInputError(label + " uses its full hexadecimal form.");
  }
}

function helpText() {
  return [
    "Research projection receipt",
    "",
    "Default: scan the current directory in snapshot mode and write counts-only JSON to stdout.",
    "",
    "Options:",
    "  --candidate <directory>       Candidate tree (default: current directory)",
    "  --baseline <directory>        Baseline tree; supplying it defaults to no-additions",
    "  --mode <mode>                 snapshot | no-additions | strict",
    "  --output <path|->             Counts-only JSON path (default: stdout)",
    "  --summary <path>              Optional locator-safe Markdown summary",
    "  --baseline-sha <sha>          Optional full baseline commit revision",
    "  --candidate-sha <sha>         Optional full candidate commit revision",
    "  --candidate-tree <sha>        Full candidate Git tree for strict mode",
    "  --archive-sha256 <digest>     Streamed source-archive digest for strict mode",
    "",
    "Example:",
    "  npm run check:research-projection -- --baseline ../baseline --candidate . --output /tmp/research-receipt.json",
  ].join("\n");
}

function buildModeFindings(mode, candidateTree, additions) {
  const findings = [];

  for (const rule of LOCATOR_RULES) {
    if (mode === "no-additions" && additions[rule.id].occurrences > 0) {
      findings.push({
        code: "locator_addition_needs_alignment",
        family: rule.id,
        count: additions[rule.id].occurrences,
        affected_paths: additions[rule.id].affected_paths,
        locator_shaped_path_count:
          additions[rule.id].locator_shaped_path_count,
        guidance:
          "Preserve or reduce the baseline locator tuples and carry new lineage through a public-safe receiver or stable key.",
      });
    }

    if (
      mode === "strict" &&
      candidateTree.rules[rule.id].occurrences > 0
    ) {
      const pathReceipt = safePathReceipt(candidateTree.rules[rule.id].files);
      findings.push({
        code: "strict_candidate_boundary_needs_alignment",
        family: rule.id,
        count: candidateTree.rules[rule.id].occurrences,
        ...pathReceipt,
        guidance:
          "Complete the public-possible projection with public receivers, repository-local sources, local explanations, or stable private-lineage keys.",
      });
    }
  }

  return findings;
}

function revisionReceipt(sha, tree, archiveSha256) {
  const receipt = {};
  if (sha) {
    receipt.commit_sha = sha;
  }
  if (tree) {
    receipt.tree_id = tree;
  }
  if (archiveSha256) {
    receipt.streamed_archive_sha256 = archiveSha256;
  }
  return receipt;
}

function markdownSummary(receipt) {
  const lines = [
    "# Research projection receipt",
    "",
    "- Result: " + receipt.result,
    "- Mode: " + receipt.mode,
    "",
    "## Scoped locator counts",
    "",
    "| Family | Baseline occurrences | Candidate occurrences | Delta | Added tuples |",
    "| --- | ---: | ---: | ---: | ---: |",
  ];

  for (const rule of LOCATOR_RULES) {
    const baselineCount =
      receipt.baseline?.locator_counts[rule.id].occurrences ?? 0;
    const candidateCount =
      receipt.candidate.locator_counts[rule.id].occurrences;
    const delta = receipt.deltas?.[rule.id].occurrences ?? candidateCount;
    const additionCount = receipt.additions?.[rule.id].occurrences ?? 0;
    lines.push(
      "| " +
        rule.label +
        " | " +
        baselineCount +
        " | " +
        candidateCount +
        " | " +
        delta +
        " | " +
        additionCount +
        " |",
    );
  }

  const threadkeeping = receipt.threadkeeping.candidate_totals;
  lines.push(
    "",
    "## Settled Threadkeeping",
    "",
    "- Stable-key occurrences: " + threadkeeping.key_occurrences,
    "- Stable-key identities: " + threadkeeping.key_identities,
    "- Intentional key reuses: " + threadkeeping.key_reuses,
    "- Exact locator occurrences: " + threadkeeping.exact_locator_occurrences,
    "- Raw coordinate occurrences: " + threadkeeping.raw_coordinate_occurrences,
    "",
    "## Evidence boundary",
    "",
    receipt.evidence_boundary,
  );

  if (receipt.findings.length > 0) {
    lines.push("", "## Revision route", "");
    for (const finding of receipt.findings) {
      lines.push(
        "- " +
          finding.code +
          ": " +
          finding.count +
          " observation(s). " +
          finding.guidance,
      );
    }
  } else {
    lines.push("", "## Next move", "", receipt.next_move);
  }

  return lines.join("\n") + "\n";
}

function assertLocatorSafeSerialization(serialized) {
  if (
    rawCoordinateMatches(serialized).length > 0 ||
    LOCATOR_RULES.some(
      (rule) => matchesForRule(serialized, rule).length > 0,
    )
  ) {
    throw new Error(
      "The receipt serialization carried locator-shaped content; keep only counts and safe paths.",
    );
  }
}

async function writeArtifact(target, content) {
  if (target === "-") {
    process.stdout.write(content);
    return;
  }

  await mkdir(path.dirname(path.resolve(target)), { recursive: true });
  await writeFile(target, content, "utf8");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(helpText() + "\n");
    return;
  }

  const candidateRoot = path.resolve(options.candidate);
  const baselineRoot = options.baseline
    ? path.resolve(options.baseline)
    : null;

  const candidateTree = await scanTree(candidateRoot);
  const baselineTree = baselineRoot ? await scanTree(baselineRoot) : null;
  const additions = baselineTree
    ? additionsAgainst(baselineTree, candidateTree)
    : null;
  const threadkeeping = await inspectThreadkeeping(
    candidateRoot,
    baselineRoot,
  );
  const findings = [
    ...buildModeFindings(options.mode, candidateTree, additions ?? {}),
    ...threadkeeping.findings,
  ];

  const receipt = {
    schema_version: "0.1.0",
    kind: "research_projection_receipt",
    mode: options.mode,
    result: findings.length === 0 ? "ready" : "revision_route_available",
    baseline: baselineTree
      ? {
          revision: revisionReceipt(options.baselineSha),
          locator_counts: publicTreeCounts(baselineTree),
        }
      : null,
    candidate: {
      revision: revisionReceipt(
        options.candidateSha,
        options.mode === "strict" ? options.candidateTree : null,
        options.mode === "strict" ? options.archiveSha256 : null,
      ),
      locator_counts: publicTreeCounts(candidateTree),
    },
    deltas: baselineTree
      ? compareCounts(baselineTree, candidateTree)
      : null,
    additions,
    threadkeeping: threadkeeping.receipt,
    findings,
    evidence_boundary:
      "This receipt carries aggregate counts, safe repository-relative paths, stable-key contract counts, and bounded Git evidence. Exact locator values remain inside the compared source trees and the authorized resolver.",
    next_move:
      findings.length === 0
        ? options.mode === "strict"
          ? "The candidate satisfies the strict locator boundary and carries reproducibility evidence for public-possible review."
          : options.mode === "no-additions"
            ? "The candidate preserves or reduces every scoped locator tuple relative to its baseline and keeps settled stable-key lineage intact."
            : "The candidate keeps the settled stable-key lineage contract intact; use a baseline comparison for addition-blocking evidence."
        : "Revise the affected paths toward the scoped locator boundary, then run the same receipt mode again.",
  };

  const serialized = JSON.stringify(receipt, null, 2) + "\n";
  assertLocatorSafeSerialization(serialized);
  await writeArtifact(options.output, serialized);

  if (options.summary) {
    const summary = markdownSummary(receipt);
    assertLocatorSafeSerialization(summary);
    await writeArtifact(options.summary, summary);
  }

  if (findings.length > 0) {
    process.stderr.write(
      "Research projection receipt offers a revision route for " +
        findings.length +
        " scoped observation(s).\n",
    );
    process.exitCode = 1;
  } else {
    process.stderr.write(
      "Research projection receipt ready in " + options.mode + " mode.\n",
    );
  }
}

main().catch((error) => {
  const guidance =
    error instanceof ReceiptInputError
      ? error.message
      : "Verify the comparison directories, readable source files, and output destination.";
  process.stderr.write(
    "Research projection receipt could not complete: " + guidance + "\n",
  );
  process.exitCode = 2;
});
