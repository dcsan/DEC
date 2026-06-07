Features

- [x] /diff command
add a diff command to show the difference between

user.conclusions
dec.conclusionsOf(user)

based on the chat below, they seem to maybe be a bit different:

-----

❯   One small caveat to revisit on /facts (from the prior round): it reads the user peer's
  self-conclusions;
    if Honcho actually stores its facts as the assistant's observations, that's a one-line switch to
    assistant.conclusionsOf(user).

  whats the diff?

⏺ It's about whose perspective the fact is stored under. Honcho models every conclusion as a directed
  (observer → observed) pair: who concluded it, and about whom. The current code and the alternative differ
  only on the observer:

  ┌──────────────────────────┬─────────────┬──────────┬───────────────────────────────────────────────┐
  │           Call           │  observer   │ observed │                    Meaning                    │
  ├──────────────────────────┼─────────────┼──────────┼───────────────────────────────────────────────┤
  │                          │             │          │ What the user peer concluded about itself —   │
  │ user.conclusions         │ user        │ user     │ its self-model. The SDK literally calls this  │
  │ (current)                │             │          │ "self-conclusions (where observer == observed │
  │                          │             │          │  == self)".                                   │
  ├──────────────────────────┼─────────────┼──────────┼───────────────────────────────────────────────┤
  │ dec.conclusionsOf(user)  │ dec         │ user     │ What DEC inferred about the user while        │
  │ (alt)                    │ (assistant) │          │ talking to them.                              │
  └──────────────────────────┴─────────────┴──────────┴───────────────────────────────────────────────┘

  Both are "facts about the user" (observed = user either way) — the split is who did the observing.

  Why it matters in practice: in this app, user turns are authored by the user peer and assistant turns by
  dec. Honcho's deriver builds a peer's representation of the others it's in a session with — so DEC
  naturally accumulates conclusions about the user (dec.conclusionsOf(user)). Whether the user also forms
  self-conclusions (user.conclusions) depends on Honcho's observe_me/local-vs-global representation
  settings, and is often empty by default. So:

  - If /facts comes back empty when you'd expect data → the facts are living under dec.conclusionsOf(user),
  not user.conclusions.
  - "Facts we (DEC) know about the user" is, semantically, exactly dec.conclusionsOf(user) — arguably the
  more correct call regardless.

  The safest version queries both and merges (self-conclusions + DEC's conclusions about the user,
  deduped). It's a few lines, not one — but it can't come back empty for the wrong reason.

---
done: Added `/diff` command — `facts.diff` tRPC procedure reads both `dec.conclusionsOf(user)` and `user.conclusions` (per-session), returns set-diff (both / DEC-only / self-only); wired into ChatView (grouped markdown reply) + slash autocomplete. Shared `collectConclusions` helper refactored out of `/facts`.
at: 2026-06-07 05:56:29 EDT
