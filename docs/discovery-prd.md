# PotholeWatch — Discovery PRD

**Product:** PotholeWatch — citizen pothole reporting with proof
**Author:** Akanksha Kanjolia
**Status:** Living document — prototype shipped, primary research pending
**Live app:** https://pothhole-checker-frontend.vercel.app

---

## 0. Scope the Problem Space

**What exactly are we trying to understand?**
Why potholes in Indian cities — Bengaluru as the reference city — take so long to get fixed *and stay fixed*, despite citizens actively reporting them through multiple channels. We are studying the reporting-to-repair loop, not road engineering.

**What is inside our scope?**

- The citizen's journey: noticing a pothole → reporting it → tracking it → knowing it was actually fixed
- The municipal loop: complaint intake → prioritisation → assignment → repair → closure claim
- The credibility gap: why "fixed" claims don't hold and potholes reappear
- Duplicate reporting: many citizens reporting the same physical pothole as separate complaints

**What is outside our scope?**

- Road construction quality, asphalt chemistry, monsoon engineering (we treat repairs as a black box with verifiable inputs/outputs)
- Municipal budgeting, tendering, and contractor payment systems (integration point, not our problem to solve)
- Highway/national-highway potholes (NHAI processes differ from city corporations like BBMP)
- Other civic complaints (garbage, streetlights, water) — the model generalises, but this PRD stays on potholes

**Which stakeholders might be involved?**
Citizens/commuters, municipal corporation (BBMP), ward engineers, repair contractors and crews, RWAs, ward councillors, civic-tech platforms, traffic police.

**What are the different directions this problem could go?**

1. Better *intake* — easier reporting (the crowded space: apps, WhatsApp, Twitter)
2. Better *accountability* — public tracking of promised vs delivered repairs (nearly empty space)
3. Better *verification* — proof that a repair happened and held (empty space)
4. Better *triage* — AI photo-detection and auto-filing (emerging, hardware-dependent)

**What do we already know?** Pothole fatalities are rising nationally; BBMP's own app data shows thousands of reports and low closure rates; citizens repeatedly report the same spots.

**What do we not know yet?** Whether verification loops change municipal behaviour; whether citizens will verify others' repairs; what ward engineers actually do with duplicate complaints.

---

## 1. Problem Space

### Case Summary

**What is the case about?**
Urban potholes are a chronic, lethal, and recurring infrastructure failure. In India they kill ~2,000 people a year (2,161 in 2023, up 16% from 2022 — MoRTH). Bengaluru, our reference city, identifies thousands of potholes every monsoon through citizen reports, yet in one measured month (Aug 2024) only **155 of 2,300 reported potholes were fixed** (~7%). The reporting-to-repair loop is broken in three places:

1. **Intake floods, insight doesn't.** Ten neighbours reporting one pothole create ten complaints, ten tickets, zero added information — and crowd out other road problems.
2. **Closure is claimed, not proven.** A contractor marks a ticket "resolved"; the pothole reappears in three weeks; nobody can distinguish a real repair from a paper one.
3. **Citizens have no memory.** Complaint data lives in ward offices and closed dashboards. The public can't see a road's repair history, so repeated failures are invisible — and unforgivable repairs go unremarked.

**What are we trying to understand?**
Whether a citizen-facing system built around **the pothole, not the complaint** — one identity per physical pothole, deduplicated reports, GPS-gated repair evidence, and resident verification before a fix counts — can close the loop that today's complaint-box apps leave open.

---

## 2. Stakeholder Mapping

| Stakeholder | Role | Why are they important? |
|---|---|---|
| **Citizen / commuter** | Reports the pothole; lives with the consequence; the primary user | They have the eyes (photo), the location (GPS), and the motive (they ride that road daily). Without them there is no signal. |
| **Municipal corporation (BBMP)** | Owns the road; runs the complaint system; accountable for repairs | The party with budget and authority. Their internal SLAs and dashboards decide what actually gets fixed. A tool they distrust or can't use changes nothing. |
| **Ward engineer / junior engineer** | Triages complaints; assigns crews; marks closure | The operational bottleneck. Receives the duplicate flood; their "resolved" click is the unverified claim we're challenging. |
| **Repair contractor / crew** | Performs the fix; paid per job | Incentivised to close tickets fast. The only actor physically present at the pothole at repair time — hence the only honest source of before/after evidence. |
| **Ward councillor** | Political owner of the ward; pressure valve for complaints | Amplifies constituent complaints; interested in visible wins; can drive adoption of a ward-level public dashboard. |
| **RWA / residents' association** | Aggregates neighborhood voices | Trusted local nodes; can organise verification ("did your street actually get fixed?") better than any individual. |
| **Civic-tech platforms / open-data community** | Builds tools on municipal data (OpenCity, WhatsApp bots) | Distribution and credibility partners; they already publish BBMP complaint datasets. |
| **Traffic police** | First responders to accidents; file spot reports | Witness the failure mode (accidents at potholes) but own neither road nor repair. |

---

## 3. Current Ecosystem

### How the system works today

A pothole's life in Bengaluru, as it stands:

```
 Citizen spots pothole
        │
        ├── Channel A: BBMP app ("Fix My Street") ──► ward office ticket queue
        ├── Channel B: WhatsApp bot ──► weekly consolidated report ──► ward office
        ├── Channel C: Twitter/X tag @BBMPC Commissioner ──► VIP escalation
        ├── Channel D: ward councillor call ──► engineer phone call
        └── Channel E: newspaper / TV ──► after an accident
        │
        ▼
 Ward engineer receives N separate complaints for the SAME pothole
        │
        ▼
 Contractor assigned (per-zone, often monsoon drives)
        │
        ▼
 Crew repairs ── or doesn't ── or patches superficially
        │
        ▼
 Ticket marked "resolved" in the internal system
        │
        ▼
 Monsoon returns → pothole reappears → NEW ticket, NEW chain, no memory
 of the old one. History resets. Accountability resets with it.
```

### Current workflow (the citizen's actual journey)

1. **Notice** — hit the pothole on a commute (most reports are two-wheeler riders, post-rain).
2. **Decide to report** — requires knowing a channel exists and believing it works. Many don't; the ones who do are the persistent minority.
3. **Report** — app/WhatsApp/Twitter; photo optional in some channels; location often imprecise (pin dropped from memory, hours later).
4. **Wait** — no per-pothole status the citizen can track; the ticket number is opaque.
5. **Observe** — weeks later, either the road is patched or it isn't. Either way the citizen closes the loop themselves, silently.
6. **Re-report** — if it reappears, the citizen starts again at step 1, with a fresh ticket and zero continuity.

### Stakeholder interactions today

- **Citizen → BBMP:** one-way, anonymous-ish, high-friction, no feedback loop.
- **BBMP engineer → contractor:** assignment sheets and SLAs; closure is self-reported by the executor — the classic fox-guarding-the-henhouse.
- **Contractor → BBMP:** closure claim; photo evidence, when it exists, is unverifiable (no GPS, no timestamp proof).
- **Citizen → citizen:** none. Neighbours independently report the same pothole; nobody knows who reported what.
- **Press/public data → BBMP:** periodic RTI/open-data dumps and scandal-driven attention spikes, not continuous accountability.

### Insights — Current Ecosystem

> **The ecosystem's core defect is identity.** Nobody — not the citizen, not the engineer, not the data — can say "this is the same physical pothole as last time." Every actor above treats the *complaint* as the object; the *pothole* has no identity, no history, and therefore no accountability. Channels compete for complaint volume while the road stays broken. A system that gives each physical pothole a permanent identity, a status, and a public timeline converts every stakeholder interaction from noise into signal.

---

## 4. Secondary Research

### 4.1 Industry Trends

**Major trends in civic complaint / municipal-tech:**

- **Complaint apps went mainstream.** The national **Swachhata MoHUA app**, state 311-style apps, and city-specific tools (BBMP's own app) normalised photo + location complaints for urban issues.
- **Social media as the de-facto escalation layer.** Tagging commissioners on Twitter/X routinely outperforms official channels for speed — a signal that official intake works but official *resolution* needs public pressure.
- **Open data and transparency activism.** Platforms like OpenCity publish municipal complaint datasets; journalists and researchers analyse ward-level performance — accountability demand exists and is under-supplied.
- **Citizen-built automation.** WhatsApp bots that consolidate weekly pothole complaints; AI-vision apps that auto-detect potholes and auto-file to BBMP (Bengaluru engineer-built, 2024). The tooling energy is bottom-up, not just top-down.
- **Evidence-based governance rhetoric.** BBMP announced pothole-mapping drives with machine surveys and dashboards; MoRTH publishes annual road-accident cause data. Data collection is improving; consequence loops are not.

**What is changing?** Smartphone + GPS ubiquity made precise, photo-geotagged reporting free for every citizen. What was once ward-office paperwork is now a 30-second phone action.

**What is driving this change?** Rising two-wheeler usage (India: ~21 crore registered two-wheelers), monsoon-aggravated road decay in booming metros, social-media-fuelled citizen expectations, and court/probe pressure after fatal pothole accidents.

### Insights — Industry Trends

> Every trend point attacks **intake**, and intake is basically solved: a citizen today can report a pothole in 30 seconds through five different doors. The industry's frontier — AI auto-detection, bots — pushes the same solved problem further. Nobody is building the **back half of the loop**: proof of repair, permanence of record, and citizen verification. The white space has moved from "make reporting easy" to "make resolution true."

### 4.2 Stakeholder Understanding

**Citizen / commuter**

- **Goals:** get the road they use daily fixed; avoid the accident; feel their report mattered.
- **Motivations:** personal safety (two-wheeler riders hitting water-filled potholes), vehicle damage, neighborhood pride, civic duty.
- **Pain points:** no feedback after reporting; same pothole resurfacing; no idea whether anyone else reported it; filing feels futile — the Aug-2024 data (155/2,300 fixed) validates the cynicism.
- **Behaviours:** report once, then give up; escalate to Twitter only after personal loss; avoid water-filled potholes by swerving (a cause of secondary accidents).
- **Existing challenges:** imprecise reporting (wrong pin, no photo), duplicate effort, no closure signal to react to.

**Municipal corporation (BBMP) & ward engineers**

- **Goals:** meet SLA numbers; manage the complaint flood with limited crews; avoid scandal.
- **Motivations:** performance reviews tied to closure *counts*; political pressure from councillors; monsoon emergency response.
- **Pain points:** duplicate complaints inflate and pollute queues; no reliable way to prioritise by severity or affected population; closure is measured in tickets, not roads.
- **Behaviours:** batch repairs into zone-level drives; close tickets on contractor word; respond fastest to escalations (media, VIP).
- **Existing challenges:** trust deficit with citizen data (fake/stale photos); no system linking repeat failures on the same spot.

**Contractor / crew**

- **Goals:** close assigned jobs quickly; get paid; avoid rework penalties.
- **Motivations:** per-job payment; contract renewal.
- **Pain points:** vague locations ("near the bakery"); revisits for the same spot billed as new jobs; no standard evidence protocol.
- **Behaviours:** fast superficial patches (beat/pothole mix) that survive weeks; photo-as-proof done casually, when demanded.
- **Existing challenges:** no tooling that makes honest evidence easier than fake evidence.

### Insights — Stakeholder Understanding

> Every stakeholder is optimising locally and rationally: citizens minimise futile effort, engineers minimise queue noise, contractors maximise closure rate. The system's failure is structural — no shared object with a verifiable state. Notably, **the crew is the only actor physically at the pothole at repair time**, and current systems give them zero reason to capture honest proof. Any solution must make truth the path of least resistance for all three parties at once.

### 4.3 Current Solutions

**How is this problem solved today?**

| Solution | What it is | Workarounds it replaces |
|---|---|---|
| BBMP "Fix My Street" app | Official photo + location complaint app feeding ward ticketing | Phone calls and office visits |
| Swachhata MoHUA app | National civic-complaint platform (all categories) routed to ULBs | Nothing — first of its kind at scale |
| WhatsApp bots | Citizen-built bots consolidating weekly pothole reports to BBMP | Manual email compilations |
| Twitter/X escalation | Public tagging of commissioners; press amplification | RTI petitions |
| Ward councillor intervention | Political escalation lane | — |
| Newspaper/TV coverage | Post-accident spotlight | — |

**What workarounds do people use?**
Swerving around water-filled potholes (dangerous), informal arrangements with security guards/shopkeepers to place barricades or bricks, RWA petitions, and simply absorbing vehicle-damage costs.

### Insights — Current Solutions

> Every current solution is a **doorbell** — it rings the municipality louder or through a fancier bell. None of them change what happens after the door opens: assignment, proof, closure, and permanence are untouched. The workarounds (bricks, barricades) prove citizens will self-organise hazard mitigation when the system fails — latent demand for agency that a verification role can channel.

### 4.4 Competitor Analysis

| Competitor | Problem they solve | Target user | How they solve it | Gaps |
|---|---|---|---|---|
| **Swachhata (MoHUA)** | Civic complaint intake at national scale | Urban citizens | App complaint → routed to ULB geotagged, with photo and token status | Ticket-centric; one pothole = many tickets; no repair evidence; no verification; status often stalls at "forwarded" |
| **BBMP Fix My Street** | Official pothole intake for Bengaluru | Bengaluru citizens | App report → ward queue → drive-based fixes | Opaque status; low closure (155/2,300 in Aug 2024); no public history; duplicates flood engineers |
| **FixMyStreet (mySociety, UK)** | Civic reporting with transparency pedigree | UK citizens (copied in 20+ countries) | Report + fix map, council integration, open codebase | Still complaint-centric; verification is council-reported; India adaptation absent |
| **SeeClickFix (US)** | 311-style reporting with city contracts | US municipalities + citizens | Issue maps + workflow tooling for city staff | Sold to cities (B2G), not citizens; no resident verification loop |
| **AI pothole detectors (2024, Bengaluru)** | Reporting friction | Tech-forward riders | Phone camera auto-detects pothole, auto-files to BBMP | Solves intake (already solved); adds duplicate noise; no loop |
| **Google Maps incident reporting** | Hazard awareness while driving | All drivers | crowdsourced "hazard ahead" pins | Alerting, not fixing; expires in hours; no municipal handoff |

### Insights — Competitor Analysis

> The entire competitive set optimises **complaint volume and intake UX**. Structural gaps repeat across all of them: (1) no physical-pothole identity, so duplicates and recurrences are invisible; (2) closure is self-reported by the executing party; (3) no citizen role after submission — the user's job ends when the complaint begins. A citizen-verified repair loop is not a feature gap in these products; it is a category gap.

### 4.5 Facts & Data

**National (MoRTH, "Road Accidents in India" series):**

- Pothole-related road deaths: **1,856 in 2022 → 2,161 in 2023 (+16.4%)**; **9,438 deaths 2020–2024**, a **~53% rise** over the period (PTI/MoRTH).
- Total road deaths 2023: **1.7 lakh+**; potholes are a top "road condition" cause — accidents on potholed/curved/steep roads ≈ 13.8% of all accidents (2022).

**Bengaluru (BBMP / press / open data):**

- **Aug 2024: 155 of 2,300 reported potholes fixed (~7%)**; complaints concentrated in South Zone (476) and Mahadevapura (465) — New Indian Express.
- **Monsoon 2023: 9,796 potholes identified** via the dedicated app — The Hindu.
- **61% of pothole complaints come from local streets (RoW < 12m)** — Citizen Matters analysis of BBMP data — the long tail wards know least about.
- BBMP Fix My Street complaint data is published ward-wise on **data.opencity.in** — a working open-data ecosystem exists.

**Category context:**

- ~**21 crore registered two-wheelers** in India — the exposure base; water-filled potholes are a documented two-wheeler fatality pattern.
- Civic-app adoption precedent: Swachhata has crores of complaints logged nationally — Indians will use civic apps when the loop is visible.

### Insights — Facts & Data

> The data says two things at once: the problem is **lethal and growing** (pothole deaths +53% over five years) and the response is ** structurally underperforming** (a 7% fix rate on reported potholes in the measured month). The 61%-local-street figure means the worst-affected roads are exactly the ones with the weakest political visibility. Numbers of this shape usually indicate not a resource problem alone, but a **feedback-loop problem**: no system forces the repeat failure into view.

### 4.6 Observations

*(Patterns only — no "why" yet.)*

- Citizens report the same physical pothole through multiple channels within days of each other.
- Complaint volume spikes after rains and after accidents; repair drives spike after media coverage.
- Fix rates on reported potholes are single-digit in measured months (7%, Aug 2024).
- Escalation channels (Twitter, press, councillors) outperform official apps in response speed.
- Pothole deaths rose 53% in five years even as complaint apps proliferated.
- Water-filled potholes cause swerving, which causes secondary accidents.
- Contractor closure is accepted without independent evidence.
- Recurrence is routine: the same locations reappear in complaint data across years (visible in OpenCity datasets).
- Citizens' dominant workaround is physical (bricks, barricades), not procedural.
- Civic-tech energy in Bengaluru is bottom-up: bots and AI detectors built by residents, not by the city.

### 4.7 Insights

| # | What did we discover? | Why do we think this is happening? | Evidence |
|---|---|---|---|
| I1 | Intake is saturated while resolution starves | Reporting is a citizen-side problem (easy to build), resolution is a governance problem (hard, unsexy) — so tools cluster at the easy end | 5+ intake channels vs zero verification tools; competitor table |
| I2 | The complaint, not the pothole, is the unit of record | Ticket systems descend from office paperwork; each channel issues its own ticket namespace, so no cross-system identity ever forms | Duplicate complaint patterns; OpenCity ward data showing repeat locations with new ticket IDs |
| I3 | Closure claims are unverifiable by design | The executor self-reports; adding proof would slow the contractor and embarrass the department | 155/2,300 fixed; recurring "resolved" statuses on recurring potholes |
| I4 | Citizens disengage after one ignored report | Civic action without feedback extinguishes the behaviour | App review sentiment, Twitter cynicism, workaround behaviours |
| I5 | Escalation beats process | Public visibility is the only working enforcement mechanism | Twitter/press-driven repairs outpacing app-driven ones |
| I6 | The repair moment is entirely undocumented | No actor is equipped or incentivised to capture on-site truth; GPS-camera evidence isn't demanded anywhere | No current tool requires geotagged before/after photos |

### 4.8 Research Gaps (secondary-level)

- We don't know BBMP's internal SLA terms with contractors, or whether evidence requirements exist on paper.
- We don't know what fraction of "fixed" closures recur within 3/6/12 months (needs longitudinal analysis of OpenCity data).
- We don't know ward-engineer workload per zone (complaints/engineer/day).
- We don't know how many reports come from repeat reporters vs first-timers (engagement concentration).
- We don't know the municipality's appetite for citizen-generated evidence in official closure processes.

---

## 5. Key Insights

*(Summarising all of secondary research — insights only, in the prescribed format.)*

- **We observed** citizens reporting the same pothole through five channels and engineers closing tickets without evidence, **because** the system's unit of record is the complaint, not the physical road defect, **which means** duplicates mask severity, closures mask reality, and the true backlog is invisible to everyone.
- **We observed** pothole deaths rising 53% while complaint apps proliferated, **because** every tool attacks intake and none attacks verification, **which means** the binding constraint is the resolution loop, not citizen participation.
- **We observed** escalation (Twitter, press) outperforming process, **because** public visibility is the only enforcement that exists today, **which means** a permanent public timeline per pothole is the enforcement engine — not a nice-to-have.
- **One interesting thing we discovered:** citizens already self-organise hazard mitigation (bricks, barricades, WhatsApp groups) — the demand for agency is proven; nobody has given it a formal role after submission.
- **One interesting thing we discovered:** the repair crew — the least-digitised actor — is the only one physically present at the moment of truth, making an evidence protocol that serves *them* the linchpin of the entire accountability chain.

---

## 6. Opportunity Areas

**FOR** — *who we build for*
- Daily commuters (two-wheeler riders first) on Bengaluru's local streets — the 61%-long-tail where visibility is weakest.
- Ward engineers drowning in duplicate tickets who would trade a public dashboard for cleaner queues.
- RWAs who want a formal verification role instead of WhatsApp outrage.

**THROUGH** — *the mechanism*
- A pothole-identity model: one permanent record per physical pothole (`#BLR-00042`) that deduplicates reports, aggregates demand (upvotes), and carries a public timeline across repairs and recurrences.
- An evidence protocol: GPS-gated before/after photos captured on-site by the crew — proof that is cheaper to produce honestly than to fake.
- A verification role: the repair counts as fixed only when a resident who reported that pothole confirms it; "not fixed" reopens the record with history intact.

**BECAUSE** — *the enabling conditions*
- Smartphones with GPS + EXIF cameras make free, tamper-resistant evidence capture trivial (2020s reality that paper-era ticketing never had).
- Open data (OpenCity) and RTI culture create the transparency pressure ready to consume this signal.
- The competitive set has structurally ignored the post-submission loop for a decade.

---

## 7. Scope Down

**Chosen direction:** Build the citizen-side verification loop around pothole identity — report → dedup → evidence → resident-verify → permanent public timeline — as a standalone PWA, city-scoped to Bengaluru, with the municipality as an adopting reader (not a co-design dependency).

**Why this?**
- It attacks I2/I3/I6 (identity, unverifiable closure, undocumented repair moment) — the insights with the strongest evidence and weakest incumbent response.
- It is buildable without BBMP cooperation: the timeline and evidence are valuable to citizens *even before* official adoption, and the artefacts (per-pothole histories) are exactly what press, RWAs, and open-data activists already consume.
- It converts the proven-but-misdirected citizen energy (I4, workarounds) into the verification workforce.

**Why not the others?**
- *Better intake (AI detection, bots):* solves the solved problem; adds duplicate noise. Competitors and civic hackers already ship this.
- *Municipal workflow/ERP tooling:* B2G sale, 12–24 month procurement cycles, dies without a champion inside BBMP; premature for a prototype.
- *Prediction/analytics (which pothole next):* needs historical data we don't own yet; our timeline *creates* that dataset as a by-product — sequence it later.

**What evidence supports this?** The 7% fix rate and duplicate-flood patterns are loop failures, not intake failures; every insight (I1–I6) points past intake; the workarounds prove citizen demand for agency.

---

## 8. Existing Solutions Gaps

| Solution | Who uses it? | What's good | What's missing |
|---|---|---|---|
| **Swachhata app** (direct) | Urban citizens nationally | Scale, official routing, geotagged photos | Pothole identity; repair evidence; citizen verification; public per-spot history |
| **BBMP Fix My Street** (direct) | Bengaluru citizens | Official intake; ward routing | Transparent status; fix-rate credibility (155/2,300); dedup; recurrence memory |
| **FixMyStreet** (direct, UK-origin) | UK citizens, 20+ country forks | Transparency ethos, open source, council integrations | Resident verification of closures; identity model; Indian municipal context |
| **SeeClickFix** (direct, US) | US cities + residents | City-workflow tooling, issue maps | Citizen-side loop; B2G orientation; verification |
| **AI pothole detectors** (indirect) | Tech-forward riders | Zero-friction reporting | Loop closure; dedup (adds noise); durability of reports |
| **Google Maps hazards** (indirect) | All drivers | Real-time alerts, scale | Permanence; municipal handoff; repair state |
| **Manual: ward-office complaints** | Older residents | Human contact | Everything digital; traceability; evidence |
| **Workaround: Twitter/press escalation** | Vocal minority | Actually works (speed) | Not scalable; not persistent; no memory after the news cycle |
| **Workaround: bricks/barricades by citizens** | Street-level shopkeepers, guards | Immediate hazard mitigation | Doesn't fix the road; invisible to the system |

---

## 9. Research Gaps (what we STILL don't know)

- Whether ward engineers would *use* a deduplicated, prioritised queue if given one (or whether political escalation overrides any queue).
- Whether contractors will accept GPS-gated evidence capture, and what it does to their throughput.
- Whether citizens who report will return to verify — the retention curve of the verification act.
- Whether "repaired then reported again" events (our `REPORTED_AGAIN` state) genuinely predict shoddy repairs vs new adjacent potholes.
- What severity signals (upvote velocity, near-miss reports) actually correlate with municipal priority.
- Whether public timelines shift media/councillor behaviour toward the worst potholes rather than the loudest ones.
- Legal weight (if any) of citizen-captured geotagged evidence in municipal audit or contract penalty processes.

*(These become the primary research questions below.)*

---

## 10. Assumptions

| # | Assumption | Confidence | Evidence | Needs validation? |
|---|---|---|---|---|
| A1 | Citizens will report potholes via a dedicated app despite app fatigue | ⭐⭐⭐ | Swachhata adoption; Bengaluru's bottom-up civic-tech energy | Yes — activation in a real ward |
| A2 | One-per-person upvotes meaningfully prioritise demand | ⭐⭐ | General crowdsourcing patterns | Yes — compare vs engineer intuition |
| A3 | Crews can be induced to capture GPS-gated before/after photos (admin-as-crew in v1 sidesteps this; contractor adoption is the real test) | ⭐⭐ | No precedent data found | **Yes — make-or-break** |
| A4 | Reporting citizens will return to verify/reject repairs | ⭐⭐ | Analogous loops (community moderation) | **Yes — make-or-break** |
| A5 | 20 m is the right same-pothole radius in dense Indian street geometry | ⭐⭐ | Manual map inspection during design | Yes — measure in the field |
| A6 | Municipalities will eventually consume citizen-generated timelines (adoption path exists) | ⭐ | Open-data culture; press appetite | Yes — needs a champion |
| A7 | The verification loop improves real fix behaviour (not just reporting UX) | ⭐ | Theory of change only | Yes — the core hypothesis |

---

## 11. Primary Research Plan

| Persona | Why them? | What we are validating | Sample questions |
|---|---|---|---|
| **Daily two-wheeler commuter, 25–45, Bengaluru** | Primary reporter persona; highest personal stake | A1, A4 — reporting willingness; verification return; channel switching cost | "Walk me through the last pothole you cursed at. Did you tell anyone? What happened after?" / "If you got a notification 'the pothole you reported claims to be fixed — confirm?' — would you act on it? What would stop you?" |
| **Ward engineer / JE (BBMP)** | Owner of the duplicate flood; the internal user | A2, A6 — queue value; whether dedup + priority maps to their reality | "When 30 complaints arrive for one street, what happens to them in your queue?" / "What would make you trust a citizen report more than you do today?" |
| **Road contractor / crew lead** | The evidence producer; A3 depends on them | A3 — acceptability of GPS-gated photo protocol in daily workflow | "After finishing a patch, what proof do you capture today?" / "If the app only accepted photos taken at the spot, within 25 m, how would that change your day?" |
| **RWA office-bearer** | Trusted aggregator; distribution node; bulk verifier | A4, A6 — community verification role; institutional consumption of timelines | "When your ward gets a repair drive, how do you know it was done properly?" / "Would your RWA use a public per-street repair history when meeting the councillor?" |
| **Civic-tech open-data analyst (OpenCity ecosystem)** | Consumer of our outputs; credibility multiplier | A6 — data usefulness; integration appetite | "What's missing in BBMP complaint data you analyse today?" / "Would per-pothole timelines with verified repairs change your analyses?" |

**Method:** 30–45 min semi-structured interviews; n=4–6 per persona; ward-scoped field observation of one repair drive (before/after the crew's actual process).

---

## 12. Primary Research Findings

*(Status: pending — scheduled post-prototype. To preserve honesty in this document, this section records only prototype-internal observations, not field findings.)*

**Prototype observations (internal testing, Bengaluru, Sep 2026):**

- **Behaviour:** the tester (admin/citizen dual role) completed report → assign → evidence → verify in one sitting — the loop is completable by a single motivated user, which matters for cold-start.
- **Observation:** duplicate flow surfaced a prior pothole within 20 m and the tester chose "same" — the identity decision felt natural to make when presented.
- **Pattern (n=1, anecdotal):** the moment of strongest engagement was the before/after comparison screen — the evidence pair invites judgement.
- **Quote (tester, on seeing REPORTED_AGAIN state):** "So the pothole can't pretend it was never broken." — the timeline's meaning lands without explanation.

*(Field interviews to be inserted here after completion of the plan in §11.)*

---

## 13. Synthesis (Primary + Secondary → Themes)

*(Themes from secondary research + prototype; to be merged with field findings.)*

**What repeated across every source?**
1. **Identity is the missing primitive** — duplicates (secondary), recurrence invisibility (open data), tester's reaction to the permanent timeline (prototype). Every failure traces to "no one can name the pothole."
2. **Proof must be captured where truth lives** — the crew's phone at the pothole is the only uncontested fact-source; GPS gating is the only cheap lie-detector.
3. **Citizens need a job after submission** — disengagement (I4), workaround agency (§3), and the tester's engagement peak at the verification screen all point the same way.

**What surprised us?**
- The repair *moment* being entirely undocumented (I6) — a vacuum this total usually means an opportunity this obvious has a hidden blocker; primary research with crews must find it.
- Water-filled potholes cause deaths partly through *swerving*, not impact — reporting urgency is an accident-prevention feature, not just a maintenance feature.

**Which assumptions were challenged?**
- A5 (20 m radius): in prototype testing the same/new decision was easy, but dense street geometry may need field calibration.
- A3's shape: admin-as-crew worked in v1, but assuming *contractors* behave like motivated admins is exactly the leap primary research must test.

---

## 14. Final Problem Statement

**Who?** Urban Indian commuters — two-wheeler riders above all — and the ward engineers who serve them in cities like Bengaluru.

**Problem?** Potholes are lethal, recurring, and chronically under-repaired because the entire complaint ecosystem treats *complaints* as the unit of record: the same physical pothole generates endless duplicate tickets, closures are claimed without verifiable evidence, repairs that fail are silently re-registered as new problems with no memory, and citizens — the only persistent witnesses — are given no role after submission.

**Why does it matter?** 2,161 Indians died in pothole-related accidents in 2023 (+16% YoY; +53% over five years). In the measured month, Bengaluru fixed 7% of *reported* potholes. Every stakeholder behaves rationally inside a system that cannot remember, prove, or compel.

**Evidence?** MoRTH fatality series; BBMP fix-rate reporting (Aug 2024: 155/2,300); OpenCity ward-level complaint data showing repeat locations under new ticket IDs; the complete absence of any verification mechanism across all nine mapped current solutions; and the documented citizen energy (workarounds, bots, escalation) waiting to be channelled.

**Therefore:** give every physical pothole a permanent identity, make repair evidence GPS-gated and unavoidable, and let the residents who reported it ratify the fix — turning civic anger into an accountable, public, verifiable repair record.

---

## 15. Opportunity Size

| Dimension | Estimate | Basis |
|---|---|---|
| **TAM (users)** | ~5–6 crore daily two-wheeler commuters in urban India; Bengaluru alone: ~45–50 lakh registered two-wheelers | Registered-vehicle base (MoRTH/VAHAN) |
| **TAM (potholes)** | Bengaluru identifies ~10k–35k potholes/yr (monsoon-dependent); top-8 metros imply 1L+ annual | BBMP drive data (9,796 in monsoon 2023) |
| **Frequency** | Reportable encounters: daily per commuter; actual reporting: rare today — the delta *is* the opportunity | Commuter behaviour |
| **Severity** | 2,161 deaths/yr nationally; vehicle damage; secondary swerve accidents | MoRTH 2023 |
| **Business impact (paths)** | (1) B2G: verification/audit layer for municipal SLAs & contractor penalties — payment integrity for ₹-crore road budgets; (2) B2B2C: insurance/warranty data on repair durability; (3) Public interest: press/RWA dashboards as adoption wedge | Precedents: SeeClickFix B2G model; open-data consumption |

**Serviceable entry market:** one Bengaluru zone (e.g., Mahadevapura — 465 complaints in the worst month) → ward-level proof → city.

---

## 16. Success Criteria

**Product truth (is the loop real?)**
- ≥ 30% of submitted reports join an existing pothole (dedup working) rather than creating new records
- ≥ 80% of completed repairs carry full GPS-gated before/after evidence pairs
- ≥ 40% of awaiting-verification repairs receive a citizen verdict within 7 days
- Recurrence honesty: every "fixed → reported again" cycle preserved on the timeline (zero data loss by design — verified in audits)

**Outcome truth (does it change behaviour?)**
- Time-to-first-verified-fix for ward-tracked potholes vs the ward's baseline ticket closure
- Repeat-report churn: citizens who report once and report again (retention of civic behaviour)
- Downward trend in duplicate complaints reaching the ward engineer (queue de-noising)

**Adoption truth**
- 100 verified-repair timelines in the launch ward within 8 weeks
- One RWA or press citation of the public timeline as a source

**Anti-success (what failure looks like):** high report volume with zero verification returns — a complaint box with better branding; that is the incumbent failure mode we must beat, not join.

---

## 17. Open Questions

- Will BBMP (or any ULB) formally accept citizen-verified closure in SLA accounting, or only consume it informally (press/RWA pressure)?
- What is the contractual hook for evidence — can geotagged before/after pairs be tied to contractor payment milestones?
- Does the verification act survive monetisation neutrality — who pays for the loop long-term (municipality, CSR, membership)?
- How do we prevent verification gaming (fake residents verifying their own repair) beyond the current reporter-must-verify rule — quorum thresholds? reputation?
- What is the honest same-pothole radius across Indian street densities (20 m in cores vs highways)?
- Can the timeline withstand legal challenge as a public record (defamation, data-provenance disputes)?
- Does PWA-only distribution suffice for two-wheeler riders' usage moments, or is an Android-native app required for reach?

---

## Appendix: artefacts

- Live prototype: https://pothhole-checker-frontend.vercel.app (PWA; Google sign-in; citizen + municipality doors)
- Source & README (flows, architecture): https://github.com/akanksha2306/Pothhole_Checker
- Key secondary sources: MoRTH "Road Accidents in India" reports (2022–2024); New Indian Express BBMP fix-rate reporting (Aug 2024); The Hindu monsoon pothole coverage (2023); Citizen Matters BBMP complaint analysis; data.opencity.in BBMP Fix My Street datasets; PTI pothole-fatality series.
