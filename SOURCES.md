# Sources & licensing provenance

The registry **data is published CC0** (§6.2/§9). Every seed source must be CC0-compatible.
Source evaluation: `dev-context/specs/openbody/registry/SOURCE-COMPARISON.md` (private).

## Seed sources

| Source | License | CC0-compatible | Use |
|---|---|---|---|
| **free-exercise-db** (yuhonas) | The Unlicense (public domain) | ✅ yes | Imported — 872 entries in `data/seed/` (commit b0eed06). |
| **Compendium of Physical Activities** (MET codes) | Public / academic | ⚠️ verify per-use | Cardio/endurance MET attributes. |
| Curated (this repo) | CC0-original | ✅ yes | Functional / mobility / flexibility gaps; the current seed. |

## free-exercise-db import — licensing cleared (2026-06-26)

**Verified:** GitHub licensee detection reports `yuhonas/free-exercise-db` as **SPDX
`Unlicense` (The Unlicense)** — a public-domain dedication, CC0-compatible. Redistributing
the structured data under CC0 is supported.

**Imported the OSS-accepted way:**
- **Provenance pinned** — upstream `yuhonas/free-exercise-db`, commit
  **`b0eed061e1c832b3ed815fbaa4b45b3cdc14df49`** (`dist/exercises.json`, 873 records).
- **Segregated** — imported entries live in `data/seed/free-exercise-db.json` (872; 1
  skipped for an id collision with the curated set), separate from the curated canonical
  `data/exercises.json` (11, authoritative). Per-entry `source: "free-exercise-db"` +
  `coded.free-exercise-db: <upstream id>` preserves attribution (a courtesy — PD requires
  none) and a reverse crosswalk.
- **Structured data only** — names + facets (modality/mechanic/equipment/anatomy); the
  upstream `instructions` prose and `images` are **not** bundled.
- **Ids decomposed toward canonical form** (`tools/decompose-ids.mjs`): source equipment +
  a qualifier lexicon map names → `base[.equipment][.stance][.grip][.laterality]` + variation
  facets (e.g. `wide-grip-lat-pulldown` → `lat-pulldown.cable.wide` + `grip:wide`). 616 of
  872 restructured; **256 are atomic base movements** kept as single-segment ids (no
  variation to extract, e.g. `ab-roller`); **1 genuine duplicate flagged** for dedupe
  (`smith-press.machine.decline.2`). **Still pre-v1** — algorithmic pass; a human review
  (+ supplements, dedupe) is the remaining v1.0 work (OB-24). Ids are NOT promised stable
  until v1.0.

## Extraction coverage (what we took from free-exercise-db)

- **Records:** 872 of 873 (one skipped — id collision with the curated set). ~99.9%.
- **Fields mapped:** `name` → `names`; `equipment` → facet + id segment; `mechanic` →
  facet; `primaryMuscles`/`secondaryMuscles` → `facets.anatomy`; `category` → `modality`;
  `id` → `coded.free-exercise-db` (reverse crosswalk).
- **Fields deliberately NOT taken:** `instructions` (prose — out of scope for an identity
  registry), `images` (binary, larger surface), `force` (push/pull/static — not modelled
  yet; candidate for `movementPattern` later), `level` (beginner/expert — not identity).
- **Upstream pin:** commit `b0eed061e1c832b3ed815fbaa4b45b3cdc14df49`; re-pin on any refresh.

## Compendium of Physical Activities (MET)

MET values are facts (not copyrightable); used only as numeric `attributes.met` with a
citation to the Compendium edition. Applied to curated cardio/endurance entries; not a bulk
source.
