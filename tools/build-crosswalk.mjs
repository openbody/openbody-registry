// Build/refresh the free-exercise-db → OpenBody crosswalk table (§6.4).
//
// MODEL: the canonical registry (data/exercises.json) is HAND-CURATED. free-exercise-db
// (The Unlicense / public domain) is used as a *crosswalk source only* — this table maps
// each free-exercise-db movement id to a canonical OpenBody id (or null = not yet curated).
// It is (1) the resolution table for FED-sourced refs and (2) the curation worklist.
//
// This generator preserves existing `canonical` fills AND the pinned upstream `commit`, and
// only adds new FED rows / refreshes names, so maintainers edit the table freely. Run with a
// local FED dump (not committed); pass the upstream commit you dumped from to re-pin it:
//   node tools/build-crosswalk.mjs path/to/free-exercise-db/dist/exercises.json [upstream-commit-sha]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "crosswalk/free-exercise-db.json");

// Bootstrap mappings (honest exact/near-exact matches to the current curated set).
// Maintainer edits in the file win over these on re-run.
const SEED = {
  Pullups: "pull-up",
  Plank: "plank",
  Running_Treadmill: "run",
  Dumbbell_Bicep_Curl: "curl.dumbbell",
  Rowing_Stationary: "row.erg",
  Standing_Military_Press: "overhead-press.barbell",
};

// Bootstrap pin: used only when the crosswalk file doesn't exist yet AND no commit arg is given.
const DEFAULT_COMMIT = "b0eed061e1c832b3ed815fbaa4b45b3cdc14df49";

const src = process.argv[2];
const commitArg = process.argv[3];
if (!src) { console.error("usage: build-crosswalk.mjs <free-exercise-db/dist/exercises.json> [upstream-commit-sha]"); process.exit(1); }
const fed = JSON.parse(fs.readFileSync(src, "utf8"));

const prevDoc = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : null;
const prev = prevDoc ? Object.fromEntries(prevDoc.mappings.map((m) => [m.id, m.canonical])) : {};

// Pin precedence: explicit CLI arg > existing pinned commit > bootstrap default.
const commit = commitArg ?? prevDoc?.commit ?? DEFAULT_COMMIT;
if (!commitArg && !prevDoc?.commit) {
  console.warn(`warning: no commit arg and no existing pin — using bootstrap default ${DEFAULT_COMMIT}; pass the upstream commit to re-pin.`);
}

const mappings = fed
  .map((e) => ({ id: e.id, name: e.name, canonical: prev[e.id] ?? SEED[e.id] ?? null }))
  .sort((a, b) => a.id.localeCompare(b.id));

const doc = {
  source: "free-exercise-db",
  upstream: "https://github.com/yuhonas/free-exercise-db",
  commit,
  license: "Unlicense (public domain)",
  note: "Crosswalk only — NOT canonical registry data. `canonical` points at a data/exercises.json id, or null if that movement is not yet hand-curated (the worklist). See CONTRIBUTING.md.",
  mappings,
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n");
const filled = mappings.filter((m) => m.canonical).length;
console.log(`crosswalk: ${mappings.length} free-exercise-db movements, ${filled} mapped to canonical (${mappings.length - filled} unmapped = worklist).`);
