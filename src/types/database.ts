export type UserRole = "patient" | "doctor" | "admin";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "rejected"
  | "completed";

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export interface Patient {
  patient_id: number;
  user_id: number;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  created_at?: string;
  user?: Pick<User, "full_name" | "email" | "phone">;
}

export interface Doctor {
  doctor_id: number;
  user_id: number;
  specialization: string;
  qualification: string;
  experience_years: number;
  consultation_fee: number;
  bio?: string | null;
  avatar_url?: string | null;
  clinic_address?: string | null;
  created_at?: string;
  user?: Pick<User, "full_name" | "email" | "phone">;
}

export interface Availability {
  availability_id: number;
  doctor_id: number;
  available_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  slot_duration: number; // in minutes (e.g., 30)
  is_available: boolean;
  created_at?: string;
}

export interface Appointment {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  availability_id: number;
  appointment_date: string; // ISO datetime
  status: AppointmentStatus;
  reason: string;
  created_at: string;
  patient?: Patient & { user?: Pick<User, "full_name" | "email" | "phone"> };
  doctor?: Doctor & { user?: Pick<User, "full_name" | "email" | "phone"> };
  availability?: Availability;
}

export interface SessionUser {
  user_id: number;
  email: string;
  full_name: string;
  role: UserRole;
  patient_id?: number | null;
  doctor_id?: number | null;
}
