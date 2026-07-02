# Sources & licensing provenance

The canonical registry (`data/exercises.json`) is **curated and CC0**. Being precise about
what that means: no third-party dataset was **bulk-imported verbatim** as canonical entries
(an early pass that did exactly that was reverted, 2026-06-26 — see History), but the
majority of entries are a **curated derivation** from the free-exercise-db worklist: their
existence, coverage, and usually their display names come from upstream rows, while their
ids and facet classifications were authored per-entry to OpenBody conventions (§6.2/§6.3).
Each entry's `source` field records its provenance; the per-source evaluation is below.

## Crosswalk / seed sources

| Source | License | CC0-compatible | Role |
|---|---|---|---|
| **free-exercise-db** (yuhonas) | The Unlicense (public domain) | ✅ yes | Crosswalk + curation worklist (873 movements); seed for 657/740 entries (`source: "free-exercise-db"`). |
| **Compendium of Physical Activities** (MET) | facts (not copyrightable) | ✅ (cite edition) | `attributes.met` on curated entries. |

Blocked / not used: **wger** (CC-BY-SA — share-alike incompatible with CC0), **ExerciseDB**
(proprietary). **wrkout/exercises.json** (Unlicense) is clean but largely overlaps
free-exercise-db, so it adds little — not pulled.

## free-exercise-db

- **License verified:** GitHub licensee reports `yuhonas/free-exercise-db` as SPDX
  **`Unlicense`** (public domain) — CC0-compatible. Both the crosswalk *table* and
  derivation of entry names/coverage from it are unambiguously fine to publish CC0.
- **Crosswalk artifact:** `crosswalk/free-exercise-db.json` — 873 rows
  `{ id, name, canonical|null }`. `null` = not curated (out of scope or pending). Generated
  by `tools/build-crosswalk.mjs`, which preserves maintainer fills.
- **Upstream pin:** commit `b0eed061e1c832b3ed815fbaa4b45b3cdc14df49` (`dist/exercises.json`);
  re-pin on refresh. The upstream dump is **not** committed — only the crosswalk table.
- **What `source: "free-exercise-db"` entries take from upstream:** the movement's
  existence/coverage (via the worklist) and typically the display name(s), carried verbatim
  as the common name. Upstream `category`/`mechanic`/muscle lists were consulted as
  reference during facet authoring.
- **What they do NOT take:** ids (re-authored as dot-segmented `base[.variation…]`, §6.2 —
  upstream has no such structure), facet classification (`movementPattern`, `modality`,
  `anatomy` re-derived at finer granularity against this registry's vocabularies — e.g.
  upstream `shoulders` → `deltoids`/`rotator-cuff`, upstream has no movement-pattern field
  at all — and they frequently disagree with upstream where upstream is coarse or wrong),
  instructions, and images. A diff of any seeded entry against its upstream row will show
  a shared name and an otherwise re-authored record.

## Compendium of Physical Activities (MET)

MET values are facts (not copyrightable); used only as numeric `attributes.met` on curated
entries, citing the Compendium edition in the PR. Not a bulk source.

## History

- **Bulk import, reverted (2026-06-26):** an earlier pass imported free-exercise-db
  wholesale as ~872 canonical entries with algorithmic id decomposition. Reverted in favour
  of curated-canonical + crosswalk — to own id quality/stability and give maintainers a
  clear method (CONTRIBUTING.md) rather than inheriting machine-derived ids.
- **Curated derivation (OB-24, 2026-06):** the registry then grew 114 → 740 entries by
  working the crosswalk worklist: each movement individually re-authored (id, facets,
  classification) and reviewed to the CONTRIBUTING.md method, with the upstream row as seed.
  Those entries carry `source: "free-exercise-db"` to record that lineage honestly.
