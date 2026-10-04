# AGENTS.md — Beat

Instructions for humans and coding agents working in this repo.
Read this before changing product behaviour, copy, data adapters, or the comparison engine.

Related files:
- `README.md` — setup and product contract summary
- `PLAN.md` — 2-hour team split, file ownership, cut order

---

## What we are building

**Beat** is a **Dublin emergency-flow planning simulator**.

Given a **simulated incident location**, it shows how **live road conditions** and **hospital crowding context** might affect the wider emergency pathway, while keeping the **final routing decision explicitly with dispatch / clinical teams**.

Beat illuminates system bottlenecks and trade-offs. It does **not** route real ambulances or recommend clinical care.

### One-line pitch

A journey that looks fastest on the road can still lead into a crowded hospital pathway. Beat makes the trade-off visible, with evidence and uncertainty attached.

### Key metric (defensible demo claim)

> How much avoidable delay could system planners identify under different traffic-and-capacity scenarios?

That is the win condition. **Not** “AI routes ambulances.”

---

## Primary user

An emergency-system planner, hospital-flow coordinator, or city operations lead reviewing a **simulated** incident.

---

## Demo story (target)

**Scene:** Simulated high-acuity incident in **Tallaght** (or another fixed Dublin demo location).

1. Map / corridor view shows live (or replayed) corridor travel times.
2. Compare two **pre-declared** pathways:
   - **Scenario A — nearest-hospital pathway** (declared corridor toward the nearer named pathway).
   - **Scenario B — flow-aware pathway** (declared alternate corridor / hospital pathway chosen to surface crowding vs travel trade-offs).
3. Display current crowding as a **contextual signal**, not a clinical routing rule.
4. Produce an **auditable planning brief**: planning simulation only; dispatcher approval required.
5. Show what is live, stale, replayed, or unavailable — never invent numbers.

### Demo question

Given this simulated incident, which of two pre-declared scenario pathways has the **lower planning friction right now**, and what evidence drove that result?

---

## Non-negotiable scope boundary

Beat is a **planning and communications prototype**.

| Do | Do not |
| --- | --- |
| Compare declared hypothetical pathways | Dispatch or route a real ambulance |
| Show traffic, transit, crowding evidence with timestamps | Triage, clinical assessment, or patient-level guidance |
| Surface uncertainty and missing sources | Select a hospital as a recommendation |
| Keep final authority with humans | Consume protected patient data |
| Label INMO as bed-wait / crowding context | Call INMO “ED wait time” or capacity |
| Fall back to dated fixtures or `unavailable` | Fabricate journey times or crowding numbers |

Every UI surface and every brief must make the planning-only boundary obvious.

---

## Success criteria

1. A judge can see **source**, **timestamp**, **freshness**, and **role** of every meaningful signal.
2. Scenario calculation is **deterministic** and replayable from a saved input snapshot.
3. Final output explicitly calls itself a **simulated planning comparison**.
4. Demo stays compelling if GTFS or INMO is unavailable — clear fallback, no invented data.
5. Brief language never tells a crew where to go.

---

## Data stack

Integrate the fast, reliable source first. Do not block the UI on every feed.

| Source | Role in Beat | Confidence | Build notes |
| --- | --- | --- | --- |
| **DCC TRIPS** | Core road-corridor journey times (updated ~every minute) | Very strong | Required live layer when possible; georeferenced journey-time feed |
| **NTA GTFS-Realtime** | Bus arrivals, alerts, vehicle positions as congestion / disruption context | Strong (needs API key) | Corroborating signal only; never infer road speed from a bus alone |
| **DFB ambulance incidents** | Historical priority / area / response patterns | Strong for retrospective context | Aggregate only; not live demand |
| **INMO Trolley Watch** | Daily hospital crowding / patients waiting for beds | Useful, not live ED wait | Label precisely; never as ED wait time or destination capacity |
| **HSE / DoH performance data** | Historical or periodic ED performance background | Background only | Optional; not live dispatch data |

Official starting points live in `src/data/sourceRegistry.ts`.

### Live-data rule

Never replace a failed feed with invented values. Use:

1. Live evidence (`status: "live"`), or
2. Timestamped saved fixture (`status: "replayed"`), or
3. Explicit `status: "unavailable"`

Fixtures are the demo. Live data is a bonus layer. See `PLAN.md`.

---

## Architecture (required pattern)

```text
data adapters -> EvidenceEnvelope -> scenario engine -> ComparisonResult -> reviewable brief -> UI
```

| Layer | Responsibility | Location |
| --- | --- | --- |
| Data adapters | Fetch, validate, timestamp; one tool/function per source | `src/data/` |
| Shared contract | Common evidence shape | `src/domain/types.ts` (treat as frozen unless team agrees) |
| Scenario engine | Deterministic comparison of declared A/B inputs | `src/domain/` |
| UI | Incident, evidence, comparison, disclaimer | `src/App.tsx`, `src/components/` |
| Brief / model | Explain structured results; cite sources; abstain when evidence missing | `src/brief/` |

### Evidence envelope (every adapter)

Return at least: `source`, `sourceUrl`, `retrievedAt`, `observedAt` (if known), `freshnessSeconds` (if known), `status`, `caveat`, and `data` when available.

UI and brief consume this one shape so failure states are first-class.

### Comparison rules

- Keep **road travel context** and **crowding context** visually and logically separate.
- Do not collapse them into a medical suitability score.
- If a composite “scenario friction” value is shown, expose every term and weight and phrase it as planning friction only.
- Differences and trade-offs only — never a destination recommendation field.

### Model / brief rules

- Code computes; the model (or brief builder) only explains structured outputs.
- Name source + observed/retrieval time for each material claim.
- Separate section for uncertainty, stale inputs, unavailable sources.
- Forbid patient-level guidance, real-time destination instructions, and capacity claims.
- If comparison evidence is missing, abstain and request human review.

Optional later: small server routes or an MCP server with one tool per source (`get_traffic_context`, `get_transit_context`, `get_crowding_context`, `compare_scenarios`, `draft_planning_brief`). The product surface remains the planner UI — not a hospital live-ops command console.

---

## Current stub vs target

| Target | Current starter |
| --- | --- |
| Tallaght (or fixed) simulated incident | Dublin 2 fixture copy |
| Nearest vs flow-aware declared pathways | Generic Scenario A / B corridors |
| Live TRIPS | Fixture / replayed adapter stub |
| Map as supporting evidence | Not required for first vertical slice |
| Auditable cited brief | Template brief in `createPlanningBrief.ts` |

When changing fixtures or copy, prefer the Tallaght / nearest vs flow-aware framing above unless the team explicitly freezes a different demo scene.

---

## Agent coding rules

1. Prefer changes inside the owned folder for the task (`data`, `domain`, `components`/`App`, `brief`).
2. Do not invent live metrics. Prefer `unavailable` or dated `replayed` fixtures.
3. Do not add dispatch, triage, clinical, or “recommended hospital” language.
4. Do not label INMO as ED wait time.
5. Keep comparison deterministic and testable.
6. No database required for MVP — versioned JSON snapshots / fixtures are enough.
7. Map is supporting evidence, not the product. Strong comparison + evidence cards beat fragile routing UI.
8. Follow `PLAN.md` for hackathon timeboxing and cut order.

---

## Fallback ladder (demo resilience)

1. Live TRIPS + live enrichment sources
2. Live TRIPS + cached, timestamped GTFS / INMO snapshots
3. Fully replayed public-data snapshot, clearly marked as saved demonstration

Never ship a made-up number. Unavailable is a valid and persuasive product state.

---

## Cut order if time runs out

Keep: safety copy, source attribution, fixture replay path, TRIPS corridor comparison, planning brief disclaimer.

Cut / defer first: live GTFS, DFB chart polish, complex map / turn-by-turn, live INMO scraping, elaborate scoring.
