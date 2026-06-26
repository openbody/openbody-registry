# Contributing to the OpenBody exercise registry

The canonical registry is **hand-curated** for quality and stable identity. Third-party
datasets (e.g. free-exercise-db) are used **only as crosswalk sources** — never imported as
canonical entries. This guide is the method: follow it for every addition so the registry
stays consistent for future maintainers.

## The model

- **`data/exercises.json`** — the canonical entries. Each is a deliberate, reviewed movement
  with a stable id. This is the authority.
- **`crosswalk/<source>.json`** — a mapping `source movement id → canonical id` (or `null`).
  It is (1) the resolution table for refs that arrive named in an incumbent system and (2)
  the **curation worklist** (every `null` is a movement not yet curated). Crosswalk data is a
  table of pointers, not movement content.

## Adding a canonical entry

1. **Decide the base movement.** A canonical id is lowercase dot-segments,
   `base[.variation…]` (§6.2), each segment `[a-z0-9]+(?:-[a-z0-9]+)*`. The **base** is the
   movement pattern (`squat`, `bench-press`, `curl`); **variation** segments narrow it
   (`squat.barbell.high-bar`). Reuse an existing base where one fits; don't invent synonyms.
2. **Order variation segments** consistently: `base . equipment . position(stance/barPosition)
   . grip . laterality`. Only add a segment when it distinguishes this movement from a
   sibling that shares the base. Atomic movements stay single-segment (`plank`, `run`).
3. **Fill facets** (§6.3) — they must agree with the id:
   - *Classification* (intrinsic): `modality`, `movementPattern`, `mechanic`
     (`compound|isolation`), `anatomy.primary[]` (+ optional `secondary[]`).
   - *Variation* (distinguishing): `equipment`, `grip`, `stance`/`barPosition`,
     `laterality` (`bilateral|unilateral_left|unilateral_right|alternating`),
     `rangeOfMotion`.
4. **Attributes** (optional): `met` (Compendium MET, cite the edition in your PR).
5. **Crosswalk codes** (optional, §6.4): `coded` may carry incumbent ids
   (`{ "wger": 73 }`) for *this* entry. For bulk source mappings, prefer the crosswalk file.
6. **`source`**: provenance of the entry's data. Use `"curated"` for a fully hand-authored
   entry; `"compendium"` when the entry's `attributes.met` comes from the Compendium of
   Physical Activities; `"free-exercise-db"` if a crosswalked movement seeded the entry (its
   facets must still be hand-verified against §6.3). Facets are always hand-authored regardless
   of `source`.
7. **Validate**: `npm run check` (id format + uniqueness + facet conformance + crosswalk
   integrity). Green is required.

### Example

```json
{
  "id": "lat-pulldown.cable.wide",
  "names": ["Wide-Grip Lat Pulldown"],
  "facets": {
    "modality": "strength", "movementPattern": "vertical-pull", "mechanic": "compound",
    "anatomy": { "primary": ["lats"], "secondary": ["biceps", "rhomboids"] },
    "equipment": "cable", "grip": "wide"
  },
  "attributes": { "met": 5.0 },
  "source": "curated"
}
```

## Mapping a crosswalk source to a canonical id

1. Open `crosswalk/<source>.json`; find the source movement (each row: `id`, `name`,
   `canonical`).
2. If a suitable canonical entry exists, set `canonical` to its id. If not, **first add the
   canonical entry** (above), then map. Leave `null` if it's genuinely out of scope.
3. Many source rows MAY map to one canonical id (variants → one base). One source row maps to
   at most one canonical id (its best identity match; codes are advisory, §6.4).
4. `npm run check` verifies every non-null target resolves.

### Refreshing a source

`node tools/build-crosswalk.mjs <local-source-dump.json>` rebuilds the table, **preserving
your `canonical` fills** and adding any new source rows. Pin the upstream commit in the file
header and in `SOURCES.md`. Source dumps are **not** committed — only the crosswalk table.

## Id stability

Pre-v1.0 ids MAY change. **From v1.0 they are stable** — a published id is never repurposed.
That's the whole point of hand-curation: get the id right once. When in doubt, open an issue
before minting a new base.

## Review

Every change is reviewed for: id correctness (base + ordered variation), facet/​id agreement,
no duplicate or near-duplicate of an existing entry, and `npm run check` green.
