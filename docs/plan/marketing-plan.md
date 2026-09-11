# ViziThink — Marketing Plan (v2)

*Companion docs:* [business-plan.md](./business-plan.md) — the master reference
(product, market, model). · [first-100-users.md](./first-100-users.md) — the
tactical playbook for the first cohort. · [comps.md](./comps.md) — competitive /
research brief. This doc is the **go-to-market strategy** those plug into.

> **v2 changes:** sharper ICP and "trigger moments", a clearer messaging ladder
> per channel, an explicit acquisition-loop priority order, and tighter
> kill-criteria. v1's PLG loops, 90-day calendar, and metrics are preserved.

---

## 1. What we're selling (one paragraph)

ViziThink is an AI decision buddy. You describe a decision in plain chat and it
hands you the right visual thinking framework — a 2×2, a pros & cons sheet, an
Eisenhower matrix, a pre-mortem — pre-filled with your options, ready to tweak
and conclude. The output isn't a wall of AI text; it's a picture you can act on.

**The wedge:** every general chatbot can *discuss* your decision. None of them
give you a *structured, visual, interactive* artifact. The anti-positioning
writes itself: **"Stop reading AI essays about your decision. See it."**

## 2. Positioning

### Category
"AI decision tool" — deliberately *not* "AI chatbot" (drowned category) and not
"whiteboard/canvas tool" (Miro/FigJam own it, and they're for workshops, not
personal decisions).

### Positioning statement
> For people facing a real decision who are tired of churning, ViziThink is an
> AI decision buddy that turns your situation into the right visual framework
> in one message — unlike ChatGPT, which gives you twelve paragraphs to reread,
> and unlike Miro templates, which give you an empty grid to fill in yourself.

### The three message pillars

| Pillar | Line | Proof in product |
|---|---|---|
| **Anti-slop** | "We're drowning in deep-research AI slop. ViziThink helps you see the road ahead and decide with clarity." | Every answer is a widget, not an essay. |
| **Right tool, automatically** | "Describe the decision; it picks the framework." | The convo router classifies decision type → widget. |
| **Frameworks made effortless** | "You've seen the Eisenhower matrix in a book. Now it fills itself in." | Slash commands `/2x2 /pc /eis /pm`, prefilled from chat. |

**Channel → pillar mapping:**
- HN / Twitter-X (AI-fatigued, technical) → lead **anti-slop**.
- r/productivity, PKM, GTD communities → lead **frameworks made effortless**.
- PM / founder communities → lead **right tool, automatically** (it removes the
  "which framework do I use?" friction they feel weekly).

## 3. Audience & trigger moments

Priority order (full segment economics in [business-plan.md](./business-plan.md)
§4):

1. **Indie founders / solo operators** — *Primary; the first 100 come from here.*
   Weekly consequential decisions, already pay for AI tools, publicly reachable.
2. **Product managers / tech leads** — *Likely first paying segment.*
   Prioritisation is the job; framework vocabulary is native; budget is
   expense-able.
3. **Productivity / PKM enthusiasts** — *Distribution, not revenue.* High
   virality (they screenshot tools), low willingness to pay.
4. **Consultants / coaches** — *Underrated.* Co-create artifacts with clients;
   white-label angle later.
5. **Life-decision consumers** — *Year-one SEO play, not a launch play.* Biggest
   TAM, diffuse, reach via content not outreach.

**Trigger moments** (when the need is acute — aim messaging at these):
pricing changes, a pivot call, a hire/no-hire, weekly sprint prioritisation, a
job offer, "rent vs buy", a relocation, quitting to start something. These are
the searches and the public dilemmas to meet people at.

## 4. Competitive frame

| Alternative | Their gap → our line |
|---|---|
| ChatGPT/Claude raw | Text walls, no structure, nothing to manipulate. *"A picture you can act on."* |
| Miro / FigJam / Whimsical templates | Empty templates; you do all the filling. *"The matrix fills itself in."* |
| Decision-matrix web apps (legacy SaaS) | Form-heavy, no conversation, feel like homework. *"Just describe it."* |
| Pen and paper / a friend | Actually our role model. We're the friend who happens to know 12 frameworks. |

Nobody owns "AI + visual decision frameworks" yet. Speed-to-mindshare matters
more than feature depth right now. (Deeper competitive map: [comps.md](./comps.md).)

## 5. Product-led growth loops (build these, in priority order)

The product produces inherently shareable artifacts. Marketing is mostly making
them travel. **Build top to bottom — earlier loops have higher leverage:**

1. **Shareable result links** — every completed widget gets a public read-only
   URL (`vizithink.com/d/abc123`) with a clean OG image of the filled-in
   framework. **The single highest-leverage marketing feature; prioritise it over
   any paid channel.**
2. **Image export** — "Download as PNG" with a small `vizithink.com` watermark.
   2×2 screenshots travel extremely well on X and LinkedIn.
3. **"Decide with me" templates** — pre-baked decision links ("Should I quit my
   job?" → opens chat with that context) that double as SEO landing pages.
4. **(Later) duel mode** — send a pros/cons or 2×2 to a friend/cofounder to fill
   in their weights, compare. Multiplayer ([multiplayer.md](./multiplayer.md))
   points here; this is also the team-monetisation wedge.

## 6. Content & SEO strategy

Two tracks, one funnel:

**Track A — framework pages (evergreen, high intent).** One page per framework:
"Eisenhower matrix — interactive + AI-filled", "Pre-mortem template", "2×2
prioritization matrix maker". These *names* are searched ~10k+/mo combined;
current results are static PDF templates; we have a strictly better answer — an
interactive widget that fills itself in. Each page embeds the live widget. **The
durable moat channel.**

**Track B — decision pages (long-tail).** One page per common decision: "Should I
quit my job to start a company?", "Rent vs buy", "Which framework for choosing
between job offers". Each walks the decision through 2–3 frameworks and ends in
the live tool. Generate skeletons with the product itself (dogfooding = content).

**Cadence:** 1 framework page/week until all ~12 are covered, then 2 decision
pages/week. No "AI trends" blog content — only pages a searcher *with a decision*
would land on.

## 7. Channels, by phase

### Phase 0 — Foundation (before any promotion)
- Landing page (README content is already strong) + a 30-second screen recording:
  "describe decision → widget appears → decide".
- Shareable result links + OG images (loop #1).
- Analytics: `signup → first message → first widget completed → shared/returned`
  (§9).
- **Remove the fake testimonials** from README/landing before launch — HN/Reddit
  will find them and it becomes the story. Replace with real quotes as they land.

### Phase 1 — Founder-led, communities (months 1–2)
First 100 users, fully specified in [first-100-users.md](./first-100-users.md).
Channels: direct DMs, X build-in-public, Indie Hackers, targeted subreddits,
small Slack/Discord communities. Zero spend.

### Phase 2 — Launches (months 2–3)
- **Product Hunt** — artifact-heavy demo (GIFs of widgets filling in) suits PH.
  Aim Tuesday/Wednesday; line up 20–30 genuine Phase-1 users to comment with real
  use cases.
- **Hacker News Show HN** — lead anti-slop + honest architecture (Cloudflare
  Worker + tRPC + schema-driven LLM). HN rewards candor over copy.
- One launch per platform, two weeks apart, each preceded by a week of
  build-in-public posts about what the last one taught you.

### Phase 3 — Compounding (months 3–6)
- SEO tracks A & B start paying off (~month 4+).
- Newsletter sponsorships in PM/productivity newsletters (start small — Product
  Compass, Department of Product — $200–500/slot) **only after activation >40%**,
  else paid traffic just leaks.
- YouTube/Shorts: 60-second "one decision, one framework" screen recordings.

**Explicitly not doing (yet):** paid search/social ads, LinkedIn
thought-leadership grind, cold email at scale, affiliate programs. Revisit after
retention is proven.

## 8. Pricing posture (marketing-relevant only)

*(Full model in [business-plan.md](./business-plan.md) §6.)*

- **Free during the first-100 phase** — you're buying feedback and testimonials;
  LLM cost per user is cents.
- Signal seriousness with a visible-but-inactive "Pro — coming soon" tier.
- Likely v1 paywall: decision history, `/research`, multiplayer/shared decisions,
  unwatermarked export. **Keep the core loop (chat → widget → decide) free
  forever** — it's the growth engine.
- Indicative: $8–12/mo consumer-ish; revisit upward when PMs/teams arrive.

## 9. Metrics

North star: **decisions completed per week** (a widget sent back with a
conclusion = one completed decision).

| Funnel step | Definition | Target by month 3 |
|---|---|---|
| Visit → try | sends ≥1 chat message | >25% |
| Try → activate | completes ≥1 widget | >40% |
| Activate → return | second session within 14 days | >25% |
| Return → share | shares a result link or screenshot | >10% |

A weekly cohort table of these four numbers is the entire dashboard. If
**try → activate** is below 40%, fix the router and widget prefill before any
more promotion — everything downstream is wasted otherwise.

## 10. Risks & honest unknowns

- **Frequency risk (the big one):** big decisions are rare; this may be a 4×/year
  tool. Mitigation: Eisenhower + prioritisation widgets target *weekly* work
  decisions — push those to founders/PMs, keep "life decision" framing for SEO.
- **Fast-follow risk:** ChatGPT could ship interactive decision canvases.
  Mitigation: own framework-name SEO and the "decision buddy" identity first;
  depth (history, multiplayer, research) beats a feature demo.
- **Brand risk:** "ViziThink" is unfrozen ([names-oai.md](./names-oai.md) /
  [names-gem.md](./names-gem.md)). **Freeze the name before Phase 2** — renaming
  after PH/HN throws away earned mindshare.

## 11. 90-day calendar (summary)

| Weeks | Focus | Output |
|---|---|---|
| 1–2 | Phase 0 foundation | share links, OG images, demo video, analytics, real-testimonial swap |
| 3–6 | First 100 users | per first-100-users.md; 15+ user conversations, 5 real testimonials |
| 7–8 | Fix what they hit | activation >40%, top-3 friction items shipped |
| 9 | Product Hunt | 300+ signups goal |
| 10–13 | Framework SEO pages | 6 pages live, indexed |
| 11 | Show HN | traffic + 3 quality threads of feedback |
