<div align="center">

<img src="web-dec/client/public/logo.svg" width="80" height="80" alt="ViziThink" />

# ViziThink.com

### Your AI Decision Buddy

Make complex decisions with visual thinking frameworks. ViziThink turns the
churn of analysis into a clear picture you can act on.

</div>

---

## Why ViziThink

As we work more with AI, the role of the human is to make **fewer, better
decisions**.

AI can help with the analysis and research — but the information has to be
presented clearly. We're drowning in pages of "deep research" AI slop.

**ViziThink helps you get to the point quickly.**

## A framework for every decision

Drop a tool into the chat with a slash command, or just describe your decision
and let ViziThink pick the right one.

| Command | Framework | What it's for |
|---|---|---|
| `/2x2` | **2×2 Matrix** | Plot options against two axes to see the trade-offs at a glance. |
| `/pc` | **Pros & Cons** | Weigh each factor for and against — no slog, just the signal. |
| `/eis` | **Eisenhower** | Sort by urgent vs. important so you act on what matters. |
| `/pm` | **Pre-mortem** | Assume it failed, work backwards, and de-risk before you commit. |

…plus SWOT, cost–benefit, decision tree, expected value, OODA, scenario
planning, regret minimisation, and more — each a self-contained widget that
posts its result back into the conversation.

## Clearer heads, faster calls

> "I used to drown in twelve-tab research spirals. ViziThink got me to a
> decision in one afternoon."
> — **Maya R.**, Founder, seed-stage SaaS

> "The 2×2 is deceptively simple. Seeing the options laid out killed three weeks
> of going in circles."
> — **Daniel K.**, Product lead

> "It's the first AI tool that made me think more clearly instead of just
> handing me a wall of text."
> — **Priya S.**, Engineering manager

## Stay in the loop

Follow updates at [ViziThink.com](https://vizithink.com) and we'll let you know
about new features and early access.

---

## Run it locally

The whole app lives in [`web-dec/`](web-dec/) (a Cloudflare Worker + React SPA).

```bash
cd web-dec
pnpm install
cp .dev.vars.example .dev.vars   # add your keys (optional — it runs key-less)
pnpm run dev                     # client on :6391, Worker on :6390
```

Then open `/chat` and describe a decision. LLM features use
`OPENROUTER_API_KEY`; everything degrades gracefully without it. See
[`CLAUDE.md`](CLAUDE.md) for the architecture and full command list.
