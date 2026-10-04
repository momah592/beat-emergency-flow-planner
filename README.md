# Beat

Beat is a **simulated emergency-flow planning dashboard** for Build for Ireland. It compares two declared, hypothetical pathways using public-data evidence. It is not an ambulance routing, dispatch, triage, clinical, or hospital-capacity tool.

## Start

```bash
npm install
npm run dev
```

The app starts with deterministic public-data-shaped fixtures so the core experience works before live source access is complete.

## Product contract

- Show traffic, transit and hospital-crowding context as distinct evidence layers.
- Surface retrieval time, observed time, freshness, source and caveat for every meaningful signal.
- Code performs comparisons; the AI layer only explains structured results and drafts a reviewable planning brief.
- Never give a real-world destination instruction or make a clinical claim.

## Delegation map

| Owner | Folder and responsibility | Done when |
| --- | --- | --- |
| 1 Data adapters | `src/data/` | DCC TRIPS works live and every source returns the `EvidenceEnvelope` contract with a cached fallback. |
| 2 Scenario engine | `src/domain/` | Declared Scenario A/B inputs produce deterministic comparison output and tests pass. |
| 3 Interface | `src/components/`, `src/App.tsx` | Evidence cards, comparison table, safety copy and responsive layout are polished. |
| 4 AI and evaluation | `src/brief/`, `src/domain/*.test.ts` | Structured brief generation, refusal tests and source-traceability checks are in place. |

Keep changes inside your owned folder where possible. Coordinate on `src/domain/types.ts`: it is the shared contract.

## Data sources

| Source | Role | Day-one status |
| --- | --- | --- |
| DCC TRIPS | Required live corridor travel context | Implement first |
| NTA GTFS Realtime | Optional service-alert / transit context | Adapter boundary ready |
| DFB incidents | Optional historical context | Fixture ready |
| INMO Trolley Watch | Optional daily bed-wait context | Fixture ready; never call it ED wait time |

Official starting points are recorded in `src/data/sourceRegistry.ts`.

## Architecture

```text
data adapters -> EvidenceEnvelope -> scenario engine -> ComparisonResult -> reviewable brief -> UI
                         |                     |
                         +-> source timestamps  +-> no clinical / dispatch recommendation
```

## Live-data rule

Never replace a failed feed with invented values. Use the explicit `unavailable` state or a timestamped saved fixture marked as replayed.

