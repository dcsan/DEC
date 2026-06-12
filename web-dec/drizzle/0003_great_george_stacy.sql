ALTER TABLE "chat_logs" ADD COLUMN "user_id" text;--> statement-breakpoint
CREATE INDEX "chat_logs_user_idx" ON "chat_logs" USING btree ("user_id");