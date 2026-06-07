- [x] move to neon
switch the DB backend to use 'neon'
using DATABASE_URL env connector

use drizzle ORM
Let's try to have a single source of truth for the schemas. For example, use Drizzle to create the schema and then derive the TypeScript types shared with the frontend from this schema.

create a chatlogs table
each message from user / system in the chat should be logged here with a timestamp
Including the widget responses, make sure to create a JSONB field that will include the widget data, including which widget it was, and then the structured data and the unstructured plain text version.

---
done: Migrated the DB backend from D1/SQLite to Neon Postgres (Drizzle + @neondatabase/serverless over DATABASE_URL, lazy ctx.db). Schema in src/db/schema.ts is the single source of truth deriving shared TS types; added a chat_logs table (session_id, role, content, created_at, + JSONB `widget` = {type,data,text}) and chat.send now logs every turn and widget submission.
at: 2026-06-07 05:59 EDT

