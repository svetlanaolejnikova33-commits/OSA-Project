# OSA Core v2 — Transition Map

File-grounded migration to one AI Office decision path. Evidence Discovery is an approved mandatory stage between Memory and Office Validation.

- Canonical: `/api/osa/pipeline`
- Canonical production roadmap: [OSA Core V2 — Evidence-to-Estimate Production Roadmap v1.0](./osa-core-v2-evidence-to-estimate-roadmap-v1.md)
- Evidence Discovery approved
- Three U's gate

> **Roadmap baseline**
> The completed UI → Office wiring remains the migration prerequisite. The canonical production Roadmap re-baselines the next implementation unit, Evidence Discovery MVP, as Slice 1. Historical migration numbering below is retained for file-grounded traceability.

> **Constraint preserved**  
> Target decision path is only the AI Office pipeline. Legacy UI remains until each slice proves replacement. No deletions before replacement works.

> **Architectural principle — Evidence Discovery**  
> Evidence Discovery does not determine truth. It supplies verifiable evidence candidates. The sole source of a confirmed Official Product is Office Validation (CCN + G3). The module is provider-independent: SerpAPI Google Lens (MVP) is an internal adapter behind a stable contract and must not couple Office / Spec / Estimate.

> **manufacturer_id**  
> manufacturer_id is not assumed known a priori. It emerges from Evidence Candidates + Office Validation accept (or an already reliable explicit id, which skips Evidence Discovery).

> **Manufacturer-neutral platform rule**
> A concrete manufacturer is data and may serve as a Proof of Value scenario; it is not an architectural entity, platform capability, or migration slice of OSA. Platform stages and contracts use universal concepts: Manufacturer Registry, Official Source Bindings, Product Index, Media Index, Visual Index, Internal Registry Retrieval, Evidence Discovery, CCN, Spec Assembler, and Estimate. Manufacturer-specific behavior is allowed only inside a concrete source adapter, test data, or explicitly labeled PoV acceptance.

> **Internal Registry Retrieval qualification**
> Internal Registry Retrieval is the universal capability for retrieving candidates from Registry-backed official catalog data. **Platform DoD:** common source, product, media, visual-index, retrieval, and CCN contracts work without brand-specific branches. **PoV acceptance:** the mechanism is proven on the first real Registry-backed manufacturer; the current first PoV is Modelux through its concrete source adapter. The PoV manufacturer does not name or define the platform slice or its contracts.

| Metric | Value |
| --- | --- |
| Slice 1 done (UI→Office) | 1 |
| Migration slices | 8 |
| Next: Evidence Discovery | 2 |

---

## A. Current dual-architecture diagram

### Shipping UI path (A · Legacy)

| Step | Location |
| --- | --- |
| UI entry | app/page.js |
| Analyze panel | app/components/VisionAnalysisPanel.js |
| Analyze API | POST /api/analyze-image → app/api/analyze-image/route.js |
| Discovery | page.js → fetchVisualProductCandidates / buildVisualRecommendationPipeline |
| Visual search | app/lib/visualProductDiscovery.js → POST /api/visual-search |
| Jina / Lens | visualSearch/providers/JinaProvider.js · GoogleLensProvider.js |
| First Registry-backed Official Catalog (Modelux source adapter) | app/lib/registry/fetchVisualProductCandidates.js → /api/registry/modelux-catalog |
| SKU / budget | fetchSkuMatchesForBudgetDraft → /api/registry/resolve-sku |
| Basket | projectSelectionStore.addProjectSelectionItem |
| Estimate UI | StructuredEstimateSection → buildStructuredEstimateRows |

### AI Office Core path (B · Office)

| Step | Location |
| --- | --- |
| API entry | POST /api/osa/pipeline → app/api/osa/pipeline/route.js |
| Orchestrator | app/lib/pipeline/osaPipeline.js → runOsaPipeline |
| CVO | app/lib/pipeline/runCVO.js → analyze-image OR validateVisionJson |
| Vision contract | app/lib/visionJsonContract.js · mapSemanticDraftToVisionJson.js |
| G1 | app/lib/pipeline/gateG1.js |
| Visual Memory | memory/fingerprintMatcher.js · visualMemoryStore.js |
| Experience | memory/experienceMemory.js |
| Evidence Discovery | Approved module (stable contract). MVP adapter: SerpAPI Google Lens → Registry normalize. Not truth. |
| Evidence Candidates | 3–7 manufacturer hypotheses + evidence[] + confidence + source |
| Registry bind | ccn/resolveManufacturerCatalog.js ← per candidate |
| Office Validation (CCN) | chiefCatalogNavigator.js OR ccn/live/ccnLiveAdapter.js |
| G3 | ccn/gateG3.js — sole accept of Official Product |
| Spec + Estimate | spec/specAssembler.js |
| Designer Summary | spec/buildDesignerSummary.js |

## B. Target single-path diagram

**Image → Vision (CVO) → Visual / Experience Memory → Evidence Discovery → Evidence Candidates → Office Validation (CCN) → Official Product → Specification → Estimate → Designer Summary → User**

Entry remains /api/osa/pipeline. UI supervises trigger + summary + needs_human. Discovery/Jina/basket-estimate are not on the decision path. Evidence Discovery is mandatory when manufacturer_id is not already reliably known.

---

## C. File classification

Status · responsibility · consumers · target · dependency · deletion risk. RETIRE* = retire after adapter consolidation, not necessarily delete immediately.

| File | Status | Now | Consumers | Target | Depends | Del. risk |
| --- | --- | --- | --- | --- | --- | --- |
| app/api/osa/pipeline/route.js | KEEP | Office entry | API only / tests | Canonical entry | None | Low |
| app/lib/pipeline/osaPipeline.js | KEEP | Decision orchestrator | pipeline route, fixtures | Sole decision path | Slice 1+ | Low |
| app/lib/pipeline/runCVO.js | KEEP | CVO adapter | osaPipeline | CVO step | Shares analyze-image | Low |
| app/lib/pipeline/gateG1.js | KEEP | Vision gate | osaPipeline | Unchanged | None | Low |
| app/lib/visionJsonContract.js | KEEP | Vision contract | analyze-image, CVO, memory, CCN | Canonical vision | None | Low |
| app/lib/mapSemanticDraftToVisionJson.js | KEEP | Draft→Vision bridge | analyze-image | Bridge until draft retires | Slice 6 | Med |
| app/lib/buildRichVisualFingerprint.js | KEEP | Office fingerprint | memory store/matcher | Canonical FP | None | Low |
| app/lib/memory/* | KEEP | Visual + Experience memory | osaPipeline, memory APIs | Experience substrate | None | Low |
| app/lib/ccn/resolveManufacturerCatalog.js | KEEP | Manufacturer bind | CCN, live, verify | Canonical bind | Slice 6 vs mapSpec* | Med |
| app/lib/ccn/chiefCatalogNavigator.js | KEEP | Mock CCN | osaPipeline (default) | Dev/fallback CCN | None | Low |
| app/lib/ccn/live/* | KEEP | Live CCN LOCAL | osaPipeline when flagged | Production CCN | Env flags | Med |
| app/lib/ccn/gateG3.js | KEEP | Match gate | osaPipeline, CCN | Unchanged | None | Low |
| app/lib/spec/specAssembler.js | KEEP | Spec + estimate line | osaPipeline, assemble API | Sole estimate truth | Slice 3 | Low |
| app/lib/spec/buildDesignerSummary.js | KEEP | Human summary | specAssembler | User-facing summary | Slice 2 | Low |
| app/api/analyze-image/route.js | ADAPT | Semantic + Vision emit | page.js, runCVO | CVO engine behind Office | Slice 1 uses it | Low |
| app/page.js | ADAPT | UI god object | browser | Thin shell calling Office | Slices 1–4,7 | High |
| app/components/VisionAnalysisPanel.js | ADAPT | Analysis + discovery UI | page.js | Show Office results; hide discovery later | Slices 1–4 | High |
| app/components/StructuredEstimateSection.js | ADAPT | Estimate table from basket | VisionAnalysisPanel | Render Spec Assembler lines | Slice 3 | Med |
| app/lib/projectSelectionStore.js | ADAPT | Basket + client estimate | page, ProjectSelection, StructuredEstimate | Optional selection only; not estimate truth | Slice 3–4 | Med |
| app/lib/supplierSourcesRegistry.js | KEEP | Brand registry data | resolveManufacturerCatalog, UI suppliers | Shared registry data | None | Low |
| app/lib/registry/parseModeluxCatalogHtml.js | KEEP | First PoV source-adapter HTML parse | live CCN + registry UI | Official catalog parser helper (Modelux adapter) | None | Low |
| app/lib/visualProductDiscovery.js | RETIRE | Legacy discovery pipeline | page.js | Replace with CCN | After Slice 4 | High if early |
| app/lib/registry/fetchVisualProductCandidates.js | RETIRE | Registry visual candidates | page.js | CCN replaces | After Slice 4 | Med |
| app/api/visual-search/route.js | RETIRE | Jina/Lens search API | visualProductDiscovery | No Office consumer | Slice 5 | Med |
| app/lib/visualSearch/** | RETIRE | Jina/Lens providers | visual-search API | Remove after no consumers | Slice 5 | Med |
| app/lib/visualProduct/visualFingerprint.js | RETIRE* | semanticDraft fingerprint | rankVisualCandidates, discovery | Superseded by rich FP | Slice 6 | Med |
| app/lib/mapSpecToSupplierRegistry.js | RETIRE* | Spec→category bind (UI) | discovery, diagnostics | Overlap with resolveManufacturerCatalog + categoryBridge | Slice 6 | Med |
| app/lib/registry/fetchSkuMatchesForBudgetDraft.js | RETIRE | Budget SKU matching | page.js | CCN product card replaces | After Slice 4 | Med |
| app/components/VisualProductDiscoverySection.js | RETIRE | Discovery UI | VisionAnalysisPanel | Hide after Office default | Slice 4→7 | Low |
| app/components/BudgetRecommendationsSection.js | RETIRE | Budget draft UI | VisionAnalysisPanel | Retire with discovery | Slice 4→7 | Low |
| app/components/SkuMatchesSection.js | RETIRE | Orphan SKU UI | none in page.js | Delete after confirm unused | Slice 7 | Low |
| app/components/ProjectSelectionSection.js | UNKNOWN | Designer basket | VisionAnalysisPanel | May remain as approve/select UX | Manual product decision | — |
| Generate-mode estimate placeholder (page.js) | RETIRE | Fake 'Скоро: смета' | generate mode UI | Remove placeholder | Slice 7 | Low |

---

## D. Duplicated truths (proven overlap)

| Truth | Legacy location | Office location | Evidence |
| --- | --- | --- | --- |
| Vision truth | semanticDraft (UI state in page.js; validateSemanticDraft.js) | Vision JSON (visionJsonContract; emitted in analyze-image via mapSemanticDraftToVisionJson; consumed by osaPipeline) | Proven: analyze-image returns both; UI only stores semanticDraft; Office validates vision |
| Fingerprint | visualProduct/visualFingerprint.buildVisualFingerprint(semanticDraft) | buildRichVisualFingerprint(vision) + visualMemoryStore.buildVisualFingerprint(vision) | Proven: different inputs (draft vs Vision JSON); both used for matching different stacks |
| Manufacturer / category bind | mapSpecToSupplierRegistry + sceneObjectRegistryRouting (UI discovery) | ccn/resolveManufacturerCatalog ← getAllSupplierBrands (Office) | Proven: discovery imports mapSpec*; Office imports resolveManufacturerCatalog only |
| Discovery / search | fetchVisualProductCandidates + buildVisualRecommendationPipeline + /api/visual-search (Jina/Lens) | CCN mock/live via osaPipeline (Stagehand LOCAL / mock catalog) | Proven: page.js calls fetchVisualProductCandidates; no UI import of /api/osa/* |
| Estimate generation | projectSelectionStore.buildStructuredEstimateRows (basket items) | specAssembler.buildEstimateLine (product card) | Proven: StructuredEstimateSection uses store; Office uses assembler; different inputs |
| Product result shape | UI recommendation rows / budgetDraft / projectSelection items | CCN Product Card (source CCN\|CCN_LIVE) → Spec package fields | Proven: incompatible field sets; no shared type |
| Jina-dependent flow | visualProductDiscovery → /api/visual-search → JinaProvider / imageSimilarity/jinaEmbeddings | None in Office path | Proven: grep shows Jina only under visualSearch + discovery |
| Fake surface | page.js generate-mode: «Скоро: ориентировочная смета…» | Office already produces estimate line | Proven: string in page.js ~5952; Office estimate from Phase #9 |
| Orphan | SkuMatchesSection.js exported but never imported by page.js | — | Proven: component-only grep hit |

## Dependency & risk map

### Hard dependencies (updated)

- runCVO → analyze-image (shared CVO engine)
- Evidence Discovery → Evidence Candidates (stable contract; Lens = MVP adapter only)
- Registry + CCN consume candidates → Official Product (only after G3 accept)
- Spec / Estimate / Designer Summary unchanged contracts
- live CCN → manufacturer-specific official source adapter + resolveManufacturerCatalog (current first PoV adapter: parseModeluxCatalogHtml)

### High-risk premature deletes

- visualProductDiscovery before Slice 5 acceptance
- Legacy Jina /api/visual-search while discovery still called
- projectSelectionStore before estimate UI adapted
- Do not couple Office to SerpAPI — keep Evidence adapter internal

---

## E. Ordered migration slices

Slice 1 done. Slice 2 = Evidence Discovery (new, mandatory). Former render/estimate/retire slices shift +1. Evidence Candidates feed Registry/CCN; CVO/Memory/Spec unchanged.

| # | Slice | Delivers | Accelerates | Removes work | De-stress | Risk | Rollback | Verify |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Wire Analyze UI → /api/osa/pipeline (DONE) | Flagged Office panel after analyze; vision passed; discovery kept. | Office path reachable from UI. | Zero Office visibility from Analyze. | Honest needs_human when product not confirmed. | Done — NEXT_PUBLIC_OSA_OFFICE. | Flag OFF. | Slice 1 acceptance green. |
| 2 | Evidence Discovery MVP | Pipeline continues without prior manufacturer_id: Image→Vision→Memory→Evidence Discovery→candidates→CCN validation. | User need not know the brand to reach official product check. | Hard stop H4 when manufacturer_id unknown a priori. | Hypotheses labeled as evidence, not invented articles. | Med — SerpAPI Lens adapter + public image URL; Registry normalize. | Disable Evidence Discovery → prior Slice 1 behavior (explicit id or needs_human). | Floor-lamp-class case without manufacturer_id yields candidates then CCN ok\|needs_human; no fake article. |
| 3 | Render Office Product Card / Spec / Estimate / Designer Summary | Designer-visible Office outputs after Validation (uses Official Product, not Lens). | Readable outcome without JSON diving. | Need to interpret technical audit. | Designer Summary is human language. | Low — additive UI. | Hide Office result panel enhancements. | Summary ≤6 lines; article/price/url when accept. |
| 4 | Spec Assembler = only estimate truth (scenario) | Estimate view reads assembler line for Office products. | One total, one line definition. | Basket-derived estimate for that product. | No conflicting prices from two systems. | Med — estimate UI contract change. | Flag restores buildStructuredEstimateRows for scenario. | Estimate line_total === Spec price × 1. |
| 5 | Disable parallel legacy discovery for scenario | VisualProductDiscovery / budget SKU path hidden when Office path active. | Fewer panels; faster to decision. | Duplicate candidate lists vs Evidence+CCN. | One recommendation surface. | Med — user habit change. | Re-enable showVisualProductDiscovery. | No legacy registry candidate fetch in scenario. |
| 6 | Remove legacy Jina UI path when unused | No Jina via /api/visual-search for Analyze legacy discovery. | Less cost/latency/failure modes on retired path. | Legacy visual-search Jina consumer. | Fewer opaque provider failures outside Evidence module. | Low if Slice 5 proven. Evidence Discovery adapter is separate (Lens MVP). | Keep packages until Slice 5 acceptance green. | No /api/visual-search from Analyze legacy path. |
| 7 | Consolidate internal duplicated contracts | One fingerprint family; manufacturer bind shared; Evidence contract stable. | Fewer mismatches between analysis type and catalog. | Dual fingerprint / dual bind drift. | Consistent category routing. | Med — shared libs. | Keep adapters where needed. | Fixtures + Evidence + Office scenario green. |
| 8 | Retire obsolete UI/routes last | Delete/hide retired discovery components, orphan SkuMatches, fake Скоро estimate. | Cleaner product surface. | Dead code and false promises. | No misleading placeholders. | Low if prior slices accepted. | Git revert retirement commit only. | Build green; no imports of retired modules. |

---

## F / G. Next slice — Evidence Discovery

> **NEXT implementation slice — Evidence Discovery MVP (do not implement until requested)**  
> Proof of Value: unknown manufacturer_id stops the floor-lamp case at H4; with known id the same Vision reaches Official Product. Evidence Discovery is the approved unblocker.

### Scope

- Insert Evidence Discovery after Vision / Visual+Experience Memory, before Office Validation (CCN).
- Do NOT require manufacturer_id from the user. manufacturer_id emerges from Evidence Candidates + CCN accept.
- Stable module contract; MVP internal adapter = SerpAPI Google Lens → Registry normalize → candidates 3–7.
- Evidence Discovery does not assert Official Product. Only CCN + G3 may accept.
- Skip Evidence Discovery only when manufacturer_id is already reliably known.
- Do NOT change Spec Assembler contract. Do NOT retire legacy discovery in this slice.
- Provider swap later must not change Office/CCN/Spec — adapter behind Evidence contract only.

### Uses Evidence Discovery output

- Registry bind (per candidate)
- CCN / Office Validation
- G3 → Official Product → Spec → Estimate → Designer Summary

### Unchanged by Slice 2

- CVO / Vision JSON
- Visual Memory / Experience Memory mechanisms
- Spec Assembler / Estimate Line / Designer Summary contracts
- Slice 1 UI flag wiring pattern

### Acceptance criteria

| # | Criterion |
| --- | --- |
| 1 | Without prior manufacturer_id: pipeline runs Evidence Discovery and returns candidates or honest empty/needs_human. |
| 2 | Candidates carry manufacturer_id, name, confidence, source, evidence[] — no article/price as truth. |
| 3 | Office Validation consumes candidates; Official Product only after CCN+G3 accept. |
| 4 | Swapping Lens adapter for another Evidence provider does not require Office/Spec changes (contract stable). |
| 5 | Legacy discovery still works if still enabled. Foundation unchanged. |

> **Stop**  
> Transition Map updated for Evidence Discovery. Do not implement Slice 2 until explicitly requested.
