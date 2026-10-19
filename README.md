# Beat

Beat is a **Dublin emergency-flow planning simulator** for Build for Ireland.

Given a **simulated incident**, it compares two **pre-declared pathways** using public data: observed corridor journey
time (road context) and published trolley counts (crowding context). It shows differences and trade-offs, with the
source, status and timestamp of every figure. It does **not** dispatch ambulances, pick a hospital, triage, or give
clinical guidance. Final decisions stay with dispatch and clinical teams. See `AGENTS.md` for the full contract.

## Start

```bash
npm ci
npm run dev
npm test
```

The app runs on dated, replayed public-data fixtures, so the full experience works with every live feed down. Live DCC
TRIPS and NTA GTFS-R are used when reachable (see `.env.example`).

## How it works

```text
data adapters -> EvidenceEnvelope -> compareScenarios -> ComparisonResult -> planning brief -> UI + map
```

- An **incident** (Tallaght or St Stephen's Green) resolves to two candidate hospitals, which become Scenario A
  and B for the engine.
- Road and crowding context stay separate. They are never merged into one score.
- The brief cites a source and time for every claim, lists uncertainty separately, and **abstains** when the two
  corridors cannot be compared.

## Product rules

- No recommendation, no "best" pathway, no destination field. Differences only.
- INMO is a published daily count of patients waiting for beds. It is not an ED wait time or live capacity.
- TRIPS journey times are general traffic observations, not blue-light response estimates.
- Missing data is shown as `unavailable`. Nothing is invented.

## Known limits of the demo data

- The saved TRIPS sample is from 2015 and uses provisional proxy corridors (Dublin city centre), not measured Tallaght routes.
  The Tallaght scene says so on its traffic evidence.
- No INMO figure is captured for Tallaght University Hospital, so that pathway's crowding context is `unavailable`.
- Unit positions are simulated. Route lines are OSRM road geometry only; no time is derived from them.

## Layout

| Path | Contains |
| --- | --- |
| `src/data/` | Source registry, fixtures, live adapters behind `loadScenarioEvidence` |
| `src/fleet/` | Simulated units, hospitals, incidents, and the adapter that turns an incident into Scenario A/B evidence |
| `src/domain/` | The comparison engine, shared types, safety tests |
| `src/brief/` | The planning brief, its citations and tests |
| `src/components/` | Map, pathway cards, evidence cards, brief panel |
| `src/state/` | `useComparison`, the single UI boundary |
