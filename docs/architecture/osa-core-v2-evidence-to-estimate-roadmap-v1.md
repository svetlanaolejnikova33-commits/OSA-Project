# OSA Core V2 — Evidence-to-Estimate Production Roadmap v1.0

**Status:** canonical production Roadmap  
**Approved:** 2026-08-05  
**Canonical entry:** `/api/osa/pipeline`  
**Migration prerequisite:** UI → AI Office wiring is complete.

## Purpose

This Roadmap is the approved production sequence for reaching the primary OSA outcome:

> From a real image, propose the most correct candidates for a future estimate, validate them against official manufacturer data, and produce a trustworthy specification and estimate.

It converts the existing AI Office path into one manufacturer-neutral decision flow without deleting working legacy behavior before its replacement is proven.

## Approved slices

### Slice 1 — Evidence Discovery MVP

Remove the requirement for the user to know `manufacturer_id`. External evidence produces Registry-bound manufacturer hypotheses; only CCN + G3 may confirm an Official Product.

### Slice 2 — Office Result Rendering

Render the validated Office Product Card, Specification, Estimate, Designer Summary, and honest `needs_human` result in a designer-readable form.

### Slice 3 — Spec Assembler as the only estimate truth

Make the Office estimate line from Spec Assembler the sole estimate truth for the validated scenario; remove conflicting basket-derived calculation from that decision path.

### Slice 4 — Unified Manufacturer Registry and Official Source Bindings

Provide one manufacturer and official-source read contract for Evidence Discovery, Registry resolution, catalog adapters, and CCN.

### Slice 5 — Official Catalog Retrieval Vertical Slice

Prove the universal path from a Registry-backed Official Catalog through Product Index, Media Index, versioned visual embeddings, Visual Index, and Internal Registry Retrieval to CCN validation.

**Platform DoD:** source, product, media, visual-index, retrieval, and CCN contracts contain no brand-specific branches.

**PoV acceptance:** the mechanism is proven with the first real Registry-backed manufacturer. The current first PoV is Modelux through its concrete source adapter; Modelux does not name or define the platform slice or contracts.

### Slice 6 — Canonical discovery routing

Establish the single runtime order:

`Visual / Experience Memory → Internal Registry Retrieval → Evidence Discovery on miss → CCN + G3`.

Both discovery routes converge on the same Official Product validation contract.

### Slice 7 — Disable parallel legacy discovery

After replacement acceptance is green, stop the legacy discovery, budget-SKU, and request-time visual-search path from producing competing candidate and estimate surfaces.

### Slice 8 — Contract consolidation and safe retirement

Consolidate duplicated fingerprints, manufacturer binding, Evidence and product-result contracts; retire only proven-unused UI, routes, and placeholders.

## Governing principles

1. **Official truth:** retrieval and Evidence Discovery propose candidates; only CCN + G3 confirm an Official Product.
2. **Manufacturer neutrality:** a manufacturer is Registry data and may be a PoV scenario, but is never an OSA architectural entity or platform slice.
3. **One decision path:** all accepted results flow through AI Office, Spec Assembler, and Estimate.
4. **Evidence as fallback, not truth:** external evidence is provider-independent and cannot write article, price, or specification as confirmed facts.
5. **No premature deletion:** legacy behavior remains available until its replacement has measurable acceptance.
6. **Human subjectivity:** ambiguous candidates produce `human_pick` or `needs_human`; OSA does not manufacture certainty.
7. **Three U's:** every Slice must accelerate the path to a useful result, simplify the user's action, and reduce manual work and stress.
8. **Measurable progress:** each Slice is accepted through an observable end-to-end result, not infrastructure completion alone.

## Production outcome

The completed Roadmap produces the canonical OSA flow:

`Real Image → Vision → Memory → Internal Registry Retrieval → Evidence Discovery fallback → CCN + G3 → Official Product → Spec Assembler → Estimate → Designer Summary → User`.
