# Shortcuts:

Add some shortcut questions to the chat input box.
if the user types /q1 or q1

then simulate as if they had typed this question.

q1: "should I join a startup or a large multinational company?"
q2: "should i quit my corporate job to join a startup?"
q3: "Should I move to New York or San Francisco?"

In this case, we also want to see the question, not just the Q1, and then the answer.

so

/q1
user: should I ....
agent: answers...

///

After the question is sent to the agent,

add a RHS sidebar where we can see the request text sent and the response
This should show the prompts going in and out of the system.
Add a button at the top right with a little brain icon that will open the right-hand sidebar where we can see all of this going on.

///

reflect

add a /reflect command
This should review the conversation and then decide how good the proposed solution is based on the information that was provided.

Then it should review the thinking process that the agent went through and propose how to improve that process to get to a better solution, given the final information that it knows now.

///

/explain

add an explain process that details what the input and output for the last question was

///

Change the research command to use the you.com API

```ts
const url = "https://api.you.com/v1/research";
const options = {
  method: "POST",
  headers: { "X-API-Key": "YDC_API_KEY", "Content-Type": "application/json" },
  body: '{"input":"Which global cities improved air quality the most over the past 10 years, and what measurable actions contributed?","research_effort":"standard"}',
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

///

apply

create an /apply command that will modify the questions asked to the user for this specific question
to improve the conversation

///

add a /random command to ask a random short question to the system
This should start a new chat session.

///

/review

echo a very short summary of what was done in this session
The question the user asked, our qualifying response questions, the updates that were made to the system
