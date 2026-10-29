CREATE TABLE "early_slot_offers" (
	"offer_id" serial PRIMARY KEY NOT NULL,
	"slot_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"queue_id" integer,
	"original_appointment_id" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"offered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"delivery_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"channel" varchar(20) DEFAULT 'email' NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"appointment_id" integer,
	"status" varchar(20) DEFAULT 'delivered' NOT NULL,
	"provider" varchar(50) DEFAULT 'console' NOT NULL,
	"provider_message_id" varchar(150),
	"idempotency_key" varchar(100),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_logs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"notification_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(150) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(30) DEFAULT 'general' NOT NULL,
	"related_offer_id" integer,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"payment_id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"provider" varchar(30) DEFAULT 'razorpay' NOT NULL,
	"provider_order_id" varchar(100) NOT NULL,
	"provider_payment_id" varchar(100),
	"provider_signature" text,
	"amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"idempotency_key" varchar(100),
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_provider_order_id_unique" UNIQUE("provider_order_id"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"refund_id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"appointment_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"reason" text NOT NULL,
	"policy_applied" varchar(100) NOT NULL,
	"provider" varchar(30) DEFAULT 'razorpay' NOT NULL,
	"provider_refund_id" varchar(100),
	"idempotency_key" varchar(100),
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "refunds_provider_refund_id_unique" UNIQUE("provider_refund_id"),
	CONSTRAINT "refunds_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "scheduled_reminders" (
	"reminder_id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer NOT NULL,
	"reminder_type" varchar(50) DEFAULT '24h_before' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"sent_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waiting_queue" (
	"queue_id" serial PRIMARY KEY NOT NULL,
	"doctor_id" integer NOT NULL,
	"patient_id" integer,
	"patient_name" varchar(150) NOT NULL,
	"patient_phone" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'waiting' NOT NULL,
	"check_in_time" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"event_id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(30) DEFAULT 'razorpay' NOT NULL,
	"provider_event_id" varchar(150) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" text NOT NULL,
	"status" varchar(30) DEFAULT 'processed' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_availability_id_unique";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "payment_status" varchar(30) DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "rescheduled_from_id" integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "wave_number" integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "estimated_consult_time" varchar(10);--> statement-breakpoint
ALTER TABLE "availability" ADD COLUMN "is_wave" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "availability" ADD COLUMN "wave_capacity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "availability" ADD COLUMN "wave_booked_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "scheduling_mode" varchar(20) DEFAULT 'stream' NOT NULL;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "wave_capacity" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "wave_interval_minutes" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "early_slot_offers" ADD CONSTRAINT "early_slot_offers_slot_id_availability_availability_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."availability"("availability_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "early_slot_offers" ADD CONSTRAINT "early_slot_offers_doctor_id_doctors_doctor_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("doctor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "early_slot_offers" ADD CONSTRAINT "early_slot_offers_patient_id_patients_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "early_slot_offers" ADD CONSTRAINT "early_slot_offers_queue_id_waiting_queue_queue_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."waiting_queue"("queue_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "early_slot_offers" ADD CONSTRAINT "early_slot_offers_original_appointment_id_appointments_appointment_id_fk" FOREIGN KEY ("original_appointment_id") REFERENCES "public"."appointments"("appointment_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_appointment_id_appointments_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("appointment_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_offer_id_early_slot_offers_offer_id_fk" FOREIGN KEY ("related_offer_id") REFERENCES "public"."early_slot_offers"("offer_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_appointments_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("appointment_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_patients_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("payment_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_appointment_id_appointments_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("appointment_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_reminders" ADD CONSTRAINT "scheduled_reminders_appointment_id_appointments_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("appointment_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiting_queue" ADD CONSTRAINT "waiting_queue_doctor_id_doctors_doctor_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("doctor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiting_queue" ADD CONSTRAINT "waiting_queue_patient_id_patients_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "appt_reminder_type_idx" ON "scheduled_reminders" USING btree ("appointment_id","reminder_type");