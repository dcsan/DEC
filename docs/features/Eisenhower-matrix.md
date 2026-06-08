Eisenhower matrix


create a new widget 'Eisenhower'

purpose: to help you prioritize and decide on what task to do next

this is the 'important / urgent' matrix

to the widget spec also include a 'purpose' field, what this chart is good for.

the chart should start with items at the bottom
and you have to drag them into the right place in the 2x2 matrix

then hit 'send'

it will format the data back in this way

each widget should send a response which is the structured response
but also know how to send a plain text response too
programmatically - using a template to format the output

eg structured might be

```
entries: [
    {
        important: 1,
        urgent: 0,
        text: "pay taxes"
    },
    {
        important: 0,
        urgent: 1,
        text: "respond to slack messages"
    }
]
```

but the agent should know how to format this in a way as plain text that is useful to an AI agent to understand.

```
Here is a list of tasks
Important but not urgent tasks: Pay Taxes
Urgent but not important tasks: respond to slack messages
```

