Auth

we need to implement 'oAuth' for people to sign on

Set up Neon Auth for my project. Enable Google OAuth and email/password sign-in,
and set the application name to "dec".

then integrate with openAI

we're using Neon Auth for auth, so ignore all information below about other services such as replit.


https://developers.openai.com/apps-sdk/build/auth


# Building MCP servers for ChatGPT Apps and API integrations

[Model Context Protocol](https://modelcontextprotocol.io/introduction) (MCP) is an open protocol that's becoming the industry standard for extending AI models with additional tools and knowledge. Remote MCP servers can be used to connect models over the Internet to new data sources and capabilities.

In this guide, we'll cover how to build a remote MCP server that reads data from a private data source (a [vector store](https://developers.openai.com/api/docs/guides/retrieval)) and makes it available in ChatGPT as a data-only app (formerly called a connector) for chat, deep research, and company knowledge, as well as [via API](https://developers.openai.com/api/docs/guides/deep-research).

**Note**: For ChatGPT app setup (developer mode, connecting your MCP server, and optional UI), start with the Apps SDK docs: [Quickstart](https://developers.openai.com/apps-sdk/quickstart), [Build your MCP server](https://developers.openai.com/apps-sdk/build/mcp-server), [Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt), and [Authentication](https://developers.openai.com/apps-sdk/build/auth). If you are building a data-only app, you can skip UI resources and just expose tools.

**Terminology update**: As of **December 17, 2025**, ChatGPT renamed connectors to apps. Existing functionality remains, but current docs and product UI use "apps". See the Help Center updates: [ChatGPT apps with sync](https://help.openai.com/en/articles/10847137-chatgpt-apps-with-sync), [Company knowledge in ChatGPT](https://help.openai.com/en/articles/12628342-company-knowledge-in-chatgpt-business-enterprise-and-edu), and [Admin controls, security, and compliance in apps](https://help.openai.com/en/articles/11509118-admin-controls-security-and-compliance-in-apps-connectors-enterprise-edu-and-business).

## Configure a data source

You can use data from any source to power a remote MCP server, but for simplicity, we will use [vector stores](https://developers.openai.com/api/docs/guides/retrieval) in the OpenAI API. Begin by uploading a PDF document to a new vector store - [you can use this public domain 19th century book about cats](https://cdn.openai.com/API/docs/cats.pdf) for an example.

You can upload files and create a vector store [in the dashboard here](https://platform.openai.com/storage/vector_stores), or you can create vector stores and upload files via API. [Follow the vector store guide](https://developers.openai.com/api/docs/guides/retrieval) to set up a vector store and upload a file to it.

Make a note of the vector store's unique ID to use in the example to follow.

![vector store configuration](https://cdn.openai.com/API/docs/images/vector_store.png)

## Create an MCP server

Next, let's create a remote MCP server that will do search queries against our vector store, and be able to return document content for files with a given ID.

In this example, we are going to build our MCP server using Python and [FastMCP](https://github.com/jlowin/fastmcp). A full implementation of the server will be provided at the end of this section, along with instructions for running it on [Replit](https://replit.com/).

Note that there are a number of other MCP server frameworks you can use in a variety of programming languages. Whichever framework you use though, the tool definitions in your server will need to conform to the shape described here.

To work with ChatGPT deep research and company knowledge (and deep research via API), your MCP server should implement two read-only tools: `search` and `fetch`, using the compatibility schema in [Company knowledge compatibility](https://developers.openai.com/apps-sdk/build/mcp-server#company-knowledge-compatibility).

Declare an output schema for each tool so clients can validate the result shape.
In FastMCP, typed return models can generate this schema automatically; the
example below passes `output_schema` explicitly from the same models.

### `search` tool

The `search` tool is responsible for returning a list of relevant search results from your MCP server's data source, given a user's query.

_Arguments:_

A single query string.

_Returns:_

An object with a single key, `results`, whose value is an array of result objects. Each result object should include:

- `id` - a unique ID for the document or search result item
- `title` - human-readable title.
- `url` - canonical URL for citation.

In MCP, return this object as `structuredContent` and include the same value as
a JSON-encoded string in the [content array](https://modelcontextprotocol.io/docs/learn/architecture#understanding-the-tool-execution-response)
for compatibility.

The final tool response should look like:

```json
{
  "structuredContent": {
    "results": [{ "id": "doc-1", "title": "...", "url": "..." }]
  },
  "content": [
    {
      "type": "text",
      "text": "{\"results\":[{\"id\":\"doc-1\",\"title\":\"...\",\"url\":\"...\"}]}"
    }
  ]
}
```

### `fetch` tool

The fetch tool is used to retrieve the full contents of a search result document or item.

_Arguments:_

A string which is a unique identifier for the search document.

_Returns:_

A single object with the following properties:

- `id` - a unique ID for the document or search result item
- `title` - a string title for the search result item
- `text` - The full text of the document or item
- `url` - a URL to the document or search result item. Useful for citing
  specific resources in research.
- `metadata` - an optional key/value pairing of data about the result

In MCP, return this object as `structuredContent` and include the same value as
a JSON-encoded string in the content array for compatibility.

The final tool response should look like:

```json
{
  "structuredContent": {
    "id": "doc-1",
    "title": "...",
    "text": "full text...",
    "url": "https://example.com/doc",
    "metadata": { "source": "vector_store" }
  },
  "content": [
    {
      "type": "text",
      "text": "{\"id\":\"doc-1\",\"title\":\"...\",\"text\":\"full text...\",\"url\":\"https://example.com/doc\",\"metadata\":{\"source\":\"vector_store\"}}"
    }
  ]
}
```

### Server example

An easy way to try out this example MCP server is using [Replit](https://replit.com/). You can configure this sample application with your own API credentials and vector store information to try it yourself.

<a href="https://replit.com/@kwhinnery-oai/DeepResearchServer?v=1#README.md">


<span slot="icon">
      </span>
    Remix the server example on Replit to test live.


</a>

A full implementation of both the `search` and `fetch` tools in FastMCP is below also for convenience.

Full implementation - FastMCP server

```python
"""
Sample MCP Server for ChatGPT Integration

This server implements the Model Context Protocol (MCP) with search and fetch
capabilities designed to work with ChatGPT's chat and deep research features.
"""

import logging
import os
from typing import Any

from fastmcp import FastMCP
from openai import OpenAI
from pydantic import BaseModel


class SearchResult(BaseModel):
    id: str
    title: str
    url: str


class SearchOutput(BaseModel):
    results: list[SearchResult]


class FetchOutput(BaseModel):
    id: str
    title: str
    text: str
    url: str
    metadata: dict[str, Any] | None = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OpenAI configuration
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
VECTOR_STORE_ID = os.environ.get("VECTOR_STORE_ID", "")

# Initialize OpenAI client
openai_client = OpenAI()

server_instructions = """
This MCP server provides search and document retrieval capabilities
for ChatGPT Apps and deep research. Use the search tool to find relevant documents
based on keywords, then use the fetch tool to retrieve complete
document content with citations.
"""


def create_server():
    """Create and configure the MCP server with search and fetch tools."""

    # Initialize the FastMCP server
    mcp = FastMCP(name="Sample MCP Server",
                  instructions=server_instructions)

    @mcp.tool(output_schema=SearchOutput.model_json_schema())
    async def search(query: str) -> SearchOutput:
        """
        Search for documents using OpenAI Vector Store search.

        This tool searches through the vector store to find semantically relevant matches.
        Returns a list of search results with basic information. Use the fetch tool to get
        complete document content.

        Args:
            query: Search query string. Natural language queries work best for semantic search.

        Returns:
            Dictionary with 'results' key containing list of matching documents.
            Each result includes id, title, and URL.
        """
        if not query or not query.strip():
            return SearchOutput(results=[])

        if not openai_client:
            logger.error("OpenAI client not initialized - API key missing")
            raise ValueError(
                "OpenAI API key is required for vector store search")

        # Search the vector store using OpenAI API
        logger.info(f"Searching {VECTOR_STORE_ID} for query: '{query}'")

        response = openai_client.vector_stores.search(
            vector_store_id=VECTOR_STORE_ID, query=query)

        results = []

        # Process the vector store search results
        if hasattr(response, 'data') and response.data:
            for i, item in enumerate(response.data):
                # Extract file_id, filename, and content
                item_id = getattr(item, 'file_id', f"vs_{i}")
                item_filename = getattr(item, 'filename', f"Document {i+1}")

                result = SearchResult(
                    id=item_id,
                    title=item_filename,
                    url=f"https://platform.openai.com/storage/files/{item_id}",
                )

                results.append(result)

        logger.info(f"Vector store search returned {len(results)} results")
        return SearchOutput(results=results)

    @mcp.tool(output_schema=FetchOutput.model_json_schema())
    async def fetch(id: str) -> FetchOutput:
        """
        Retrieve complete document content by ID for detailed
        analysis and citation. This tool fetches the full document
        content from OpenAI Vector Store. Use this after finding
        relevant documents with the search tool to get complete
        information for analysis and proper citation.

        Args:
            id: File ID from vector store (file-xxx) or local document ID

        Returns:
            Complete document with id, title, full text content,
            optional URL, and metadata

        Raises:
            ValueError: If the specified ID is not found
        """
        if not id:
            raise ValueError("Document ID is required")

        if not openai_client:
            logger.error("OpenAI client not initialized - API key missing")
            raise ValueError(
                "OpenAI API key is required for vector store file retrieval")

        logger.info(f"Fetching content from vector store for file ID: {id}")

        # Fetch file content from vector store
        content_response = openai_client.vector_stores.files.content(
            vector_store_id=VECTOR_STORE_ID, file_id=id)

        # Get file metadata
        file_info = openai_client.vector_stores.files.retrieve(
            vector_store_id=VECTOR_STORE_ID, file_id=id)

        # Extract content from paginated response
        file_content = ""
        if hasattr(content_response, 'data') and content_response.data:
            # Combine all content chunks from FileContentResponse objects
            content_parts = []
            for content_item in content_response.data:
                if hasattr(content_item, 'text'):
                    content_parts.append(content_item.text)
            file_content = "\n".join(content_parts)
        else:
            file_content = "No content available"

        # Use filename as title and create proper URL for citations
        filename = getattr(file_info, 'filename', f"Document {id}")

        result = FetchOutput(
            id=id,
            title=filename,
            text=file_content,
            url=f"https://platform.openai.com/storage/files/{id}",
        )

        # Add metadata if available from file info
        if hasattr(file_info, 'attributes') and file_info.attributes:
            result.metadata = dict(file_info.attributes)

        logger.info(f"Fetched vector store file: {id}")
        return result

    return mcp


def main():
    """Main function to start the MCP server."""
    # Verify OpenAI client is initialized
    if not openai_client:
        logger.error(
            "OpenAI API key not found. Please set OPENAI_API_KEY environment variable."
        )
        raise ValueError("OpenAI API key is required")

    logger.info(f"Using vector store: {VECTOR_STORE_ID}")

    # Create the MCP server
    server = create_server()

    # Configure and start the server
    logger.info("Starting MCP server on 0.0.0.0:8000")
    logger.info("Server will be accessible via SSE transport")

    try:
        # Use FastMCP's built-in run method with SSE transport
        server.run(transport="sse", host="0.0.0.0", port=8000)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise


if __name__ == "__main__":
    main()
```

Replit setup

On Replit, you will need to configure two environment variables in the "Secrets" UI:

- `OPENAI_API_KEY` - Your standard OpenAI API key
- `VECTOR_STORE_ID` - The unique identifier of a vector store that can be used for search - the one you created earlier.

On free Replit accounts, server URLs are active for as long as the editor is active, so while you are testing, you'll need to keep the browser tab open. You can get a URL for your MCP server by clicking on the chainlink icon:

![replit configuration](https://cdn.openai.com/API/docs/images/replit.png)

In the long dev URL, ensure it ends with `/sse/`, which is the server-sent events (streaming) interface to the MCP server. This is the URL you will use to connect your app in ChatGPT and call it via API. An example Replit URL looks like:

```
https://777xxx.janeway.replit.dev/sse/
```

## Test and connect your MCP server

You can test your MCP server with a deep research model [in the prompts dashboard](https://platform.openai.com/chat). Create a new prompt, or edit an existing one, and add a new MCP tool to the prompt configuration. Remember that MCP servers used via API for deep research have to be configured with no approval required.

If you are testing this server in ChatGPT as an app, follow [Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt).

![prompts configuration](https://cdn.openai.com/API/docs/images/prompts_mcp.png)

Once you have configured your MCP server, you can chat with a model using it via the Prompts UI.

![prompts chat](https://cdn.openai.com/API/docs/images/chat_prompts_mcp.png)

You can test the MCP server using the Responses API directly with a request like this one:

```bash
curl https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
  "model": "o4-mini-deep-research",
  "input": [
    {
      "role": "developer",
      "content": [
        {
          "type": "input_text",
          "text": "You are a research assistant that searches MCP servers to find answers to your questions."
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "Are cats attached to their homes? Give a succinct one page overview."
        }
      ]
    }
  ],
  "reasoning": {
    "summary": "auto"
  },
  "tools": [
    {
      "type": "mcp",
      "server_label": "cats",
      "server_url": "https://777ff573-9947-4b9c-8982-658fa40c7d09-00-3le96u7wsymx.janeway.replit.dev/sse/",
      "allowed_tools": [
        "search",
        "fetch"
      ],
      "require_approval": "never"
    }
  ]
}'
```

### Handle authentication

As someone building a custom remote MCP server, authorization and authentication help you protect your data. We recommend using OAuth with [Client ID Metadata Documents](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization#client-id-metadata-documents) for client registration when your authorization server supports CIMD and the connector creator chooses it. ChatGPT supports CIMD with public-client token exchange (`none`) or signed client assertion token exchange (`private_key_jwt`). Dynamic client registration remains supported when configured. For ChatGPT app auth requirements, see [Authentication](https://developers.openai.com/apps-sdk/build/auth). For protocol details, read the [MCP user guide](https://modelcontextprotocol.io/docs/concepts/transports#authentication-and-authorization) or the [authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).

If you connect your custom remote MCP server in ChatGPT as an app, users in your workspace will get an OAuth flow to your application.

### Connect in ChatGPT

1. Import your remote MCP server in [ChatGPT settings](https://chatgpt.com/#settings).
1. Create and configure your app in **Apps & Connectors** using your server URL.
1. Test your app by running prompts in chat and deep research.

For detailed setup steps, see [Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt).

## Risks and safety

Custom MCP servers enable you to connect your ChatGPT workspace to external applications, which allows ChatGPT to access, send and receive data in these applications. Please note that custom MCP servers are not developed or verified by OpenAI, and are third-party services that are subject to their own terms and conditions.

If you come across a malicious MCP server, please report it to security@openai.com.

### Prompt injection-related risks

Prompt injections are a form of attack where an attacker embeds malicious instructions in content that one of our models is likely to encounter–such as a webpage–with the intention that the instructions override ChatGPT’s intended behavior. If the model obeys the injected instructions it may take actions the user and developer never intended—including sending private data to an external destination.

For example, you might ask ChatGPT to find a restaurant for a group dinner by checking your calendar and recent emails. While researching, it might encounter a malicious comment—essentially a harmful piece of content designed to trick the agent into performing unintended actions—directing it to retrieve a password reset code from Gmail and send it to a malicious website.

Below is a table of specific scenarios to consider. We recommend reviewing this table carefully to inform your decision about whether to use custom MCPs.

| Scenario / Risk                                                                                                                                                                                                                                                                                                                                                                                                                            | Is it safe if I trust the MCP’s developer?                                                                                                                                                                                                                                                       | What can I do to reduce risk?                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| An attacker may somehow insert a prompt injection attack into data accessible via the MCP. <br /><br />_Examples:_<br />• For a customer support MCP, an attacker could send you a customer support request with a prompt injection attack.                                                                                                                                                                                                | Trusting a MCP’s developer does not make this safe.<br /><br />For this to be safe you need to trust _all content that can be accessed within the MCP_.                                                                                                                                          | • Do not use a MCP if it could contain malicious or untrusted user input, even if you trust the developer of the MCP.<br />• Configure access to minimize how many people have access to the MCP.                                                                                                                              |
| A malicious MCP may request excessive parameters to a read or write action. <br /><br />_Example:_<br />• An employee flight booking MCP could expose a read action to get a flight schedule, but request parameters including `summaryOfConversation`, `userAnnualIncome`, `userHomeAddress`.                                                                                                                                             | Trusting a MCP’s developer does not necessarily make this safe.<br /><br />A MCP’s developer may consider it reasonable to be requesting certain data that you do not consider acceptable to share.                                                                                              | • When sideloading MCPs, carefully review the parameters being requested for each action and ensure there is no privacy overreach.                                                                                                                                                                                             |
| An attacker may use a prompt injection attack to trick ChatGPT into fetching sensitive data from a custom MCP, to then be sent to the attacker. <br /><br />_Example:_<br />• An attacker may deliver a prompt injection attack to one of the enterprise users via a different MCP (e.g. for email), where the attack attempts to trick ChatGPT into reading sensitive data from some internal tool MCP and then attempt to exfiltrate it. | Trusting a MCP’s developer does not make this safe.<br /><br />Everything within the new MCP could be safe and trusted since the risk is this data being stolen by attacks coming from a different malicious source.                                                                             | • _ChatGPT is designed to protect users_, but attackers may attempt to steal your data, so be aware of the risk and consider whether taking it makes sense.<br />• Configure access to minimize how many people have access to MCPs with particularly sensitive data.                                                          |
| An attacker may use a prompt injection attack to exfiltrate sensitive information through a write action to a custom MCP. <br /><br />_Example:_<br />• An attacker uses a prompt injection attack (via a different MCP) to trick ChatGPT into fetching sensitive data, and then exfiltrates it by tricking ChatGPT into using a MCP for a customer support system to send it to the attacker.                                             | Trusting a MCP’s developer does not make this safe.<br /><br />Even if you fully trust the MCP, if write actions have any consequences that can be observed by an attacker, they could attempt to take advantage of it.                                                                          | • Users should review write actions carefully when they happen (to ensure they were intended and do not contain any data that shouldn’t be shared).                                                                                                                                                                            |
| An attacker may use a prompt injection attack to exfiltrate sensitive information through a read action to a malicious custom MCP (since these can be logged by the MCP).                                                                                                                                                                                                                                                                  | This attack only works if the MCP is malicious, or if the MCP incorrectly marks write actions as read actions.<br /><br />If you trust a MCP’s developer to correctly only mark read actions as _read_, and trust that developer to not attempt to steal data, then this risk is likely minimal. | • Only use MCPs from developers that you trust (though note this isn’t sufficient to make it safe).                                                                                                                                                                                                                            |
| An attacker may use a prompt injection attack to trick ChatGPT into taking a harmful or destructive write action via a custom MCP that users did not intend.                                                                                                                                                                                                                                                                               | Trusting a MCP’s developer does not make this safe.<br /><br />Everything within the new MCP could be safe and trusted, and this risk still exists since the attack comes from a different malicious source.                                                                                     | • Users should carefully review write actions to ensure they are intended and correct.<br />• ChatGPT is designed to protect users, but attackers may attempt to trick ChatGPT into taking unintended write actions.<br />• Configure access to minimize how many people have access to MCPs with particularly sensitive data. |

### Non-prompt injection related risks

There are additional risks of custom MCPs, unrelated to prompt injection attacks:

- **Write actions can increase both the usefulness and the risks of MCP servers**, because they make it possible for the server to take potentially destructive actions rather than simply providing information back to ChatGPT. ChatGPT currently requires manual confirmation in any conversation before write actions can be taken. The confirmation will flag potentially sensitive data but you should only use write actions in situations where you have carefully considered, and are comfortable with, the possibility that ChatGPT might make a mistake involving such an action. It is possible for write actions to occur even if the MCP server has tagged the action as read only, making it even more important that you trust the custom MCP server before deploying to ChatGPT.
- **Any MCP server may receive sensitive data as part of querying**. Even when the server is not malicious, it will have access to whatever data ChatGPT supplies during the interaction, potentially including sensitive data the user may earlier have provided to ChatGPT. For instance, such data could be included in queries ChatGPT sends to the MCP server when using deep research or chat app tools.

### Connecting to trusted servers

We recommend that you do not connect to a custom MCP server unless you know and trust the underlying application.

For example, always pick official servers hosted by the service providers themselves (e.g., connect to the Stripe server hosted by Stripe themselves on mcp.stripe.com, instead of an unofficial Stripe MCP server hosted by a third party). Because there aren't many official MCP servers today, you may be tempted to use a MCP server hosted by an organization that doesn't operate that server and simply proxies requests to that service via an API. This is not recommended—and you should only connect to an MCP once you’ve carefully reviewed how they use your data and have verified that you can trust the server. When building and connecting to your own MCP server, double check that it's the correct server. Be very careful with which data you provide in response to requests to your MCP server, and with how you treat the data sent to you as part of OpenAI calling your MCP server.

Your remote MCP server permits others to connect OpenAI to your services and allows OpenAI to access, send and receive data, and take action in these services. Avoid putting any sensitive information in the JSON for your tools, and avoid storing any sensitive information from ChatGPT users accessing your remote MCP server.

As someone building an MCP server, don't put anything malicious in your tool definitions.

---

# PLAN

> Status: design plan. **§8.5a–5b (no-auth app + widget) is implemented** —
> everything else is still a plan.
>
> **Implemented (2026-06-07):** `web-dec/src/mcp/server.ts` (one read-only tool
> `list_decision_frameworks` + an HTML widget resource) mounted at `/mcp` in
> `web-dec/src/index.ts` via `@hono/mcp` (Streamable HTTP, stateless, no auth).
> Verified locally: `initialize`, `tools/list`, `tools/call`, `resources/list`,
> `resources/read` all return correctly; `pnpm run typecheck` + `pnpm run build`
> pass on the Workers runtime.
>
> **To connect in ChatGPT dev mode:** `cd web-dec && pnpm run dev` (Worker on
> :6390), expose it over HTTPS, then in ChatGPT: Settings → Apps & Connectors →
> Advanced → developer mode, Create connector → `https://<host>/mcp`. No sign-in
> yet (that's §8.5c). Next: §8.5c wires Better Auth + the Connect/OAuth flow.
> For the tunnel use either a throwaway URL
> (`cloudflared tunnel --url http://localhost:6390`) or, better, a **permanent
> fixed address** — see §11.

> **2026-06-07 revision — Connect-first.** The user's priority is the ChatGPT
> **"Connect"** flow (deploying DEC as a ChatGPT app) *over* our own web login.
> That priority moves the **OAuth authorization server** to the center of the
> design and **rules out managed Neon Auth** as that server (see §2). The plan
> below was rewritten accordingly. The earlier "provision managed Neon Auth"
> phases are superseded.
>
> **Recommended build order (not the phase numbering):** start with the
> **no-auth app + widget** (§8.5a–5b) behind a tunnel to prove the app renders in
> ChatGPT dev mode → then Phase 0 spike + Phase 1–2 (self-host Better Auth) →
> then wire **Connect** (§8.5c) → then web login + ownership (Phases 3–4).
> Auth is conditional, so 5a/5b need no auth and no public deploy.

## 0. The two surfaces, and which one leads

1. **The DEC ChatGPT App + its "Connect" (the priority).** We ship DEC as an
   **Apps SDK app**, and the thing that matters most is the **connection** — the
   OAuth flow that links a ChatGPT user to a DEC account. In the Apps SDK an
   "app" is *not* separate from an MCP server: an app **=** a (minimal) MCP
   server backend **+** UI widget(s) rendered inside ChatGPT **+** the
   connect/auth flow. So we still build an MCP server, but only as much as the
   app needs — the effort goes into the connection and one or two widgets, **not**
   a rich data connector.
2. **Our own web-app login** (secondary) — Google + email/password for the React
   SPA. Same user identities; reuses the same auth server as (1).

**Two things this is NOT:**
- The `search`/`fetch`-over-a-vector-store guide pasted at the top of this doc is
  the **data-only deep-research connector** pattern. An Apps SDK *app* is the
  interactive kind (widgets), so that schema is **not** our path. (Replit/FastMCP
  Python example: also ignore — our stack is Cloudflare Worker + React + Neon.)
- "App connection" is not a separate API. The app's connection **is** the MCP
  OAuth in [`build/auth`](https://developers.openai.com/apps-sdk/build/auth) —
  i.e. exactly the authorization-server work below. The app triggers it by
  returning `401` + `_meta["mcp/www_authenticate"]`; ChatGPT then shows the
  Connect / sign-in UI.

**Reuse opportunity:** DEC already has a widget system (`client/components/widgets/*`
— structured data + renderer per tool). Apps SDK UI components map onto it almost
directly, so the app's widgets can reuse DEC's existing two-file convention.

## 1. Current state (verified)

- Neon project **`dec`** exists (`withered-shape-93916759`, org DCsan, pg 18).
  No auth provisioned.
- App is **fully public**: `src/trpc/context.ts` is `{ db, env, waitUntil }` —
  no user/session. Every router uses `publicProcedure`; no `protectedProcedure`.
- **No `users` table**, **no `userId`** on any table (`boards`, `nodes`,
  `edges`, `messages`, `chatLogs` in `src/db/schema.ts`).
- No auth env/secrets, no auth deps, no login UI/state.
- Chat (`/chat`) works key-lessly and without a DB; auth must not break that.

## 2. What ChatGPT "Connect" requires, and who can serve it

Per the [OpenAI Apps SDK auth doc](https://developers.openai.com/apps-sdk/build/auth)
and the [MCP authorization spec (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization):

- **Resource server** (our `/mcp`): host `/.well-known/oauth-protected-resource`
  (RFC 9728) with `resource` + `authorization_servers`; return `401` +
  `WWW-Authenticate` and tool errors with `_meta["mcp/www_authenticate"]` to
  trigger the connect UI; **validate every token's `aud` is us** (no passthrough).
- **Authorization server**: host `/.well-known/oauth-authorization-server`
  (RFC 8414); support **PKCE S256**; support **CIMD**
  (`client_id_metadata_document_supported: true`) and/or **DCR** (`/register`,
  RFC 7591); echo the **`resource` param into the token `aud`** (RFC 8707);
  redirect URI `https://chatgpt.com/connector/oauth/{callback_id}`.
- ChatGPT prioritizes **CIMD**, falls back to **DCR**. The user signs into *our*
  AS during connect (account-linking) — ChatGPT never shares the user's OpenAI
  identity. The minted access token is what binds "this ChatGPT session" ↔ "this
  DEC user", and it's attached `Bearer` on every tool call.

**Managed Neon Auth cannot be this AS.** Its docs frame it as a *relying party*
("identity system for your app") with no OIDC-provider / DCR /
`/.well-known/oauth-authorization-server` endpoints, and the managed service
**does not support custom Better Auth plugins** (it lists that as a reason to
self-host). So we need a real OAuth AS. Two options:

| | **A. Self-host Better Auth on the Worker** (recommended) | **B. Dedicated MCP-auth provider** |
|---|---|---|
| What | Better Auth + **`mcp` plugin** (+ `oidcProvider`), AS+RS+MCP co-located on the Worker, backed by the **same Neon Postgres** | [Stytch](https://stytch.com/blog/guide-to-authentication-for-the-openai-apps-sdk/) / [WorkOS](https://workos.com/blog/dynamic-client-registration-dcr-mcp-oauth) / [Scalekit](https://www.scalekit.com/mcp-auth) / [Auth0](https://billlyzhaoyh.github.io/tidbits/auth0-setup-blog/) |
| Connect flow | `withMcpAuth` + both well-known endpoints built in; **DCR** via `/oauth2/register`; PKCE, consent, trusted clients | Vendor guarantees ChatGPT-compatible DCR/CIMD/PRM/audience |
| Our login too | Same instance also does Google + email/password | Also handles app login |
| In-stack | Yes — one component, no SaaS, no per-MAU cost | No — external identity store to map to our users |
| Risks | Verify **(1)** Better Auth on Workers + Neon driver; **(2)** RFC 8707 audience binding & CIMD (DCR covers ChatGPT regardless) | Vendor pricing/lock-in; second identity system |

**Recommendation: Option A.** Better Auth's `mcp` plugin is purpose-built to
"act as OAuth providers for MCP clients", the same instance gives us the web
login for free, and it stays in the Cloudflare + Neon + Drizzle stack. **Net
change from the old plan: swap managed Neon Auth → self-hosted Better Auth**
(same underlying tech, same database). Option B is the fallback if the spikes in
§3 hit friction or we'd rather offload OAuth-compliance.

> **Decided earlier (still holds):** keep **tRPC + Drizzle** for data; add token
> verification only (no Neon Data API). Wipe existing ownerless data so `ownerId`
> is `NOT NULL` from the start.

## 3. Phase 0 — De-risk spikes (do first, before committing to Option A)

1. **Better Auth on Workers + Neon.** Stand up a minimal Better Auth on the Hono
   worker with the Postgres/Neon-serverless adapter (or Hyperdrive). Confirm it
   runs on the Workers runtime (Web Crypto, no Node-only APIs) and reads/writes
   its tables in the existing Neon DB.
2. **OAuth-server compliance for ChatGPT.** With the `mcp` + `oidcProvider`
   plugins, confirm: `/.well-known/oauth-authorization-server` +
   `/.well-known/oauth-protected-resource`, DCR via `/register`, PKCE S256, and
   **`resource` → `aud` audience binding** (RFC 8707). If audience binding or
   CIMD is missing, decide: accept DCR-only (sufficient for ChatGPT) + a small
   audience shim, or switch to Option B.

If either spike fails, fall back to **Option B** and skip to a vendor-specific
variant of Phases 1–5.

## 4. Phase 1 — Stand up the auth server (Option A)

1. Add `better-auth`; mount its handler on Hono
   (`app.on(["GET","POST"], "/api/auth/*", c => auth.handler(c.req.raw))`).
2. Configure providers: **Google OAuth** + **email/password**, app name **"dec"**.
   Use the same Neon DB (`DATABASE_URL`); let Better Auth own its tables (own
   migrations, separate from our Drizzle schema).
3. Enable the **`mcp`** plugin (and `oidcProvider` with
   `allowDynamicClientRegistration: true`, trusted-client/consent config).
4. Secrets/env: `BETTER_AUTH_SECRET`, Google client id/secret, base URL; add to
   `src/env.ts` `Bindings` (optional-typed so the app still boots without them),
   `wrangler.jsonc` vars, `.dev.vars(.example)`.

## 5. Phase 2 — Protect the tRPC API

1. `src/services/auth.ts`: verify the Better Auth session/JWT (via `withMcpAuth`
   helper or `createRemoteJWKSet` against the AS JWKS), returning
   `{ userId, email, scopes } | null`.
2. Extend `Context` (`src/trpc/context.ts`) with `user: AuthUser | null`,
   resolved from the `Authorization: Bearer` header / session cookie. Never throw
   at context build (preserves key-less chat).
3. Add `protectedProcedure = publicProcedure.use(...)` in `src/trpc/router.ts`
   that throws `UNAUTHORIZED` when `ctx.user` is null and narrows the type.

## 6. Phase 3 — Web-app sign-in (secondary surface)

1. Add the Better Auth React client in `client/lib/auth.ts`; expose
   `useSession()` via the root (`client/routes/__root.tsx` / `main.tsx`).
2. Attach the token to tRPC calls: `httpBatchLink({ headers: async () => ... })`.
3. `/login` (or modal) for Google + email/password; route guards for owner-only
   views (board/canvas).

## 7. Phase 4 — Ownership data model

1. `src/db/schema.ts`: add **required** `ownerId text` to `boards` and
   `chatLogs` (`nodes`/`edges`/`messages` inherit ownership via board).
2. **Wipe existing data (decided):** truncate current ownerless rows so `ownerId`
   can be `NOT NULL` from the start — no backfill.
3. `just migrations-generate` + `just migrations-apply` (never hand-write SQL).
4. Scope router reads/writes to `ctx.user.id`; switch relevant procedures to
   `protectedProcedure`.

## 8. Phase 5 — The DEC ChatGPT App + Connect (the priority feature)

Goal: a working **Apps SDK app** whose **connection** links a ChatGPT user to a
DEC account. Served by the same Worker; AS + resource server + `/mcp` co-located.

**Build order matters: ship the app *without auth first*, add Connect after.**
Auth in the Apps SDK is conditional — ChatGPT only shows the Connect/sign-in UI
if the server publishes resource metadata + tool `securitySchemes` **and**
returns `401` + `_meta["mcp/www_authenticate"]`. If we don't challenge, ChatGPT
connects with **no OAuth at all**. So 5a/5b need *zero* auth and don't depend on
Phases 1–4; only 5c does. This de-risks "does our widget render?" separately from
"does our OAuth round-trip?".

**No public deploy needed:** run the Worker locally and expose it with Cloudflare
Tunnel/ngrok (ChatGPT needs HTTPS, not raw localhost). The OAuth redirect target
is **ChatGPT's** URL (`https://chatgpt.com/connector/oauth/{callback_id}`), not a
DEC page — so there's no redirect site to deploy. The connect flow is interactive
**authorization-code + PKCE** (user logs in via browser), *not* server-to-server.

**5a. No-auth app skeleton (do this first — fastest feedback loop).**
1. Add `/mcp` (Streamable HTTP) using `@modelcontextprotocol/sdk` +
   `@modelcontextprotocol/ext-apps`. Tunnel it; no auth, no challenge.
2. Register **one** read-only tool (e.g. `list_demo_decisions`) with an
   `outputSchema` and `readOnlyHint: true`. Return static/sample data for now.
3. Connect in **developer mode** → Settings → Connectors → tunnel `/mcp` URL;
   confirm the tool is listed and callable. (Also works via the Responses API,
   `type:"mcp"`, `require_approval:"never"`.)

**5b. Basic widget (what makes it an app, not a connector) — still no auth.**
4. Add a UI component resource (MIME `text/html;profile=mcp-app`, versioned
   `ui://widget/*` URI, `_meta.ui` with `domain` + `csp` allowlists); point the
   tool at it via `_meta.ui.resourceUri`. Reuse a DEC widget data shape
   (`client/components/widgets/*`).
5. Tool responses carry three siblings: `structuredContent` (model + widget
   visible — minimal), `content` (narration), `_meta` (widget-only, never reaches
   the model). **No secrets in any of them.** Confirm the widget *renders in
   ChatGPT*. Widget ↔ host via the MCP Apps bridge / `window.openai`.

**5c. Wire Connect (depends on Phases 1–2 — add after 5a/5b work).**
6. Serve `/.well-known/oauth-protected-resource` + `/.well-known/oauth-authorization-server`;
   add tool `securitySchemes` (`oauth2` + scopes); protect handlers with
   `withMcpAuth`; on missing/invalid token return `401` +
   `_meta["mcp/www_authenticate"]` so ChatGPT shows **Connect**.
7. Resolve the audience-bound token to the same DEC `userId` as the web app, so a
   decision made in the browser is visible to ChatGPT (and vice-versa). Swap the
   sample data in 5a for the **caller's** real decisions.
8. Verify the full round-trip: discovery → CIMD/DCR → PKCE login on *our* AS →
   audience-bound token → authorized tool call.

**5d. Scope + safety.** Tools return only the caller's data; start **read-only**
(see the prompt-injection / write-action risk table above); idempotent handlers.
Enforce auth server-side only — never trust `_meta` hints.

## 9. Verification (no test suite in this repo)

- `pnpm run typecheck` after every phase (primary check).
- `pnpm run build:client` after route changes; `pnpm run build` for the Worker.
- Web login: `pnpm run dev` → sign-up, Google sign-in, sign-out, a protected
  call (200 with token / 401 without); confirm key-less chat still works.
- Connect (the priority): MCP Inspector + ChatGPT connector → full OAuth
  round-trip (discovery → CIMD/DCR → PKCE login → audience-bound token →
  authorized tool call); verify per-user data scoping and that a widget renders.

## 10. Decisions

Resolved:
1. **Data path:** tRPC + Drizzle, token verification only (no Neon Data API).
2. **Legacy data:** wipe; `ownerId` required from the start.
3. **MCP server:** in scope — and now the **priority** (Connect-first).

4. **Auth-server choice:** **Option A — self-host Better Auth** on the Worker
   (`mcp` + `oidcProvider` plugins), backed by the existing Neon DB. Run the
   Phase 0 spikes first; fall back to Option B (dedicated provider) only if a
   spike fails.

## 11. Hosting the dev MCP app: permanent Cloudflare Tunnel (fixed address)

ChatGPT needs an HTTPS URL for the connector. A throwaway
`cloudflared tunnel --url http://localhost:6390` works but gives a **new random
`*.trycloudflare.com` URL every run** — you'd re-create the connector each time.
A **named tunnel** maps a stable hostname (e.g. `dec.<yourdomain>.com`) to the
local Worker, so the URL never changes. This matters even more for §8.5c: the
OAuth issuer / `.well-known` discovery / token `aud` must stay constant.

Prereq: a domain in your Cloudflare account, and `cloudflared` logged in
(`cloudflared tunnel login` → writes `~/.cloudflared/cert.pem`). On this machine
both are already done (existing named tunnels confirm the login).

```bash
# 1. Create the named tunnel (writes a <UUID>.json credentials file in ~/.cloudflared/)
cloudflared tunnel create dec

# 2. Point a DNS record at it (creates CNAME dec.<yourdomain>.com → <UUID>.cfargotunnel.com)
cloudflared tunnel route dns dec dec.<yourdomain>.com

# 3. Dedicated config ~/.cloudflared/dec.yml (don't reuse the shared config.yml):
#    tunnel: dec
#    credentials-file: /Users/<you>/.cloudflared/<UUID>.json
#    ingress:
#      - hostname: dec.<yourdomain>.com
#        service: http://localhost:6390   # DEC dev Worker port
#      - service: http_status:404

# 4. Run it (stable URL → connector = https://dec.<yourdomain>.com/mcp)
cloudflared tunnel --config ~/.cloudflared/dec.yml run dec
```

Notes:
- Use a **dedicated `dec.yml`** config; the existing `~/.cloudflared/config.yml`
  belongs to another tunnel (`quintace-dev`) — don't overwrite it.
- `tunnel route dns` writes a DNS record in your Cloudflare zone (an outward
  change) — confirm the exact hostname before running.
- **Always-on (optional):** install as a launchd service via the tunnel's token
  (Zero Trust dashboard → Networks → Tunnels → `dec` → Configure):
  `sudo cloudflared service install <TOKEN>`. Token mode stores ingress remotely,
  so there's no clash with the local `config.yml`. Otherwise just keep the `run`
  command alive in `tmux`/a background process.
- ChatGPT connector URL: `https://dec.<yourdomain>.com/mcp`.