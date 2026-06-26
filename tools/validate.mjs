// Validate the hand-curated canonical registry (data/exercises.json) against the entry
// schema's core invariants (SPEC §6.2/§6.3), and check crosswalk referential integrity
// (every non-null crosswalk target resolves to a canonical id). Dependency-free.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "schema/registry-entry.schema.json"), "utf8"));

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

  if (errors.length) {
    console.error(`OpenBody registry: ${errors.length} error(s):`);
    for (const e of errors.slice(0, 50)) console.error("  ✗ " + e);
    if (errors.length > 50) console.error(`  … and ${errors.length - 50} more`);
    process.exit(1);
  }
  console.log(`OpenBody registry: ${entries.length} canonical entries valid (ids unique); crosswalk ${mapped}/${xwalkTotal} mapped, all targets resolve.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
