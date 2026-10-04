# AGENTS.md — Healthy Traffic: Dublin Emergency Flow Simulator

Instructions for humans and coding agents working in this repo.
Read this before changing product behaviour, copy, data adapters, or the comparison engine.

Related files:
- `README.md` — setup and short product contract
- `PLAN.md` — 2-hour team split, file ownership, cut order

---

## Product definition (locked)

**Healthy Traffic** is a **Dublin Emergency Flow Simulator**.

Given a **simulated incident location**, it shows how **live road conditions** and **hospital crowding** might affect the wider emergency pathway, while keeping the **final routing decision explicitly with dispatch / clinical teams**.

It is stronger and more defensible than “AI routes ambulances.”

### Key metric

> How much avoidable delay could system planners identify under different traffic-and-capacity scenarios?

That is the win condition. Every comparison, brief, and demo line should support this claim.

### Congestion signal rule

Use **direct road journey-time feeds** (DCC TRIPS) as the primary congestion / corridor signal.
Use **live bus delay / vehicle / alert data** (NTA GTFS-Realtime) only as a **corroborating** disruption signal.
Never invent road speed from a bus position alone.

---

## Demo story (locked)

**Scene:** Simulated high-acuity incident in **Tallaght**.

1. Map / corridor view shows **live** (or clearly replayed) corridor travel times.
2. Compare two **pre-declared** pathways:
   - **Scenario A — nearest-hospital pathway**
   - **Scenario B — flow-aware pathway**
3. Display current crowding as a **contextual signal**, not a clinical routing rule.
4. Produce an **auditable briefing** that states:

   > This is a planning simulation; dispatcher approval required.

5. Show what is live, stale, replayed, or unavailable — never invent numbers.

### Demo question

Given this simulated Tallaght incident, under the current traffic-and-capacity evidence, where could planners identify avoidable delay between the nearest-hospital pathway and the flow-aware pathway — and what evidence drove that result?

---

## Primary user

An emergency-system planner, hospital-flow coordinator, or city operations lead reviewing a **simulated** incident.

---

## Non-negotiable scope boundary

Healthy Traffic is a planning and communications prototype.

| Do | Do not |
| --- | --- |
| Compare nearest vs flow-aware declared pathways | Dispatch or route a real ambulance |
| Show traffic, transit, crowding evidence with timestamps | Triage, clinical assessment, or patient-level guidance |
| Surface uncertainty and missing sources | Select / recommend a hospital destination |
| Keep final authority with dispatch / clinical teams | Consume protected patient data |
| Label INMO as patients waiting for beds / crowding | Call INMO “ED wait time”, capacity, or suitability |
| Fall back to dated fixtures or `unavailable` | Fabricate journey times or crowding numbers |

Every UI surface and every brief must make the planning-only boundary obvious.

---

## Strong data stack

Integrate the fast, reliable source first. Do not block the UI on every feed.

| Data | What it contributes | Confidence |
| --- | --- | --- |
| **Dublin City Council TRIPS** | Road-corridor journey times, updated every minute; georeferenced journey-time feed | Very strong |
| **NTA GTFS-Realtime** | Bus arrival/departure updates, alerts and vehicle positions | Strong, but requires an API key |
| **DFB ambulance incidents** | Historical incident priority, area and response-time patterns | Strong for retrospective analysis |
| **INMO Trolley Watch** | Daily hospital crowding signal by hospital | Useful, but not an official real-time ED waiting-time feed |
| **HSE / DoH performance data** | Historical or periodic ED performance context | Useful background, not live dispatch data |

### Source labelling rules

- **TRIPS** is the core live corridor layer when available.
- **GTFS-Realtime** needs a registered key; mock / replay / `unavailable` is valid.
- **INMO** must be described precisely as **patients waiting for beds / crowding**, never as ED wait time.
- Official starting points live in `src/data/sourceRegistry.ts`.

### Live-data rule

Never replace a failed feed with invented values. Use:

1. Live evidence (`status: "live"`), or
2. Timestamped saved fixture (`status: "replayed"`), or
3. Explicit `status: "unavailable"`

From `PLAN.md`: **fixtures are the demo; live data is a bonus layer.**

---

## Success criteria

1. A judge can see **source**, **timestamp**, **freshness**, and **role** of every meaningful signal.
2. Scenario calculation is **deterministic** and replayable from a saved input snapshot.
3. Final output explicitly calls itself a **planning simulation** and requires **dispatcher approval**.
4. Demo stays compelling if GTFS or INMO is unavailable — clear fallback, no invented data.
5. Brief language never tells a crew where to go.
6. The avoidable-delay / traffic-and-capacity trade-off is visible without collapsing into a clinical score.

---

## Architecture (required pattern)

```text
data adapters -> EvidenceEnvelope -> scenario engine -> ComparisonResult -> auditable brief -> UI
```

| Layer | Responsibility | Location |
| --- | --- | --- |
| Data adapters | Fetch, validate, timestamp; one tool/function per source | `src/data/` |
| Shared contract | Common evidence shape | `src/domain/types.ts` (frozen unless team agrees) |
| Scenario engine | Deterministic nearest vs flow-aware comparison | `src/domain/` |
| UI | Tallaght incident, evidence, comparison, disclaimer | `src/App.tsx`, `src/components/` |
| Brief / model | Explain structured results; cite sources; abstain when evidence missing | `src/brief/` |

### Evidence envelope (every adapter)

Return at least: `source`, `sourceUrl`, `retrievedAt`, `observedAt` (if known), `freshnessSeconds` (if known), `status`, `caveat`, and `data` when available.

### Comparison rules

- Keep **road travel context** and **crowding context** visually and logically separate.
- Do not collapse them into a medical suitability score.
- If a composite planning-friction / avoidable-delay index is shown, expose every term and weight.
- Differences and trade-offs only — never a destination recommendation field.
- Transit and historic DFB context belong in their own result layers, not caveat-only footnotes.

### Brief rules

- Code computes; the model (or brief builder) only explains structured outputs.
- Name source + observed/retrieval time for each material claim.
- Include a separate uncertainty section for stale / missing / replayed inputs.
- Must include: **“This is a planning simulation; dispatcher approval required.”**
- Forbid patient-level guidance, real-time destination instructions, and hospital-capacity claims.
- If comparison evidence is missing, abstain and request human review.

Optional later: server routes or MCP tools per source. The product surface remains the planner UI — not a hospital live-ops command console.

---

## Current stub vs stronger target

| Stronger target | Current starter risk |
| --- | --- |
| Tallaght simulated incident | Dublin 2 fixture copy |
| Nearest-hospital vs flow-aware pathways | Generic Scenario A / B naming |
| Live TRIPS corridor times on map / evidence | Fixture / replayed adapter stub |
| Auditable brief with dispatcher-approval line | Template brief may omit exact wording |
| Avoidable-delay framing | Easy to slip into “recommended route” language |

When changing fixtures or copy, move toward the Tallaght + nearest vs flow-aware framing above.

---

## Agent coding rules

1. Prefer changes inside the owned folder for the task (`data`, `domain`, `components`/`App`, `brief`). Follow `PLAN.md` ownership.
2. Do not invent live metrics. Prefer `unavailable` or dated `replayed` fixtures.
3. Do not add dispatch, triage, clinical, or “recommended hospital” language.
4. Do not label INMO as ED wait time.
5. Keep comparison deterministic and testable.
6. No database required for MVP — versioned JSON snapshots / fixtures are enough.
7. Map is supporting evidence, not the product. Strong comparison + evidence cards beat fragile routing UI.
8. Prefer TRIPS for congestion; treat GTFS as corroborating context only.

---

## Fallback ladder

1. Live TRIPS + live enrichment sources
2. Live TRIPS + cached, timestamped GTFS / INMO snapshots
3. Fully replayed public-data snapshot, clearly marked as a saved demonstration

Never ship a made-up number. Unavailable is a valid and persuasive product state.

---

## Cut order if time runs out

**Keep:** safety copy, source attribution, fixture replay path, TRIPS corridor comparison, auditable planning brief with dispatcher-approval line.

**Cut / defer first:** live GTFS, DFB chart polish, complex map / turn-by-turn, live INMO scraping, elaborate scoring, HSE/DoH background charts.
