CREATE TABLE "calendar_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start_day" varchar(10) DEFAULT 'monday',
	"color_theme" varchar(50) DEFAULT 'default',
	"layout_density" varchar(10) DEFAULT 'standard',
	"visible_entry_types" jsonb DEFAULT '["task","event","note"]'::jsonb,
	"custom_sizing" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "collection_entries" (
	"collection_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now(),
	CONSTRAINT "collection_entries_collection_id_entry_id_pk" PRIMARY KEY("collection_id","entry_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"layout_id" uuid,
	"is_template" boolean DEFAULT false,
	"template_type" varchar(30),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"type" varchar(10) NOT NULL,
	"text" varchar(500) NOT NULL,
	"signifiers" jsonb DEFAULT '[]'::jsonb,
	"date" date,
	"state" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gallery_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" varchar(300) NOT NULL,
	"category" varchar(20) NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"content_areas" jsonb NOT NULL,
	"preview_image_url" text,
	"author_id" uuid,
	"author_name" varchar(255) NOT NULL,
	"usage_count" integer DEFAULT 0,
	"is_featured" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'published',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"layout_id" uuid,
	"title" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"is_built_in" boolean DEFAULT false,
	"content_areas" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"template_id" uuid,
	"layout_id" uuid,
	"description" varchar(300) NOT NULL,
	"category" varchar(20) NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'pending_review',
	"review_notes" text,
	"submitted_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"default_layout_id" uuid,
	"theme" varchar(20) DEFAULT 'system',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"image" text,
	"email_verified" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "calendar_configs" ADD CONSTRAINT "calendar_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_layout_id_layouts_id_fk" FOREIGN KEY ("layout_id") REFERENCES "public"."layouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_page_id_journal_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."journal_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_templates" ADD CONSTRAINT "gallery_templates_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_pages" ADD CONSTRAINT "journal_pages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_pages" ADD CONSTRAINT "journal_pages_layout_id_layouts_id_fk" FOREIGN KEY ("layout_id") REFERENCES "public"."layouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layouts" ADD CONSTRAINT "layouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_submissions" ADD CONSTRAINT "template_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_submissions" ADD CONSTRAINT "template_submissions_template_id_gallery_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."gallery_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_submissions" ADD CONSTRAINT "template_submissions_layout_id_layouts_id_fk" FOREIGN KEY ("layout_id") REFERENCES "public"."layouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_configs_user_id_unique" ON "calendar_configs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_collections_user" ON "collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_entries_user_page" ON "entries" USING btree ("user_id","page_id");--> statement-breakpoint
CREATE INDEX "idx_entries_user_date" ON "entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_entries_user_type" ON "entries" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "idx_gallery_templates_category" ON "gallery_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_gallery_templates_status" ON "gallery_templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_gallery_templates_featured" ON "gallery_templates" USING btree ("is_featured");--> statement-breakpoint
CREATE UNIQUE INDEX "layouts_user_id_name_unique" ON "layouts" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "idx_layouts_user" ON "layouts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preferences_user_id_unique" ON "user_preferences" USING btree ("user_id");