add some more features to the '2x2' matrix choice.

* redo axes

when the user has added a few items to the grid

move button 'suggest axes' to below the chart
on click:
expand a 'settings' area under the chart
use an LLM to choose some extra options for the two axes
to better compare the featured items

calculate 5 options of how to compare all the items on the grid
show the list of axes
and let the user choose up to two options and 'set axes'

also leave an empty line where the user can add an axis of their own

on setting those new axes, we would also submit all the current items on the grid
the LLM would then re-score those items on the two picked axes
return values and the UI will place items on those axes

* more options
next to existing options add a "generate" button

the widget should suggest other similar options and also score them

eg if the user is comparing apples, oranges

the LLM should first decide what the items have in common

eg 'fruit' then suggest other items in that category: strawberries, bananas etc.
eg 'car, bike' == transport -> suggest: bus, ferry, walk

and rank the items on the current active Axes
return item names and scores and pre-place them on the grid.

---
done: 2×2 widget gained a "⚙ redo axes" panel (appears once ≥2 options exist) — `axes.options` proposes 5 ways to compare, user picks up to two (or types their own), then `axes.score` re-scores every option in place — plus a "✨ generate" button that calls `axes.generate` to infer the shared category, suggest 3-5 new similar options scored on the active axes, and pre-place them on the grid.
at: 2026-06-07

