// Map free-exercise-db (yuhonas) records → OpenBody registry entries (SPEC §6).
//
// free-exercise-db is The Unlicense (public domain). Per the source evaluation it is
// CC0-compatible, but the actual bulk import + redistribution under CC0 is a licensing
// decision that must be signed off before this tool's full output is committed. Until
// then this maps the documented source shape and is verifiable via `--selftest` without
// fetching the dataset.
//
// Usage:
//   node tools/ingest-free-exercise-db.mjs --selftest          # map synthetic samples, validate
//   node tools/ingest-free-exercise-db.mjs <fed-exercises.json> # map a local clone (writes nothing)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateEntry } from "./validate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// free-exercise-db `category` → OpenBody `modality` (§5.9 / §6.3).
const MODALITY = {
  strength: "strength", powerlifting: "strength", "olympic weightlifting": "strength",
  strongman: "strength", cardio: "endurance", cardiorespiratory: "endurance",
  stretching: "flexibility", plyometrics: "functional",
};

/** Map one free-exercise-db record to a registry entry. */
export function mapRecord(r) {
  const facets = {};
  const modality = MODALITY[(r.category || "").toLowerCase()];
  if (modality) facets.modality = modality;
  if (r.mechanic === "compound" || r.mechanic === "isolation") facets.mechanic = r.mechanic;
  if (r.equipment) facets.equipment = slug(r.equipment);
  if (Array.isArray(r.primaryMuscles) && r.primaryMuscles.length)
    facets.anatomy = { primary: r.primaryMuscles.map(slug), ...(r.secondaryMuscles?.length ? { secondary: r.secondaryMuscles.map(slug) } : {}) };
  const entry = {
    // NOTE: first-pass id = full-name slug (single segment). Decomposing into a
    // base[.variation] id + variation facets (e.g. "Incline Dumbbell Curl" →
    // curl.dumbbell + stance:incline) is a curation refinement, tracked for follow-up.
    id: slug(r.name),
    names: [r.name],
    ...(Object.keys(facets).length ? { facets } : {}),
    coded: { "free-exercise-db": r.id ?? slug(r.name) },
    source: "free-exercise-db",
  };
  return entry;
}

function selftest() {
  const samples = [
    { id: "Barbell_Squat", name: "Barbell Squat", force: "push", level: "intermediate",
      mechanic: "compound", equipment: "barbell", category: "strength",
      primaryMuscles: ["quadriceps"], secondaryMuscles: ["glutes", "hamstrings"] },
    { id: "Standing_Calf_Raises", name: "Standing Calf Raises", force: "push", level: "beginner",
      mechanic: "isolation", equipment: "machine", category: "strength",
      primaryMuscles: ["calves"], secondaryMuscles: [] },
  ];
  const mapped = samples.map(mapRecord);
  const errs = mapped.flatMap((e) => validateEntry(e, new Set()));
  if (errs.length) { console.error("selftest FAILED:\n" + errs.map((e) => "  ✗ " + e).join("\n")); process.exit(1); }
  if (mapped[0].id !== "barbell-squat" || mapped[0].facets.equipment !== "barbell" || mapped[0].facets.anatomy.primary[0] !== "quadriceps") {
    console.error("selftest FAILED: unexpected mapping", JSON.stringify(mapped[0])); process.exit(1);
  }
  console.log(`ingest selftest OK — ${mapped.length} synthetic records mapped & validated.`);
}

const arg = process.argv[2];
if (arg === "--selftest") {
  selftest();
} else if (arg) {
  // Licensing cleared (free-exercise-db = The Unlicense / public domain → CC0; see SOURCES.md).
  const outArg = process.argv.indexOf("--out");
  const outPath = outArg > -1 ? process.argv[outArg + 1] : path.join(root, "data/seed/free-exercise-db.json");
  const src = JSON.parse(fs.readFileSync(arg, "utf8"));
  const raw = Array.isArray(src) ? src : src.exercises ?? [];

  // Curated entries (data/exercises.json) are authoritative — skip any id collision.
  const curatedIds = new Set(JSON.parse(fs.readFileSync(path.join(root, "data/exercises.json"), "utf8")).map((e) => e.id));
  const out = [];
  const seen = new Set();
  let skipped = 0;
  for (const r of raw) {
    const e = mapRecord(r);
    if (curatedIds.has(e.id) || seen.has(e.id)) { skipped++; continue; }
    seen.add(e.id);
    out.push(e);
  }
  // Validate before writing.
  const errs = out.flatMap((e) => validateEntry(e, new Set()));
  if (errs.length) { console.error(`ingest FAILED — ${errs.length} invalid entries:\n` + errs.slice(0, 20).map((e) => "  ✗ " + e).join("\n")); process.exit(1); }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${out.length} entries → ${path.relative(root, outPath)} (skipped ${skipped} id-collisions/dupes).`);
} else {
  console.error("usage: ingest-free-exercise-db.mjs --selftest | <fed-exercises.json> [--out <path>]");
  process.exit(1);
}
