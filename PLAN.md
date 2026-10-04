# Healthy Traffic — 2-hour build plan for 4 people

Goal: at T+120 we have a working, demoable app that renders correctly even if every
live feed fails. Everything else is optional.

## The one rule

**Fixtures are the demo. Live data is a bonus layer.**
If a feed breaks, the app still renders from `src/data/fixtures.ts` with
`status: "replayed"`. Nobody is allowed to make the demo depend on a live fetch.

---

## T+0 to T+15 — Lockdown (do this together, nobody codes yet)

One person drives, screen shared. In order:

1. `npm install` — then confirm `npm run dev` serves and `npm test` passes.
2. **Freeze `src/domain/types.ts`.** After this point, a change to that file needs
   all four of us to agree out loud. It is the shared contract.
3. Create the two seam files below and commit them. This is what makes the work
   parallel — without it, three of us end up editing `App.tsx`.
4. Everyone confirms they can run the app locally before splitting up.

### Seam 1 — the data boundary (owned afterwards by P1)

```ts
// src/data/loadScenarioEvidence.ts
import type { Scenario, ScenarioEvidence } from "../domain/types";

export async function loadScenarioEvidence(scenario: Scenario): Promise<ScenarioEvidence>;
```

Must never throw and never return invented numbers. On failure it returns the
fixture envelope, or an envelope with `status: "unavailable"`.

### Seam 2 — the UI boundary (owned afterwards by P3)

```ts
// src/state/useComparison.ts
import type { ComparisonResult, Scenario } from "../domain/types";

export type ComparisonState =
  | { phase: "loading" }
  | { phase: "ready"; result: ComparisonResult }
  | { phase: "error"; message: string };

export function useComparison(a: Scenario, b: Scenario): ComparisonState;
```

Calls `loadScenarioEvidence` for both scenarios, then `compareScenarios`.
`App.tsx` consumes only this. No more module-top-level `compareScenarios` call.

---

## T+15 to T+75 — Parallel build

Stay in your own files. If you need something from someone else's lane, say it
out loud rather than editing their file.

| | Owner | Owns these files | Must not touch |
| --- | --- | --- | --- |
| **P1** | Data adapters | `src/data/adapters.ts`, `src/data/loadScenarioEvidence.ts`, `src/data/fixtures.ts`, `src/data/sourceRegistry.ts`, `vite.config.ts` | `App.tsx`, `src/domain/`, `src/brief/` |
| **P2** | Scenario engine | `src/domain/compareScenarios.ts`, `src/domain/compareScenarios.test.ts` | `src/data/`, `src/components/`, `src/brief/` |
| **P3** | Interface | `src/App.tsx`, `src/components/**`, `src/styles.css`, `src/state/useComparison.ts` | `src/data/`, `src/domain/`, `src/brief/` |
| **P4** | AI, safety, pitch | `src/brief/createPlanningBrief.ts`, `src/brief/*.test.ts`, `src/domain/safety.test.ts`, `README.md`, `DEMO.md` | everything else |

`src/domain/types.ts` is nobody's. It is frozen.

### P1 — Data adapters

Make DCC TRIPS work live, with a guaranteed fallback.

- Implement the real fetch inside `adapters.ts`, wrapped in try/catch.
- Set `retrievedAt`, `observedAt`, `freshnessSeconds`, `status: "live"` honestly
  from the response. If the field isn't in the response, leave it undefined —
  don't fill it in.
- **Known trap:** a browser fetch straight to a public dataset host will very
  likely be CORS-blocked. Budget for this. Fix is a Vite dev proxy:
  ```ts
  server: { proxy: { "/trips": { target: "https://data.smartdublin.ie", changeOrigin: true, rewrite: p => p.replace(/^\/trips/, "") } } }
  ```
  If it still fails after 20 minutes, stop. Ship the replayed fixture, say so on
  screen, and go help P3. This is a fallback the design already expects.
- Done when: both scenarios load through `loadScenarioEvidence`, and the app
  still renders with wifi off.

### P2 — Scenario engine

Make the comparison richer and provably safe.

- Fold `transit` and the DFB historic context into the result as their own layers
  rather than caveat-only.
- Tighten `confidence`: current rule only looks at traffic freshness. Make the
  three states genuinely distinguishable in the demo.
- Deduplicate `caveats` — right now two unavailable feeds from the same source
  produce two identical strings.
- Keep every comparison a *difference*, never a ranking of destinations.
- Done when: `npm test` passes and the engine has a test for each of the three
  confidence states.

### P3 — Interface

This is what the judges actually see. Most visible lane; weight it accordingly.

- Wire `App.tsx` to `useComparison` and build the three phases: loading, ready,
  error. The `unavailable` evidence state needs to look deliberate, not broken.
- The evidence trail currently only shows Scenario A's three cards. Show both.
- Make the safety copy impossible to miss but not ugly.
- `src/styles.css` is 32 lines. This is the highest-leverage hour of work
  available — spend it on layout, the confidence badge, and the status pills.
- Done when: it looks finished on a laptop screen and on a projector.

### P4 — AI, safety, pitch

- `createPlanningBrief` is string concatenation today. Make it read like a brief:
  structure it, cite source and retrieval time per claim, and state what it
  cannot conclude.
- Write `src/domain/safety.test.ts`: assert the brief and the comparison never
  contain destination, dispatch, triage or clinical language, including when
  feeds are unavailable. Red-team your own output.
- Every meaningful number in the brief must trace to a source in
  `sourceRegistry.ts`. Write a test for that.
- Write `DEMO.md`: the 3-minute script, who says what, in order.
- Done when: the brief is readable aloud and the safety tests pass.

---

## T+75 — Integration freeze #1 (hard stop)

Everyone stops and pushes. Then together:

- `npm run build` (this runs `tsc --noEmit` too) and `npm test`.
- Click through the app: live path, then with wifi off.
- **Anything not merged at T+75 is cut.** Not finished later — cut. Half-merged
  work is how hackathon demos die.

## T+75 to T+105 — Polish and dry run

- P3 + P4 on visual and copy polish.
- P1 + P2 on whatever broke at integration.
- Run the full demo out loud, twice, on the machine that will present.

## T+105 to T+120 — Buffer

Final commit. No new features. Someone confirms a fresh `git clone` +
`npm install` + `npm run dev` works.

---

## Git protocol

Commit straight to `main` — with four people and strict file ownership,
branches and PRs cost more than they save over two hours.

- Small commits, push every ~15 minutes.
- `git pull --rebase` before every push.
- Never commit a state where `npm run build` fails. If you break the build,
  say so immediately — three other people are pulling from you.

## If you are running out of time

Cut in this order: live GTFS transit → live DFB context → live DCC TRIPS →
richer confidence states. Never cut: the safety copy, the source attribution, or
the fixture path that makes the app render.
