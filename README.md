# openbody-registry

The canonical registries for the [OpenBody](https://github.com/openbody/openbody)
standard. This repo hosts **both** registries the spec defines:

- the **exercise registry** (SPEC §6) — the interop anchor that resolves an `ExerciseRef`
  to a stable base movement plus structured facets, and
- the **measurement-type registry** (SPEC §4.5) — the canonical `Measurement.type` tokens
  and the `location` sampleArray channel-naming convention (under `vocab/measurements/`).

Each is a separate, independently-versioned, fetchable artifact **decoupled from the spec**
(the spec defines the *mechanism*; this repo ships *content* on its own semver cadence,
§6.2). **Data is CC0.**

> The measurement-type registry was folded in from the `openbody-measurements` repo on
> 2026-07-03: at ~27 tokens it did not justify a separate repo's overhead (own schema,
> validator, CI, contributor docs). It may be re-split later if its content or contributor
> pool grows to justify it.

## What's here

| Path | What |
|---|---|
| `schema/registry-entry.schema.json` | JSON Schema for one exercise-registry entry (id + names + facets + attributes + coded, §6.2/§6.3). |
| `schema/vocab-file.schema.json` | JSON Schema for one controlled-vocabulary file (open token set, §5.9) — shared by the training and measurement vocabularies. |
| `data/exercises.json` | **The canonical exercise entries** — curated, CC0, authoritative. See *Provenance* below for what "curated" means per entry. |
| `vocab/*.json` | **The training controlled vocabularies** — recommended-canon tokens for the model's open, registry-backed fields (§5.9): `disciplines`, `block-scoring-scheme`, `block-grouping`, `set-role`, `load-basis`, `modifier-type`, `effort-method`, `threshold-kind`, `stop-condition-kind`, `progression-rule`, `participant-role`, `status-period-type`, `modality`, `movement-pattern`, `range-of-motion`, `phase-qualifier`, and more. See `vocab/index.json`. |
| `vocab/measurements/*.json` | **The measurement-type registry** (§4.5): `cardiovascular`, `respiratory`, `sleep`, `body-composition`, `activity`, `power-pace` (all `Measurement.type` subsets) and `location-channel` (`sampleArray.channels[].name` for `type: "location"`). Also indexed in `vocab/index.json`. |
| `crosswalk/free-exercise-db.json` | Crosswalk: free-exercise-db movement id → canonical id (or `null`). Resolution table + curation worklist. See SOURCES.md. |
| `tools/validate.mjs` | Validator: each canonical entry against `schema/registry-entry.schema.json` (ajv) + id uniqueness + crosswalk integrity + vocabulary token format/uniqueness (incl. cross-file uniqueness for the `Measurement.*` vocabularies). `npm run check`. |
| `tools/build-crosswalk.mjs` | Rebuild a crosswalk table from a local source dump (preserving fills). `npm run crosswalk -- <dump.json>`. |

## Provenance & the `source` field

Every exercise entry carries a `source` recording where its data came from (full detail in
[SOURCES.md](./SOURCES.md)):

- **`curated`** — fully hand-authored, no third-party seed.
- **`compendium`** — the entry's `attributes.met` comes from the Compendium of Physical
  Activities (facts; edition cited per PR).
- **`free-exercise-db`** — the entry's existence, coverage, and typically its display
  name(s) derive from a row of the public-domain
  [free-exercise-db](https://github.com/yuhonas/free-exercise-db) worklist (Unlicense;
  upstream commit pinned in SOURCES.md). The **id and facet classification were authored to
  OpenBody conventions** (§6.2/§6.3) against this registry's own vocabularies, with a
  per-entry review — upstream categories and muscle lists were consulted as reference, but
  the facets were re-derived at finer granularity and frequently disagree with upstream.
  Upstream instructions and images are not used at all.

To be precise about what was and wasn't done: an early pass that **bulk-imported**
free-exercise-db verbatim (with algorithmic id decomposition) was **reverted** (2026-06-26).
What replaced it (OB-24) is a **curated derivation**: the crosswalk worklist drove which
movements to cover, and each entry was individually authored and reviewed to the method in
[CONTRIBUTING.md](./CONTRIBUTING.md). The result: 657 of 740 entries are
`source: "free-exercise-db"` — worklist-seeded, OpenBody-classified — alongside 73
`curated` and 10 `compendium` entries. Display names on seeded entries are usually carried
verbatim from upstream (they're the common names, and upstream is public domain); ids and
facets are not.

## Controlled vocabularies (§5.9, §4.5)

Pillar B has many **open, registry-backed token fields** — `Session.disciplines`,
`Block.scoring.scheme`, `Block.grouping`, `WorkUnit.setRole`, `Load.basis`,
`modifiers[].type`, `EffortLoad.method`, and the facet tokens, among others. Pillar A's
`Measurement.type` uses the same mechanism (§4.4/§4.5): registered canonical token →
namespaced source token (`apple:…`, `garmin:…`) → lossless opaque round-trip. The **spec
defines the mechanism**; this registry **ships the content** in `vocab/`, on its own
cadence. These files **never close a set** — an unknown token MUST still round-trip (§3.3,
§4.4). They exist so independent implementers converge on the *same* token for the *same*
concept (so a rest-pause, an AMRAP, a %1RM target, or a resting heart rate encodes
identically everywhere), not to constrain.

The measurement-type vocabularies are a narrow, hand-curated **high-frequency wedge** — the
types every mainstream health/fitness platform already exposes (Apple Health, Garmin,
Google Health Connect, Whoop, Oura, Strava) — not an exhaustive clinical taxonomy.

## Entry model (§6.3)

A representative entry, verbatim from `data/exercises.json`:

```json
{
  "id": "deadlift.barbell.romanian.deficit",
  "names": ["Romanian Deadlift from Deficit"],
  "facets": {
    "modality": "strength",
    "movementPattern": "hinge",
    "anatomy": { "primary": ["hamstrings", "glutes"], "secondary": ["spinal-erectors"] },
    "mechanic": "compound",
    "equipment": "barbell",
    "rangeOfMotion": "extended"
  },
  "source": "free-exercise-db"
}
```

`id` is canonical, unprefixed, dot-segmented (`base[.variation…]`); `names[0]` is the
preferred label; `facets` carry classification (intrinsic) + variation (distinguishing).
Optional fields, present where the data supports them:

- `attributes` — registry attributes that are **not** identity, e.g. Compendium MET
  (`{ "met": 6.0 }`); currently on 68 entries.
- `coded` — advisory identity-equivalence crosswalk to incumbent systems (§6.4), e.g.
  `{ "wger": 73 }`. **Sparsely populated**: 5 of 740 entries today; systematic population
  is tracked as OB-69. Don't rely on it for coverage yet — for bulk source mappings use
  `crosswalk/`.
- `progressions` / `regressions` / `variations` — relationships to other entries.
- `source` — provenance (see above).

Ids follow `^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$` (§6.2). Consumers
**MUST NOT** infer semantics from segment structure — the registry, not the string, is
authoritative.

## Status

Pre-v1 (ids and tokens **not** stable until v1.0). The exercise registry holds 740
canonical entries; the free-exercise-db crosswalk (873 movements) is 799 mapped, the
remainder being out-of-scope or pending review. The measurement-type registry is the v1
wedge (27 tokens across 7 vocabularies), started 2026-07-02 (OB-13) and folded in here
2026-07-03 (OB-66). Growth is by reviewed addition (see CONTRIBUTING.md). Model, schema,
validator, crosswalk, and CI are in place.
