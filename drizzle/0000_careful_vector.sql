CREATE TABLE "appointments" (
	"appointment_id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"availability_id" integer NOT NULL,
	"appointment_date" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_availability_id_unique" UNIQUE("availability_id")
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"availability_id" serial PRIMARY KEY NOT NULL,
	"doctor_id" integer NOT NULL,
	"available_date" varchar(20) NOT NULL,
	"start_time" varchar(10) NOT NULL,
	"end_time" varchar(10) NOT NULL,
	"slot_duration" integer DEFAULT 30 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"doctor_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"specialization" varchar(100) NOT NULL,
	"qualification" varchar(150) NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"consultation_fee" numeric(10, 2) DEFAULT '50.00' NOT NULL,
	"bio" text,
	"avatar_url" text,
	"clinic_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doctors_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"patient_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date_of_birth" varchar(30),
	"gender" varchar(30),
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patients_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'patient' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_doctor_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("doctor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_availability_id_availability_availability_id_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."availability"("availability_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_doctor_id_doctors_doctor_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("doctor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_date_slot_idx" ON "availability" USING btree ("doctor_id","available_date","start_time");