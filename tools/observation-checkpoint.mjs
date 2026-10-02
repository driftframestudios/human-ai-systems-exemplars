import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const digest = (value) => createHash("sha256").update(value).digest("hex");

export async function publishObservation(store, record, finishArtifacts) {
  await finishArtifacts();
  await store.write(record.id, record.signature, record.dependencies, record.result);
}

/** Local case checkpoints: atomic publication, exact inputs, explicit re-entry. */
export async function openCheckpoints(directory) {
  await fs.mkdir(directory, { recursive: true });
  const filename = (id) => path.join(directory, digest(id) + ".json");
  return {
    async read(id, signature, dependenciesAgree) {
      let record;
      try { record = JSON.parse(await fs.readFile(filename(id), "utf8")); }
      catch (error) {
        if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
        throw error;
      }
      if (record.version !== 1 || record.id !== id || record.signature !== signature
          || !["pass", "review"].includes(record.result?.standing)
          || !await dependenciesAgree(record.dependencies)) return null;
      return record.result;
    },
    async write(id, signature, dependencies, result) {
      const temporary = filename(id) + "." + randomUUID() + ".tmp";
      try {
        await fs.writeFile(temporary, JSON.stringify({ version: 1, id, signature, dependencies, result }) + "\n", { flag: "wx", flush: true });
        await fs.rename(temporary, filename(id));
      } finally { await fs.rm(temporary, { force: true }); }
    },
  };
}
