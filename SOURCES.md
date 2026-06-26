# Sources & licensing provenance

The registry **data is published CC0** (§6.2/§9). Every seed source must be CC0-compatible.
Source evaluation: `dev-context/specs/openbody/registry/SOURCE-COMPARISON.md` (private).

## Seed sources

| Source | License | CC0-compatible | Use |
|---|---|---|---|
| **free-exercise-db** (yuhonas) | The Unlicense (public domain) | ✅ yes | Primary strength seed (~800 entries). |
| **Compendium of Physical Activities** (MET codes) | Public / academic | ⚠️ verify per-use | Cardio/endurance MET attributes. |
| Curated (this repo) | CC0-original | ✅ yes | Functional / mobility / flexibility gaps; the current seed. |

## ⚠️ Open licensing decision (needs sign-off before bulk import)

The current `data/exercises.json` is **CC0-original curated content** — no third-party data
is bundled yet. Before importing free-exercise-db in bulk and redistributing it under CC0,
confirm:

1. **free-exercise-db → CC0.** Source is **The Unlicense** (a public-domain dedication),
   which is CC0-compatible — relicensing/redistributing as CC0 is supported. Record the
   provenance (this file) and the upstream commit pinned at import time.
2. **Compendium MET values.** Confirm the specific MET figures used are usable (facts/data
   are generally not copyrightable, but cite the Compendium edition).

`tools/ingest-free-exercise-db.mjs` performs the mapping and is validated via `--selftest`;
it deliberately **does not write/commit** imported data until the above is signed off.
