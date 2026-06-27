# openbody-registry

The **canonical exercise registry** for the [OpenBody](https://github.com/openbody/openbody)
standard — the interop anchor that resolves an `ExerciseRef` (SPEC §6) to a stable base
movement plus structured facets. A separate, independently-versioned, fetchable artifact,
**decoupled from the spec** (the spec defines the *mechanism*; this ships *content* on its
own semver cadence, §6.2). **Data is CC0.**

## What's here

The registry is **hand-curated** for quality and stable identity; third-party datasets are
used **only as crosswalk sources**, never imported as canonical entries. See
[CONTRIBUTING.md](./CONTRIBUTING.md) for the method.

| Path | What |
|---|---|
| `schema/registry-entry.schema.json` | JSON Schema for one registry entry (id + names + facets + attributes + coded, §6.2/§6.3). |
| `schema/vocab-file.schema.json` | JSON Schema for one controlled-vocabulary file (open token set, §5.9). |
| `data/exercises.json` | **The canonical entries** — hand-curated, CC0, authoritative. The registry. |
| `vocab/*.json` | **The controlled vocabularies** — recommended-canon tokens for the model's open, registry-backed fields (§5.9): `disciplines`, `block-scoring-scheme`, `block-grouping`, `set-role`, `load-basis`, `modifier-type`, `effort-method`, `threshold-kind`, `stop-condition-kind`, `progression-rule`, `participant-role`, `status-period-type`, `modality`, `movement-pattern`, `range-of-motion`, `phase-qualifier`. See `vocab/index.json`. |
| `crosswalk/free-exercise-db.json` | Crosswalk **only**: free-exercise-db movement id → canonical id (or `null`). Resolution table + curation worklist. See SOURCES.md. |
| `tools/validate.mjs` | Dependency-free validator: entry id format + uniqueness + facet conformance + crosswalk integrity + vocabulary token format/uniqueness. `npm run check`. |
| `tools/build-crosswalk.mjs` | Rebuild a crosswalk table from a local source dump (preserving fills). `npm run crosswalk -- <dump.json>`. |

## Controlled vocabularies (§5.9)

Pillar B has many **open, registry-backed token fields** — `Session.disciplines`,
`Block.scoring.scheme`, `Block.grouping`, `WorkUnit.setRole`, `Load.basis`,
`modifiers[].type`, `EffortLoad.method`, and the facet tokens, among others. The **spec
defines the mechanism** (recommended-canon token → namespaced fallback → lossless opaque
round-trip); this registry **ships the content** in `vocab/`, on its own cadence. These
files **never close a set** — an unknown token MUST still round-trip (§3.3). They exist so
independent implementers converge on the *same* token for the *same* concept (so a
rest-pause, an AMRAP, or a %1RM target encodes identically everywhere), not to constrain.

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

Pre-v1 (ids **not** stable until v1.0). Hand-curation is deliberate and ongoing: the
canonical set starts small and grows by reviewed addition (see CONTRIBUTING.md). The
free-exercise-db crosswalk (873 movements, 6 mapped so far) is the worklist. Model, schema,
validator, crosswalk, and CI are in place and green.
