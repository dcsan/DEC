An AI decision helper

This is an AI tool you can chat to and use to help make decisions

## type of decision

to help the user we should initially ask some questions
what type of decision?
- **binary choice** — is it an A or B question? (e.g. "should I take this job?")
- **multi-option** — choosing one path from several (e.g. "which city to move to?")
- **future planning** — sequencing actions over time toward a goal
- **risk tradeoff** — weighing potential downside against upside
- **prioritisation** — ranking/ordering many competing items
- **resource allocation** — splitting limited time/money/people across options
- **reversible vs irreversible** — how costly is it to undo? (one-way vs two-way door)
- **group / stakeholder** — multiple people with differing interests must align
- **values clarification** — the hard part is figuring out what you actually want

Each type biases us toward different frameworks (see below) and different
follow-up questions.

## decision frameworks

the app will respond with visual thinking frameworks such as
- **Eisenhower matrix** — urgent/important 2×2, for prioritisation
- **SWOT analysis** — strengths / weaknesses / opportunities / threats
- **scenario planning** — sketch out plausible futures and their implications
- **decision matrix / weighted scoring** — score options against weighted criteria
- **pros & cons (T-chart)** — the simplest baseline, good for binary choices
- **cost–benefit analysis** — quantify tradeoffs where numbers are available
- **2×2 matrix (generic)** — plot options against any two axes the user picks
- **pre-mortem** — imagine the decision failed; work backwards to the causes
- **decision tree** — branch out conditional outcomes and their probabilities
- **expected value table** — outcome × probability for risk tradeoffs
- **OODA / first-principles prompts** — for breaking open a stuck decision
- **regret minimisation** — which choice will you regret least in 10 years?

| framework | best for decision types |
|---|---|
| pros & cons | binary choice |
| decision matrix | multi-option, prioritisation |
| Eisenhower matrix | prioritisation, resource allocation |
| SWOT | binary choice, future planning |
| scenario planning | future planning, risk tradeoff |
| pre-mortem / decision tree | risk tradeoff, irreversible |
| regret minimisation | values clarification, irreversible |

and plot your idea within those

## UX

The core idea: **conversation on the left, spatial thinking on the right.** You
talk through the decision in chat; the AI's frameworks and concepts materialise
as nodes on a canvas you can rearrange, expand, and merge.

### Sidebar + Canvas (primary layout)
- left hand sidebar for chat
- infinite canvas at right using react-flow

#### Wireframe — basic UX layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  DEC                                          decision: "should I relocate?"│  ← top bar: title + decision context
├──────────────────┬─────────────────────────────────────────────────────────┤
│  CHAT SIDEBAR     │  INFINITE CANVAS (react-flow)                  [+] [-] ⊡ │  ← zoom / fit controls
│                   │                                                          │
│ ┌───────────────┐ │            ┌──────────────┐                             │
│ │ AI            │ │            │  Stay        │                             │
│ │ What kind of  │ │       ┌────┤  (option A)  ├────┐                        │
│ │ decision is   │ │       │    └──────────────┘    │                        │
│ │ this?         │ │       │                         │                        │
│ └───────────────┘ │   ┌───┴────┐            ┌───────┴──────┐                 │
│ ┌───────────────┐ │   │ Career │            │  Cost of     │                 │
│ │ You           │ │   │ growth │            │  living      │                 │
│ │ Binary —      │ │   └────────┘            └──────────────┘                 │
│ │ stay or move  │ │       ▲                        ▲   (dimmed: >2 degrees)  │
│ └───────────────┘ │       │    ┌──────────────┐    │                        │
│ ┌───────────────┐ │       └────┤  Relocate    ├────┘                        │
│ │ AI            │ │            │  (option B)  │  ← selected node (focused)  │
│ │ Here's a SWOT │ │            └──────┬───────┘                             │
│ │ on the canvas │ │                   │ click + to expand related ideas     │
│ │ →             │ │                   ▼                                      │
│ └───────────────┘ │            ┌──────────────┐                             │
│                   │            │ Family ties  │ (greyed / out of focus)     │
│ ┌───────────────┐ │            └──────────────┘                             │
│ │ 🔍 search a   │ │                                                          │
│ │   concept...  │ │   ╭─ node controls (on hover/select) ─────────╮          │
│ └───────────────┘ │   │  [＋ expand]  [⤢ details]  [⨯ remove]      │          │
│  └ game theory    │   ╰────────────────────────────────────────────╯        │
│    └ Nash eq.     │                                                          │
│    └ zero-sum  [+]│   drag one node onto another → merge into new node       │
│                   │                                                          │
│ [ type a message…]│                                                          │
└──────────────────┴─────────────────────────────────────────────────────────┘
   ~360px fixed                       flex-grow, pan + zoom
```

Key interactions visible above:
- **chat sidebar** drives the conversation and holds the concept-search tool
- **canvas** holds option nodes, framework nodes and concept nodes
- **node controls** (expand / details / remove) appear on hover or select
- **focus dimming** — selecting a node greys out anything >2 degrees away
- **merge** — drag a node onto another to fuse them into a new node

### other layout options

1. **Canvas-first (chat as overlay)** — the canvas is full-screen and the chat
   collapses into a floating panel or a bottom command bar. Maximises thinking
   space; good once the user is deep in exploration. Chat can be toggled with a
   hotkey.
2. **Stacked / mobile** — chat on top, canvas below (or swipeable tabs). The
   only realistic layout on narrow screens; react-flow stays pannable.
3. **Three-pane** — chat | canvas | details inspector. Selecting a node opens a
   right-hand inspector with the full description, sources, and edit controls
   instead of expanding inline. Better when nodes carry a lot of metadata.
4. **Document / outline view** — a non-spatial alternative that renders the same
   concept graph as a collapsible nested outline. Useful for export, sharing, or
   users who find the canvas overwhelming. Could be a toggle on the same data.
5. **Framework-focused (templated boards)** — instead of a free canvas, the
   right pane is a structured template (e.g. a SWOT 2×2 or decision matrix grid)
   and nodes snap into quadrants/cells. Trades freedom for guided structure.

Decision: ship **Sidebar + Canvas** first; treat (1) and (2) as responsive
states of the same layout, and (5) as a future "snap to framework" mode.

## User journey

A sample conversation showing how chat and canvas move together. The decision:
**"Should I leave my job to start a company?"**

> **AI:** Hi — what decision are you weighing up?
>
> **User:** Whether to quit my job and start my own company.
>
> **AI:** Got it. This sounds like a **binary, mostly-irreversible** choice
> (a one-way door once you've quit). Two good lenses here are a **SWOT** and a
> **pre-mortem**. Want me to start with a SWOT?
> *→ adds a `Quit & start company` option node and a `Stay employed` option node
> to the canvas.*
>
> **User:** Yes, SWOT please.
>
> **AI:** Done — I've laid out a SWOT around "Quit & start company".
> *→ adds four child nodes: `Strengths: domain expertise`, `Weaknesses: no
> runway`, `Opportunities: growing market`, `Threats: well-funded incumbents`.*
> What's your current financial runway?
>
> **User:** About 8 months of savings.
>
> **AI:** That's a real constraint — I'll flag the runway node. Let's pressure-
> test it with a quick pre-mortem: imagine it's 12 months out and the company
> failed. What's the most likely cause?
> *→ highlights `Weaknesses: no runway`, adds a `Pre-mortem: ran out of cash`
> node linked to it.*
>
> **User:** Probably I couldn't get to revenue fast enough. *(searches the
> sidebar for "lean startup")*
>
> *→ concept search returns a tree: Lean Startup → MVP, build-measure-learn,
> pivot. User clicks `+` on **MVP** to add it to the canvas.*
>
> **User:** *(drags the `MVP` node onto `Opportunities: growing market`)*
>
> **AI:** Merged those into **"Validate market with an MVP before quitting"** —
> a way to test the opportunity while keeping your runway intact.
> *→ creates a new merged node with a one-paragraph description (hidden until
> expanded).*
>
> **AI:** Here's where you've landed: the strongest path reduces the
> irreversibility — run a small MVP on nights/weekends to de-risk before you
> commit your 8-month runway. Want me to turn this into an action plan?

Notice the pattern each turn: **the AI narrates in chat and mutates the canvas in
the same beat**, so the conversation and the spatial map never drift apart.

## Adding ideas
the user can search for concepts in the chat sidebar
we use an LLM to research that idea and then present one or two word key concepts related to that
in a tree structure
click 'expand' to see details on the concept
these can be clicked + icon to add to the canvas

eg the user searches **"game theory"**. The LLM returns a tree of one/two-word
key concepts:

```
game theory
├─ Nash equilibrium
│   └─ expand → "A stable state where no player gains by changing strategy alone."
├─ zero-sum                         [+]   ← added to canvas
├─ prisoner's dilemma               [+]   ← added to canvas
│   └─ expand → "Two rational actors fail to cooperate even when it's mutually best."
├─ cooperative games
├─ dominant strategy
└─ tit-for-tat
```

Behaviour:
- the tree is collapsed to titles by default; **expand** reveals the LLM's
  one-line description for that concept
- each leaf has a **`+`** icon → clicking it adds that concept as a node on the
  canvas
- in this example the user adds **zero-sum** and **prisoner's dilemma**; the
  others stay in the sidebar tree for later
- added nodes link back to their parent search term, so the canvas keeps a trace
  of where each idea came from

## expanding ideas
the user can click a node on the canvas to expand and find related ideas, like an automated 'mindmap'
related concepts are added to the graph.
the user can keep expanding ideas to add more

## Merging ideas
if the user drags a node onto another, we create a NEW node which is the merging of those two concepts
using an LLM we combine the two ideas to create a new one
using a structured query
- one to three word title
- longer one paragraph description
description is hidden unless the user expands the node


## Node Focus
when you click a node we DIM out all other nodes beyond two degrees of separation.
to let the user focus on that idea
