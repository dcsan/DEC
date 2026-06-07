CREATE TABLE "boards" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'Untitled decision' NOT NULL,
	"decision_type" text DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"widget" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"source" text NOT NULL,
	"target" text NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"kind" text DEFAULT 'concept' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"x" double precision DEFAULT 0 NOT NULL,
	"y" double precision DEFAULT 0 NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chat_logs_session_idx" ON "chat_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "edges_board_idx" ON "edges" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "messages_board_idx" ON "messages" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "nodes_board_idx" ON "nodes" USING btree ("board_id");