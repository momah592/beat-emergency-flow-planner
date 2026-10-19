# Figma prompt — Beat front end

Paste everything below the line into Figma (Make / AI).

---

Design a responsive web app called **Beat**: a **Dublin emergency-flow planning simulator** for emergency-system planners, hospital-flow coordinators and city operations leads. It is a **planning and communications prototype**. It does NOT dispatch ambulances, triage, give clinical guidance or recommend a hospital. Final routing authority always stays with dispatch and clinical teams. Design for desktop (1280px) first, with a mobile layout (375px).

**Tone and look:** calm, trustworthy, civic-tech. Not a flashy command-centre dashboard. Deep navy header (#071a2f), light cool-grey page background (#edf3f6), white cards with soft shadows and 14–18px radii, Inter typeface, generous whitespace. Accent blue (#2398c5). Status colours: green = live, amber = replayed/saved, red = unavailable. Never use red/green to imply "better/worse hospital". Meet WCAG AA contrast.

**Key idea to make visible:** a route that looks fastest on the road can still lead into a crowded hospital pathway. Keep **road travel context** and **hospital crowding context** visually separate (different cards, different colour accent). Never merge them into one score.

## Page structure (single scrolling page)

1. **Persistent safety banner (always visible, sticky top):** amber left border. Text: "Simulated planning comparison only. Not for ambulance dispatch, hospital selection, triage or clinical decision-making. Final decisions rest with dispatch and clinical teams."

2. **Hero:** "Beat" wordmark, subtitle "A simulated emergency-flow planning comparison for Dublin", small eyebrow "Build for Ireland".

3. **Simulated incident bar:** title "Simulated high-acuity incident, Tallaght" with location chip "Tallaght, Dublin 24", a small "Fixed demonstration scene" tag, and on the right an **Evidence confidence** pill (High / Limited / Insufficient). A small optional map thumbnail may sit beside it, clearly secondary — the map is supporting evidence, not the product.

4. **Demo question** (prominent, one line): "Which of two pre-declared pathways shows lower planning friction right now, and what evidence drove that?"

5. **Side-by-side pathway comparison (the hero of the page):** two equal cards.
   - **Scenario A: nearest-hospital pathway** — corridor "Tallaght incident to the nearest named hospital pathway (Tallaght University Hospital)".
   - **Scenario B: flow-aware pathway** — corridor "Tallaght incident to an alternate declared pathway (St James's Hospital)".
   Each card has two clearly separated sub-panels:
   - **Road context** (blue accent): "Corridor journey time" big number in minutes (example A: 2.4 min, B: 18.3 min), a status pill (Live / Saved snapshot / Unavailable), and a freshness line such as "Saved snapshot from 20 Nov 2015" or "Updated 45 s ago".
   - **Crowding context** (violet accent): label exactly "Published bed-wait context" (never "ED wait time" or "capacity"), big number with "patients waiting for beds" (example B: 10), the published date, and an **Unavailable** empty state for A: "No INMO figure captured for this pathway. Not estimated."
   Under the pair, a thin **difference strip**: "Road time differs by 15.9 min" and "Bed-wait context differs: not comparable (one source unavailable)". Show differences and trade-offs only. **No "recommended" badge, no winner highlight, no destination arrow, no "best" label.**

6. **Evidence trail (grid of cards):** one card per signal: Road A, Road B, Crowding A, Crowding B, Transit, Historical demand. Every card shows: **role** (e.g. "Core road-corridor journey time", "Corroborating context only"), **source name as a link**, **status pill**, **observed time**, **retrieved time**, **freshness** ("Not supplied" is a valid value), and a short **caveat** line. Transit card example state: Unavailable — "Supporting context only; never used to infer road speed". Historical card: "Dublin Fire Brigade 2025 aggregate: 14,040 of 83,233 ambulance incidents in the Tallaght station area. Historical context, not live demand."

7. **Planning brief panel:** document-like, left blue border, labelled "Simulated planning brief" with a "Reviewable output" eyebrow. Sections: **Summary**, **Claims with sources** (each claim followed by a small citation chip: source · status · time), **Uncertainty and missing sources** (amber list), **Boundary statement** (bordered box). If evidence is missing the panel switches to an **Abstain state**: "Insufficient comparable evidence. Human review requested." The brief must never say where a crew should go.

8. **Footer:** data source list with links (DCC TRIPS, NTA GTFS-Realtime, Dublin Fire Brigade incidents, INMO Trolley Watch), and the planning-only disclaimer repeated.

## States to design

- Default (saved/replayed data, as above)
- All sources live (green pills, "Updated N s ago")
- Loading (skeleton cards)
- One source unavailable (A crowding) — treated as a first-class, calm state, not an error
- Everything unavailable — brief abstains
- Mobile: cards stack, safety banner stays sticky and collapses to one line with a "Read more" expand

## Components to build

Safety banner, confidence pill, status pill (live / replayed / unavailable), pathway card with road and crowding sub-panels, difference strip, evidence card, citation chip, brief section, abstain panel, source link row.

## Never include

Dispatch buttons, "send ambulance", hospital recommendations, patient or triage information, ETA to a real destination, turn-by-turn navigation, or any invented numbers — if data is missing, show "Unavailable".
