# ViziThink — Business Plan (Reference Document)

> **Working name:** ViziThink. The name is not yet frozen — see
> [names-oai.md](./names-oai.md) / [names-gem.md](./names-gem.md) for candidates
> (Forkwise, OptionLab, Clearcall…). **Freeze the name before any public launch**
> (Product Hunt / Show HN); renaming afterward throws away earned mindshare.
>
> *Companion docs:* [marketing-plan.md](./marketing-plan.md) (go-to-market
> strategy, v2) · [first-100-users.md](./first-100-users.md) (tactical launch
> playbook) · [overview.md](./overview.md) (product/UX vision) ·
> [stack.md](./stack.md) (architecture).
>
> This document is the durable reference: *what the product is, who it's for, how
> it makes money, and how it grows.* Update it as the strategy evolves rather
> than spinning up new strategy docs.

---

## 1. Executive summary

**ViziThink is an AI decision buddy.** You describe a decision you're chewing on
in plain chat, and instead of a wall of AI text it hands you the *right visual
thinking framework* — a 2×2, a pros & cons sheet, an Eisenhower matrix, a
pre-mortem — already pre-filled with your options and ready to tweak, conclude,
and share.

- **The problem:** People facing real decisions either churn endlessly, or ask a
  general chatbot and get back twelve paragraphs of text they have to re-read and
  can't act on. The thinking never gets *structured*.
- **The wedge:** Every general chatbot can *discuss* your decision. None turn it
  into a *structured, visual, interactive artifact* you can manipulate and act
  on. **"Stop reading AI essays about your decision. See it."**
- **The product today:** A live chat web app (`/chat`) where a conversation
  router classifies your decision and drops the best-fit framework widget,
  pre-filled, into the chat. Built as a single Cloudflare Worker (Hono + tRPC +
  React), Neon Postgres, schema-driven LLM calls via OpenRouter. Degrades
  gracefully with no API key (deterministic fallbacks).
- **The model:** Freemium. The core loop (chat → widget → decide) is free
  forever — it's the growth engine. Paid tiers gate persistence, deeper research,
  collaboration, and unwatermarked export.
- **The bet:** Own the category of "AI + visual decision frameworks" — which
  nobody owns yet — before a general chatbot fast-follows. Speed to mindshare
  beats feature depth right now.

---

## 2. The product

### 2.1 What it does

The core interaction is **conversation in, structured artifact out**:

1. The user describes a decision in chat ("should I raise my prices?", "which job
   offer?", "what do I work on this week?").
2. ViziThink probes briefly if needed (one short question per turn, max two) to
   understand the dilemma, then **classifies the decision type** and **picks the
   matching framework**.
3. It drops an **interactive widget** into the chat, *pre-filled* with the user's
   options — not an empty template.
4. The user tweaks it (drags tasks into quadrants, adds pros/cons, adjusts
   weights) and "sends" the result. The widget posts **both** a structured
   payload *and* a plain-text rendering back to the conversation, so the AI can
   reason over the user's actual choices.
5. The user walks away with a picture they can act on — and share.

### 2.2 Decision types → frameworks

The product maps the *kind* of decision to the *right lens* (full matrix in
[overview.md](./overview.md)):

| Decision type | Best-fit framework(s) |
|---|---|
| Binary choice (A or B) | Pros & cons, SWOT |
| Multi-option | Decision matrix / weighted scoring |
| Prioritisation | Eisenhower matrix, 2×2 |
| Resource allocation | Eisenhower, cost–benefit |
| Risk tradeoff | Pre-mortem, scenario planning, expected-value table |
| Reversible vs irreversible | Regret minimisation, pre-mortem |
| Future planning | SWOT, scenario planning |
| Values clarification | Regret minimisation, first-principles prompts |

Framework canon shipped/planned: pros & cons, Eisenhower, generic 2×2, SWOT,
decision matrix, pre-mortem, scenario planning, cost–benefit, decision tree,
expected-value table, regret minimisation. **~12 frameworks** is both the product
surface *and* the SEO content map (one page per framework).

### 2.3 What makes it defensible (for now)

- **The convo router** — the model picks the framework *for* you. Competitors
  give you a blank canvas (Miro) or a text wall (ChatGPT); we remove the "which
  tool do I even use?" step.
- **Pre-fill** — the framework arrives populated from the conversation. The
  matrix fills itself in.
- **Shareable, screenshot-friendly artifacts** — the output is inherently
  viral; every completed decision is a marketing asset.
- **Framework-name SEO** — durable, evergreen, high-intent search demand we can
  own with a strictly-better interactive answer.

None of these are permanent moats individually; the strategy is to **stack them
plus brand/mindshare faster than a fast-follower can ship a feature demo**, then
deepen with history, research, and multiplayer (see §7 roadmap).

### 2.4 Architecture (one-line)

Single Cloudflare Worker (Hono) serving tRPC API + React SPA; Neon Postgres via
Drizzle; schema-driven LLM calls via OpenRouter; widgets are two-file,
two-registry, self-contained. Cheap to run (LLM cost per decision is cents),
edge-deployed, scales to zero. Full detail in [stack.md](./stack.md) and
`CLAUDE.md`.

---

## 3. User benefits

| For the user | The benefit |
|---|---|
| **Clarity, fast** | A decision turns into a clear picture in one message — no churn, no re-reading essays. |
| **The right tool, automatically** | No need to know *which* framework fits; the router chooses. |
| **Frameworks made effortless** | The Eisenhower matrix / SWOT you've seen in a book now fills itself in. |
| **Something to act on** | An interactive artifact you can manipulate, not text you passively consume. |
| **Lower regret on big calls** | Pre-mortems and regret-minimisation surface the downside *before* you commit. |
| **Shareable thinking** | Send the artifact to a cofounder, partner, or team to align — thinking made visible. |
| **A record of *why*** | Decisions (and the reasoning behind them) are saved and revisitable. |

The emotional promise: **the friend who happens to know 12 thinking frameworks** —
calm, structured, on your side, available at 2am when you're spiralling about a
decision.

---

## 4. Market & target categories

### 4.1 Framing the market

Decision-making is universal, which makes "everyone" the wrong answer. The useful
question is: **who makes consequential decisions *often enough* to form a habit,
and is *reachable* cheaply?** Frequency + reachability, not raw TAM, drives the
early business. (Frequency is the #1 risk — see §9.)

### 4.2 Target categories (priority order)

**1. Indie founders / solo operators — PRIMARY.**
Make consequential decisions weekly (pricing, pivot, hire, which feature, which
channel), often have no one to talk it through with, already pay for AI tools,
and congregate in public reachable places (X, Indie Hackers, Hacker News). *The
first 100 users come from here.* High decision frequency, low CAC, fast feedback.

**2. Product managers / tech leads — FIRST PAYING SEGMENT.**
Prioritisation *is* the job; Eisenhower / 2×2 / RICE are native vocabulary.
Reachable via PM newsletters and communities. Budget is expense-able, so
willingness to pay is highest here. Weekly-frequency use (sprint planning,
roadmap calls) solves the frequency problem.

**3. Productivity / PKM enthusiasts — DISTRIBUTION ENGINE.**
Love frameworks for their own sake, screenshot and share tools (high virality),
but low willingness to pay. Optimise these for *reach*, not revenue.

**4. Consultants, coaches & advisors — UNDERRATED B2B2C.**
Make and *facilitate* decisions for a living; an artifact they can co-create with
a client and hand over is directly valuable to their service. Potential
white-label / "powered by" angle later.

**5. Life-decision consumers ("should I move / change job / buy the house") —
SEO TAM, not a launch play.**
The biggest total market and the source of evergreen high-intent search traffic,
but diffuse, infrequent per-person, and expensive to reach via outreach. Target
via content/SEO in year one, not founder-led recruiting.

### 4.3 "Who is regularly making decisions a tool like this helps?"

Concretely, the people to chase — they decide *on a cadence*, not once a year:

- **Founders & operators** — weekly strategy/ops calls with real stakes.
- **PMs / tech leads / EMs** — continuous prioritisation and tradeoffs.
- **Freelancers / agency owners** — which clients, which projects, what to charge.
- **Investors / analysts** — repeated go/no-go and comparison calls.
- **Managers / team leads** — hiring, resource allocation, delegation.
- **Consultants & coaches** — facilitating others' decisions professionally.
- **Students & early-career switchers** — high-stakes, framework-hungry, but
  low/no budget (treat as reach, not revenue).

The pattern that qualifies a segment: **recurring decisions + reachable channel +
ability or reason to pay.** Founders and PMs win on all three.

---

## 5. Competitive landscape

| Alternative | Their gap → our line |
|---|---|
| **ChatGPT / Claude (raw)** | Text walls, no structure, nothing to manipulate. → *"A picture you can act on."* |
| **Miro / FigJam / Whimsical templates** | Empty templates; you do all the filling, and they're built for team workshops not personal decisions. → *"The matrix fills itself in."* |
| **Legacy decision-matrix SaaS** | Form-heavy, no conversation, feels like homework. → *"Just describe it."* |
| **Notion / docs templates** | Static; no intelligence, no interactivity. → *"It thinks with you."* |
| **Pen & paper / a friend** | Our role model, not our enemy. → *"The friend who knows 12 frameworks."* |

**Whitespace:** nobody owns "AI + visual decision frameworks." The category is
unclaimed. The real competitive threat is a **fast-follow** from a general
chatbot adding interactive decision canvases (§9) — which is why mindshare and
SEO ownership are the priority over feature breadth.

---

## 6. Business model

### 6.1 Pricing posture

- **Free during the first-100 phase.** The "purchase" at this stage is feedback
  and testimonials. LLM cost per user is cents.
- **Keep the core loop free forever** (chat → widget → decide) — it is the
  growth engine and the SEO/virality surface. Never paywall the magic moment.
- **Freemium thereafter.** Signal seriousness early with a visible-but-inactive
  "Pro — coming soon" tier so free users understand the deal.

### 6.2 Likely v1 paywall (what Pro unlocks)

- **Decision history & saved boards** — revisit and track past decisions.
- **`/research`** — deeper web-research-backed advice (real API cost — see
  [research-more.md](./research-more.md)); a natural metered/premium feature.
- **Multiplayer / shared decisions** — collaborate with a cofounder or team on a
  shared board (see [multiplayer.md](./multiplayer.md); Cloudflare Agents SDK).
- **Unwatermarked image/PNG export** and custom OG branding.
- **Higher usage limits / faster models.**

Indicative price: **$8–12/mo consumer-ish**, revisit upward when PMs/teams show
up (team seats are the path to meaningful ARPU).

### 6.3 Unit economics (back-of-envelope)

- **Variable cost per decision:** cents — short structured LLM calls via
  OpenRouter; Cloudflare Workers scale to zero; Neon is usage-priced.
- **Implication:** gross margin is high and free-tier generosity is cheap
  insurance for growth. The constraint is **activation and retention**, not COGS.
- **`/research` is the exception** — web-research API calls cost real money, which
  is exactly why it sits behind the paywall / metering.

### 6.4 Revenue paths, in order of likelihood

1. **Prosumer subscriptions** (PMs, founders) — the near-term revenue.
2. **Team / seat-based plans** — shared decisions, the multiplayer wedge, higher
   ARPU. The most scalable B2B path.
3. **API / embed** — let other tools drop in "decision widgets" (long-term,
   opportunistic).
4. **White-label for consultants/coaches** — "powered by" decision artifacts in a
   service business (long-term).

---

## 7. Roadmap (business-relevant milestones)

| Horizon | Focus | Why it matters commercially |
|---|---|---|
| **Now** | Core loop rock-solid: <60s cold-start to a completed decision, no signup wall before the magic, anonymous use. | Activation is the gate to *everything* downstream. |
| **Now+** | Shareable result links + great PNG export + OG images. | The single highest-leverage growth feature — turns every decision into an ad. |
| **Q+1** | Decision history / saved boards (first paid hook). | Converts free → paid and creates return-visit retention. |
| **Q+1** | Framework-name SEO pages (~12, one per framework) with embedded live widget. | The durable acquisition moat. |
| **Q+2** | `/research` premium feature. | Real differentiated value + first metered revenue. |
| **Q+2/3** | Multiplayer / shared decisions (Cloudflare Agents SDK). | Team plans, higher ARPU, a collaboration moat a chatbot can't trivially copy. |
| **Later** | "Snap to framework" structured boards; duel/compare mode; API/embed; white-label. | Depth that compounds the lead. |

---

## 8. Go-to-market (summary)

Full strategy in [marketing-plan.md](./marketing-plan.md); tactics in
[first-100-users.md](./first-100-users.md). In brief:

- **Phase 0 — Foundation:** landing page + 30s demo, share links + OG images,
  analytics funnel, remove fake testimonials.
- **Phase 1 — Founder-led (first 100):** manual, personal recruiting — DMs,
  build-in-public on X, Reddit value-posts, Indie Hackers, small Discords/Slacks.
  Zero spend. Goal: **100 *completed decisions*, not signups.**
- **Phase 2 — Launches:** Product Hunt (artifact-heavy demo) then Show HN
  (anti-slop + honest architecture angle), two weeks apart, only after activation
  >40%.
- **Phase 3 — Compounding:** framework + decision SEO pages, then targeted
  newsletter sponsorships once activation is proven.

**Distribution thesis:** the product makes inherently shareable artifacts;
marketing is mostly *making them travel*. Product-led growth loops (share links,
PNG export, "decide with me" template links, later duel mode) beat paid channels
until retention is proven.

---

## 9. Risks & honest unknowns

- **Frequency risk (the big one):** big life decisions are rare — the product
  risks being a 4×/year tool. **Mitigation:** lead with *weekly* work decisions
  (Eisenhower/prioritisation) for founders & PMs; reserve "life decision" framing
  for SEO where infrequency doesn't matter.
- **Fast-follow risk:** a general chatbot ships interactive decision canvases.
  **Mitigation:** own framework-name SEO and the "decision buddy" identity first;
  depth (history, research, multiplayer) beats a feature demo.
- **Activation risk:** if visitors don't reach a completed decision in the first
  minute, every downstream metric and every marketing dollar leaks. **This is the
  thing to protect above all else.**
- **Monetisation risk:** the highest-virality segment (PKM, students) has the
  lowest willingness to pay; the payers (PMs, teams) need the collaboration
  features that aren't built yet. Sequence accordingly.
- **Brand/name risk:** "ViziThink" is serviceable but unfrozen. Decide and lock
  it before Phase 2.

---

## 10. Success metrics

**North star: decisions completed per week** (a widget sent back to chat with a
conclusion = one completed decision).

| Funnel step | Definition | Target (month 3) |
|---|---|---|
| Visit → try | sends ≥1 chat message | >25% |
| Try → activate | completes ≥1 widget | >40% |
| Activate → return | second session within 14 days | >25% |
| Return → share | shares a result link or screenshot | >10% |

A weekly cohort table of these four numbers is the entire early dashboard. **If
try→activate is below 40%, stop all promotion and fix the router/prefill first** —
everything downstream is wasted otherwise. Revenue metrics (free→paid conversion,
ARPU, team-seat expansion) come online only after activation and retention clear
these bars.
