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
  gender?: "male" | "female" | string | null;
  bio?: string | null;
  avatar_url?: string | null;
  clinic_address?: string | null;
  scheduling_mode?: "stream" | "wave";
  wave_capacity?: number;
  wave_interval_minutes?: number;
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
  is_wave?: boolean;
  wave_capacity?: number;
  wave_booked_count?: number;
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
  rescheduled_from_id?: number | null;
  wave_number?: number | null;
  estimated_consult_time?: string | null;
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

export type WaitingQueueStatus =
  | "waiting"
  | "called"
  | "in_consultation"
  | "completed"
  | "cancelled";

export interface WaitingQueueEntry {
  queue_id: number;
  doctor_id: number;
  patient_id?: number | null;
  patient_name: string;
  patient_phone: string;
  status: WaitingQueueStatus;
  check_in_time: string; // ISO datetime
  notes?: string | null;
  created_at: string;
  doctor?: Doctor & { user?: Pick<User, "full_name" | "email" | "phone"> };
  patient?: Patient & { user?: Pick<User, "full_name" | "email" | "phone"> };
}

export type EarlyOfferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled";

export interface EarlySlotOffer {
  offer_id: number;
  slot_id: number;
  doctor_id: number;
  patient_id: number;
  queue_id?: number | null;
  original_appointment_id?: number | null;
  status: EarlyOfferStatus;
  offered_at: string;
  expires_at: string;
  responded_at?: string | null;
  created_at: string;
  slot?: Availability;
  doctor?: Doctor & { user?: Pick<User, "full_name" | "email" | "phone"> };
  patient?: Patient & { user?: Pick<User, "full_name" | "email" | "phone"> };
  original_appointment?: Appointment;
}

export type NotificationType =
  | "early_offer"
  | "offer_accepted"
  | "offer_expired"
  | "offer_declined"
  | "queue_update"
  | "rescheduled"
  | "general";

export interface InAppNotification {
  notification_id: number;
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  related_offer_id?: number | null;
  is_read: boolean;
  created_at: string;
  offer?: EarlySlotOffer;
}
