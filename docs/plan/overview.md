An AI decision helper

This is an AI tool you can chat to and use to help make decisions

## type of decision

to help the user we should initially ask some questions
what type of decision?
- is it an A or B question?
- future planning
- risk tradeoff
TODO: add more types

## decision frameworks

the app will respond with visual thinking frameworks such as
- eisenhower matrix,
- SWOT analysis,
- scenario planning.
TODO: add more types

and plot your idea within those

## UX

still researching

### Sidebar + Canvas
- left hand sidebar for chat
- infinite canvas at right using react-flow

### other layout options
TODO: some other options

## User journey
TODO: fill in a sample conversation

## Adding ideas
the user can search for concepts in the chat sidebar
we use an LLM to research that idea and then present one or two word key concepts related to that
in a tree structure
click 'expand' to see details on the concept
these can be clicked + icon to add to the canvas

eg "game theory"
TODO: fill out example search results + which items are added

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
