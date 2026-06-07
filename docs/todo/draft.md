- [ ] move to neon
switch the DB backend to use 'neon'
using DATABASE_URL env connector

use drizzle ORM
Let's try to have a single source of truth for the schemas. For example, use Drizzle to create the schema and then derive the TypeScript types shared with the frontend from this schema.

create a chatlogs table
each message from user / system in the chat should be logged here with a timestamp
Including the widget responses, make sure to create a JSONB field that will include the widget data, including which widget it was, and then the structured data and the unstructured plain text version.

