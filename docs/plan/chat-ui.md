Chat view

create a new route and main view for this

this should be a plain chat input box at the bottom

create a 'widgets' directory
when the user types /pc drop a ProCon widget into the main view

this should NOT use react-flow
keep the components simple and standalone

add a 'send' button on the procon widget to send those results back to the chat

each widget needs a spec file that will describe how to format its output for sending back to chat

## Slash widgets (chat `/command`)

Frameworks mirror `overview.md`. First word after `/` is matched (lowercase). Examples:

| Command examples | Widget |
|------------------|--------|
| `/pc`, `/procon` | Pros & cons (T-chart) |
| `/22`, `/twobytwo`, `/2x2` | Generic 2×2 drag-swap grid |
| `/eisenhower`, `/ike`, `/urgent-important` | Eisenhower matrix |
| `/swot` | SWOT |
| `/scenario`, `/futures`, `/whatif` | Scenario planning |
| `/dmatrix`, `/scores`, `/decisionmatrix` | Decision matrix / weighted scores |
| `/costbenefit`, `/cba` | Cost–benefit |
| `/premortem`, `/premort`, `/failureprep` | Pre-mortem |
| `/dtree`, `/dectree` | Decision tree |
| `/evtable`, `/expvalue` | Expected value table |
| `/ooda`, `/loop`, `/firstprinciples` | OODA / first principles |
| `/regret`, `/10years` | Regret minimisation |

