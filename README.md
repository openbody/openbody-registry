# openbody-registry

The **canonical exercise registry** for the [OpenBody](https://github.com/openbody/openbody)
standard — the interop anchor that resolves an `ExerciseRef` (SPEC §6) to a stable base
movement plus structured facets. A separate, independently-versioned, fetchable artifact,
**decoupled from the spec** (the spec defines the *mechanism*; this ships *content* on its
own semver cadence, §6.2). **Data is CC0.**

## What's here

| Path | What |
|---|---|
| `schema/registry-entry.schema.json` | JSON Schema for one registry entry (id + names + facets + attributes + coded, §6.2/§6.3). |
| `data/exercises.json` | **Curated canonical** entries (11, CC0-original, authoritative) spanning strength / endurance / functional / mobility / flexibility. |
| `data/seed/free-exercise-db.json` | **Imported seed** — 872 entries from free-exercise-db (The Unlicense → CC0, commit `b0eed06`). Pre-v1 slug ids; see SOURCES.md. |
| `tools/validate.mjs` | Dependency-free validator: id format + uniqueness + facet conformance. `npm run check`. |
| `tools/ingest-free-exercise-db.mjs` | Maps [free-exercise-db](https://github.com/yuhonas/free-exercise-db) records → entries. `npm run ingest:selftest`. See SOURCES.md — the bulk import is gated on a licensing sign-off. |

## Entry model (§6.3)

```jsonc
{
  "id": "squat.barbell.high-bar",        // canonical, unprefixed, dot-segmented
  "names": ["High-Bar Back Squat"],      // first is preferred label
  "facets": {                            // classification (intrinsic) + variation (distinguishing)
    "modality": "strength", "movementPattern": "squat", "mechanic": "compound",
    "anatomy": { "primary": ["quadriceps", "glutes"] },
    "equipment": "barbell", "barPosition": "high-bar", "laterality": "bilateral"
  },
  "attributes": { "met": 6.0 },          // registry attribute (NOT identity), e.g. MET
  "coded": { "wger": 73 },               // advisory crosswalk to incumbents (§6.4)
  "source": "curated"
}
```

Ids follow `^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$` (§6.2). Consumers
**MUST NOT** infer semantics from segment structure — the registry, not the string, is
authoritative.

## Status

Pre-v1 (ids **not** stable until v1.0). 883 entries total — 11 curated canonical + 872
imported from free-exercise-db (see SOURCES.md). Imported ids have been **algorithmically
decomposed** to canonical `base[.variation]` + variation facets (`npm run decompose`).
Remaining before v1.0 (OB-24): human review of the decomposition; Compendium MET /
functional / mobility supplements; dedupe. Model, schema, validator, ingest, and CI green.
