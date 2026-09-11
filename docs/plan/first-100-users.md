# First 100 Users — Tactical Playbook

*Strategy context: [marketing-plan.md](./marketing-plan.md). This doc is only
the execution: who, where, what to say, in what order.*

**Goal:** 100 people who each *complete one decision* (send a widget result
back to chat) — not 100 signups. Timeline: 4 weeks of ~1 hr/day.

**Operating principle:** at this scale, distribution is manual and personal.
You are not "marketing", you are recruiting 100 specific humans one at a time
and watching what they do.

---

## Prerequisites (do these first, ~2 days)

Don't send anyone a link until:

- [ ] **A decision works end-to-end in <60 seconds** for a cold visitor: land →
      type "should I raise prices?" → widget appears prefilled → tweak → done.
      Test it on one friend over screen-share before anything else.
- [ ] **No signup wall before the magic.** Let people chat and get a widget
      anonymously; ask for an email only to *save* the decision. Every field
      before the first widget costs you half the cohort.
- [ ] **Shareable result link or PNG export** — your users' screenshots are the
      acquisition channel.
- [ ] **Events wired:** `visited`, `sent_message`, `widget_shown`,
      `widget_completed`, `returned` (the chatLog router is most of this
      already). You need to answer "did the person I DM'd yesterday finish?"
- [ ] **Fake testimonials removed** from the landing page (Maya R. / Daniel K.).
      One Redditor noticing kills a whole thread.
- [ ] A 30-second screen recording (GIF + mp4) of one real decision. You'll
      paste this everywhere; make it once, well.

---

## The math

100 completed decisions ≈ 250 people trying it (40% activation) ≈ 600–800
landing-page visits. Sourced as:

| Source | Effort | Expected activated users |
|---|---|---|
| 1. Hand-to-hand (DMs, friends, communities you're in) | 10/day for 3 weeks | 30–40 |
| 2. "Decide in public" posts on X / threads | 3 posts/week | 15–25 |
| 3. Reddit value-posts (not link drops) | 4 posts total | 20–30 |
| 4. Indie Hackers + small Discords/Slacks | 1 post + presence | 10–15 |
| 5. Comment-section judo (HN, X, Reddit) | opportunistic, daily | 10–15 |

No launches (PH/HN) in this phase — those are for scaling *after* the first
cohort proves activation (marketing plan §7, Phase 2).

---

## Source 1 — Hand-to-hand recruiting (the backbone)

**Week 1: the inner circle (target: 20 users).**
List 30 people you know who make decisions for a living — founders, PMs,
freelancers, that friend perpetually deciding whether to move. DM each one
*individually* (no BCC, no "launching soon!"):

> Hey — I built a thing that turns a decision you're chewing on into a visual
> framework (2×2, pros/cons, pre-mortem) in one chat message. What's a decision
> you're sitting on right now? Send it to me and I'll show you what it does
> with it — or try it yourself: vizithink.com

Two things make this work: you ask **for their decision, not for feedback**
(people love talking about their decisions; nobody wants to "check out an
app"), and you offer to run it for them (zero-effort first touch — paste their
reply into the product, screenshot the widget back at them, *then* send the
link).

**Weeks 2–4: second degree (target: 20 more).**
- End every good exchange with: "who do you know who's stuck on a decision
  right now?" A warm intro converts ~5× a cold DM.
- DM people who *publicly* mention a decision on X/Reddit/IH (see Source 5 —
  same script, quote their own decision back to them).

**Track every contact** in a flat file (`docs/plan/first-100-tracker.md` or a
sheet): name, channel, date, replied?, activated?, feedback quote. This list is
also your Product Hunt launch squad and testimonial bank.

## Source 2 — Decide in public (X/Twitter, 3×/week)

Don't post "I'm building an AI decision tool." Post **decisions**:

- Run a real, slightly spicy decision through the product and post the
  screenshot: *"Should I charge for my side project? Ran it through a
  pre-mortem instead of asking Twitter. Here's what came out:"* + image + link.
- Recurring format: **"One decision, one framework"** — pick a public dilemma
  (a founder's tweet, a news topic, 'rent vs buy in 2026'), screenshot the
  filled widget. The framework imagery is the hook; the link rides along.
- Build-in-public posts about the *router* ("the model picks which framework
  fits your decision — here's how") for the dev audience. These earn the
  followers who'll upvote the eventual Show HN.

Volume matters less than the image quality of the widget screenshots — invest
in the PNG export looking great before week 1 of this.

## Source 3 — Reddit (4 posts over 4 weeks, highest variance)

Target subs where people **post decisions** or **love frameworks**:

| Sub | Angle |
|---|---|
| r/productivity (~3M) | "I made the Eisenhower matrix fill itself in from a chat message" — tool posts do well if framed as a build story. |
| r/Entrepreneur, r/smallbusiness | Value post: walk a classic dilemma (quit-job-to-start) through pre-mortem + 2×2, screenshots inline, link at the bottom. |
| r/SideProject, r/InternetIsBeautiful | Straight launch posts are welcome here. r/InternetIsBeautiful can do thousands of visits if the demo-without-signup is instant. |
| r/decidingtobebetter, r/careerguidance | **No links** (rules) — answer real "should I…" threads using the product's output as your structured answer; link only in profile. |

Rules of engagement: read each sub's self-promo rules first; post the *story or
value*, never "check out my app"; reply to every comment within the hour
(Reddit threads live or die in the first 90 minutes); one sub per week so a
removal doesn't burn the whole channel at once.

## Source 4 — Indie Hackers + small communities

- **Indie Hackers:** one product post ("ViziThink — turn a decision into a 2×2
  in one message") + show up daily in "what are you working on" threads. IH
  users are *exactly* persona #1 and they expect to be pitched politely.
- **Small Slacks/Discords you're already in** (dev, founder, PKM): the move is
  to use it live — when someone agonises over a decision in a channel, run it
  through ViziThink and paste the screenshot with "made you a 2×2". This is
  the single highest-conversion move in this whole doc.
- PKM/tools-for-thought communities (Obsidian Discord, forum.zettelkasten.de):
  frame as "thinking tool", lead with the framework canon, soft-pedal the AI.

## Source 5 — Comment-section judo (daily, 15 min)

Set up saved searches / monitoring for:

- X searches: `"should I" (quit OR pivot OR raise OR hire)`, `"can't decide"`,
  `"pros and cons"` — reply to real dilemmas with a genuinely useful structured
  take, *offer* the tool rather than dropping the link unprompted.
- HN threads on decision-making, mental models, "AI slop" (the anti-slop
  positioning fits HN's mood perfectly — comment substance first, mention the
  tool only when relevant).
- F5Bot (free) for Reddit keyword alerts: `decision matrix`, `eisenhower
  matrix`, `pre-mortem`, `can't decide`.

This converts slowly per-touch but it's free, daily, compounding, and trains
your messaging against real objections.

---

## The feedback loop (this is half the point of the first 100)

- **Watch 5 first-sessions live** (screen-share or session replay) in week 1.
  You will find the activation killers in the first three.
- DM every user who activated: "what was the decision, and did the widget
  actually help you decide?" Save verbatim quotes → these replace the fake
  testimonials.
- DM every user who sent a message but bounced before completing a widget:
  "what did you expect to happen?" — this is your router/prefill bug list.
- Weekly ritual (30 min, Fridays): update the funnel numbers (visited → tried
  → activated → returned), pick the single biggest leak, fix only that next
  week.

## Weekly targets & kill criteria

| Week | Focus | Cumulative activated users |
|---|---|---|
| 1 | Prereqs + inner circle DMs + first X posts | 15 |
| 2 | Reddit post #1, IH post, second-degree DMs | 35 |
| 3 | Reddit #2–3, decide-in-public rhythm, judo daily | 65 |
| 4 | Reddit #4, referral asks ("who else is stuck?") | 100 |

**Course-correct signals:**
- DM reply rate <20% → the pitch is wrong; rewrite around *their* decision, not
  the product.
- Activation <30% despite traffic → **stop all promotion**, fix the
  first-minute experience, then resume.
- People activate but nobody returns or shares → frequency problem; shift
  messaging from "life decisions" to weekly work prioritisation (Eisenhower,
  /eis) and re-test.

**Done = 100 completed decisions, ≥10 unprompted return users, ≥5 real
testimonial quotes, and a written list of the top 3 friction points.** That's
the entry ticket to Phase 2 (Product Hunt / Show HN) in the marketing plan.
