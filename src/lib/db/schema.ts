import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * 1. USERS TABLE
 * Directly matches schedule-project-er-diagram.png.png
 */
export const users = pgTable("users", {
  user_id: serial("user_id").primaryKey(),
  full_name: varchar("full_name", { length: 150 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 30 }).notNull(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("patient"), // 'patient' | 'doctor' | 'admin'
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  patient: one(patients, {
    fields: [users.user_id],
    references: [patients.user_id],
  }),
  doctor: one(doctors, {
    fields: [users.user_id],
    references: [doctors.user_id],
  }),
}));

/**
 * 2. PATIENTS TABLE
 */
export const patients = pgTable("patients", {
  patient_id: serial("patient_id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.user_id, { onDelete: "cascade" }),
  date_of_birth: varchar("date_of_birth", { length: 30 }),
  gender: varchar("gender", { length: 30 }),
  address: text("address"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.user_id],
    references: [users.user_id],
  }),
  appointments: many(appointments),
}));

/**
 * 3. DOCTORS TABLE
 */
export const doctors = pgTable("doctors", {
  doctor_id: serial("doctor_id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.user_id, { onDelete: "cascade" }),
  specialization: varchar("specialization", { length: 100 }).notNull(),
  qualification: varchar("qualification", { length: 150 }).notNull(),
  experience_years: integer("experience_years").notNull().default(0),
  consultation_fee: numeric("consultation_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("50.00"),
  bio: text("bio"),
  avatar_url: text("avatar_url"),
  clinic_address: text("clinic_address"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, {
    fields: [doctors.user_id],
    references: [users.user_id],
  }),
  availabilities: many(availability),
  appointments: many(appointments),
}));

/**
 * 4. AVAILABILITY TABLE
 */
export const availability = pgTable(
  "availability",
  {
    availability_id: serial("availability_id").primaryKey(),
    doctor_id: integer("doctor_id")
      .notNull()
      .references(() => doctors.doctor_id, { onDelete: "cascade" }),
    available_date: varchar("available_date", { length: 20 }).notNull(), // YYYY-MM-DD
    start_time: varchar("start_time", { length: 10 }).notNull(), // HH:mm
    end_time: varchar("end_time", { length: 10 }).notNull(), // HH:mm
    slot_duration: integer("slot_duration").notNull().default(30),
    is_available: boolean("is_available").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("doctor_date_slot_idx").on(
      table.doctor_id,
      table.available_date,
      table.start_time
    ),
  ]
);

export const availabilityRelations = relations(availability, ({ one }) => ({
  doctor: one(doctors, {
    fields: [availability.doctor_id],
    references: [doctors.doctor_id],
  }),
  appointment: one(appointments, {
    fields: [availability.availability_id],
    references: [appointments.availability_id],
  }),
}));

/**
 * 5. APPOINTMENTS TABLE
 */
export const appointments = pgTable("appointments", {
  appointment_id: serial("appointment_id").primaryKey(),
  patient_id: integer("patient_id")
    .notNull()
    .references(() => patients.patient_id, { onDelete: "cascade" }),
  doctor_id: integer("doctor_id")
    .notNull()
    .references(() => doctors.doctor_id, { onDelete: "cascade" }),
  availability_id: integer("availability_id")
    .notNull()
    .unique()
    .references(() => availability.availability_id, { onDelete: "restrict" }),
  appointment_date: timestamp("appointment_date", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | confirmed | cancelled | rejected | completed
  reason: text("reason").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patient_id],
    references: [patients.patient_id],
  }),
  doctor: one(doctors, {
    fields: [appointments.doctor_id],
    references: [doctors.doctor_id],
  }),
  availability: one(availability, {
    fields: [appointments.availability_id],
    references: [availability.availability_id],
  }),
}));

/**
 * 6. WAITING QUEUE TABLE (Walk-in & Clinic Checked-in Patients)
 */
export const waitingQueue = pgTable("waiting_queue", {
  queue_id: serial("queue_id").primaryKey(),
  doctor_id: integer("doctor_id")
    .notNull()
    .references(() => doctors.doctor_id, { onDelete: "cascade" }),
  patient_id: integer("patient_id").references(() => patients.patient_id, {
    onDelete: "set null",
  }),
  patient_name: varchar("patient_name", { length: 150 }).notNull(),
  patient_phone: varchar("patient_phone", { length: 30 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("waiting"), // waiting | called | in_consultation | completed | cancelled
  check_in_time: timestamp("check_in_time", { withTimezone: true })
    .defaultNow()
    .notNull(),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const waitingQueueRelations = relations(waitingQueue, ({ one }) => ({
  doctor: one(doctors, {
    fields: [waitingQueue.doctor_id],
    references: [doctors.doctor_id],
  }),
  patient: one(patients, {
    fields: [waitingQueue.patient_id],
    references: [patients.patient_id],
  }),
}));

/**
 * 7. EARLY SLOT OFFERS TABLE (Smart Waiting Queue Offers)
 */
export const earlySlotOffers = pgTable("early_slot_offers", {
  offer_id: serial("offer_id").primaryKey(),
  slot_id: integer("slot_id")
    .notNull()
    .references(() => availability.availability_id, { onDelete: "cascade" }),
  doctor_id: integer("doctor_id")
    .notNull()
    .references(() => doctors.doctor_id, { onDelete: "cascade" }),
  patient_id: integer("patient_id")
    .notNull()
    .references(() => patients.patient_id, { onDelete: "cascade" }),
  queue_id: integer("queue_id").references(() => waitingQueue.queue_id, {
    onDelete: "set null",
  }),
  original_appointment_id: integer("original_appointment_id").references(
    () => appointments.appointment_id,
    { onDelete: "set null" }
  ),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | accepted | declined | expired | cancelled
  offered_at: timestamp("offered_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  responded_at: timestamp("responded_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const earlySlotOffersRelations = relations(earlySlotOffers, ({ one }) => ({
  slot: one(availability, {
    fields: [earlySlotOffers.slot_id],
    references: [availability.availability_id],
  }),
  doctor: one(doctors, {
    fields: [earlySlotOffers.doctor_id],
    references: [doctors.doctor_id],
  }),
  patient: one(patients, {
    fields: [earlySlotOffers.patient_id],
    references: [patients.patient_id],
  }),
  originalAppointment: one(appointments, {
    fields: [earlySlotOffers.original_appointment_id],
    references: [appointments.appointment_id],
  }),
}));

/**
 * 8. NOTIFICATIONS TABLE (In-App Patient Notifications)
 */
export const notifications = pgTable("notifications", {
  notification_id: serial("notification_id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.user_id, { onDelete: "cascade" }),
  title: varchar("title", { length: 150 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 30 }).notNull().default("general"), // early_offer | offer_accepted | offer_expired | offer_declined | queue_update | general
  related_offer_id: integer("related_offer_id").references(
    () => earlySlotOffers.offer_id,
    { onDelete: "set null" }
  ),
  is_read: boolean("is_read").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.user_id],
    references: [users.user_id],
  }),
  offer: one(earlySlotOffers, {
    fields: [notifications.related_offer_id],
    references: [earlySlotOffers.offer_id],
  }),
}));

export type UserSelect = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export type PatientSelect = typeof patients.$inferSelect;
export type PatientInsert = typeof patients.$inferInsert;

export type DoctorSelect = typeof doctors.$inferSelect;
export type DoctorInsert = typeof doctors.$inferInsert;

export type AvailabilitySelect = typeof availability.$inferSelect;
export type AvailabilityInsert = typeof availability.$inferInsert;

export type AppointmentSelect = typeof appointments.$inferSelect;
export type AppointmentInsert = typeof appointments.$inferInsert;

export type WaitingQueueSelect = typeof waitingQueue.$inferSelect;
export type WaitingQueueInsert = typeof waitingQueue.$inferInsert;

export type EarlySlotOfferSelect = typeof earlySlotOffers.$inferSelect;
export type EarlySlotOfferInsert = typeof earlySlotOffers.$inferInsert;

export type NotificationSelect = typeof notifications.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;
