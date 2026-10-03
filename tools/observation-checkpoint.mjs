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
