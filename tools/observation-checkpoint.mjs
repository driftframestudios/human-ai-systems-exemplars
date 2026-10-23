import './node-runtime-admission.mjs';
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const digest = (value) => createHash("sha256").update(value).digest("hex");

export async function atomicJson(filename, value) {
  const temporary = filename + "." + randomUUID() + ".tmp";
  try {
    await fs.writeFile(temporary, JSON.stringify(value) + "\n", { flag: "wx", flush: true });
    await fs.rename(temporary, filename);
  } finally { await fs.rm(temporary, { force: true }); }
}

export async function publishObservation(store, record, finishArtifacts) {
  await finishArtifacts();
  await store.write(record.id, record.signature, record.dependencies, record.result);
}


/** Attempt every owned release in order; callers keep primary and cleanup failures distinct. */
export async function collectCleanupErrors(releases) {
  const errors = [];
  for (const release of releases) {
    try { await release(); } catch (error) { errors.push(error); }
  }
  return errors;
}

/** The exclusive open is the ownership boundary; a rejected open owns no cleanup. */
export async function withCheckpointLock(filename, metadata, operation) {
  const handle = await fs.open(filename, "wx");
  let result, failure, failed = false;
  try {
    await handle.writeFile(JSON.stringify(metadata) + "\n");
    result = await operation();
  } catch (error) {
    failed = true;
    failure = error;
  }
  const cleanupErrors = await collectCleanupErrors([
    () => handle.close(),
    () => fs.rm(filename),
  ]);
  if (cleanupErrors.length) {
    throw new AggregateError(failed ? [failure, ...cleanupErrors] : cleanupErrors,
      "Campaign lock cleanup failed.", failed ? { cause: failure } : {});
  }
  if (failed) throw failure;
  return result;
}

/** Local case checkpoints: atomic publication, exact inputs, explicit re-entry. */
export async function openCheckpoints(directory) {
  await fs.mkdir(directory, { recursive: true });
  const filename = (id) => path.join(directory, digest(id) + ".json");
  const readRecord = async (id, signature, dependenciesAgree) => {
      let record;
      try { record = JSON.parse(await fs.readFile(filename(id), "utf8")); }
      catch (error) {
        if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
        throw error;
      }
      if (!record || record.version !== 2 || record.id !== id || record.signature !== signature
          || !record.dependencies || typeof record.dependencies !== "object" || Array.isArray(record.dependencies)
          || !["pass", "review"].includes(record.result?.standing)
          || !await dependenciesAgree(record.dependencies)) return null;
      return record;
  };
  return {
    readRecord,
    async read(id, signature, dependenciesAgree) {
      return (await readRecord(id, signature, dependenciesAgree))?.result ?? null;
    },
    async write(id, signature, dependencies, result) {
      await atomicJson(filename(id), { version: 2, id, signature, dependencies, result });
    },
  };
}
