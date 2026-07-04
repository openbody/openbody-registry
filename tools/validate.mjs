// Validate the canonical exercise registry (data/exercises.json) against
// schema/registry-entry.schema.json (SPEC §6.2/§6.3) using ajv, and layer on the
// checks the schema cannot express:
//   - cross-entry id uniqueness;
//   - relationship referential integrity (every progressions/regressions/variations
//     id resolves to a known entry and no entry points at itself);
//   - display-name uniqueness (a normalized name resolves to exactly one canonical id,
//     so name-based resolution downstream is unambiguous);
//   - crosswalk integrity — a `mappings` array is present, each row has a source key
//     (`id` or `name`) unique within the file, no normalized source name resolves to two
//     canonical ids, and every non-null `canonical` target resolves to an entry.
// Also validates every controlled-vocabulary file under vocab/ (including the
// measurement-type registry, vocab/measurements/, SPEC §4.5 — folded in from
// openbody-measurements, OB-66), plus cross-file token uniqueness across the
// Measurement.* vocabularies (they are subsets of one shared value space).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020Mod from "ajv/dist/2020.js";
import addFormatsMod from "ajv-formats";
// ajv / ajv-formats are CJS; this mirrors the pattern used in openbody-ts/src/validate.ts.
const Ajv2020 = Ajv2020Mod;
const addFormats = addFormatsMod;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "schema/registry-entry.schema.json"), "utf8"));
const vocabSchema = JSON.parse(fs.readFileSync(path.join(root, "schema/vocab-file.schema.json"), "utf8"));
const vocabNameRe = new RegExp(vocabSchema.properties.vocabulary.pattern);
const tokenRe = new RegExp(vocabSchema.$defs.token.properties.token.pattern);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateAgainstSchema = ajv.compile(schema);

/** Validate one entry against the JSON Schema, plus cross-entry id uniqueness. */
export function validateEntry(e, seenIds) {
  const errs = [];
  const where = e && typeof e.id === "string" ? e.id : "(no id)";
  const ok = validateAgainstSchema(e);
  if (!ok) {
    for (const err of validateAgainstSchema.errors) {
      const at = err.instancePath ? err.instancePath : "";
      errs.push(`${where}${at}: ${err.message}${err.params ? " " + JSON.stringify(err.params) : ""}`);
    }
  }
  // Id uniqueness is inherently cross-record — ajv validates one entry at a time
  // and cannot see the rest of the array, so this stays hand-rolled.
  if (typeof e?.id === "string" && seenIds) {
    if (seenIds.has(e.id)) errs.push(`${where}: duplicate id`);
    seenIds.add(e.id);
  }
  return errs;
}

/** Validate one controlled-vocabulary file; returns an array of error strings. */
export function validateVocabFile(name, doc) {
  const errs = [];
  if (typeof doc?.vocabulary !== "string" || !vocabNameRe.test(doc.vocabulary))
    errs.push(`${name}: 'vocabulary' missing or not kebab-case`);
  if (typeof doc?.field !== "string") errs.push(`${name}: 'field' (string) required`);
  if (!Array.isArray(doc?.tokens) || doc.tokens.length < 1) {
    errs.push(`${name}: 'tokens' must be a non-empty array`);
    return errs;
  }
  const seenTokens = new Set();
  for (const t of doc.tokens) {
    const where = `${name}:${t?.token ?? "(no token)"}`;
    if (typeof t?.token !== "string" || !tokenRe.test(t.token)) errs.push(`${where}: token missing or malformed`);
    else if (seenTokens.has(t.token)) errs.push(`${where}: duplicate token`);
    else seenTokens.add(t.token);
    if (typeof t?.label !== "string" || !t.label) errs.push(`${where}: 'label' (non-empty string) required`);
  }
  return errs;
}

function main() {
  const errors = [];

  // 1. Canonical entries.
  const seen = new Set();
  const entries = JSON.parse(fs.readFileSync(path.join(root, "data/exercises.json"), "utf8"));
  for (const e of entries) errors.push(...validateEntry(e, seen));

  // 1b. Relationship referential integrity. progressions/regressions/variations name
  //     OTHER entries by id; the schema (one entry at a time) can't see the id set, so
  //     this is a second pass once every id is known. A dangling or self ref is a bug the
  //     openbody-ts resolver would trip on.
  for (const e of entries) {
    const where = typeof e?.id === "string" ? e.id : "(no id)";
    for (const rel of ["progressions", "regressions", "variations"]) {
      for (const ref of e?.[rel] ?? []) {
        if (ref === e?.id) errors.push(`${where}.${rel}: references itself`);
        else if (!seen.has(ref)) errors.push(`${where}.${rel}: unknown id '${ref}'`);
      }
    }
  }

  // 1c. Display-name uniqueness. A normalized display name (case-insensitive, punctuation
  //     and spacing collapsed) must resolve to exactly one canonical id — otherwise a
  //     consumer resolving by name can't tell which movement was meant.
  const byName = new Map();
  for (const e of entries) {
    for (const n of e?.names ?? []) {
      const key = String(n).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!key) continue;
      if (byName.has(key) && byName.get(key) !== e?.id)
        errors.push(`name "${n}" resolves to both '${byName.get(key)}' and '${e?.id}'`);
      else byName.set(key, e?.id);
    }
  }

  // 2. Crosswalk integrity. Each file maps a source movement — keyed by `id` (id-based
  //    sources like free-exercise-db) or by `name` (name-based app crosswalks) — to a
  //    canonical id (or null = worklist). The source key must be unique within the file,
  //    a normalized source name must not point at two different canonical ids, and every
  //    non-null target must resolve to an entry. All three keep name/id → canonical
  //    resolution unambiguous for consumers.
  const xwalkDir = path.join(root, "crosswalk");
  let mapped = 0, xwalkTotal = 0;
  if (fs.existsSync(xwalkDir)) {
    for (const f of fs.readdirSync(xwalkDir).filter((f) => f.endsWith(".json"))) {
      const x = JSON.parse(fs.readFileSync(path.join(xwalkDir, f), "utf8"));
      if (!Array.isArray(x.mappings)) {
        errors.push(`crosswalk/${f}: 'mappings' must be an array`);
        continue;
      }
      const seenKeys = new Set();
      const byNorm = new Map(); // normalized source name → canonical id (within this file)
      for (const m of x.mappings) {
        xwalkTotal++;
        const key = m.id ?? m.name;
        const where = `crosswalk/${f}: '${key ?? "(no id/name)"}'`;
        if (key == null) errors.push(`${where}: mapping has neither 'id' nor 'name'`);
        else if (seenKeys.has(key)) errors.push(`${where}: duplicate source key`);
        else seenKeys.add(key);
        if (typeof m.name === "string" && m.canonical != null) {
          const nk = m.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
          if (nk && byNorm.has(nk) && byNorm.get(nk) !== m.canonical)
            errors.push(`${where}: name also maps to '${byNorm.get(nk)}' (ambiguous)`);
          else if (nk) byNorm.set(nk, m.canonical);
        }
        if (m.canonical == null) continue;
        mapped++;
        if (!seen.has(m.canonical)) errors.push(`${where} → unknown canonical id '${m.canonical}'`);
      }
    }
  }

  // 3. Controlled vocabularies (vocab/**/*.json, recursive — includes the
  //    measurement-type registry under vocab/measurements/) — open token sets
  //    (§5.9 for the training vocabularies, §4.5 for the measurement types).
  const vocabDir = path.join(root, "vocab");
  let vocabFiles = 0, vocabTokens = 0;
  const measurementTokens = new Map(); // token → file, across Measurement.* vocabularies
  if (fs.existsSync(vocabDir)) {
    const files = fs
      .readdirSync(vocabDir, { recursive: true })
      .map(String)
      .filter((f) => f.endsWith(".json") && path.basename(f) !== "index.json")
      .sort();
    for (const f of files) {
      const rel = `vocab/${f.split(path.sep).join("/")}`;
      const v = JSON.parse(fs.readFileSync(path.join(vocabDir, f), "utf8"));
      const errs = validateVocabFile(rel, v);
      errors.push(...errs);
      if (!errs.length) { vocabFiles++; vocabTokens += v.tokens.length; }
      // Cross-file: no duplicate token across the Measurement.* vocabularies.
      // The measurement files (and competition-score) are domain subsets of the
      // same underlying Measurement.type value space (their `field` strings
      // intentionally differ per subset), so dedup by token across all of them —
      // a producer choosing a token shouldn't find it means two different things
      // depending on which file happened to define it first.
      if (typeof v?.field === "string" && v.field.startsWith("Measurement.")) {
        for (const t of v.tokens ?? []) {
          if (typeof t?.token !== "string") continue;
          if (measurementTokens.has(t.token))
            errors.push(`${rel}: token '${t.token}' already defined in ${measurementTokens.get(t.token)}`);
          else measurementTokens.set(t.token, rel);
        }
      }
    }
  }

  if (errors.length) {
    console.error(`OpenBody registry: ${errors.length} error(s):`);
    for (const e of errors.slice(0, 50)) console.error("  ✗ " + e);
    if (errors.length > 50) console.error(`  … and ${errors.length - 50} more`);
    process.exit(1);
  }
  console.log(`OpenBody registry: ${entries.length} canonical entries valid (ids + names unique, relationship refs resolve); crosswalk ${mapped}/${xwalkTotal} mapped, all targets resolve, no ambiguous aliases; ${vocabFiles} vocabularies (${vocabTokens} tokens) valid, incl. measurement-type registry (${measurementTokens.size} Measurement.* tokens unique across files).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
