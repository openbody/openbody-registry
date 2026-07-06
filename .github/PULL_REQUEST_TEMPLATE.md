<!-- Thanks for contributing to the OpenBody registries. Keep ids stable and facets honest. -->

## What & why

<!-- What entry/crosswalk/token changes, and why. Link any related issue. -->

## Type of change

- [ ] New canonical entry (`data/exercises.json`)
- [ ] Crosswalk mapping (`crosswalk/<source>.json`)
- [ ] Controlled-vocabulary token (`vocab/*.json`)
- [ ] Other (tooling, docs)

## Checklist

- [ ] Commits are **DCO-signed** (`git commit -s` → `Signed-off-by:` trailer). The DCO check gates merge. Provenance matters — the registry data is CC0.
- [ ] `npm run check` is green (id format + uniqueness + facet/id agreement + crosswalk integrity).
- [ ] Ids follow §6.2 (`base[.variation…]`, ordered segments) and reuse an existing base where one fits — no synonyms or near-duplicates.
- [ ] Facets agree with the id (§6.3); `source` reflects real provenance (see `CONTRIBUTING.md` / `SOURCES.md`).
