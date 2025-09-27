CREATE TYPE "public"."event_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."minecraft_server_status" AS ENUM('STARTING', 'RUNNING', 'STOPPING', 'STOPPED');--> statement-breakpoint
CREATE TABLE "discord_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"primary_color" integer,
	"discord_role_id" text NOT NULL,
	CONSTRAINT "discord_roles_discord_role_id_unique" UNIQUE("discord_role_id")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"user_id" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer DEFAULT 86400000,
	"rate_limit_max" integer DEFAULT 10,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"last_request" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"status" text DEFAULT 'NON_APPLICANT' NOT NULL,
	"permissions" integer DEFAULT 0 NOT NULL,
	"root_admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text NOT NULL,
	"actor_id" text,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "minecraft_server_status_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_ref_id" uuid NOT NULL,
	"status" "minecraft_server_status" NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_members" (
	"event_ref_id" uuid NOT NULL,
	"member_ref_id" text NOT NULL,
	CONSTRAINT "event_members_event_ref_id_member_ref_id_pk" PRIMARY KEY("event_ref_id","member_ref_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "event_status_enum" DEFAULT 'ACTIVE' NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"role_ref_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_roles" (
	"member_ref_id" text NOT NULL,
	"role_ref_id" uuid NOT NULL,
	CONSTRAINT "member_roles_member_ref_id_role_ref_id_pk" PRIMARY KEY("member_ref_id","role_ref_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"discord_role_ref_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"permissions" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "minecraft_ip_whitelist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text,
	"ip_address" text NOT NULL,
	"minecraft_server_ref_id" uuid NOT NULL,
	"allow" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "minecraft_player_members" (
	"member_ref_id" text NOT NULL,
	"minecraft_player_ref_id" integer NOT NULL,
	CONSTRAINT "minecraft_player_members_member_ref_id_minecraft_player_ref_id_pk" PRIMARY KEY("member_ref_id","minecraft_player_ref_id")
);
--> statement-breakpoint
CREATE TABLE "minecraft_player_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_address" text NOT NULL,
	"minecraft_player_ref_id" integer NOT NULL,
	"minecraft_server_ref_id" uuid NOT NULL,
	"proxy_server_ref_id" uuid,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "minecraft_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"uuid" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "minecraft_players_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "minecraft_proxy_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"ip_address" text NOT NULL,
	"port" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "minecraft_server_player_whitelist" (
	"allow" boolean DEFAULT true NOT NULL,
	"minecraft_server_ref_id" uuid NOT NULL,
	"minecraft_player_ref_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "minecraft_server_role_whitelist" (
	"allow" boolean DEFAULT true NOT NULL,
	"minecraft_server_ref_id" uuid NOT NULL,
	"role_ref_id" uuid NOT NULL,
	CONSTRAINT "minecraft_server_role_whitelist_minecraft_server_ref_id_role_ref_id_pk" PRIMARY KEY("minecraft_server_ref_id","role_ref_id")
);
--> statement-breakpoint
CREATE TABLE "minecraft_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"ip_address" text NOT NULL,
	"port" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_members_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_user_id_members_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_members_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_members_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_server_status_logs" ADD CONSTRAINT "minecraft_server_status_logs_server_ref_id_minecraft_servers_id_fk" FOREIGN KEY ("server_ref_id") REFERENCES "public"."minecraft_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_event_ref_id_events_id_fk" FOREIGN KEY ("event_ref_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_member_ref_id_members_id_fk" FOREIGN KEY ("member_ref_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_role_ref_id_roles_id_fk" FOREIGN KEY ("role_ref_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_member_ref_id_members_id_fk" FOREIGN KEY ("member_ref_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_role_ref_id_roles_id_fk" FOREIGN KEY ("role_ref_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_discord_role_ref_id_discord_roles_id_fk" FOREIGN KEY ("discord_role_ref_id") REFERENCES "public"."discord_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_ip_whitelist" ADD CONSTRAINT "minecraft_ip_whitelist_minecraft_server_ref_id_minecraft_servers_id_fk" FOREIGN KEY ("minecraft_server_ref_id") REFERENCES "public"."minecraft_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_player_members" ADD CONSTRAINT "minecraft_player_members_member_ref_id_members_id_fk" FOREIGN KEY ("member_ref_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_player_members" ADD CONSTRAINT "minecraft_player_members_minecraft_player_ref_id_minecraft_players_id_fk" FOREIGN KEY ("minecraft_player_ref_id") REFERENCES "public"."minecraft_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_player_sessions" ADD CONSTRAINT "minecraft_player_sessions_minecraft_player_ref_id_minecraft_players_id_fk" FOREIGN KEY ("minecraft_player_ref_id") REFERENCES "public"."minecraft_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_player_sessions" ADD CONSTRAINT "minecraft_player_sessions_minecraft_server_ref_id_minecraft_servers_id_fk" FOREIGN KEY ("minecraft_server_ref_id") REFERENCES "public"."minecraft_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_player_sessions" ADD CONSTRAINT "minecraft_player_sessions_proxy_server_ref_id_minecraft_proxy_servers_id_fk" FOREIGN KEY ("proxy_server_ref_id") REFERENCES "public"."minecraft_proxy_servers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_server_player_whitelist" ADD CONSTRAINT "minecraft_server_player_whitelist_minecraft_server_ref_id_minecraft_servers_id_fk" FOREIGN KEY ("minecraft_server_ref_id") REFERENCES "public"."minecraft_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_server_player_whitelist" ADD CONSTRAINT "minecraft_server_player_whitelist_minecraft_player_ref_id_minecraft_players_id_fk" FOREIGN KEY ("minecraft_player_ref_id") REFERENCES "public"."minecraft_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_server_role_whitelist" ADD CONSTRAINT "minecraft_server_role_whitelist_minecraft_server_ref_id_minecraft_servers_id_fk" FOREIGN KEY ("minecraft_server_ref_id") REFERENCES "public"."minecraft_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "minecraft_server_role_whitelist" ADD CONSTRAINT "minecraft_server_role_whitelist_role_ref_id_roles_id_fk" FOREIGN KEY ("role_ref_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_table_name_index" ON "audit_logs" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "audit_logs_record_id_index" ON "audit_logs" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_index" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_before_index" ON "audit_logs" USING gin ("before");--> statement-breakpoint
CREATE INDEX "audit_logs_after_index" ON "audit_logs" USING gin ("after");--> statement-breakpoint
CREATE INDEX "minecraft_server_status_logs_server_ref_id_index" ON "minecraft_server_status_logs" USING btree ("server_ref_id");--> statement-breakpoint
CREATE INDEX "event_members_event_ref_id_index" ON "event_members" USING btree ("event_ref_id");--> statement-breakpoint
CREATE INDEX "event_members_member_ref_id_index" ON "event_members" USING btree ("member_ref_id");--> statement-breakpoint
CREATE INDEX "events_role_ref_id_index" ON "events" USING btree ("role_ref_id");--> statement-breakpoint
CREATE INDEX "member_roles_role_ref_id_index" ON "member_roles" USING btree ("role_ref_id");--> statement-breakpoint
CREATE INDEX "member_roles_member_ref_id_index" ON "member_roles" USING btree ("member_ref_id");--> statement-breakpoint
CREATE INDEX "roles_discord_role_ref_id_index" ON "roles" USING btree ("discord_role_ref_id");--> statement-breakpoint
CREATE UNIQUE INDEX "minecraft_ip_whitelist_unique_index" ON "minecraft_ip_whitelist" USING btree ("ip_address","minecraft_server_ref_id");--> statement-breakpoint
CREATE INDEX "minecraft_ip_whitelist_server_ref_id_index" ON "minecraft_ip_whitelist" USING btree ("minecraft_server_ref_id");--> statement-breakpoint
CREATE INDEX "minecraft_ip_whitelist_ip_address_index" ON "minecraft_ip_whitelist" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "minecraft_player_members_member_ref_id_index" ON "minecraft_player_members" USING btree ("member_ref_id");--> statement-breakpoint
CREATE INDEX "minecraft_player_members_player_ref_id_index" ON "minecraft_player_members" USING btree ("minecraft_player_ref_id");--> statement-breakpoint
CREATE INDEX "minecraft_player_sessions_player_ref_id_index" ON "minecraft_player_sessions" USING btree ("minecraft_player_ref_id");--> statement-breakpoint
CREATE UNIQUE INDEX "proxy_servers_unique" ON "minecraft_proxy_servers" USING btree ("ip_address","port");--> statement-breakpoint
CREATE UNIQUE INDEX "minecraft_server_player_whitelist_unique_index" ON "minecraft_server_player_whitelist" USING btree ("minecraft_server_ref_id","minecraft_player_ref_id");--> statement-breakpoint
CREATE INDEX "minecraft_server_player_whitelist_server_ref_id_index" ON "minecraft_server_player_whitelist" USING btree ("minecraft_server_ref_id");--> statement-breakpoint
CREATE INDEX "minecraft_server_player_whitelist_player_ref_id_index" ON "minecraft_server_player_whitelist" USING btree ("minecraft_player_ref_id");--> statement-breakpoint
CREATE INDEX "minecraft_server_role_whitelist_server_ref_id_index" ON "minecraft_server_role_whitelist" USING btree ("minecraft_server_ref_id");--> statement-breakpoint
CREATE INDEX "minecraft_server_role_whitelist_role_ref_id_index" ON "minecraft_server_role_whitelist" USING btree ("role_ref_id");--> statement-breakpoint
CREATE UNIQUE INDEX "minecraft_servers_unique" ON "minecraft_servers" USING btree ("ip_address","port");