# Healthy Traffic

Healthy Traffic is a **hospital routing prototype** for Build for Ireland.

Ambulances are positioned around Dublin city centre. When a unit is on scene with a patient, Healthy Traffic compares the two
hospitals in range using public data — observed corridor journey time and published trolley counts — and suggests which
one to run to, drawn on a map.

It is a prototype. Confirm against live operational systems before any real-world use.

## Start

```bash
npm ci
npm run dev
```

The app runs on deterministic public-data-shaped fixtures, so the full experience works before live source access is
complete.

## How it works

```text
ambulances + on-scene incident
        ↓
two candidate hospitals  ──→  Scenario A / Scenario B
        ↓
data adapters → EvidenceEnvelope → compareScenarios → ComparisonResult
        ↓
brief: suggested route + cited sources + stated limits
        ↓
map: both runs drawn, suggested one highlighted
```

The fleet layer sits **on top of** the comparison engine. Picking an incident resolves two candidate hospitals, which
become the Scenario A/B inputs the engine already understands, so `src/domain/` never had to change.

## Product contract

- Suggest the hospital with the shorter observed corridor journey time, and say by how much.
- Cite source, status and retrieval time for every figure. No number appears without its provenance.
- State plainly what each source does and does not measure. Two limits are load-bearing and tested:
  - DCC TRIPS measures **general traffic** journey times. These are not blue-light response estimates, and an emergency
    vehicle will not experience the corridor the same way.
  - The INMO figure is a **published daily trolley count**. It is not an ED waiting time and not live capacity.
- Say so when the two signals disagree — shorter run, busier hospital — rather than hiding it behind one number.
- Withhold a suggestion entirely when the evidence cannot support one. The map then draws both runs neutrally.

## Interface

Map-first. Every ambulance in the fleet, the scene with its assigned unit, and both candidate hospital runs with their
observed minutes and trolley counts. Three preset incidents (Grafton Street, Docklands, Heuston) switch the scenario.

Route lines are **indicative geometry** so the two options read as distinct. They are not routing-engine output, and no
time or distance is derived from them — journey times come from DCC TRIPS.

## Delegation map

| Owner | Folder and responsibility | Done when |
| --- | --- | --- |
| 1 Data adapters | `src/data/` | DCC TRIPS works live behind `loadScenarioEvidence` and every source returns the `EvidenceEnvelope` contract with a cached fallback. |
| 2 Scenario engine | `src/domain/` | Scenario A/B inputs produce deterministic comparison output and tests pass. |
| 3 Interface | `src/components/`, `src/App.tsx`, `src/state/`, `src/fleet/` | Map, incident presets, evidence trail and responsive layout are polished. |
| 4 Brief and evaluation | `src/brief/`, `src/domain/*.test.ts` | Route suggestion with cited sources, accuracy tests and source-traceability checks are in place. |

Keep changes inside your owned folder where possible. `src/domain/types.ts` is the shared contract and is frozen:
changing it needs everyone's agreement.

## Data sources

| Source | Role | Status |
| --- | --- | --- |
| DCC TRIPS | Corridor journey time from scene to hospital | Fixture-backed; live adapter is P1's first job |
| INMO Trolley Watch | Published daily trolley count per hospital | Fixture ready; never call it ED wait time or capacity |
| NTA GTFS Realtime | Optional transit context | Adapter boundary ready, currently `unavailable` |
| DFB incidents | Optional historical context | Fixture ready |

Official starting points are recorded in `src/data/sourceRegistry.ts`.

## Live-data rule

Never replace a failed feed with invented values. Use the explicit `unavailable` state, or a timestamped saved fixture
marked as replayed. The UI is built to show absence honestly.

## Layout

| Path | Contains |
| --- | --- |
| `src/fleet/` | Ambulances, hospitals, preset incidents, and the adapter that turns an incident into Scenario A/B evidence |
| `src/domain/` | The comparison engine and the frozen shared types |
| `src/data/` | Source registry, fixtures and the live adapter boundary |
| `src/brief/` | The route suggestion, its citations, and the accuracy tests |
| `src/components/` | Map, evidence cards, brief panel |
| `src/state/` | `useComparison`, the single UI boundary |

## Tests

```bash
npm test
```

`npm test` does **not** typecheck. Run `npm run build` before pushing — it runs `tsc --noEmit` first.
