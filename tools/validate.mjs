// Validate the canonical exercise registry (data/exercises.json) against
// schema/registry-entry.schema.json (SPEC §6.2/§6.3) using ajv, and layer on the
// checks the schema cannot express: cross-entry id uniqueness and crosswalk
// referential integrity (every non-null crosswalk target resolves to a canonical id).
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

  // 2. Crosswalk referential integrity (every non-null `canonical` resolves to an entry).
  const xwalkDir = path.join(root, "crosswalk");
  let mapped = 0, xwalkTotal = 0;
  if (fs.existsSync(xwalkDir)) {
    for (const f of fs.readdirSync(xwalkDir).filter((f) => f.endsWith(".json"))) {
      const x = JSON.parse(fs.readFileSync(path.join(xwalkDir, f), "utf8"));
      for (const m of x.mappings ?? []) {
        xwalkTotal++;
        if (m.canonical == null) continue;
        mapped++;
        if (!seen.has(m.canonical)) errors.push(`crosswalk/${f}: '${m.id}' → unknown canonical id '${m.canonical}'`);
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
  console.log(`OpenBody registry: ${entries.length} canonical entries valid (ids unique); crosswalk ${mapped}/${xwalkTotal} mapped, all targets resolve; ${vocabFiles} vocabularies (${vocabTokens} tokens) valid, incl. measurement-type registry (${measurementTokens.size} Measurement.* tokens unique across files).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
