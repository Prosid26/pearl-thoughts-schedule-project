import fs from "fs";
import path from "path";
import { isSlotInPast, getTodayIST } from "@/lib/utils/date";
import {
  generateDoctorSlotsForDate,
  getRollingDateWindow,
} from "@/lib/scheduling/doctor-schedule";
import {
  User,
  Patient,
  Doctor,
  Availability,
  Appointment,
  AppointmentStatus,
  UserRole,
  WaitingQueueStatus,
  WaitingQueueEntry,
  EarlyOfferStatus,
  EarlySlotOffer,
  NotificationType,
  InAppNotification,
  Payment,
  PaymentStatus,
  AppointmentPaymentStatus,
  Refund,
  RefundStatus,
  WebhookEvent,
  NotificationLog,
  ScheduledReminder,
  PatientNotificationPreferences,
} from "@/types/database";

interface DatabaseState {
  users: User[];
  patients: Patient[];
  doctors: Doctor[];
  availability: Availability[];
  appointments: Appointment[];
  waitingQueue: WaitingQueueEntry[];
  earlySlotOffers: EarlySlotOffer[];
  notifications: InAppNotification[];
  payments: Payment[];
  refunds: Refund[];
  webhookEvents: WebhookEvent[];
  notificationLogs: NotificationLog[];
  scheduledReminders: ScheduledReminder[];
  notificationPreferences: PatientNotificationPreferences[];
  counters: {
    userId: number;
    patientId: number;
    doctorId: number;
    availabilityId: number;
    appointmentId: number;
    queueId: number;
    offerId: number;
    notificationId: number;
    paymentId: number;
    refundId: number;
    webhookEventId: number;
    deliveryId: number;
    reminderId: number;
    preferenceId: number;
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "medrella_db.json");

// Helper to format date offset from today YYYY-MM-DD
function getFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Initial seed matching ER diagram and supabase/seed.sql
const DEFAULT_PASSWORD_HASH =
  "$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly"; // "Password123!"

function generateInitialSeed(): DatabaseState {
  const users: User[] = [
    {
      user_id: 1,
      full_name: "Aarav Sharma",
      email: "patient@demo.com",
      phone: "+91 98200 11223",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "patient",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 2,
      full_name: "Priya Verma",
      email: "jane@demo.com",
      phone: "+91 98200 44556",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "patient",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 3,
      full_name: "Dr. Ananya Sharma",
      email: "doctor.ananya@demo.com",
      phone: "+91 98201 23456",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "doctor",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 4,
      full_name: "Dr. Priya Nair",
      email: "doctor.priya@demo.com",
      phone: "+91 98202 34567",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "doctor",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 5,
      full_name: "Dr. Rohan Iyer",
      email: "doctor.rohan@demo.com",
      phone: "+91 98203 45678",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "doctor",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 6,
      full_name: "Dr. Sneha Kulkarni",
      email: "doctor.sneha@demo.com",
      phone: "+91 98204 56789",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "doctor",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 7,
      full_name: "Dr. Rahul Mehta",
      email: "doctor.rahul@demo.com",
      phone: "+91 98205 67890",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "doctor",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 8,
      full_name: "Dr. Arjun Deshmukh",
      email: "doctor.arjun@demo.com",
      phone: "+91 98206 78901",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "doctor",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 9,
      full_name: "Dr. Aditi Patel",
      email: "doctor.aditi@demo.com",
      phone: "+91 98207 89012",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "doctor",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 10,
      full_name: "Dr. Karan Shah",
      email: "doctor.karan@demo.com",
      phone: "+91 98208 90123",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "doctor",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 11,
      full_name: "Sunita Deshpande",
      email: "admin@demo.com",
      phone: "+91 98200 99887",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "admin",
      created_at: new Date().toISOString(),
    },
  ];

  const patients: Patient[] = [
    {
      patient_id: 1,
      user_id: 1,
      date_of_birth: "1992-05-14",
      gender: "Male",
      address: "204 Silver Arch, Lokhandwala Complex, Andheri West, Mumbai",
      created_at: new Date().toISOString(),
    },
    {
      patient_id: 2,
      user_id: 2,
      date_of_birth: "1996-11-22",
      gender: "Female",
      address: "501 Sea View Apartments, Hill Road, Bandra West, Mumbai",
      created_at: new Date().toISOString(),
    },
  ];

  const doctors: Doctor[] = [
    {
      doctor_id: 1,
      user_id: 3,
      specialization: "Cardiology",
      qualification: "MBBS, MD (Medicine), DM (Cardiology - AIIMS New Delhi)",
      experience_years: 14,
      consultation_fee: 1000.0,
      bio: "Dr. Ananya Sharma is a senior consultant cardiologist specializing in preventive cardiology, echocardiography, hypertension management, and heart rhythm disorders.",
      avatar_url: null,
      clinic_address: "Apex Heart & Vascular Clinic, Suite 402, Link Road, Andheri West, Mumbai",
      created_at: new Date().toISOString(),
    },
    {
      doctor_id: 2,
      user_id: 4,
      specialization: "Dermatology",
      qualification: "MBBS, MD (Dermatology, Venereology & Leprosy - Grant Medical College)",
      experience_years: 11,
      consultation_fee: 800.0,
      bio: "Dr. Priya Nair provides expert medical and aesthetic dermatological care, focusing on chronic eczema, acne scar treatments, psoriasis, and pediatric skin conditions.",
      avatar_url: null,
      clinic_address: "Twacha Skin & Aesthetic Clinic, Hill Road, Bandra West, Mumbai",
      created_at: new Date().toISOString(),
    },
    {
      doctor_id: 3,
      user_id: 5,
      specialization: "Neurology",
      qualification: "MBBS, MD (Medicine), DM (Neurology - NIMHANS Bengaluru)",
      experience_years: 16,
      consultation_fee: 1200.0,
      bio: "Dr. Rohan Iyer is a senior consultant neurologist focusing on stroke rehabilitation, epilepsy management, migraine headaches, Parkinson's disease, and neurophysiology.",
      avatar_url: null,
      clinic_address: "Mind & Nerve Healthcare, Central Avenue, Hiranandani Gardens, Powai, Mumbai",
      created_at: new Date().toISOString(),
    },
    {
      doctor_id: 4,
      user_id: 6,
      specialization: "Pediatrics",
      qualification: "MBBS, DCH, DNB (Pediatrics - Bai Jerbai Wadia Hospital for Children)",
      experience_years: 12,
      consultation_fee: 700.0,
      bio: "Dr. Sneha Kulkarni is known for compassionate pediatric care, specializing in newborn care, developmental assessment, childhood vaccinations, and nutrition counseling.",
      avatar_url: null,
      clinic_address: "Vatsalya Children's Clinic, Gokhale Road, Dadar West, Mumbai",
      created_at: new Date().toISOString(),
    },
    {
      doctor_id: 5,
      user_id: 7,
      specialization: "Orthopedics",
      qualification: "MBBS, MS (Orthopedics - KEM Hospital Mumbai), Fellowship in Joint Replacement",
      experience_years: 15,
      consultation_fee: 900.0,
      bio: "Dr. Rahul Mehta specializes in robotic joint replacement, arthroscopic knee and shoulder surgery, sports medicine, and complex fracture care.",
      avatar_url: null,
      clinic_address: "Mehta Bone & Joint Clinic, S.V. Road, Goregaon West, Mumbai",
      created_at: new Date().toISOString(),
    },
    {
      doctor_id: 6,
      user_id: 8,
      specialization: "General Medicine",
      qualification: "MBBS, MD (General Medicine - B.J. Medical College Pune)",
      experience_years: 13,
      consultation_fee: 500.0,
      bio: "Dr. Arjun Deshmukh is a trusted family physician with comprehensive expertise in diabetes management, infectious diseases, preventive health screenings, and geriatric care.",
      avatar_url: null,
      clinic_address: "Deshmukh Family Healthcare, Teen Hath Naka, Thane West, Maharashtra",
      created_at: new Date().toISOString(),
    },
    {
      doctor_id: 7,
      user_id: 9,
      specialization: "Gynecology",
      qualification: "MBBS, MS (Obstetrics & Gynecology - Seth GS Medical College & KEM)",
      experience_years: 10,
      consultation_fee: 800.0,
      bio: "Dr. Aditi Patel is a dedicated obstetrician and gynecologist specializing in high-risk pregnancy management, adolescent health, PCOS care, and minimally invasive laparoscopic surgeries.",
      avatar_url: null,
      clinic_address: "Matrutva Women's Care Clinic, Palm Beach Road, Sector 17, Vashi, Navi Mumbai, Maharashtra",
      created_at: new Date().toISOString(),
    },
    {
      doctor_id: 8,
      user_id: 10,
      specialization: "Dentistry",
      qualification: "BDS, MDS (Prosthodontics & Implantology - Nair Hospital Dental College)",
      experience_years: 9,
      consultation_fee: 600.0,
      bio: "Dr. Karan Shah provides high-precision cosmetic dentistry, dental implants, pain-free root canals, and orthodontic smile designs.",
      avatar_url: null,
      clinic_address: "Shah Dental Studio & Laser Clinic, FC Road, Shivajinagar, Pune, Maharashtra",
      created_at: new Date().toISOString(),
    },
  ];

  const date1 = getFutureDate(1);
  const date2 = getFutureDate(2);
  const date3 = getFutureDate(3);
  const date4 = getFutureDate(4);

  const availability: Availability[] = [
    // Dr. Ananya Sharma (doctor_id 1)
    {
      availability_id: 1,
      doctor_id: 1,
      available_date: date1,
      start_time: "09:00",
      end_time: "09:30",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 2,
      doctor_id: 1,
      available_date: date1,
      start_time: "09:30",
      end_time: "10:00",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 3,
      doctor_id: 1,
      available_date: date1,
      start_time: "10:00",
      end_time: "10:30",
      slot_duration: 30,
      is_available: false, // reserved by sample appointment
    },
    {
      availability_id: 4,
      doctor_id: 1,
      available_date: date1,
      start_time: "11:00",
      end_time: "11:30",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 5,
      doctor_id: 1,
      available_date: date1,
      start_time: "14:00",
      end_time: "14:30",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 6,
      doctor_id: 1,
      available_date: date2,
      start_time: "09:00",
      end_time: "09:30",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 7,
      doctor_id: 1,
      available_date: date2,
      start_time: "10:30",
      end_time: "11:00",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 8,
      doctor_id: 1,
      available_date: date3,
      start_time: "15:00",
      end_time: "15:30",
      slot_duration: 30,
      is_available: true,
    },

    // Dr. Priya Nair (doctor_id 2)
    {
      availability_id: 9,
      doctor_id: 2,
      available_date: date1,
      start_time: "10:00",
      end_time: "10:30",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 10,
      doctor_id: 2,
      available_date: date1,
      start_time: "10:30",
      end_time: "11:00",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 11,
      doctor_id: 2,
      available_date: date2,
      start_time: "14:00",
      end_time: "14:30",
      slot_duration: 30,
      is_available: true,
    },

    // Dr. Rohan Iyer (doctor_id 3)
    {
      availability_id: 12,
      doctor_id: 3,
      available_date: date1,
      start_time: "11:00",
      end_time: "11:30",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 13,
      doctor_id: 3,
      available_date: date2,
      start_time: "15:00",
      end_time: "15:30",
      slot_duration: 30,
      is_available: true,
    },

    // Dr. Sneha Kulkarni (doctor_id 4)
    {
      availability_id: 14,
      doctor_id: 4,
      available_date: date1,
      start_time: "09:30",
      end_time: "10:00",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 15,
      doctor_id: 4,
      available_date: date2,
      start_time: "11:00",
      end_time: "11:30",
      slot_duration: 30,
      is_available: true,
    },

    // Dr. Rahul Mehta (doctor_id 5)
    {
      availability_id: 16,
      doctor_id: 5,
      available_date: date1,
      start_time: "13:30",
      end_time: "14:00",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 17,
      doctor_id: 5,
      available_date: date3,
      start_time: "10:00",
      end_time: "10:30",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 18,
      doctor_id: 5,
      available_date: date4,
      start_time: "16:00",
      end_time: "16:30",
      slot_duration: 30,
      is_available: true,
    },

    // Dr. Arjun Deshmukh (doctor_id 6)
    {
      availability_id: 19,
      doctor_id: 6,
      available_date: date1,
      start_time: "09:00",
      end_time: "09:30",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 20,
      doctor_id: 6,
      available_date: date2,
      start_time: "11:00",
      end_time: "11:30",
      slot_duration: 30,
      is_available: true,
    },

    // Dr. Aditi Patel (doctor_id 7)
    {
      availability_id: 21,
      doctor_id: 7,
      available_date: date1,
      start_time: "10:30",
      end_time: "11:00",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 22,
      doctor_id: 7,
      available_date: date2,
      start_time: "14:30",
      end_time: "15:00",
      slot_duration: 30,
      is_available: true,
    },

    // Dr. Karan Shah (doctor_id 8)
    {
      availability_id: 23,
      doctor_id: 8,
      available_date: date1,
      start_time: "11:30",
      end_time: "12:00",
      slot_duration: 30,
      is_available: true,
    },
    {
      availability_id: 24,
      doctor_id: 8,
      available_date: date3,
      start_time: "16:00",
      end_time: "16:30",
      slot_duration: 30,
      is_available: true,
    },
  ];

  const appointments: Appointment[] = [
    {
      appointment_id: 1,
      patient_id: 1,
      doctor_id: 1,
      availability_id: 3,
      appointment_date: `${date1}T10:00:00.000Z`,
      status: "confirmed",
      reason: "Routine cardiac consultation and blood pressure evaluation.",
      created_at: new Date().toISOString(),
    },
  ];

  const waitingQueue: WaitingQueueEntry[] = [
    {
      queue_id: 1,
      doctor_id: 1,
      patient_id: null,
      patient_name: "Vikram Malhotra",
      patient_phone: "+91 98111 22334",
      status: "waiting",
      check_in_time: new Date().toISOString(),
      notes: "Walk-in check-in. Routine cardiac check-up.",
      created_at: new Date().toISOString(),
    },
  ];

  return {
    users,
    patients,
    doctors,
    availability,
    appointments,
    waitingQueue,
    earlySlotOffers: [],
    notifications: [],
    payments: [],
    refunds: [],
    webhookEvents: [],
    notificationLogs: [],
    scheduledReminders: [],
    notificationPreferences: [],
    counters: {
      userId: 11,
      patientId: 2,
      doctorId: 8,
      availabilityId: 24,
      appointmentId: 1,
      queueId: 1,
      offerId: 0,
      notificationId: 0,
      paymentId: 0,
      refundId: 0,
      webhookEventId: 0,
      deliveryId: 0,
      reminderId: 0,
      preferenceId: 0,
    },
  };
}

class LocalDatabase {
  private static instance: LocalDatabase;
  private state: DatabaseState;
  private isWriting = false;

  private constructor() {
    this.state = this.loadState();
  }

  public static getInstance(): LocalDatabase {
    if (!LocalDatabase.instance) {
      LocalDatabase.instance = new LocalDatabase();
    }
    return LocalDatabase.instance;
  }

  private loadState(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.doctors && parsed.appointments) {
          if (!parsed.waitingQueue) parsed.waitingQueue = [];
          if (!parsed.earlySlotOffers) parsed.earlySlotOffers = [];
          if (!parsed.notifications) parsed.notifications = [];
          if (!parsed.payments) parsed.payments = [];
          if (!parsed.refunds) parsed.refunds = [];
          if (!parsed.webhookEvents) parsed.webhookEvents = [];
          if (!parsed.notificationLogs) parsed.notificationLogs = [];
          if (!parsed.scheduledReminders) parsed.scheduledReminders = [];
          if (!parsed.notificationPreferences) parsed.notificationPreferences = [];
          if (!parsed.counters) parsed.counters = {};
          if (!parsed.counters.queueId) parsed.counters.queueId = parsed.waitingQueue.length;
          if (!parsed.counters.offerId) parsed.counters.offerId = parsed.earlySlotOffers.length;
          if (!parsed.counters.notificationId) parsed.counters.notificationId = parsed.notifications.length;
          if (!parsed.counters.paymentId) parsed.counters.paymentId = parsed.payments.length;
          if (!parsed.counters.refundId) parsed.counters.refundId = parsed.refunds.length;
          if (!parsed.counters.webhookEventId) parsed.counters.webhookEventId = parsed.webhookEvents.length;
          if (!parsed.counters.deliveryId) parsed.counters.deliveryId = parsed.notificationLogs.length;
          if (!parsed.counters.reminderId) parsed.counters.reminderId = parsed.scheduledReminders.length;
          if (!parsed.counters.preferenceId) parsed.counters.preferenceId = parsed.notificationPreferences.length;
          if (!parsed.users.some((u: User) => u.email === "admin@demo.com")) {
            parsed.users.push({
              user_id: 11,
              full_name: "Sunita Deshpande",
              email: "admin@demo.com",
              phone: "+91 98200 99887",
              password_hash: DEFAULT_PASSWORD_HASH,
              role: "admin",
              created_at: new Date().toISOString(),
            });
            if (parsed.counters.userId < 11) parsed.counters.userId = 11;
          }
          return parsed;
        }
      }
    } catch (err) {
      console.warn("Could not read local DB, creating fresh seed:", err);
    }

    const freshState = generateInitialSeed();
    this.saveState(freshState);
    return freshState;
  }

  private saveState(state: DatabaseState) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to write to local DB file:", err);
    }
  }

  private commit() {
    this.saveState(this.state);
  }

  // --- User operations ---
  public getUserByEmail(email: string): User | undefined {
    const normalized = email.toLowerCase().trim();
    const directMatch = this.state.users.find(
      (u) => u.email.toLowerCase() === normalized
    );
    if (directMatch) return directMatch;

    const legacyAliases: Record<string, string> = {
      "doctor.sarah@demo.com": "doctor.ananya@demo.com",
      "doctor.marcus@demo.com": "doctor.priya@demo.com",
      "doctor.elena@demo.com": "doctor.rohan@demo.com",
      "doctor.david@demo.com": "doctor.sneha@demo.com",
    };
    const targetEmail = legacyAliases[normalized];
    if (targetEmail) {
      return this.state.users.find((u) => u.email.toLowerCase() === targetEmail);
    }
    return undefined;
  }

  public getUserById(userId: number): User | undefined {
    return this.state.users.find((u) => u.user_id === userId);
  }

  public createUser(
    fullName: string,
    email: string,
    phone: string,
    passwordHash: string,
    role: UserRole
  ): User {
    if (this.getUserByEmail(email)) {
      throw new Error("A user with this email address already exists.");
    }
    this.state.counters.userId += 1;
    const user: User = {
      user_id: this.state.counters.userId,
      full_name: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password_hash: passwordHash,
      role,
      created_at: new Date().toISOString(),
    };
    this.state.users.push(user);
    this.commit();
    return user;
  }

  // --- Patient operations ---
  public getPatientByUserId(userId: number): Patient | undefined {
    const patient = this.state.patients.find((p) => p.user_id === userId);
    if (!patient) return undefined;
    const user = this.getUserById(userId);
    return {
      ...patient,
      user: user
        ? { full_name: user.full_name, email: user.email, phone: user.phone }
        : undefined,
    };
  }

  public getPatientById(patientId: number): Patient | undefined {
    const patient = this.state.patients.find((p) => p.patient_id === patientId);
    if (!patient) return undefined;
    const user = this.getUserById(patient.user_id);
    return {
      ...patient,
      user: user
        ? { full_name: user.full_name, email: user.email, phone: user.phone }
        : undefined,
    };
  }

  public createPatient(
    userId: number,
    dob?: string,
    gender?: string,
    address?: string
  ): Patient {
    this.state.counters.patientId += 1;
    const patient: Patient = {
      patient_id: this.state.counters.patientId,
      user_id: userId,
      date_of_birth: dob || null,
      gender: gender || null,
      address: address || null,
      created_at: new Date().toISOString(),
    };
    this.state.patients.push(patient);
    this.commit();
    return patient;
  }

  public updatePatient(
    patientId: number,
    data: {
      full_name?: string;
      phone?: string;
      date_of_birth?: string;
      gender?: string;
      address?: string;
    }
  ): Patient {
    const patientIndex = this.state.patients.findIndex(
      (p) => p.patient_id === patientId
    );
    if (patientIndex === -1) throw new Error("Patient record not found.");

    const patient = this.state.patients[patientIndex];
    if (data.date_of_birth !== undefined)
      patient.date_of_birth = data.date_of_birth;
    if (data.gender !== undefined) patient.gender = data.gender;
    if (data.address !== undefined) patient.address = data.address;

    if (data.full_name || data.phone) {
      const user = this.state.users.find((u) => u.user_id === patient.user_id);
      if (user) {
        if (data.full_name) user.full_name = data.full_name.trim();
        if (data.phone) user.phone = data.phone.trim();
      }
    }

    this.commit();
    return this.getPatientById(patientId)!;
  }

  // --- Doctor operations ---
  public getDoctorByUserId(userId: number): Doctor | undefined {
    const doctor = this.state.doctors.find((d) => d.user_id === userId);
    if (!doctor) return undefined;
    const user = this.getUserById(userId);
    return {
      ...doctor,
      user: user
        ? { full_name: user.full_name, email: user.email, phone: user.phone }
        : undefined,
    };
  }

  public getDoctorById(doctorId: number): Doctor | undefined {
    const doctor = this.state.doctors.find((d) => d.doctor_id === doctorId);
    if (!doctor) return undefined;
    const user = this.getUserById(doctor.user_id);
    return {
      ...doctor,
      user: user
        ? { full_name: user.full_name, email: user.email, phone: user.phone }
        : undefined,
    };
  }

  public getDoctors(filters?: {
    search?: string;
    specialization?: string;
    minExperience?: number;
  }): Doctor[] {
    return this.state.doctors
      .map((d) => {
        const user = this.getUserById(d.user_id);
        return {
          ...d,
          user: user
            ? {
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
              }
            : undefined,
        };
      })
      .filter((d) => {
        if (filters?.specialization && filters.specialization !== "All") {
          if (
            d.specialization.toLowerCase() !==
            filters.specialization.toLowerCase()
          ) {
            return false;
          }
        }
        if (filters?.minExperience && d.experience_years < filters.minExperience) {
          return false;
        }
        if (filters?.search && filters.search.trim()) {
          const q = filters.search.toLowerCase().trim();
          const nameMatch = d.user?.full_name?.toLowerCase().includes(q);
          const specMatch = d.specialization.toLowerCase().includes(q);
          const qualMatch = d.qualification.toLowerCase().includes(q);
          if (!nameMatch && !specMatch && !qualMatch) return false;
        }
        return true;
      });
  }

  public createDoctor(
    userId: number,
    specialization: string,
    qualification: string,
    experienceYears: number,
    consultationFee: number,
    bio?: string,
    avatarUrl?: string,
    clinicAddress?: string
  ): Doctor {
    this.state.counters.doctorId += 1;
    const doctor: Doctor = {
      doctor_id: this.state.counters.doctorId,
      user_id: userId,
      specialization,
      qualification,
      experience_years: experienceYears,
      consultation_fee: consultationFee,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      clinic_address: clinicAddress || null,
      created_at: new Date().toISOString(),
    };
    this.state.doctors.push(doctor);
    this.commit();
    return doctor;
  }

  public updateDoctor(
    doctorId: number,
    data: {
      full_name?: string;
      specialization?: string;
      qualification?: string;
      experience_years?: number;
      consultation_fee?: number;
      bio?: string;
      clinic_address?: string;
      scheduling_mode?: "stream" | "wave";
      wave_capacity?: number;
      wave_interval_minutes?: number;
    }
  ): Doctor {
    const doctorIndex = this.state.doctors.findIndex(
      (d) => d.doctor_id === doctorId
    );
    if (doctorIndex === -1) throw new Error("Doctor record not found.");

    const doctor = this.state.doctors[doctorIndex];
    if (data.specialization !== undefined)
      doctor.specialization = data.specialization;
    if (data.qualification !== undefined)
      doctor.qualification = data.qualification;
    if (data.experience_years !== undefined)
      doctor.experience_years = data.experience_years;
    if (data.consultation_fee !== undefined)
      doctor.consultation_fee = data.consultation_fee;
    if (data.bio !== undefined) doctor.bio = data.bio;
    if (data.clinic_address !== undefined)
      doctor.clinic_address = data.clinic_address;
    if (data.scheduling_mode !== undefined)
      doctor.scheduling_mode = data.scheduling_mode;
    if (data.wave_capacity !== undefined)
      doctor.wave_capacity = data.wave_capacity;
    if (data.wave_interval_minutes !== undefined)
      doctor.wave_interval_minutes = data.wave_interval_minutes;

    if (data.full_name) {
      const user = this.state.users.find((u) => u.user_id === doctor.user_id);
      if (user) {
        user.full_name = data.full_name.trim();
      }
    }

    this.commit();
    return this.getDoctorById(doctorId)!;
  }

  // --- Availability operations ---
  public ensureDoctorAvailabilityWindow(
    doctorId: number,
    daysAhead: number = 14
  ): void {
    const doctor = this.getDoctorById(doctorId);
    if (!doctor) return;

    const dates = getRollingDateWindow(daysAhead);
    let addedCount = 0;

    for (const dateStr of dates) {
      const candidateSlots = generateDoctorSlotsForDate(
        doctorId,
        dateStr,
        doctor.scheduling_mode,
        doctor.wave_capacity
      );

      for (const slotDef of candidateSlots) {
        const existing = this.state.availability.find(
          (a) =>
            a.doctor_id === doctorId &&
            a.available_date === dateStr &&
            a.start_time === slotDef.startTime
        );

        if (!existing) {
          this.state.counters.availabilityId += 1;
          this.state.availability.push({
            availability_id: this.state.counters.availabilityId,
            doctor_id: doctorId,
            available_date: dateStr,
            start_time: slotDef.startTime,
            end_time: slotDef.endTime,
            slot_duration: slotDef.slotDuration,
            is_available: true,
            is_wave: slotDef.isWave,
            wave_capacity: slotDef.waveCapacity,
            wave_booked_count: 0,
            created_at: new Date().toISOString(),
          });
          addedCount++;
        } else if (
          existing.is_available &&
          (existing.wave_booked_count || 0) === 0 &&
          existing.is_wave !== slotDef.isWave
        ) {
          // Sync unbooked future slot mode with doctor's updated scheduling policy
          existing.is_wave = slotDef.isWave;
          existing.wave_capacity = slotDef.waveCapacity;
          addedCount++;
        }
      }
    }

    if (addedCount > 0) {
      this.saveState(this.state);
    }
  }

  public getDoctorAvailability(
    doctorId: number,
    date?: string,
    onlyAvailable: boolean = false
  ): Availability[] {
    this.ensureDoctorAvailabilityWindow(doctorId, 14);

    return this.state.availability
      .filter((a) => {
        if (a.doctor_id !== doctorId) return false;
        if (date && a.available_date !== date) return false;
        if (onlyAvailable) {
          if (!a.is_available) return false;
          if (isSlotInPast(a.available_date, a.start_time)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.available_date !== b.available_date) {
          return a.available_date.localeCompare(b.available_date);
        }
        return a.start_time.localeCompare(b.start_time);
      });
  }

  public getAvailabilityById(
    availabilityId: number
  ): Availability | undefined {
    return this.state.availability.find(
      (a) => a.availability_id === availabilityId
    );
  }

  public addAvailabilitySlot(
    doctorId: number,
    availableDate: string,
    startTime: string,
    endTime: string,
    slotDuration: number = 30,
    isWave?: boolean,
    waveCapacity?: number
  ): Availability {
    // Check doctor exists
    const doctor = this.getDoctorById(doctorId);
    if (!doctor) throw new Error("Doctor does not exist.");

    // Validate future slot in IST
    if (isSlotInPast(availableDate, startTime)) {
      throw new Error("Cannot add availability for a past date or time.");
    }

    // Check duplicate or overlap
    const existing = this.state.availability.find(
      (a) =>
        a.doctor_id === doctorId &&
        a.available_date === availableDate &&
        a.start_time === startTime
    );
    if (existing) {
      throw new Error(
        `A slot at ${startTime} on ${availableDate} already exists for this doctor.`
      );
    }

    const resolvedIsWave = isWave !== undefined ? isWave : doctor.scheduling_mode === "wave";
    const resolvedWaveCapacity = resolvedIsWave
      ? (waveCapacity && waveCapacity > 0 ? waveCapacity : doctor.wave_capacity || 3)
      : 1;

    this.state.counters.availabilityId += 1;
    const newSlot: Availability = {
      availability_id: this.state.counters.availabilityId,
      doctor_id: doctorId,
      available_date: availableDate,
      start_time: startTime,
      end_time: endTime,
      slot_duration: slotDuration,
      is_available: true,
      is_wave: resolvedIsWave,
      wave_capacity: resolvedWaveCapacity,
      wave_booked_count: 0,
      created_at: new Date().toISOString(),
    };
    this.state.availability.push(newSlot);
    this.commit();
    return newSlot;
  }

  public deleteAvailabilitySlot(
    availabilityId: number,
    doctorId: number
  ): boolean {
    const slotIndex = this.state.availability.findIndex(
      (a) => a.availability_id === availabilityId
    );
    if (slotIndex === -1) throw new Error("Slot not found.");

    const slot = this.state.availability[slotIndex];
    if (slot.doctor_id !== doctorId) {
      throw new Error("Unauthorized: You do not own this availability slot.");
    }

    // Check if slot has active appointments
    const activeAppointment = this.state.appointments.find(
      (app) =>
        app.availability_id === availabilityId &&
        app.status !== "cancelled" &&
        app.status !== "rejected"
    );
    if (activeAppointment) {
      throw new Error(
        "Cannot delete a slot with an active or confirmed appointment."
      );
    }

    this.state.availability.splice(slotIndex, 1);
    this.commit();
    return true;
  }

  // --- Appointment operations (Atomic Booking) ---
  public bookAppointmentAtomic(params: {
    patientId: number;
    doctorId: number;
    availabilityId: number;
    reason: string;
  }): Appointment {
    const { patientId, doctorId, availabilityId, reason } = params;

    // Verify patient
    const patient = this.getPatientById(patientId);
    if (!patient) throw new Error("Patient record not found.");

    // Verify doctor
    const doctor = this.getDoctorById(doctorId);
    if (!doctor) throw new Error("Doctor record not found.");

    // Atomic slot check & lock
    const slot = this.getAvailabilityById(availabilityId);
    if (!slot) {
      throw new Error("The selected availability slot does not exist.");
    }

    if (slot.doctor_id !== doctorId) {
      throw new Error(
        "Integrity error: Slot does not belong to the selected doctor."
      );
    }

    if (isSlotInPast(slot.available_date, slot.start_time)) {
      throw new Error("Cannot book an appointment for a past date or time.");
    }

    let waveNum: number | null = null;
    let estConsult: string | null = null;

    if (slot.is_wave) {
      const capacity = slot.wave_capacity || 3;
      const currentBooked = slot.wave_booked_count || 0;
      if (currentBooked >= capacity || !slot.is_available) {
        throw new Error(
          "This wave arrival window has reached its maximum capacity. Please choose another wave or slot."
        );
      }
      slot.wave_booked_count = currentBooked + 1;
      waveNum = slot.wave_booked_count;
      const [sh, sm] = slot.start_time.split(":").map(Number);
      const totalMinutes = sh * 60 + sm + (waveNum - 1) * 20;
      const eh = Math.floor(totalMinutes / 60) % 24;
      const em = totalMinutes % 60;
      estConsult = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

      if (slot.wave_booked_count >= capacity) {
        slot.is_available = false;
      }
    } else {
      if (!slot.is_available) {
        throw new Error(
          "This time slot has already been booked by another patient. Please choose an alternative slot."
        );
      }

      // Check if this slot already has an appointment assigned
      const duplicateBooking = this.state.appointments.find(
        (a) =>
          a.availability_id === availabilityId &&
          a.status !== "cancelled" &&
          a.status !== "rejected"
      );
      if (duplicateBooking) {
        throw new Error(
          "This time slot is no longer available. Please select another slot."
        );
      }

      // Mark slot unavailable
      slot.is_available = false;
    }

    // Create appointment
    this.state.counters.appointmentId += 1;
    const appointmentDate = `${slot.available_date}T${slot.start_time}:00.000Z`;

    const newAppointment: Appointment = {
      appointment_id: this.state.counters.appointmentId,
      patient_id: patientId,
      doctor_id: doctorId,
      availability_id: availabilityId,
      appointment_date: appointmentDate,
      status: "pending",
      payment_status: "unpaid",
      reason: reason.trim(),
      wave_number: waveNum,
      estimated_consult_time: estConsult,
      created_at: new Date().toISOString(),
    };

    this.state.appointments.push(newAppointment);
    this.commit();

    return this.hydrateAppointment(newAppointment);
  }

  // --- Atomic Rescheduling ---
  public rescheduleAppointmentAtomic(params: {
    appointmentId: number;
    newAvailabilityId: number;
    reason?: string;
    requesterUserId: number;
    requesterRole: UserRole;
  }): Appointment {
    const { appointmentId, newAvailabilityId, reason, requesterUserId, requesterRole } = params;

    const appIndex = this.state.appointments.findIndex(
      (a) => a.appointment_id === appointmentId
    );
    if (appIndex === -1) {
      throw new Error("Appointment record not found.");
    }
    const app = this.state.appointments[appIndex];

    const doctor = this.getDoctorById(app.doctor_id);
    const patient = this.getPatientById(app.patient_id);
    if (!doctor || !patient) {
      throw new Error("Practitioner or patient record not found.");
    }

    // Authorization checks
    if (requesterRole === "patient") {
      if (patient.user_id !== requesterUserId) {
        throw new Error("Unauthorized: You cannot reschedule appointments for other patients.");
      }
    } else if (requesterRole === "doctor") {
      if (doctor.user_id !== requesterUserId) {
        throw new Error("Unauthorized: You cannot reschedule appointments for other practitioners.");
      }
    }

    if (app.status !== "pending" && app.status !== "confirmed") {
      throw new Error(
        `Cannot reschedule an appointment in '${app.status}' status. Only upcoming pending or confirmed appointments are eligible.`
      );
    }

    if (app.availability_id === newAvailabilityId) {
      throw new Error("The selected appointment slot is identical to your current time slot.");
    }

    const newSlot = this.getAvailabilityById(newAvailabilityId);
    if (!newSlot) {
      throw new Error("The requested new availability slot does not exist.");
    }

    if (newSlot.doctor_id !== app.doctor_id) {
      throw new Error("Rescheduling is only supported with the same consulting practitioner.");
    }

    if (isSlotInPast(newSlot.available_date, newSlot.start_time)) {
      throw new Error("Cannot reschedule an appointment to a past date or time.");
    }

    // Check availability of target slot
    if (newSlot.is_wave) {
      const cap = newSlot.wave_capacity || 3;
      const booked = newSlot.wave_booked_count || 0;
      if (booked >= cap || !newSlot.is_available) {
        throw new Error("The selected wave arrival window is already at full capacity. Please choose another window.");
      }
    } else {
      if (!newSlot.is_available) {
        throw new Error("The requested alternative time slot has already been reserved. Please select another slot.");
      }
    }

    // Release old slot
    const oldSlot = this.getAvailabilityById(app.availability_id);
    if (oldSlot) {
      if (oldSlot.is_wave) {
        oldSlot.wave_booked_count = Math.max(0, (oldSlot.wave_booked_count || 1) - 1);
        oldSlot.is_available = true;
      } else {
        oldSlot.is_available = true;
      }
    }

    // Claim new slot
    let waveNum: number | null = null;
    let estConsult: string | null = null;

    if (newSlot.is_wave) {
      const cap = newSlot.wave_capacity || 3;
      newSlot.wave_booked_count = (newSlot.wave_booked_count || 0) + 1;
      waveNum = newSlot.wave_booked_count;
      const [sh, sm] = newSlot.start_time.split(":").map(Number);
      const totalMinutes = sh * 60 + sm + (waveNum - 1) * 20;
      const eh = Math.floor(totalMinutes / 60) % 24;
      const em = totalMinutes % 60;
      estConsult = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

      if (newSlot.wave_booked_count >= cap) {
        newSlot.is_available = false;
      }
    } else {
      newSlot.is_available = false;
    }

    const previousSlotId = app.availability_id;
    app.availability_id = newAvailabilityId;
    app.appointment_date = `${newSlot.available_date}T${newSlot.start_time}:00.000Z`;
    app.rescheduled_from_id = previousSlotId;
    app.wave_number = waveNum;
    app.estimated_consult_time = estConsult;
    if (reason && reason.trim()) {
      app.reason = `${app.reason} (Rescheduled: ${reason.trim()})`;
    }

    // Create in-app notification
    this.createNotification({
      userId: patient.user_id,
      title: "Appointment Rescheduled",
      message: `Your consultation with ${doctor.user?.full_name || "Dr. " + doctor.specialization} has been rescheduled to ${newSlot.available_date} at ${newSlot.start_time} IST.`,
      type: "rescheduled",
    });

    this.commit();
    return this.hydrateAppointment(app);
  }

  public updateAppointmentStatus(params: {
    appointmentId: number;
    newStatus: AppointmentStatus;
    requesterUserId: number;
    requesterRole: UserRole;
  }): Appointment {
    const { appointmentId, newStatus, requesterUserId, requesterRole } =
      params;

    const appIndex = this.state.appointments.findIndex(
      (a) => a.appointment_id === appointmentId
    );
    if (appIndex === -1) {
      throw new Error("Appointment not found.");
    }

    const app = this.state.appointments[appIndex];
    const doctor = this.getDoctorById(app.doctor_id);
    const patient = this.getPatientById(app.patient_id);

    // Authorization checks
    if (requesterRole === "doctor") {
      if (!doctor || doctor.user_id !== requesterUserId) {
        throw new Error(
          "Unauthorized: You cannot modify appointments for other doctors."
        );
      }
    } else if (requesterRole === "patient") {
      if (!patient || patient.user_id !== requesterUserId) {
        throw new Error(
          "Unauthorized: You cannot modify appointments for other patients."
        );
      }
      if (newStatus !== "cancelled") {
        throw new Error("Patients are only permitted to cancel appointments.");
      }
      if (app.status === "completed") {
        throw new Error("Cannot cancel an already completed appointment.");
      }
    }

    const oldStatus = app.status;
    app.status = newStatus;

    // Restore slot if cancelled or rejected
    if (
      (newStatus === "cancelled" || newStatus === "rejected") &&
      oldStatus !== "cancelled" &&
      oldStatus !== "rejected"
    ) {
      const slot = this.getAvailabilityById(app.availability_id);
      if (slot) {
        if (slot.is_wave) {
          slot.wave_booked_count = Math.max(0, (slot.wave_booked_count || 1) - 1);
          slot.is_available = true;
        } else {
          slot.is_available = true;
        }
      }
    }

    this.commit();
    return this.hydrateAppointment(app);
  }

  public getAppointmentsForPatient(patientId: number): Appointment[] {
    return this.state.appointments
      .filter((a) => a.patient_id === patientId)
      .map((a) => this.hydrateAppointment(a))
      .sort(
        (a, b) =>
          new Date(b.appointment_date).getTime() -
          new Date(a.appointment_date).getTime()
      );
  }

  public getAppointmentsForDoctor(doctorId: number): Appointment[] {
    return this.state.appointments
      .filter((a) => a.doctor_id === doctorId)
      .map((a) => this.hydrateAppointment(a))
      .sort(
        (a, b) =>
          new Date(b.appointment_date).getTime() -
          new Date(a.appointment_date).getTime()
      );
  }

  public getAppointmentById(appointmentId: number): Appointment | undefined {
    const app = this.state.appointments.find(
      (a) => a.appointment_id === appointmentId
    );
    if (!app) return undefined;
    return this.hydrateAppointment(app);
  }

  // --- Waiting Queue Methods ---
  public addToWaitingQueue(params: {
    doctorId: number;
    patientId?: number | null;
    patientName: string;
    patientPhone: string;
    notes?: string;
  }): WaitingQueueEntry {
    this.state.counters.queueId += 1;
    const entry: WaitingQueueEntry = {
      queue_id: this.state.counters.queueId,
      doctor_id: params.doctorId,
      patient_id: params.patientId || null,
      patient_name: params.patientName.trim(),
      patient_phone: params.patientPhone.trim(),
      status: "waiting",
      check_in_time: new Date().toISOString(),
      notes: params.notes?.trim() || null,
      created_at: new Date().toISOString(),
    };
    this.state.waitingQueue.push(entry);
    this.commit();
    return this.hydrateWaitingQueue(entry);
  }

  public getWaitingQueue(
    doctorId?: number,
    status?: WaitingQueueStatus
  ): WaitingQueueEntry[] {
    return this.state.waitingQueue
      .filter((q) => {
        if (doctorId && q.doctor_id !== doctorId) return false;
        if (status && q.status !== status) return false;
        return true;
      })
      .map((q) => this.hydrateWaitingQueue(q))
      .sort(
        (a, b) =>
          new Date(a.check_in_time).getTime() -
          new Date(b.check_in_time).getTime()
      );
  }

  public getWaitingQueueById(queueId: number): WaitingQueueEntry | undefined {
    const entry = this.state.waitingQueue.find((q) => q.queue_id === queueId);
    if (!entry) return undefined;
    return this.hydrateWaitingQueue(entry);
  }

  public updateWaitingQueueStatus(
    queueId: number,
    status: WaitingQueueStatus
  ): WaitingQueueEntry {
    const entry = this.state.waitingQueue.find((q) => q.queue_id === queueId);
    if (!entry) throw new Error("Waiting queue entry not found");
    entry.status = status;
    this.commit();
    return this.hydrateWaitingQueue(entry);
  }

  // --- In-App Notifications ---
  public createNotification(params: {
    userId: number;
    title: string;
    message: string;
    type: NotificationType;
    relatedOfferId?: number;
  }): InAppNotification {
    this.state.counters.notificationId += 1;
    const notif: InAppNotification = {
      notification_id: this.state.counters.notificationId,
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      related_offer_id: params.relatedOfferId || null,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    this.state.notifications.push(notif);
    this.commit();
    return this.hydrateNotification(notif);
  }

  public getNotificationsForUser(userId: number): InAppNotification[] {
    return this.state.notifications
      .filter((n) => n.user_id === userId)
      .map((n) => this.hydrateNotification(n))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }

  public markNotificationRead(notificationId: number, userId: number): boolean {
    const notif = this.state.notifications.find(
      (n) => n.notification_id === notificationId && n.user_id === userId
    );
    if (!notif) return false;
    notif.is_read = true;
    this.commit();
    return true;
  }

  // --- Early Slot Offers ---
  public createEarlySlotOffer(params: {
    slotId: number;
    doctorId: number;
    patientId: number;
    queueId?: number | null;
    originalAppointmentId?: number | null;
    responseWindowMinutes?: number;
  }): EarlySlotOffer {
    // Prevent duplicate active offer for same patient
    const existingActive = this.state.earlySlotOffers.find(
      (o) =>
        o.patient_id === params.patientId &&
        o.status === "pending" &&
        new Date(o.expires_at).getTime() > Date.now()
    );
    if (existingActive) {
      throw new Error("Patient already has an active pending offer.");
    }

    const windowMinutes = params.responseWindowMinutes || 2; // Default 2 minutes
    const expiresAt = new Date(Date.now() + windowMinutes * 60 * 1000).toISOString();

    this.state.counters.offerId += 1;
    const offer: EarlySlotOffer = {
      offer_id: this.state.counters.offerId,
      slot_id: params.slotId,
      doctor_id: params.doctorId,
      patient_id: params.patientId,
      queue_id: params.queueId || null,
      original_appointment_id: params.originalAppointmentId || null,
      status: "pending",
      offered_at: new Date().toISOString(),
      expires_at: expiresAt,
      responded_at: null,
      created_at: new Date().toISOString(),
    };
    this.state.earlySlotOffers.push(offer);

    // Create In-App Notification for patient
    const patient = this.getPatientById(params.patientId);
    const doctor = this.getDoctorById(params.doctorId);
    const slot = this.getAvailabilityById(params.slotId);

    if (patient?.user_id) {
      this.createNotification({
        userId: patient.user_id,
        title: "Earlier Appointment Slot Available!",
        message: `Dr. ${doctor?.user?.full_name || "Doctor"} finished an appointment early. An earlier slot is available on ${slot?.available_date} at ${slot?.start_time}. You have 2 minutes to respond.`,
        type: "early_offer",
        relatedOfferId: offer.offer_id,
      });
    }

    this.commit();
    return this.hydrateEarlySlotOffer(offer);
  }

  public getActiveOfferForPatient(patientId: number): EarlySlotOffer | null {
    // Check and expire any overdue offers
    for (const o of this.state.earlySlotOffers) {
      if (
        o.patient_id === patientId &&
        o.status === "pending" &&
        new Date(o.expires_at).getTime() <= Date.now()
      ) {
        o.status = "expired";
        this.commit();
        this.advanceOfferToNextEligiblePatient(o.slot_id, o.doctor_id);
      }
    }

    const active = this.state.earlySlotOffers.find(
      (o) =>
        o.patient_id === patientId &&
        o.status === "pending" &&
        new Date(o.expires_at).getTime() > Date.now()
    );

    return active ? this.hydrateEarlySlotOffer(active) : null;
  }

  public getOffersForDoctor(doctorId: number): EarlySlotOffer[] {
    return this.state.earlySlotOffers
      .filter((o) => o.doctor_id === doctorId)
      .map((o) => this.hydrateEarlySlotOffer(o))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }

  public getAllOffers(): EarlySlotOffer[] {
    return this.state.earlySlotOffers
      .map((o) => this.hydrateEarlySlotOffer(o))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }

  public getOfferById(offerId: number): EarlySlotOffer | undefined {
    const offer = this.state.earlySlotOffers.find((o) => o.offer_id === offerId);
    if (!offer) return undefined;
    return this.hydrateEarlySlotOffer(offer);
  }

  public acceptEarlySlotOfferAtomic(
    offerId: number,
    patientUserId: number
  ): { success: boolean; appointment: Appointment; offer: EarlySlotOffer } {
    const offer = this.state.earlySlotOffers.find((o) => o.offer_id === offerId);
    if (!offer) {
      throw new Error("Offer not found.");
    }
    if (offer.status !== "pending") {
      throw new Error(`Offer is already ${offer.status}.`);
    }
    if (new Date(offer.expires_at).getTime() <= Date.now()) {
      offer.status = "expired";
      this.commit();
      this.advanceOfferToNextEligiblePatient(offer.slot_id, offer.doctor_id);
      throw new Error("This offer has expired.");
    }

    const patient = this.getPatientById(offer.patient_id);
    if (!patient || patient.user_id !== patientUserId) {
      throw new Error("Unauthorized to accept this offer.");
    }

    const newSlot = this.getAvailabilityById(offer.slot_id);
    if (!newSlot) {
      throw new Error("Target availability slot not found.");
    }

    let finalAppointment: Appointment;

    if (offer.original_appointment_id) {
      // Scheduled patient reschedule: update appointment to new slot, free old slot
      const originalApp = this.state.appointments.find(
        (a) => a.appointment_id === offer.original_appointment_id
      );
      if (!originalApp) {
        throw new Error("Original appointment record not found.");
      }

      // Free previous slot
      const oldSlot = this.getAvailabilityById(originalApp.availability_id);
      if (oldSlot) {
        oldSlot.is_available = true;
      }

      // Move to new slot safely
      originalApp.availability_id = offer.slot_id;
      originalApp.appointment_date = `${newSlot.available_date}T${newSlot.start_time}:00.000Z`;
      originalApp.status = "confirmed";
      newSlot.is_available = false;

      finalAppointment = originalApp;
    } else if (offer.queue_id) {
      // Walk-in queue patient: convert to confirmed appointment on this slot
      const queueEntry = this.state.waitingQueue.find(
        (q) => q.queue_id === offer.queue_id
      );
      if (queueEntry) {
        queueEntry.status = "in_consultation";
      }

      newSlot.is_available = false;
      this.state.counters.appointmentId += 1;
      const createdApp: Appointment = {
        appointment_id: this.state.counters.appointmentId,
        patient_id: offer.patient_id,
        doctor_id: offer.doctor_id,
        availability_id: offer.slot_id,
        appointment_date: `${newSlot.available_date}T${newSlot.start_time}:00.000Z`,
        status: "confirmed",
        reason: queueEntry?.notes || "Early Waiting Queue Consultation",
        created_at: new Date().toISOString(),
      };
      this.state.appointments.push(createdApp);
      finalAppointment = createdApp;
    } else {
      // General patient acceptance
      newSlot.is_available = false;
      this.state.counters.appointmentId += 1;
      const createdApp: Appointment = {
        appointment_id: this.state.counters.appointmentId,
        patient_id: offer.patient_id,
        doctor_id: offer.doctor_id,
        availability_id: offer.slot_id,
        appointment_date: `${newSlot.available_date}T${newSlot.start_time}:00.000Z`,
        status: "confirmed",
        reason: "Early Slot Fast-Track Offer Accepted",
        created_at: new Date().toISOString(),
      };
      this.state.appointments.push(createdApp);
      finalAppointment = createdApp;
    }

    offer.status = "accepted";
    offer.responded_at = new Date().toISOString();

    // Confirmation notification
    this.createNotification({
      userId: patient.user_id,
      title: "Earlier Slot Confirmed!",
      message: `Your earlier appointment with Dr. ${
        newSlot.doctor_id ? "your doctor" : "Doctor"
      } is confirmed for ${newSlot.available_date} at ${newSlot.start_time}.`,
      type: "offer_accepted",
      relatedOfferId: offer.offer_id,
    });

    this.commit();
    return {
      success: true,
      appointment: this.hydrateAppointment(finalAppointment),
      offer: this.hydrateEarlySlotOffer(offer),
    };
  }

  public declineEarlySlotOffer(
    offerId: number,
    patientUserId: number
  ): { success: boolean } {
    const offer = this.state.earlySlotOffers.find((o) => o.offer_id === offerId);
    if (!offer) {
      throw new Error("Offer not found.");
    }
    const patient = this.getPatientById(offer.patient_id);
    if (!patient || patient.user_id !== patientUserId) {
      throw new Error("Unauthorized to decline this offer.");
    }

    if (offer.status === "pending") {
      offer.status = "declined";
      offer.responded_at = new Date().toISOString();
      this.commit();

      // Offer to next eligible patient automatically
      this.advanceOfferToNextEligiblePatient(offer.slot_id, offer.doctor_id);
    }

    return { success: true };
  }

  public findNextEligiblePatientForSlot(
    slotId: number,
    doctorId: number
  ): {
    patientId: number;
    queueId?: number | null;
    originalAppointmentId?: number | null;
  } | null {
    const slot = this.getAvailabilityById(slotId);
    if (!slot) return null;
    const slotDateTime = new Date(`${slot.available_date}T${slot.start_time}:00.000Z`);

    // 1. Priority: Patients waiting at clinic in waiting_queue
    const waitingAtClinic = this.state.waitingQueue.filter(
      (w) =>
        w.doctor_id === doctorId &&
        w.status === "waiting" &&
        w.patient_id !== null &&
        !this.state.earlySlotOffers.some(
          (o) => o.slot_id === slotId && o.patient_id === w.patient_id
        )
    );

    if (waitingAtClinic.length > 0) {
      const candidate = waitingAtClinic[0];
      return {
        patientId: candidate.patient_id!,
        queueId: candidate.queue_id,
      };
    }

    // 2. Priority: Next scheduled patients for that doctor
    const scheduledPatients = this.state.appointments
      .filter((a) => {
        if (a.doctor_id !== doctorId) return false;
        if (a.status !== "confirmed" && a.status !== "pending") return false;
        if (new Date(a.appointment_date).getTime() <= slotDateTime.getTime()) return false;
        // Check if patient already received an offer for this slot
        const alreadyOfferedThisSlot = this.state.earlySlotOffers.some(
          (o) => o.slot_id === slotId && o.patient_id === a.patient_id
        );
        if (alreadyOfferedThisSlot) return false;
        // Check if patient currently has an active pending offer elsewhere
        const hasActivePendingOffer = this.state.earlySlotOffers.some(
          (o) =>
            o.patient_id === a.patient_id &&
            o.status === "pending" &&
            new Date(o.expires_at).getTime() > Date.now()
        );
        if (hasActivePendingOffer) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.appointment_date).getTime() -
          new Date(b.appointment_date).getTime()
      );

    if (scheduledPatients.length > 0) {
      const candidate = scheduledPatients[0];
      return {
        patientId: candidate.patient_id,
        originalAppointmentId: candidate.appointment_id,
      };
    }

    return null;
  }

  public advanceOfferToNextEligiblePatient(
    slotId: number,
    doctorId: number
  ): EarlySlotOffer | null {
    const candidate = this.findNextEligiblePatientForSlot(slotId, doctorId);
    if (candidate) {
      return this.createEarlySlotOffer({
        slotId,
        doctorId,
        patientId: candidate.patientId,
        queueId: candidate.queueId,
        originalAppointmentId: candidate.originalAppointmentId,
        responseWindowMinutes: 2,
      });
    } else {
      // No eligible patients remaining: make slot available for normal booking
      const slot = this.getAvailabilityById(slotId);
      if (slot) {
        slot.is_available = true;
        this.commit();
      }
      return null;
    }
  }

  public completeConsultationAndCheckEarlyOffer(
    appointmentId: number,
    doctorUserId: number
  ): {
    appointment: Appointment;
    earlySlotOffered: boolean;
    offer?: EarlySlotOffer;
    message: string;
  } {
    const app = this.state.appointments.find(
      (a) => a.appointment_id === appointmentId
    );
    if (!app) throw new Error("Appointment not found");

    const doctor = this.getDoctorById(app.doctor_id);
    if (!doctor || doctor.user_id !== doctorUserId) {
      throw new Error("Unauthorized: Only the attending doctor can complete this appointment.");
    }

    app.status = "completed";
    this.commit();

    const appDateStr = (
      typeof app.appointment_date === "string"
        ? app.appointment_date
        : (app.appointment_date as any).toISOString()
    ).split("T")[0];

    // Look for an early slot opportunity for this doctor on or after the consultation date
    const availableSlots = this.state.availability
      .filter(
        (s) =>
          s.doctor_id === doctor.doctor_id &&
          s.is_available &&
          s.available_date >= appDateStr
      )
      .sort((a, b) => {
        const da = new Date(`${a.available_date}T${a.start_time}:00Z`).getTime();
        const db = new Date(`${b.available_date}T${b.start_time}:00Z`).getTime();
        return da - db;
      });

    let createdOffer: EarlySlotOffer | null = null;
    if (availableSlots.length > 0) {
      const targetSlot = availableSlots[0];
      // Check if slot has active pending offer
      const activeOffer = this.state.earlySlotOffers.find(
        (o) =>
          o.slot_id === targetSlot.availability_id &&
          o.status === "pending" &&
          new Date(o.expires_at).getTime() > Date.now()
      );
      if (!activeOffer) {
        createdOffer = this.advanceOfferToNextEligiblePatient(
          targetSlot.availability_id,
          doctor.doctor_id
        );
      }
    }

    return {
      appointment: this.hydrateAppointment(app),
      earlySlotOffered: Boolean(createdOffer),
      offer: createdOffer ? this.hydrateEarlySlotOffer(createdOffer) : undefined,
      message: createdOffer
        ? "Consultation completed. Earlier slot detected and offered to next eligible patient!"
        : "Consultation marked as completed.",
    };
  }

  private hydrateWaitingQueue(item: WaitingQueueEntry): WaitingQueueEntry {
    const doctor = this.getDoctorById(item.doctor_id);
    const patient = item.patient_id ? this.getPatientById(item.patient_id) : undefined;
    return {
      ...item,
      doctor,
      patient,
    };
  }

  private hydrateEarlySlotOffer(offer: EarlySlotOffer): EarlySlotOffer {
    const doctor = this.getDoctorById(offer.doctor_id);
    const patient = this.getPatientById(offer.patient_id);
    const slot = this.getAvailabilityById(offer.slot_id);
    const originalAppointment = offer.original_appointment_id
      ? this.getAppointmentById(offer.original_appointment_id)
      : undefined;
    return {
      ...offer,
      doctor,
      patient,
      slot,
      original_appointment: originalAppointment,
    };
  }

  private hydrateNotification(notif: InAppNotification): InAppNotification {
    const offer = notif.related_offer_id
      ? this.getOfferById(notif.related_offer_id)
      : undefined;
    return {
      ...notif,
      offer,
    };
  }

  private hydrateAppointment(app: Appointment): Appointment {
    const doctor = this.getDoctorById(app.doctor_id);
    const patient = this.getPatientById(app.patient_id);
    const availability = this.getAvailabilityById(app.availability_id);
    const payments = this.state.payments.filter(
      (p) => p.appointment_id === app.appointment_id
    );
    const refunds = this.state.refunds.filter(
      (r) => r.appointment_id === app.appointment_id
    );

    return {
      ...app,
      payment_status: app.payment_status || "unpaid",
      doctor,
      patient,
      availability,
      payments,
      refunds,
    };
  }

  // --- Payments ---
  public createPayment(params: {
    appointmentId: number;
    patientId: number;
    provider: string;
    providerOrderId: string;
    amount: number;
    currency?: string;
    idempotencyKey?: string;
  }): Payment {
    if (params.idempotencyKey) {
      const existing = this.state.payments.find(
        (p) => p.idempotency_key === params.idempotencyKey
      );
      if (existing) return existing;
    }

    this.state.counters.paymentId = (this.state.counters.paymentId || 0) + 1;
    const payment: Payment = {
      payment_id: this.state.counters.paymentId,
      appointment_id: params.appointmentId,
      patient_id: params.patientId,
      provider: params.provider || "razorpay",
      provider_order_id: params.providerOrderId,
      amount: params.amount,
      currency: params.currency || "INR",
      status: "pending",
      idempotency_key: params.idempotencyKey || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.state.payments.push(payment);

    const app = this.state.appointments.find(
      (a) => a.appointment_id === params.appointmentId
    );
    if (app && (!app.payment_status || app.payment_status === "unpaid")) {
      app.payment_status = "pending";
    }

    this.commit();
    return payment;
  }

  public getPaymentById(paymentId: number): Payment | null {
    const p = this.state.payments.find((x) => x.payment_id === paymentId);
    if (!p) return null;
    const refunds = this.state.refunds.filter((r) => r.payment_id === paymentId);
    return { ...p, refunds };
  }

  public getPaymentByOrderId(orderId: string): Payment | null {
    const p = this.state.payments.find((x) => x.provider_order_id === orderId);
    if (!p) return null;
    const refunds = this.state.refunds.filter((r) => r.payment_id === p.payment_id);
    return { ...p, refunds };
  }

  public getPaymentByProviderPaymentId(providerPaymentId: string): Payment | null {
    const p = this.state.payments.find((x) => x.provider_payment_id === providerPaymentId);
    if (!p) return null;
    const refunds = this.state.refunds.filter((r) => r.payment_id === p.payment_id);
    return { ...p, refunds };
  }

  public getPaymentsForAppointment(appointmentId: number): Payment[] {
    return this.state.payments
      .filter((p) => p.appointment_id === appointmentId)
      .map((p) => ({
        ...p,
        refunds: this.state.refunds.filter((r) => r.payment_id === p.payment_id),
      }));
  }

  public getPaymentsForPatient(patientId: number): Payment[] {
    return this.state.payments
      .filter((p) => p.patient_id === patientId)
      .map((p) => ({
        ...p,
        appointment: this.getAppointmentById(p.appointment_id) || undefined,
        refunds: this.state.refunds.filter((r) => r.payment_id === p.payment_id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public updatePaymentStatus(params: {
    paymentId: number;
    status: PaymentStatus;
    providerPaymentId?: string;
    providerSignature?: string;
    failureReason?: string;
  }): Payment {
    const p = this.state.payments.find((x) => x.payment_id === params.paymentId);
    if (!p) throw new Error("Payment record not found");

    p.status = params.status;
    if (params.providerPaymentId) p.provider_payment_id = params.providerPaymentId;
    if (params.providerSignature) p.provider_signature = params.providerSignature;
    if (params.failureReason) p.failure_reason = params.failureReason;
    p.updated_at = new Date().toISOString();

    // Mirror to appointment payment_status
    const app = this.state.appointments.find((a) => a.appointment_id === p.appointment_id);
    if (app) {
      if (params.status === "captured") {
        app.payment_status = "paid";
        if (app.status === "pending") {
          app.status = "confirmed";
        }
      } else if (params.status === "failed") {
        app.payment_status = "failed";
      } else if (params.status === "refunded") {
        app.payment_status = "refunded";
      } else if (params.status === "partially_refunded") {
        app.payment_status = "partially_refunded";
      } else if (params.status === "abandoned") {
        app.payment_status = "unpaid";
      }
    }

    this.commit();
    return p;
  }

  public updateAppointmentPaymentStatus(
    appointmentId: number,
    paymentStatus: AppointmentPaymentStatus
  ): void {
    const app = this.state.appointments.find((a) => a.appointment_id === appointmentId);
    if (app) {
      app.payment_status = paymentStatus;
      this.commit();
    }
  }

  // --- Refunds ---
  public createRefundRecord(params: {
    paymentId: number;
    appointmentId: number;
    amount: number;
    currency?: string;
    reason: string;
    policyApplied: string;
    provider: string;
    providerRefundId?: string;
    idempotencyKey?: string;
    status?: RefundStatus;
    errorMessage?: string;
  }): Refund {
    if (params.idempotencyKey) {
      const existing = this.state.refunds.find(
        (r) => r.idempotency_key === params.idempotencyKey
      );
      if (existing) return existing;
    }

    const payment = this.getPaymentById(params.paymentId);
    if (!payment) throw new Error("Payment not found for refund creation");

    const existingTotal = this.state.refunds
      .filter((r) => r.payment_id === params.paymentId && r.status !== "failed")
      .reduce((sum, r) => sum + r.amount, 0);

    if (existingTotal + params.amount > payment.amount) {
      throw new Error(
        `Refund amount (${params.amount}) exceeds captured payment ceiling (total: ${payment.amount}, already refunded: ${existingTotal}).`
      );
    }

    this.state.counters.refundId = (this.state.counters.refundId || 0) + 1;
    const refund: Refund = {
      refund_id: this.state.counters.refundId,
      payment_id: params.paymentId,
      appointment_id: params.appointmentId,
      amount: params.amount,
      currency: params.currency || "INR",
      reason: params.reason,
      policy_applied: params.policyApplied,
      provider: params.provider || "razorpay",
      provider_refund_id: params.providerRefundId || null,
      idempotency_key: params.idempotencyKey || null,
      status: params.status || "pending",
      error_message: params.errorMessage || null,
      created_at: new Date().toISOString(),
      processed_at: params.status === "processed" ? new Date().toISOString() : null,
    };

    this.state.refunds.push(refund);

    if (refund.status === "processed") {
      const totalRefunded = existingTotal + params.amount;
      const newStatus =
        totalRefunded >= payment.amount ? "refunded" : "partially_refunded";
      payment.status = newStatus;
      const app = this.state.appointments.find(
        (a) => a.appointment_id === params.appointmentId
      );
      if (app) {
        app.payment_status = newStatus;
      }
    }

    this.commit();
    return refund;
  }

  public getRefundsForPayment(paymentId: number): Refund[] {
    return this.state.refunds.filter((r) => r.payment_id === paymentId);
  }

  public getRefundsForAppointment(appointmentId: number): Refund[] {
    return this.state.refunds.filter((r) => r.appointment_id === appointmentId);
  }

  public updateRefundStatus(params: {
    refundId: number;
    status: RefundStatus;
    providerRefundId?: string;
    errorMessage?: string;
  }): Refund {
    const r = this.state.refunds.find((x) => x.refund_id === params.refundId);
    if (!r) throw new Error("Refund record not found");

    r.status = params.status;
    if (params.providerRefundId) r.provider_refund_id = params.providerRefundId;
    if (params.errorMessage) r.error_message = params.errorMessage;
    if (params.status === "processed") r.processed_at = new Date().toISOString();

    if (params.status === "processed") {
      const payment = this.getPaymentById(r.payment_id);
      if (payment) {
        const totalRefunded = this.state.refunds
          .filter((ref) => ref.payment_id === r.payment_id && ref.status === "processed")
          .reduce((sum, ref) => sum + ref.amount, 0);
        const newStatus =
          totalRefunded >= payment.amount ? "refunded" : "partially_refunded";
        payment.status = newStatus;
        const app = this.state.appointments.find((a) => a.appointment_id === r.appointment_id);
        if (app) app.payment_status = newStatus;
      }
    }

    this.commit();
    return r;
  }

  // --- Webhook Events (Idempotency) ---
  public recordWebhookEvent(params: {
    provider: string;
    providerEventId: string;
    eventType: string;
    payload: string;
    status?: "processing" | "processed" | "failed";
    errorMessage?: string;
  }): WebhookEvent {
    const existing = this.state.webhookEvents.find(
      (w) =>
        w.provider === params.provider &&
        w.provider_event_id === params.providerEventId
    );
    if (existing) return existing;

    this.state.counters.webhookEventId =
      (this.state.counters.webhookEventId || 0) + 1;
    const event: WebhookEvent = {
      event_id: this.state.counters.webhookEventId,
      provider: params.provider,
      provider_event_id: params.providerEventId,
      event_type: params.eventType,
      payload: params.payload,
      status: params.status || "processed",
      error_message: params.errorMessage || null,
      created_at: new Date().toISOString(),
    };

    this.state.webhookEvents.push(event);
    this.commit();
    return event;
  }

  public getWebhookEvent(
    provider: string,
    providerEventId: string
  ): WebhookEvent | null {
    const ev = this.state.webhookEvents.find(
      (w) => w.provider === provider && w.provider_event_id === providerEventId
    );
    return ev || null;
  }

  // --- Notification Logs ---
  public createNotificationLog(params: {
    userId: number;
    recipientEmail: string;
    channel?: "email" | "sms" | "whatsapp";
    eventType: string;
    subject: string;
    appointmentId?: number | null;
    status?: "pending" | "sent" | "delivered" | "failed" | "simulated";
    provider?: string;
    providerMessageId?: string;
    idempotencyKey?: string;
    errorMessage?: string;
  }): NotificationLog {
    if (params.idempotencyKey) {
      const existing = this.state.notificationLogs.find(
        (l) => l.idempotency_key === params.idempotencyKey
      );
      if (existing) return existing;
    }

    this.state.counters.deliveryId = (this.state.counters.deliveryId || 0) + 1;
    const log: NotificationLog = {
      delivery_id: this.state.counters.deliveryId,
      user_id: params.userId,
      recipient_email: params.recipientEmail,
      channel: params.channel || "email",
      event_type: params.eventType,
      subject: params.subject,
      appointment_id: params.appointmentId ?? null,
      status: params.status || "delivered",
      provider: params.provider || "console",
      provider_message_id: params.providerMessageId || null,
      idempotency_key: params.idempotencyKey || null,
      error_message: params.errorMessage || null,
      created_at: new Date().toISOString(),
    };

    this.state.notificationLogs.push(log);
    this.commit();
    return log;
  }

  public getNotificationLogsForAppointment(
    appointmentId: number
  ): NotificationLog[] {
    return this.state.notificationLogs.filter(
      (l) => l.appointment_id === appointmentId
    );
  }

  public getNotificationLogByIdempotency(
    idempotencyKey: string
  ): NotificationLog | null {
    const l = this.state.notificationLogs.find(
      (x) => x.idempotency_key === idempotencyKey
    );
    return l || null;
  }

  public getNotificationLogByMessageId(
    providerMessageId: string
  ): NotificationLog | null {
    const l = this.state.notificationLogs.find(
      (x) => x.provider_message_id === providerMessageId
    );
    return l || null;
  }

  public updateNotificationLogStatus(
    providerMessageId: string,
    status: "sent" | "delivered" | "failed",
    errorMessage?: string
  ): void {
    const l = this.state.notificationLogs.find(
      (x) => x.provider_message_id === providerMessageId
    );
    if (l) {
      l.status = status;
      if (errorMessage) l.error_message = errorMessage;
      this.commit();
    }
  }

  public createInAppNotification(params: {
    userId: number;
    title: string;
    message: string;
    type?: NotificationType;
    relatedOfferId?: number | null;
  }): InAppNotification {
    this.state.counters.notificationId =
      (this.state.counters.notificationId || 0) + 1;
    const notif: InAppNotification = {
      notification_id: this.state.counters.notificationId,
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || "general",
      related_offer_id: params.relatedOfferId || null,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    this.state.notifications.unshift(notif);
    this.commit();
    return notif;
  }

  // --- Scheduled Reminders ---
  public upsertScheduledReminder(params: {
    appointmentId: number;
    reminderType: string;
    scheduledFor: Date | string;
  }): ScheduledReminder {
    const scheduledForIso =
      params.scheduledFor instanceof Date
        ? params.scheduledFor.toISOString()
        : new Date(params.scheduledFor).toISOString();

    const existing = this.state.scheduledReminders.find(
      (r) =>
        r.appointment_id === params.appointmentId &&
        r.reminder_type === params.reminderType
    );

    if (existing) {
      existing.scheduled_for = scheduledForIso;
      existing.status = "scheduled";
      existing.updated_at = new Date().toISOString();
      this.commit();
      return existing;
    }

    this.state.counters.reminderId = (this.state.counters.reminderId || 0) + 1;
    const reminder: ScheduledReminder = {
      reminder_id: this.state.counters.reminderId,
      appointment_id: params.appointmentId,
      reminder_type: params.reminderType,
      scheduled_for: scheduledForIso,
      status: "scheduled",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.state.scheduledReminders.push(reminder);
    this.commit();
    return reminder;
  }

  public cancelRemindersForAppointment(appointmentId: number): void {
    for (const r of this.state.scheduledReminders) {
      if (r.appointment_id === appointmentId && r.status === "scheduled") {
        r.status = "cancelled";
        r.updated_at = new Date().toISOString();
      }
    }
    this.commit();
  }

  public getDueScheduledReminders(limit?: number): ScheduledReminder[] {
    const now = Date.now();
    const staleProcessingThreshold = now - 5 * 60 * 1000;
    const list = this.state.scheduledReminders.filter(
      (r) =>
        (r.status === "scheduled" ||
          (r.status === "processing" &&
            new Date(r.updated_at).getTime() < staleProcessingThreshold)) &&
        new Date(r.scheduled_for).getTime() <= now
    );
    return typeof limit === "number" ? list.slice(0, limit) : list;
  }

  public claimScheduledReminder(reminderId: number): boolean {
    const now = Date.now();
    const staleProcessingThreshold = now - 5 * 60 * 1000;
    const r = this.state.scheduledReminders.find((x) => x.reminder_id === reminderId);
    if (!r) return false;
    const isAvailable =
      r.status === "scheduled" ||
      (r.status === "processing" &&
        new Date(r.updated_at).getTime() < staleProcessingThreshold);
    if (!isAvailable) return false;

    r.status = "processing";
    r.updated_at = new Date().toISOString();
    this.commit();
    return true;
  }

  public countDueScheduledReminders(): number {
    const now = Date.now();
    return this.state.scheduledReminders.filter(
      (r) =>
        r.status === "scheduled" &&
        new Date(r.scheduled_for).getTime() <= now
    ).length;
  }

  public updateReminderStatus(
    reminderId: number,
    status: "scheduled" | "processing" | "sent" | "cancelled" | "failed",
    errorMessage?: string
  ): void {
    const r = this.state.scheduledReminders.find((x) => x.reminder_id === reminderId);
    if (r) {
      r.status = status;
      if (status === "sent") r.sent_at = new Date().toISOString();
      if (errorMessage) r.error_message = errorMessage;
      r.updated_at = new Date().toISOString();
      this.commit();
    }
  }

  // --- Patient Notification Preferences ---
  public getNotificationPreferences(userId: number): PatientNotificationPreferences {
    const existing = this.state.notificationPreferences.find((p) => p.user_id === userId);
    if (existing) {
      return { ...existing };
    }

    // Default configuration: all enabled, not unsubscribed
    this.state.counters.preferenceId = (this.state.counters.preferenceId || 0) + 1;
    const defaultPref: PatientNotificationPreferences = {
      preference_id: this.state.counters.preferenceId,
      user_id: userId,
      email_enabled: true,
      sms_enabled: true,
      whatsapp_enabled: true,
      appointment_confirmations: true,
      appointment_reminders: true,
      cancellation_rescheduling: true,
      payment_confirmations: true,
      refund_updates: true,
      unsubscribed_all: false,
      sms_consent: true,
      whatsapp_consent: true,
      consent_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.notificationPreferences.push(defaultPref);
    this.commit();
    return { ...defaultPref };
  }

  public updateNotificationPreferences(
    userId: number,
    updates: Partial<Omit<PatientNotificationPreferences, "preference_id" | "user_id" | "created_at">>
  ): PatientNotificationPreferences {
    let pref = this.state.notificationPreferences.find((p) => p.user_id === userId);
    if (!pref) {
      this.getNotificationPreferences(userId);
      pref = this.state.notificationPreferences.find((p) => p.user_id === userId)!;
    }

    Object.assign(pref, updates, { updated_at: new Date().toISOString() });
    this.commit();
    return { ...pref };
  }

  public unsubscribeAll(userId: number): PatientNotificationPreferences {
    const pref = this.updateNotificationPreferences(userId, {
      unsubscribed_all: true,
      email_enabled: false,
      sms_enabled: false,
      whatsapp_enabled: false,
    });

    // Cancel all pending reminders for this patient
    const patient = this.state.patients.find((p) => p.user_id === userId);
    if (patient) {
      const appts = this.state.appointments.filter((a) => a.patient_id === patient.patient_id);
      for (const a of appts) {
        this.cancelRemindersForAppointment(a.appointment_id);
      }
    }

    return pref;
  }

  public unsubscribeChannelByPhone(
    phone: string,
    channel: "sms" | "whatsapp"
  ): { success: boolean; userId?: number } {
    const cleanTarget = phone.replace(/\D/g, "");
    const user = this.state.users.find((u) => {
      const uClean = u.phone.replace(/\D/g, "");
      return (
        (uClean.length >= 10 && cleanTarget.endsWith(uClean.slice(-10))) ||
        (cleanTarget.length >= 10 && uClean.endsWith(cleanTarget.slice(-10)))
      );
    });

    if (!user) {
      return { success: false };
    }

    if (channel === "sms") {
      this.updateNotificationPreferences(user.user_id, { sms_enabled: false });
    } else if (channel === "whatsapp") {
      this.updateNotificationPreferences(user.user_id, { whatsapp_enabled: false });
    }

    return { success: true, userId: user.user_id };
  }

  public resubscribeChannelByPhone(
    phone: string,
    channel: "sms" | "whatsapp"
  ): { success: boolean; userId?: number } {
    const cleanTarget = phone.replace(/\D/g, "");
    const user = this.state.users.find((u) => {
      const uClean = u.phone.replace(/\D/g, "");
      return (
        (uClean.length >= 10 && cleanTarget.endsWith(uClean.slice(-10))) ||
        (cleanTarget.length >= 10 && uClean.endsWith(cleanTarget.slice(-10)))
      );
    });

    if (!user) {
      return { success: false };
    }

    if (channel === "sms") {
      this.updateNotificationPreferences(user.user_id, {
        sms_enabled: true,
        sms_consent: true,
        unsubscribed_all: false,
      });
    } else if (channel === "whatsapp") {
      this.updateNotificationPreferences(user.user_id, {
        whatsapp_enabled: true,
        whatsapp_consent: true,
        unsubscribed_all: false,
      });
    }

    return { success: true, userId: user.user_id };
  }
}

export const localDb = LocalDatabase.getInstance();
