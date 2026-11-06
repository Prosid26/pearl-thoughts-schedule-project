import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long"),
});

export const patientRegistrationSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters long")
    .max(100, "Full name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email address"),
  phone: z
    .string()
    .trim()
    .min(8, "Phone number is too short")
    .max(25, "Phone number is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[0-9]/, "Password must contain at least one number"),
  date_of_birth: z.string().optional(),
  gender: z
    .enum(["Male", "Female", "Other", "Prefer not to say", ""])
    .optional(),
  address: z.string().max(300, "Address is too long").optional(),
});

export const doctorProvisioningSchema = z.object({
  provision_key: z.string().min(1, "Clinic Authorization Key is required"),
  full_name: z
    .string()
    .trim()
    .min(2, "Doctor full name is required")
    .max(120),
  email: z
    .string()
    .trim()
    .email("Valid clinic email address required"),
  phone: z.string().trim().min(8, "Phone number is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  specialization: z
    .string()
    .trim()
    .min(2, "Medical specialization is required"),
  qualification: z
    .string()
    .trim()
    .min(2, "Medical qualification degrees required"),
  experience_years: z.coerce
    .number()
    .int()
    .min(0, "Years of experience cannot be negative")
    .max(60, "Invalid experience years"),
  consultation_fee: z.coerce
    .number()
    .min(50, "Minimum consultation fee is ₹50")
    .max(50000, "Fee exceeds maximum allowance"),
  bio: z.string().max(1000).optional(),
  clinic_address: z.string().max(300).optional(),
});

export const bookAppointmentSchema = z.object({
  doctor_id: z.coerce.number().int().positive("Invalid doctor ID"),
  availability_id: z.coerce.number().int().positive("Invalid slot ID"),
  slot_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  reason: z
    .string()
    .trim()
    .min(5, "Please describe the reason for your visit (min 5 characters)")
    .max(500, "Reason must not exceed 500 characters"),
});

export const addAvailabilitySchema = z.object({
  available_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must follow YYYY-MM-DD format"),
  start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must follow HH:mm format"),
  end_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must follow HH:mm format"),
  slot_duration: z.coerce
    .number()
    .int()
    .min(10, "Minimum duration is 10 minutes")
    .max(120, "Maximum duration is 120 minutes")
    .default(30),
  is_wave: z.coerce.boolean().optional(),
  wave_capacity: z.coerce.number().int().min(1).max(10).optional(),
}).refine((data) => data.start_time < data.end_time, {
  message: "End time must be after the start time",
  path: ["end_time"],
});

export const createDoctorScheduleSchema = z
  .object({
    schedule_type: z.enum(["specific_dates", "recurring_weekly"]),
    scheduling_mode: z.enum(["stream", "wave"]).default("stream"),
    specific_dates: z
      .union([
        z.string(),
        z.array(z.string()),
      ])
      .optional(),
    weekdays: z
      .union([
        z.string(),
        z.array(z.coerce.number()),
      ])
      .optional(),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must follow YYYY-MM-DD")
      .optional(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must follow YYYY-MM-DD")
      .optional(),
    start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must follow HH:mm format"),
    end_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must follow HH:mm format"),
    slot_duration: z.coerce
      .number()
      .int()
      .min(5, "Minimum duration is 5 minutes")
      .max(240, "Maximum duration is 240 minutes")
      .default(30),
    capacity: z.coerce
      .number()
      .int()
      .min(1, "Capacity must be at least 1")
      .max(10, "Capacity cannot exceed 10")
      .default(1),
    is_override: z.coerce.boolean().default(false),
  })
  .refine((data) => data.start_time < data.end_time, {
    message: "End time must be after the start time",
    path: ["end_time"],
  });

export const modifyDoctorAvailabilityWindowElasticSchema = z
  .object({
    availability_id: z.coerce.number().int().positive("Invalid availability window ID"),
    new_start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must follow HH:mm format"),
    new_end_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must follow HH:mm format"),
    slot_duration: z.coerce.number().int().min(5).max(240).optional(),
    capacity: z.coerce.number().int().min(1).max(10).optional(),
  })
  .refine((data) => data.new_start_time < data.new_end_time, {
    message: "End time must be after the start time",
    path: ["new_end_time"],
  });

export const modifyDoctorScheduleElasticSchema = z
  .object({
    schedule_type: z.enum(["specific_dates", "recurring_weekly"]),
    specific_dates: z.union([z.string(), z.array(z.string())]).optional(),
    weekdays: z.union([z.string(), z.array(z.coerce.number())]).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    new_start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must follow HH:mm format"),
    new_end_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must follow HH:mm format"),
    slot_duration: z.coerce.number().int().min(5).max(240).optional(),
    capacity: z.coerce.number().int().min(1).max(10).optional(),
    is_wave: z.coerce.boolean().optional(),
  })
  .refine((data) => data.new_start_time < data.new_end_time, {
    message: "End time must be after the start time",
    path: ["new_end_time"],
  });

export const previewDoctorScheduleElasticSchema = z
  .object({
    availability_id: z.coerce.number().int().positive().optional(),
    schedule_type: z.enum(["specific_dates", "recurring_weekly"]).optional(),
    specific_dates: z.union([z.string(), z.array(z.string())]).optional(),
    weekdays: z.union([z.string(), z.array(z.coerce.number())]).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    new_start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must follow HH:mm format"),
    new_end_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must follow HH:mm format"),
    slot_duration: z.coerce.number().int().min(5).max(240).optional(),
    capacity: z.coerce.number().int().min(1).max(10).optional(),
    is_wave: z.coerce.boolean().optional(),
  })
  .refine((data) => data.new_start_time < data.new_end_time, {
    message: "End time must be after the start time",
    path: ["new_end_time"],
  });

export const updateAppointmentStatusSchema = z.object({
  appointment_id: z.coerce.number().int().positive(),
  status: z.enum(["pending", "confirmed", "cancelled", "rejected", "completed"]),
});

export const rescheduleAppointmentSchema = z.object({
  appointment_id: z.coerce.number().int().positive("Invalid appointment ID"),
  new_availability_id: z.coerce.number().int().positive("Please select an alternative time slot"),
  new_slot_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  reason: z.string().trim().max(300, "Reason cannot exceed 300 characters").optional(),
});

export const updatePatientProfileSchema = z.object({
  full_name: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(8).optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
});

export const updateDoctorProfileSchema = z.object({
  full_name: z.string().trim().min(2).optional(),
  specialization: z.string().trim().min(2).optional(),
  qualification: z.string().trim().min(2).optional(),
  experience_years: z.coerce.number().int().min(0).optional(),
  consultation_fee: z.coerce.number().min(50).optional(),
  bio: z.string().optional(),
  clinic_address: z.string().optional(),
  scheduling_mode: z.enum(["stream", "wave"]).optional(),
  wave_capacity: z.coerce.number().int().min(2).max(8).optional(),
  wave_interval_minutes: z.coerce.number().int().min(15).max(120).optional(),
});

export const addToWaitingQueueSchema = z.object({
  doctor_id: z.coerce.number().int().positive("Please select a doctor"),
  patient_id: z.coerce.number().int().positive().optional().nullable(),
  patient_name: z
    .string()
    .trim()
    .min(2, "Patient full name is required (min 2 characters)")
    .max(150),
  patient_phone: z
    .string()
    .trim()
    .min(8, "Phone number is too short")
    .max(25, "Phone number is too long"),
  notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional(),
});

export const updateWaitingQueueStatusSchema = z.object({
  queue_id: z.coerce.number().int().positive(),
  status: z.enum([
    "waiting",
    "called",
    "in_consultation",
    "completed",
    "cancelled",
  ]),
});

export const earlyOfferActionSchema = z.object({
  offer_id: z.coerce.number().int().positive("Invalid offer ID"),
});

export const completeConsultationSchema = z.object({
  appointment_id: z.coerce.number().int().positive("Invalid appointment ID"),
});

export const createReceptionistInvitationSchema = z.object({
  clinic_id: z.coerce.number().int().positive("Please select a clinic"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email address"),
});

export const acceptReceptionistInvitationSchema = z.object({
  token: z.string().trim().min(1, "Invitation token is required"),
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters long")
    .max(100, "Full name cannot exceed 100 characters"),
  phone: z
    .string()
    .trim()
    .min(8, "Phone number is too short")
    .max(25, "Phone number is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const updateReceptionistClinicSchema = z.object({
  receptionist_id: z.coerce.number().int().positive("Invalid receptionist ID"),
  clinic_id: z.coerce.number().int().positive("Invalid clinic ID"),
});

export const receptionistBookAppointmentSchema = z.object({
  patient_id: z.coerce.number().int().positive("Please select or register a patient"),
  doctor_id: z.coerce.number().int().positive("Please select a doctor"),
  availability_id: z.coerce.number().int().positive("Please select an availability slot"),
  slot_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  reason: z
    .string()
    .trim()
    .min(3, "Reason for visit is required (min 3 characters)")
    .max(500, "Reason must not exceed 500 characters"),
});

export const receptionistRegisterPatientSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters long")
    .max(100, "Full name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email address"),
  phone: z
    .string()
    .trim()
    .min(8, "Phone number is too short")
    .max(25, "Phone number is too long"),
  date_of_birth: z.string().optional(),
  gender: z
    .enum(["Male", "Female", "Other", "Prefer not to say", ""])
    .optional(),
  address: z.string().max(300, "Address is too long").optional(),
});

export const blockDoctorDateSchema = z.object({
  doctor_id: z.coerce.number().int().positive("Invalid doctor ID"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must follow YYYY-MM-DD format"),
  reason: z.string().trim().max(300, "Reason cannot exceed 300 characters").optional(),
});

export const unblockDoctorDateSchema = z.object({
  doctor_id: z.coerce.number().int().positive("Invalid doctor ID"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must follow YYYY-MM-DD format"),
});
