lets use honcho to create a session, add a peer, and query the representation of the peer based on the messages added.

```
import Honcho from "honcho-ai";

const honcho = new Honcho({ apiKey: "YOUR_API_KEY" });

// Create a session and add a peer
const session = await honcho.sessions.create("dec");
await honcho.sessions.addPeers("dec", session.id, { "user_123": { observeMe: true } });

// Add messages
await honcho.messages.create("dec", session.id, "user_123", { content: "I love hiking", isUser: true });

// Query the representation
const response = await honcho.peers.chat("dec", "user_123", { query: "What does this user like?" });
console.log(response.content);
```

