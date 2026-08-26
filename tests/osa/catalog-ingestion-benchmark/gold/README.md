# Independent Gold Corpus (Contract v2)

Provider-neutral, immutable gold manifests for the Universal Catalog Ingestion Benchmark Lab.

## Boundary

- Canonical contract: `../catalog-entity-v2.schema.json` (do not fork or modify here).
- Gold is separate from `../fixtures/` and `../providers/`.
- Gold is immutable during any provider run.
- Candidate findings must not be written into these files.
- Extraction must not read expected answers from this package.
- New manufacturers are added as data/evidence here, never as manufacturer-specific code paths.
- Incomplete evidence stays `null` / empty / warned — never invented negative catalog facts.
- Production OSA does not import this package.

## Current manifests

| File | Status |
|------|--------|
| `modelux.v2.gold.json` | Corpus role placeholder only (`live_gold_ready: false`); no invented entity facts |
| `oprime.v2.gold.json` | Confirmed `product_model` source pointers only; composition/components UNKNOWN |

## Live readiness

`live_gold_ready` remains `false` until independently prepared entity facts are complete enough for an approved live pilot. Offline structural fixtures under `../fixtures/` are not gold.
