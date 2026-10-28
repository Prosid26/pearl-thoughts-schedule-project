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
}).refine((data) => data.start_time < data.end_time, {
  message: "End time must be after the start time",
  path: ["end_time"],
});

export const updateAppointmentStatusSchema = z.object({
  appointment_id: z.coerce.number().int().positive(),
  status: z.enum(["pending", "confirmed", "cancelled", "rejected", "completed"]),
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
});
