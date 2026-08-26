# Universal Catalog Ingestion Benchmark Lab

Isolated offline harness for Benchmark Catalog Entity Contract v2. It does not implement or import production ingestion, manufacturer adapters, Retrieval, CCN, Spec, or Estimate.

## Scope

- Required future corpus: Modelux (simple SKU) and O'PRIME (configurable hierarchy).
- Golden Tile is intentionally excluded until the approved tie-breaker/stop conditions apply.
- `catalog-entity-v2.schema.json` is the machine-readable provider-neutral contract.
- `benchmark-core.mjs` contains the manufacturer-neutral normalizer, deterministic identity, hard gate, quality evaluator, and economics calculation.
- `providers/` contains symmetric offline stubs only. No client, key, network, retry, selector, or manufacturer logic exists.

## Configuration composition boundary

`configured_from` stores provider-declared component relationships as `{ entity_id, quantity }` with a positive integer quantity. The universal normalizer validates and deterministically orders those facts; it never parses configuration names/codes, infers components, calculates multiplicity from repeated tokens, or repairs missing hierarchy.

Manufacturer and catalog values are allowed only in gold/reference fixtures. Shared schema, normalizer, validator, evaluator, and provider boundaries contain no manufacturer-specific extraction logic.

Missing composition remains missing and is scored against independently prepared gold. An eligible configuration without a declared composition fails the Hard Gate.
- `fixtures/` contains structural examples, not live catalog truth. Live gold manifests must be prepared independently of provider output before a live pilot.

Run offline proof only:

```powershell
node tests/osa/catalog-ingestion-benchmark/run-fixtures.mjs
```

In-memory live entry dry-run (no network, keys, persistence, or gold import):

```powershell
node tests/osa/catalog-ingestion-benchmark/run-live-dry.mjs
```

Independent gold lives under `gold/`. Live HTTP transport is not implemented; provider stubs accept only `mode: "dry-run"` BenchmarkJob values and still reject live mode.
