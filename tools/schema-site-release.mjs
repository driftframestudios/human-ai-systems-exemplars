import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
export function pagesReleaseTag(value) {
  if (typeof value !== "string" || !/^pages-v(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u.test(value)) {
    throw new Error("Use an exact site release tag such as pages-v0.1.0");
  }
  return value;
}

export async function verifyPagesReleaseTag({ root, releaseTag, sourceRevision, projectionRevision, closureDigest }) {
  const ref = `refs/tags/${pagesReleaseTag(releaseTag)}`;
  const git = async (...args) => (await run("git", args, { cwd: root, encoding: "utf8" })).stdout.trim();
  if (await git("cat-file", "-t", ref) !== "tag") throw new Error("The site release requires an annotated tag");
  if (await git("rev-parse", `${ref}^{commit}`) !== projectionRevision) throw new Error("The site tag must identify the exact reviewed projection");
  const note = await git("for-each-ref", "--format=%(contents)", ref);
  for (const line of [`Source-Revision: ${sourceRevision}`, `Closure-SHA256: ${closureDigest}`]) {
    if (!note.split("\n").includes(line)) throw new Error(`The site tag must bind ${line.split(":")[0]}`);
  }
}
