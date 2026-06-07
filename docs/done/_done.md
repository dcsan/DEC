# Done items

- [x] up arrow
While the chat box is focused, up arrow recalls previous sent messages (Slack-style).
done: composer ArrowUp walks back through `sentHistory` (the lines you've sent), ArrowDown walks forward then to a blank draft; typing/sending resets the cursor. Up is only hijacked when the draft is empty or you're already browsing history, so multi-line editing still works.
when: 2026-06-07

- [x] slash focus
On the Chat page, typing a slash focuses the chat input immediately.
done: a window keydown listener catches `/` when you're not already in a field, focuses the composer and inserts the slash (opening the slash-command popup).
when: 2026-06-07

- [x] /session
Add a command to show the current session ID so we can look in honcho for facts
done: `/session` (aliases `/sid`, `/sessionid`) echoes the current client session id as a code block, handled locally — paste it into Honcho to find this conversation's facts.
when: 2026-06-07

- [x] /diff command
add a diff command to show the difference between user.conclusions and dec.conclusionsOf(user)
done: `/diff` (facts.diff endpoint) lists each perspective's facts — shared, only-DEC, and only-self — so you can see where DEC's model of the user and the user's self-model diverge.

- [x] /summary
recall what we're talking about using honcho and provide a short summary
done: `/summary` recalls the session via Honcho (getSessionContext) and has the LLM write a short 2-3 sentence recap (summary.run endpoint).

- [x] slash commands
Similar to Slack or Discord
Implement some kind of a pop-up for slash commands.
when the user types a command starting with /
show the list of current slash commands
then filtered by what they type next
eg /e would show all commands starting with "e"
done: typing `/word` shows an autocomplete popup of all widget + action commands filtered by the prefix; arrow/enter/tab to pick, esc/mouse to dismiss (allSlashCommands() + composer popup).

- [x] sessions
add a way to create a new session
On the hamburger menu, add a button which is /new chat
it should show in the main chat /new as if you typed it.
then implement /new command

Basically, this should just change the current session ID that we're using so that the server-side honcho will track this as a new conversation with a new decision to be made.
done: `/new` (and a "New chat" hamburger item) clears the stream and rotates the client sessionId, so Honcho tracks a fresh conversation.

- [x] facts
add a /facts command

This should query honcho for the list of facts that we know about this user and session.
using API

/conclusions/list

just show the content for each one
done: `/facts` calls a new facts.list tRPC endpoint that lists Honcho conclusions about the user for the session and renders each fact's content.

- [x] intro

change the intro text to:

Describe a decision (e.g. "should I join a startup?") and I'll surface a thinking framework to help.
Type /help for more.
done: replaced the empty-state intro with the new two-line copy.

- [x] format help

format the /help text using some basic markdown rendering. The commands themselves should be fenced off as code blocks, and remove the initial dash so it's not a bulleted list; it's just a list of items.

- [x] visualize decision
Create a new /viz command. This should review the most recent conversation history and create an on-the-fly SVG diagram of the considerations and the decision that we're trying to make.

Keep it as a system diagram of the kind of ideas, a little bit like a PowerPoint clip art or format. For example, you might use things like:
- a funnel or a triangle to describe different market segments
- a cycle diagram if things depend on each other
- a grid where the different items are in different sectors of a grid
Of course, the full range of the existing decision framework illustrations, but this time just rendered as an SVG dynamically injected into the page.

- [x] side menu
Add a hamburger menu icon that will be at the left of the chat box.
When you click this, one of the options is "Upload documents".
this should show the current 'add context' message component.

