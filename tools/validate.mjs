// Validate the canonical registry data against the entry schema's core invariants
// (SPEC §6.2/§6.3). Dependency-free so CI is a single `node` run.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "schema/registry-entry.schema.json"), "utf8"));

// Data lives in data/exercises.json (curated canonical) + data/seed/*.json (sourced seeds).
function dataFiles() {
  const files = ["data/exercises.json"];
  const seedDir = path.join(root, "data/seed");
  if (fs.existsSync(seedDir)) for (const f of fs.readdirSync(seedDir).sort()) if (f.endsWith(".json")) files.push(`data/seed/${f}`);
  return files;
}

const idRe = new RegExp(schema.properties.id.pattern);
const facetProps = schema.$defs.facets.properties;
const mechanicEnum = facetProps.mechanic.enum;
const lateralityEnum = facetProps.laterality.enum;
const allowedFacets = new Set(Object.keys(facetProps));

/** Validate one entry; returns an array of error strings. */
export function validateEntry(e, seenIds) {
  const errs = [];
  const where = e && e.id ? e.id : "(no id)";
  if (typeof e?.id !== "string" || !idRe.test(e.id)) errs.push(`${where}: id missing or not a canonical id`);
  else if (seenIds) {
    if (seenIds.has(e.id)) errs.push(`${where}: duplicate id`);
    seenIds.add(e.id);
  }
  if (!Array.isArray(e?.names) || e.names.length < 1 || !e.names.every((n) => typeof n === "string"))
    errs.push(`${where}: names must be a non-empty array of strings`);
  if (e?.facets !== undefined) {
    const f = e.facets;
    for (const k of Object.keys(f)) if (!allowedFacets.has(k)) errs.push(`${where}: unknown facet '${k}'`);
    if (f.mechanic !== undefined && !mechanicEnum.includes(f.mechanic)) errs.push(`${where}: mechanic '${f.mechanic}' not in ${mechanicEnum}`);
    if (f.laterality !== undefined && !lateralityEnum.includes(f.laterality)) errs.push(`${where}: laterality '${f.laterality}' invalid`);
    if (f.anatomy !== undefined && (!Array.isArray(f.anatomy.primary) || f.anatomy.primary.length < 1))
      errs.push(`${where}: facets.anatomy.primary required (non-empty array)`);
  }
  if (e?.attributes?.met !== undefined && typeof e.attributes.met !== "number") errs.push(`${where}: attributes.met must be a number`);
  if (e?.coded !== undefined) for (const [k, v] of Object.entries(e.coded))
    if (typeof v !== "string" && typeof v !== "number") errs.push(`${where}: coded.${k} must be string|number`);
  return errs;
}

function main() {
  const seen = new Set(); // global id uniqueness across all data files
  const errors = [];
  let total = 0;
  const perFile = [];
  for (const rel of dataFiles()) {
    const entries = JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
    for (const e of entries) errors.push(...validateEntry(e, seen));
    total += entries.length;
    perFile.push(`${rel} (${entries.length})`);
  }
  if (errors.length) {
    console.error(`OpenBody registry: ${errors.length} error(s) across ${total} entries:`);
    for (const e of errors.slice(0, 50)) console.error("  ✗ " + e);
    if (errors.length > 50) console.error(`  … and ${errors.length - 50} more`);
    process.exit(1);
  }
  console.log(`OpenBody registry: ${total} entries valid, ids globally unique — ${perFile.join(", ")}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
