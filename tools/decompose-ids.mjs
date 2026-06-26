// Decompose imported free-exercise-db slug ids into canonical base[.variation] ids
// + variation facets (SPEC §6.3). Deterministic: uses the source equipment facet and a
// curated qualifier lexicon. Rewrites data/seed/free-exercise-db.json in place.
//
// This is the move from flat name-slugs (`incline-dumbbell-bench-press`) toward the
// canonical shape (`bench-press.dumbbell.incline` + facets). Algorithmic first pass —
// review before treating ids as v1.0-stable (OB-24).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = path.join(root, "data/seed/free-exercise-db.json");
const entries = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const curatedIds = new Set(JSON.parse(fs.readFileSync(path.join(root, "data/exercises.json"), "utf8")).map((e) => e.id));

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// equipment facet slug → { seg: id segment (null = none), strip: phrases to remove from the name }
const EQUIP = {
  barbell: { seg: "barbell", strip: ["barbell"] },
  dumbbell: { seg: "dumbbell", strip: ["dumbbell", "dumbbells"] },
  cable: { seg: "cable", strip: ["cable", "cables"] },
  machine: { seg: "machine", strip: ["machine"] },
  kettlebells: { seg: "kettlebell", strip: ["kettlebells", "kettlebell"] },
  bands: { seg: "band", strip: ["bands", "band"] },
  "medicine-ball": { seg: "medicine-ball", strip: ["medicine ball"] },
  "exercise-ball": { seg: "exercise-ball", strip: ["exercise ball", "stability ball"] },
  "e-z-curl-bar": { seg: "ez-bar", strip: ["e-z curl bar", "ez curl bar", "e-z bar"] },
  "foam-roll": { seg: "foam-roll", strip: ["foam roller", "foam roll"] },
  "body-only": { seg: null, strip: ["body only"] },
  other: { seg: null, strip: [] },
};
// qualifier phrase → [facetKey, value] (longest phrases first within each group)
const STANCE = [["bent over", "bent-over"], ["bent-over", "bent-over"], ["incline", "incline"], ["decline", "decline"], ["seated", "seated"], ["standing", "standing"], ["kneeling", "kneeling"], ["lying", "lying"]];
const GRIP = [["close-grip", "close"], ["close grip", "close"], ["wide-grip", "wide"], ["wide grip", "wide"], ["reverse grip", "reverse"], ["reverse-grip", "reverse"], ["neutral grip", "neutral"], ["neutral-grip", "neutral"]];
const LAT = [["alternating", "alternating"], ["alternate", "alternating"]];

function firstMatch(lower, lex) {
  for (const [phrase, val] of lex) if (lower.includes(phrase)) return { phrase, val };
  return null;
}

let dropped = 0, collisions = 0, changed = 0;
const used = new Set();
const out = [];
for (const e of entries) {
  let lower = " " + e.names[0].toLowerCase() + " ";
  const facets = { ...(e.facets ?? {}) };
  const strip = [];

  const eq = EQUIP[facets.equipment] ?? { seg: null, strip: [] };
  for (const w of eq.strip) strip.push(w);

  const stance = firstMatch(lower, STANCE); if (stance) { facets.stance = stance.val; strip.push(stance.phrase); }
  const grip = firstMatch(lower, GRIP); if (grip) { facets.grip = grip.val; strip.push(grip.phrase); }
  const lat = firstMatch(lower, LAT); if (lat) { facets.laterality = lat.val; strip.push(lat.phrase); }

  for (const w of strip) lower = lower.split(w).join(" ");
  let base = slug(lower);
  if (!base) base = slug(e.names[0]); // fallback: never empty

  const segs = [base, eq.seg, stance?.val, grip?.val].filter(Boolean);
  let id = segs.join(".");

  if (curatedIds.has(id)) { dropped++; continue; } // curated canonical wins
  if (used.has(id)) {
    // disambiguate with laterality, then a numeric segment; log it.
    const alt = lat ? `${id}.${lat.val}` : id;
    let cand = alt, n = 1;
    while (used.has(cand) || curatedIds.has(cand)) cand = `${alt}.${++n}`;
    id = cand; collisions++;
  }
  used.add(id);
  if (id !== e.id) changed++;
  out.push({ ...e, id, facets });
}

fs.writeFileSync(seedPath, JSON.stringify(out, null, 2) + "\n");
console.log(`Decomposed ${out.length} entries: ${changed} ids changed, ${dropped} dropped (collide with curated), ${collisions} disambiguated.`);
