import fs from "fs";
import path from "path";
import crypto from "crypto";
import { isSlotInPast, getTodayIST } from "@/lib/utils/date";
import {
  generateDoctorSlotsForDate,
  getRollingDateWindow,
} from "@/lib/scheduling/doctor-schedule";
import {
  doIntervalsOverlap,
  generateTimeSlots,
  calculateStreamAppointmentTimes,
  calculateElasticDiff,
  resolveTargetDates,
} from "@/lib/scheduling/slot-generator";
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
  InAppNotificationCategory,
  Clinic,
  Receptionist,
  ReceptionistInvitation,
  InvitationStatus,
} from "@/types/database";

interface DatabaseState {
  users: User[];
  patients: Patient[];
  doctors: Doctor[];
  availability: Availability[];
  appointments: Appointment[];
  clinics: Clinic[];
  receptionists: Receptionist[];
  receptionistInvitations: ReceptionistInvitation[];
  waitingQueue: WaitingQueueEntry[];
  earlySlotOffers: EarlySlotOffer[];
  notifications: InAppNotification[];
  inAppNotifications: InAppNotification[];
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
    clinicId: number;
    receptionistId: number;
    invitationId: number;
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
    {
      user_id: 12,
      full_name: "Pooja Kulkarni",
      email: "receptionist@demo.com",
      phone: "+91 98200 88776",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "receptionist",
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
      clinic_id: 1,
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
      clinic_id: 2,
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
      clinic_id: 3,
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
      clinic_id: 4,
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
      clinic_id: 1,
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
      clinic_id: 1,
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
      clinic_id: 2,
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
      clinic_id: 3,
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

  const clinics: Clinic[] = [
    {
      clinic_id: 1,
      name: "Apex Heart & Medical Center",
      address: "Link Road, Andheri West, Mumbai, Maharashtra 400053",
      phone: "+91 22 2630 1100",
      created_at: new Date().toISOString(),
    },
    {
      clinic_id: 2,
      name: "Twacha Healthcare Clinic",
      address: "Hill Road, Bandra West, Mumbai, Maharashtra 400050",
      phone: "+91 22 2640 2200",
      created_at: new Date().toISOString(),
    },
    {
      clinic_id: 3,
      name: "Mind & Nerve Healthcare Center",
      address: "Central Avenue, Hiranandani Gardens, Powai, Mumbai, Maharashtra 400076",
      phone: "+91 22 2570 3300",
      created_at: new Date().toISOString(),
    },
    {
      clinic_id: 4,
      name: "Vatsalya Children's & Family Clinic",
      address: "Gokhale Road, Dadar West, Mumbai, Maharashtra 400028",
      phone: "+91 22 2430 4400",
      created_at: new Date().toISOString(),
    },
  ];

  const receptionists: Receptionist[] = [
    {
      receptionist_id: 1,
      user_id: 12,
      clinic_id: 1,
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
    clinics,
    receptionists,
    receptionistInvitations: [],
    waitingQueue,
    earlySlotOffers: [],
    notifications: [],
    inAppNotifications: [],
    payments: [],
    refunds: [],
    webhookEvents: [],
    notificationLogs: [],
    scheduledReminders: [],
    notificationPreferences: [],
    counters: {
      userId: 12,
      patientId: 2,
      doctorId: 8,
      availabilityId: 24,
      appointmentId: 1,
      clinicId: 4,
      receptionistId: 1,
      invitationId: 0,
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
          if (!parsed.clinics || parsed.clinics.length === 0) {
            parsed.clinics = [
              {
                clinic_id: 1,
                name: "Apex Heart & Medical Center",
                address: "Link Road, Andheri West, Mumbai, Maharashtra 400053",
                phone: "+91 22 2630 1100",
                created_at: new Date().toISOString(),
              },
              {
                clinic_id: 2,
                name: "Twacha Healthcare Clinic",
                address: "Hill Road, Bandra West, Mumbai, Maharashtra 400050",
                phone: "+91 22 2640 2200",
                created_at: new Date().toISOString(),
              },
              {
                clinic_id: 3,
                name: "Mind & Nerve Healthcare Center",
                address: "Central Avenue, Hiranandani Gardens, Powai, Mumbai, Maharashtra 400076",
                phone: "+91 22 2570 3300",
                created_at: new Date().toISOString(),
              },
              {
                clinic_id: 4,
                name: "Vatsalya Children's & Family Clinic",
                address: "Gokhale Road, Dadar West, Mumbai, Maharashtra 400028",
                phone: "+91 22 2430 4400",
                created_at: new Date().toISOString(),
              },
            ];
          }
          if (!parsed.receptionists) parsed.receptionists = [];
          if (!parsed.receptionistInvitations) parsed.receptionistInvitations = [];

          const defaultDocClinics: Record<number, number> = {
            1: 1, 2: 2, 3: 3, 4: 4, 5: 1, 6: 1, 7: 2, 8: 3,
          };
          for (const d of parsed.doctors) {
            if (!d.clinic_id) {
              d.clinic_id = defaultDocClinics[d.doctor_id] || 1;
            }
          }

          if (!parsed.waitingQueue) parsed.waitingQueue = [];
          if (!parsed.earlySlotOffers) parsed.earlySlotOffers = [];
          if (!parsed.notifications) parsed.notifications = [];
          if (!parsed.inAppNotifications) parsed.inAppNotifications = [];
          if (!parsed.payments) parsed.payments = [];
          if (!parsed.refunds) parsed.refunds = [];
          if (!parsed.webhookEvents) parsed.webhookEvents = [];
          if (!parsed.notificationLogs) parsed.notificationLogs = [];
          if (!parsed.scheduledReminders) parsed.scheduledReminders = [];
          if (!parsed.notificationPreferences) parsed.notificationPreferences = [];
          if (!parsed.counters) parsed.counters = {};
          if (!parsed.counters.clinicId) parsed.counters.clinicId = parsed.clinics.length;
          if (!parsed.counters.receptionistId) parsed.counters.receptionistId = parsed.receptionists.length;
          if (!parsed.counters.invitationId) parsed.counters.invitationId = parsed.receptionistInvitations.length;
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

          if (!parsed.users.some((u: User) => u.email === "receptionist@demo.com")) {
            parsed.users.push({
              user_id: 12,
              full_name: "Pooja Kulkarni",
              email: "receptionist@demo.com",
              phone: "+91 98200 88776",
              password_hash: DEFAULT_PASSWORD_HASH,
              role: "receptionist",
              created_at: new Date().toISOString(),
            });
            if (parsed.counters.userId < 12) parsed.counters.userId = 12;
            if (!parsed.receptionists.some((r: Receptionist) => r.user_id === 12)) {
              parsed.receptionists.push({
                receptionist_id: 1,
                user_id: 12,
                clinic_id: 1,
                created_at: new Date().toISOString(),
              });
              if (parsed.counters.receptionistId < 1) parsed.counters.receptionistId = 1;
            }
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

  public getPatients(searchQuery?: string): Patient[] {
    return this.state.patients
      .map((p) => {
        const user = this.getUserById(p.user_id);
        return {
          ...p,
          user: user
            ? { full_name: user.full_name, email: user.email, phone: user.phone }
            : undefined,
        };
      })
      .filter((p) => {
        if (!searchQuery || !searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const name = p.user?.full_name?.toLowerCase() || "";
        const phone = p.user?.phone?.toLowerCase() || "";
        const email = p.user?.email?.toLowerCase() || "";
        return name.includes(q) || phone.includes(q) || email.includes(q);
      });
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
    const clinic = doctor.clinic_id ? this.getClinicById(doctor.clinic_id) : undefined;
    return {
      ...doctor,
      user: user
        ? { full_name: user.full_name, email: user.email, phone: user.phone }
        : undefined,
      clinic,
    };
  }

  public getDoctorById(doctorId: number): Doctor | undefined {
    const doctor = this.state.doctors.find((d) => d.doctor_id === doctorId);
    if (!doctor) return undefined;
    const user = this.getUserById(doctor.user_id);
    const clinic = doctor.clinic_id ? this.getClinicById(doctor.clinic_id) : undefined;
    return {
      ...doctor,
      user: user
        ? { full_name: user.full_name, email: user.email, phone: user.phone }
        : undefined,
      clinic,
    };
  }

  public getDoctors(filters?: {
    search?: string;
    specialization?: string;
    minExperience?: number;
    clinicId?: number;
  }): Doctor[] {
    return this.state.doctors
      .map((d) => {
        const user = this.getUserById(d.user_id);
        const clinic = d.clinic_id ? this.getClinicById(d.clinic_id) : undefined;
        return {
          ...d,
          user: user
            ? {
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
              }
            : undefined,
          clinic,
        };
      })
      .filter((d) => {
        if (filters?.clinicId && d.clinic_id !== filters.clinicId) {
          return false;
        }
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
    clinicAddress?: string,
    clinicId?: number
  ): Doctor {
    this.state.counters.doctorId += 1;
    const doctor: Doctor = {
      doctor_id: this.state.counters.doctorId,
      user_id: userId,
      clinic_id: clinicId || null,
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
      clinic_id?: number;
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
    if (data.clinic_id !== undefined)
      doctor.clinic_id = data.clinic_id;
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

  // --- Clinic operations ---
  public getClinics(): Clinic[] {
    return [...this.state.clinics];
  }

  public getClinicById(clinicId: number): Clinic | undefined {
    return this.state.clinics.find((c) => c.clinic_id === clinicId);
  }

  public getDoctorsByClinic(clinicId: number): Doctor[] {
    return this.getDoctors({ clinicId });
  }

  // --- Receptionist operations ---
  public getReceptionists(): Receptionist[] {
    return this.state.receptionists.map((r) => this.hydrateReceptionist(r));
  }

  public getReceptionistById(receptionistId: number): Receptionist | undefined {
    const rec = this.state.receptionists.find((r) => r.receptionist_id === receptionistId);
    if (!rec) return undefined;
    return this.hydrateReceptionist(rec);
  }

  public getReceptionistByUserId(userId: number): Receptionist | undefined {
    const rec = this.state.receptionists.find((r) => r.user_id === userId);
    if (!rec) return undefined;
    return this.hydrateReceptionist(rec);
  }

  public createReceptionist(userId: number, clinicId: number): Receptionist {
    const existing = this.state.receptionists.find((r) => r.user_id === userId);
    if (existing) {
      existing.clinic_id = clinicId;
      this.commit();
      return this.hydrateReceptionist(existing);
    }
    this.state.counters.receptionistId += 1;
    const newRec: Receptionist = {
      receptionist_id: this.state.counters.receptionistId,
      user_id: userId,
      clinic_id: clinicId,
      created_at: new Date().toISOString(),
    };
    this.state.receptionists.push(newRec);
    this.commit();
    return this.hydrateReceptionist(newRec);
  }

  public updateReceptionistClinic(receptionistId: number, clinicId: number): Receptionist {
    const rec = this.state.receptionists.find((r) => r.receptionist_id === receptionistId);
    if (!rec) throw new Error("Receptionist not found.");
    const clinic = this.getClinicById(clinicId);
    if (!clinic) throw new Error("Target clinic does not exist.");
    rec.clinic_id = clinicId;
    this.commit();
    return this.hydrateReceptionist(rec);
  }

  public getAppointmentsByClinic(clinicId: number): Appointment[] {
    const clinicDoctorIds = new Set(
      this.state.doctors.filter((d) => d.clinic_id === clinicId).map((d) => d.doctor_id)
    );
    return this.state.appointments
      .filter((a) => clinicDoctorIds.has(a.doctor_id))
      .map((a) => this.hydrateAppointment(a))
      .sort(
        (a, b) =>
          new Date(b.appointment_date).getTime() -
          new Date(a.appointment_date).getTime()
      );
  }

  private hydrateReceptionist(rec: Receptionist): Receptionist {
    const user = this.getUserById(rec.user_id);
    const clinic = this.getClinicById(rec.clinic_id);
    return {
      ...rec,
      user: user ? { full_name: user.full_name, email: user.email, phone: user.phone } : undefined,
      clinic,
    };
  }

  // --- Receptionist Invitation operations ---
  public createReceptionistInvitation(params: {
    clinicId: number;
    email: string;
    invitedByUserId: number;
  }): { invitation: ReceptionistInvitation; rawToken: string } {
    const clinic = this.getClinicById(params.clinicId);
    if (!clinic) throw new Error("Clinic does not exist.");
    const email = params.email.toLowerCase().trim();

    // Generate cryptographically secure random token (64 hex characters)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours validity

    this.state.counters.invitationId += 1;
    const inv: ReceptionistInvitation = {
      invitation_id: this.state.counters.invitationId,
      clinic_id: params.clinicId,
      email,
      token_hash: tokenHash,
      status: "pending",
      expires_at: expiresAt,
      created_by_user_id: params.invitedByUserId,
      created_at: new Date().toISOString(),
    };
    this.state.receptionistInvitations.push(inv);
    this.commit();

    return {
      invitation: { ...inv, clinic },
      rawToken,
    };
  }

  public getReceptionistInvitations(clinicId?: number): ReceptionistInvitation[] {
    const now = new Date().toISOString();
    return this.state.receptionistInvitations
      .filter((inv) => {
        if (clinicId && inv.clinic_id !== clinicId) return false;
        return true;
      })
      .map((inv) => {
        // Auto-mark expired if past expires_at and still pending
        if (inv.status === "pending" && inv.expires_at < now) {
          inv.status = "expired";
        }
        return {
          ...inv,
          clinic: this.getClinicById(inv.clinic_id),
        };
      })
      .sort(
        (a, b) =>
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
      );
  }

  public getReceptionistInvitationByToken(rawToken: string): ReceptionistInvitation | undefined {
    const tokenHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
    const inv = this.state.receptionistInvitations.find((i) => i.token_hash === tokenHash);
    if (!inv) return undefined;

    const now = new Date().toISOString();
    if (inv.status === "pending" && inv.expires_at < now) {
      inv.status = "expired";
      this.commit();
      return undefined;
    }

    if (inv.status !== "pending") {
      return undefined;
    }

    return {
      ...inv,
      clinic: this.getClinicById(inv.clinic_id),
    };
  }

  public revokeReceptionistInvitation(invitationId: number): ReceptionistInvitation {
    const inv = this.state.receptionistInvitations.find((i) => i.invitation_id === invitationId);
    if (!inv) throw new Error("Invitation not found.");
    if (inv.status !== "pending") {
      throw new Error(`Cannot revoke invitation with status '${inv.status}'.`);
    }
    inv.status = "revoked";
    this.commit();
    return {
      ...inv,
      clinic: this.getClinicById(inv.clinic_id),
    };
  }

  public acceptReceptionistInvitation(params: {
    rawToken: string;
    fullName: string;
    phone: string;
    passwordHash: string;
  }): { user: User; receptionist: Receptionist } {
    const invitation = this.getReceptionistInvitationByToken(params.rawToken);
    if (!invitation) {
      throw new Error("Invalid, expired, or already used invitation token.");
    }

    let user = this.getUserByEmail(invitation.email);
    if (!user) {
      user = this.createUser(
        params.fullName,
        invitation.email,
        params.phone,
        params.passwordHash,
        "receptionist"
      );
    } else {
      user.role = "receptionist";
      user.full_name = params.fullName.trim();
      user.phone = params.phone.trim();
      user.password_hash = params.passwordHash;
    }

    const receptionist = this.createReceptionist(user.user_id, invitation.clinic_id);

    // Mark invitation accepted
    const storedInv = this.state.receptionistInvitations.find((i) => i.invitation_id === invitation.invitation_id);
    if (storedInv) {
      storedInv.status = "accepted";
      storedInv.accepted_at = new Date().toISOString();
    }
    this.commit();

    return { user, receptionist };
  }

  // --- Doctor Schedule Blocking ---
  public blockDoctorDate(params: {
    doctorId: number;
    date: string;
    reason?: string;
  }): { blockedSlots: Availability[]; createdOverride: boolean } {
    const { doctorId, date, reason } = params;
    const doctor = this.getDoctorById(doctorId);
    if (!doctor) throw new Error("Doctor not found.");

    // Check if active appointments exist on this date
    const activeAppointments = this.state.appointments.filter(
      (a) =>
        a.doctor_id === doctorId &&
        a.status !== "cancelled" &&
        a.status !== "rejected" &&
        typeof a.appointment_date === "string" &&
        a.appointment_date.startsWith(date)
    );

    if (activeAppointments.length > 0) {
      throw new Error(
        `Cannot block ${date}: There are ${activeAppointments.length} active booked appointment(s). Please reschedule or cancel them first.`
      );
    }

    // Mark any existing slots on that date as blocked
    const existingSlots = this.state.availability.filter(
      (a) => a.doctor_id === doctorId && a.available_date === date
    );

    let createdOverride = false;
    const blockReasonText = reason?.trim() || "Doctor unavailable / Leave";

    if (existingSlots.length > 0) {
      for (const slot of existingSlots) {
        slot.is_blocked = true;
        slot.is_available = false;
        slot.block_reason = blockReasonText;
      }
    } else {
      // Create a blocked window for the day
      this.state.counters.availabilityId += 1;
      const placeholder: Availability = {
        availability_id: this.state.counters.availabilityId,
        doctor_id: doctorId,
        available_date: date,
        start_time: "09:00",
        end_time: "17:00",
        slot_duration: 30,
        is_available: false,
        is_wave: false,
        wave_capacity: 0,
        wave_booked_count: 0,
        is_blocked: true,
        block_reason: blockReasonText,
        parent_availability_id: null,
        created_at: new Date().toISOString(),
      };
      this.state.availability.push(placeholder);
      existingSlots.push(placeholder);
      createdOverride = true;
    }

    this.commit();
    return {
      blockedSlots: existingSlots,
      createdOverride,
    };
  }

  public unblockDoctorDate(params: {
    doctorId: number;
    date: string;
  }): { unblockedSlots: Availability[] } {
    const { doctorId, date } = params;
    const slots = this.state.availability.filter(
      (a) => a.doctor_id === doctorId && a.available_date === date && a.is_blocked
    );

    if (slots.length === 0) {
      return { unblockedSlots: [] };
    }

    const unblocked: Availability[] = [];
    this.state.availability = this.state.availability.filter((a) => {
      if (a.doctor_id === doctorId && a.available_date === date && a.is_blocked) {
        if (a.wave_capacity === 0 && a.start_time === "09:00" && a.end_time === "17:00") {
          return false; // remove placeholder
        }
        a.is_blocked = false;
        a.block_reason = null;
        a.is_available = true;
        unblocked.push(a);
        return true;
      }
      return true;
    });

    this.commit();
    return { unblockedSlots: unblocked };
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
      // Do not pollute dates that already have any availability configured
      const hasAvailability = this.state.availability.some(
        (a) => a.doctor_id === doctorId && a.available_date === dateStr
      );
      if (hasAvailability) {
        continue;
      }

      const candidateSlots = generateDoctorSlotsForDate(
        doctorId,
        dateStr,
        doctor.scheduling_mode,
        doctor.wave_capacity
      );

      for (const slotDef of candidateSlots) {
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
          parent_availability_id: null,
          created_at: new Date().toISOString(),
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      this.saveState(this.state);
    }
  }

  public getDoctorAvailability(
    doctorId: number,
    date?: string,
    onlyAvailable: boolean = false,
    viewMode: "all" | "doctor" | "patient" = "patient"
  ): Availability[] {
    this.ensureDoctorAvailabilityWindow(doctorId, 14);

    const doctorSlots = this.state.availability.filter((a) => {
      if (a.doctor_id !== doctorId) return false;
      if (date && a.available_date !== date) return false;
      return true;
    });

    if (viewMode === "doctor") {
      // Doctor Portal: Return top-level windows (parent_availability_id == null)
      // Wave windows include nested subslots; Stream windows include dynamic appointment slot breakdown
      const parentWindows = doctorSlots
        .filter((a) => a.parent_availability_id == null)
        .map((pw) => ({ ...pw }));

      for (const pw of parentWindows) {
        if (pw.is_wave) {
          pw.subslots = doctorSlots
            .filter((s) => s.parent_availability_id === pw.availability_id)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
          pw.wave_booked_count = pw.subslots.reduce((sum, s) => sum + (s.wave_booked_count || 0), 0);
        } else {
          // Stream window: calculate dynamic appointment breakdown
          const activeBookings = this.state.appointments.filter(
            (app) =>
              app.doctor_id === doctorId &&
              app.status !== "cancelled" &&
              app.status !== "rejected" &&
              (app.availability_id === pw.availability_id ||
                (typeof app.appointment_date === "string" && app.appointment_date.startsWith(pw.available_date)))
          );
          const dynSlots = calculateStreamAppointmentTimes(pw, activeBookings);
          (pw as any).dynamic_slots = dynSlots;
          pw.wave_booked_count = activeBookings.filter((b) => {
            const time = b.estimated_consult_time || (typeof b.appointment_date === "string" && b.appointment_date.slice(11, 16));
            return time && time >= pw.start_time && time < pw.end_time;
          }).length;
        }
      }

      return parentWindows.sort((a, b) => {
        if (a.available_date !== b.available_date) {
          return a.available_date.localeCompare(b.available_date);
        }
        return a.start_time.localeCompare(b.start_time);
      });
    }

    // Patient view (default):
    // Returns bookable slots:
    // - For Wave: returns wave subslots (where parent_availability_id != null or standalone wave slots)
    // - For Stream: dynamically computes appointment times from the continuous window
    const bookableSlots: Availability[] = [];

    for (const slot of doctorSlots) {
      if (slot.is_blocked) continue;
      if (slot.is_wave) {
        const hasChildren = doctorSlots.some((s) => s.parent_availability_id === slot.availability_id);
        if (hasChildren) {
          continue; // Container parent; individual waves will be returned
        }
        if (onlyAvailable) {
          if (!slot.is_available) continue;
          if (isSlotInPast(slot.available_date, slot.start_time)) continue;
        }
        bookableSlots.push({ ...slot });
      } else {
        const subDefs = generateTimeSlots(slot.start_time, slot.end_time, slot.slot_duration);
        if (subDefs.length > 1) {
          const activeBookings = this.state.appointments.filter(
            (app) =>
              app.doctor_id === doctorId &&
              app.status !== "cancelled" &&
              app.status !== "rejected" &&
              (app.availability_id === slot.availability_id ||
                (typeof app.appointment_date === "string" && app.appointment_date.startsWith(slot.available_date)))
          );
          const dynSlots = calculateStreamAppointmentTimes(slot, activeBookings);
          for (const ds of dynSlots) {
            if (onlyAvailable) {
              if (!ds.isAvailable) continue;
              if (isSlotInPast(slot.available_date, ds.startTime)) continue;
            }
            bookableSlots.push({
              availability_id: slot.availability_id,
              doctor_id: slot.doctor_id,
              available_date: slot.available_date,
              start_time: ds.startTime,
              end_time: ds.endTime,
              slot_duration: ds.slotDuration,
              is_available: ds.isAvailable,
              is_wave: false,
              wave_capacity: ds.capacity,
              wave_booked_count: ds.bookedCount,
              parent_availability_id: null,
            });
          }
        } else {
          if (onlyAvailable) {
            if (!slot.is_available) continue;
            if (isSlotInPast(slot.available_date, slot.start_time)) continue;
          }
          bookableSlots.push({ ...slot });
        }
      }
    }

    return bookableSlots.sort((a, b) => {
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
    waveCapacity?: number,
    parentAvailabilityId?: number | null
  ): Availability {
    // Check doctor exists
    const doctor = this.getDoctorById(doctorId);
    if (!doctor) throw new Error("Doctor does not exist.");

    // Validate future slot in IST
    if (isSlotInPast(availableDate, startTime)) {
      throw new Error("Cannot add availability for a past date or time.");
    }

    // Interval overlap check (ignore if this is a subslot belonging to parent window)
    const overlapping = this.state.availability.filter(
      (a) =>
        a.doctor_id === doctorId &&
        a.available_date === availableDate &&
        !(parentAvailabilityId && a.availability_id === parentAvailabilityId) &&
        !(a.parent_availability_id && parentAvailabilityId === a.parent_availability_id) &&
        doIntervalsOverlap(a.start_time, a.end_time, startTime, endTime)
    );

    if (overlapping.length > 0) {
      throw new Error(
        `A slot at ${startTime} on ${availableDate} already exists or overlaps with existing availability (${overlapping[0].start_time}–${overlapping[0].end_time}) for this doctor.`
      );
    }

    const resolvedIsWave = isWave !== undefined ? isWave : doctor.scheduling_mode === "wave";
    const resolvedWaveCapacity =
      waveCapacity && waveCapacity > 0
        ? waveCapacity
        : resolvedIsWave
        ? doctor.wave_capacity || 3
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
      parent_availability_id: parentAvailabilityId || null,
      created_at: new Date().toISOString(),
    };
    this.state.availability.push(newSlot);
    this.commit();
    return newSlot;
  }

  public createDoctorSchedule(params: {
    doctorId: number;
    scheduleType: "specific_dates" | "recurring_weekly";
    schedulingMode: "stream" | "wave";
    targetDates: string[];
    startTime: string;
    endTime: string;
    slotDuration: number;
    capacity?: number;
    isOverride?: boolean;
  }): {
    addedCount: number;
    skippedCount: number;
    replacedCount: number;
    datesCount: number;
    slots: Availability[];
  } {
    const doctor = this.getDoctorById(params.doctorId);
    if (!doctor) throw new Error("Doctor does not exist.");

    let addedCount = 0;
    let skippedCount = 0;
    let replacedCount = 0;
    const addedSlots: Availability[] = [];

    for (const dateStr of params.targetDates) {
      if (isSlotInPast(dateStr, params.startTime)) {
        skippedCount++;
        continue;
      }

      if (params.isOverride) {
        // Override: Replace existing schedule for dateStr, strictly preserving booked appointments
        const activeAppointments = this.state.appointments.filter(
          (a) =>
            a.doctor_id === params.doctorId &&
            a.status !== "cancelled" &&
            a.status !== "rejected" &&
            (typeof a.appointment_date === "string" && a.appointment_date.startsWith(dateStr))
        );
        const bookedSlotIds = new Set(activeAppointments.map((a) => a.availability_id));

        // Flag any active appointments that fall outside the new hours
        for (const app of activeAppointments) {
          const consultTime =
            app.estimated_consult_time ||
            (typeof app.appointment_date === "string" ? app.appointment_date.slice(11, 16) : "");
          if (consultTime && (consultTime < params.startTime || consultTime >= params.endTime)) {
            app.is_outside_schedule = true;
            app.requires_review = true;
            app.review_reason = `Booked outside updated working hours (${params.startTime} - ${params.endTime})`;
          } else if (app.is_outside_schedule) {
            app.is_outside_schedule = false;
            app.requires_review = false;
            app.review_reason = null;
          }
        }

        this.state.availability = this.state.availability.filter((a) => {
          if (a.doctor_id === params.doctorId && a.available_date === dateStr) {
            if (bookedSlotIds.has(a.availability_id)) {
              // Preserve booked slot so existing appointment is not invalidated
              a.is_available = false;
              return true;
            }
            if (a.parent_availability_id == null) {
              replacedCount++;
            }
            return false;
          }
          return true;
        });
      } else {
        const existingWindows = this.state.availability.filter(
          (a) => a.doctor_id === params.doctorId && a.available_date === dateStr && a.parent_availability_id == null
        );

        const overlapping = existingWindows.filter((w) =>
          doIntervalsOverlap(w.start_time, w.end_time, params.startTime, params.endTime)
        );

        if (overlapping.length > 0) {
          // Check if this is an identical configuration (exact re-submission)
          const isIdentical = overlapping.some(
            (w) =>
              w.start_time === params.startTime &&
              w.end_time === params.endTime &&
              w.slot_duration === params.slotDuration &&
              Boolean(w.is_wave) === (params.schedulingMode === "wave")
          );

          if (isIdentical) {
            // Idempotent: re-running identical configuration does not create duplicates
            skippedCount++;
            continue;
          }

          throw new Error(
            `Overlapping availability window exists on ${dateStr} (${overlapping[0].start_time}–${overlapping[0].end_time}). Set override to replace existing schedule.`
          );
        }
      }

      const effectiveCap = params.capacity || (params.schedulingMode === "wave" ? 3 : 1);

      // Create new schedule for dateStr
      if (params.schedulingMode === "wave") {
        // Parent window
        this.state.counters.availabilityId += 1;
        const parentWindow: Availability = {
          availability_id: this.state.counters.availabilityId,
          doctor_id: params.doctorId,
          available_date: dateStr,
          start_time: params.startTime,
          end_time: params.endTime,
          slot_duration: params.slotDuration,
          is_available: true,
          is_wave: true,
          wave_capacity: effectiveCap,
          wave_booked_count: 0,
          parent_availability_id: null,
          created_at: new Date().toISOString(),
        };
        this.state.availability.push(parentWindow);
        addedSlots.push(parentWindow);
        addedCount++;

        // Non-overlapping subslots
        const subslotDefs = generateTimeSlots(params.startTime, params.endTime, params.slotDuration);
        for (const s of subslotDefs) {
          this.state.counters.availabilityId += 1;
          const subslot: Availability = {
            availability_id: this.state.counters.availabilityId,
            doctor_id: params.doctorId,
            available_date: dateStr,
            start_time: s.startTime,
            end_time: s.endTime,
            slot_duration: s.slotDuration,
            is_available: true,
            is_wave: true,
            wave_capacity: effectiveCap,
            wave_booked_count: 0,
            parent_availability_id: parentWindow.availability_id,
            created_at: new Date().toISOString(),
          };
          this.state.availability.push(subslot);
          addedSlots.push(subslot);
          addedCount++;
        }
      } else {
        // Stream Mode: Single continuous availability window (NO subslots persisted)
        const subDefs = generateTimeSlots(params.startTime, params.endTime, params.slotDuration);
        const streamTotalCapacity =
          params.capacity && params.capacity > 1
            ? params.capacity
            : subDefs.length > 0
            ? subDefs.length
            : 1;

        this.state.counters.availabilityId += 1;
        const streamWindow: Availability = {
          availability_id: this.state.counters.availabilityId,
          doctor_id: params.doctorId,
          available_date: dateStr,
          start_time: params.startTime,
          end_time: params.endTime,
          slot_duration: params.slotDuration,
          is_available: true,
          is_wave: false,
          wave_capacity: streamTotalCapacity,
          wave_booked_count: 0,
          parent_availability_id: null,
          created_at: new Date().toISOString(),
        };
        this.state.availability.push(streamWindow);
        addedSlots.push(streamWindow);
        addedCount++;
      }
    }

    if (addedSlots.length > 0 || replacedCount > 0) {
      this.commit();
    }

    return {
      addedCount,
      skippedCount,
      replacedCount,
      datesCount: params.targetDates.length,
      slots: addedSlots,
    };
  }

  /**
   * Modifies a specific availability window elastically (shrinking or expanding)
   * while strictly preserving all existing booked appointments and data integrity.
   */
  public modifyDoctorAvailabilityWindowElastic(params: {
    doctorId: number;
    availabilityId: number;
    newStartTime: string;
    newEndTime: string;
    slotDuration?: number;
    capacity?: number;
  }): {
    window: Availability;
    addedSlotsCount: number;
    removedSlotsCount: number;
    preservedSlotsCount: number;
    flaggedAppointmentsCount: number;
    flaggedAppointments: Appointment[];
  } {
    const doctor = this.getDoctorById(params.doctorId);
    if (!doctor) throw new Error("Doctor does not exist.");

    let targetWindow = this.state.availability.find(
      (a) => a.availability_id === params.availabilityId && a.doctor_id === params.doctorId
    );
    if (!targetWindow) {
      throw new Error("Availability window not found.");
    }

    // If passed a subslot ID, resolve to its parent window
    if (targetWindow.parent_availability_id != null) {
      const parent = this.state.availability.find(
        (a) => a.availability_id === targetWindow!.parent_availability_id
      );
      if (parent) {
        targetWindow = parent;
      }
    }

    if (isSlotInPast(targetWindow.available_date, params.newStartTime)) {
      throw new Error("Cannot modify availability for a past date or time.");
    }

    if (params.newStartTime >= params.newEndTime) {
      throw new Error("End time must be strictly after start time.");
    }

    // Save snapshot for atomic rollback in case of error
    const stateSnapshot = JSON.stringify(this.state);

    try {
      // Collision protection with other independent windows on the same date
      const otherWindows = this.state.availability.filter(
        (a) =>
          a.doctor_id === params.doctorId &&
          a.available_date === targetWindow!.available_date &&
          a.parent_availability_id == null &&
          a.availability_id !== targetWindow!.availability_id &&
          !a.is_blocked
      );

      for (const other of otherWindows) {
        if (doIntervalsOverlap(other.start_time, other.end_time, params.newStartTime, params.newEndTime)) {
          throw new Error(
            `Expanded window overlaps with another scheduled window on ${targetWindow!.available_date} (${other.start_time}–${other.end_time}).`
          );
        }
      }

      const effectiveDuration = params.slotDuration || targetWindow.slot_duration;
      const effectiveCapacity =
        params.capacity !== undefined
          ? params.capacity
          : targetWindow.wave_capacity || (targetWindow.is_wave ? 3 : 1);

      let addedSlotsCount = 0;
      let removedSlotsCount = 0;
      let preservedSlotsCount = 0;
      const flaggedAppointments: Appointment[] = [];

      // Query active booked appointments on this date
      const activeAppointments = this.state.appointments.filter(
        (a) =>
          a.doctor_id === params.doctorId &&
          a.status !== "cancelled" &&
          a.status !== "rejected" &&
          (a.availability_id === targetWindow!.availability_id ||
            (typeof a.appointment_date === "string" && a.appointment_date.startsWith(targetWindow!.available_date)))
      );

      if (targetWindow.is_wave) {
        // Wave Scheduling Mode
        const existingSubslots = this.state.availability.filter(
          (a) => a.parent_availability_id === targetWindow!.availability_id
        );

        const targetNewDefs = generateTimeSlots(params.newStartTime, params.newEndTime, effectiveDuration);
        const targetDefKeySet = new Set(targetNewDefs.map((d) => `${d.startTime}-${d.endTime}`));
        const existingKeySet = new Set(existingSubslots.map((s) => `${s.start_time}-${s.end_time}`));

        // 1. Process existing subslots
        for (const sub of existingSubslots) {
          const subKey = `${sub.start_time}-${sub.end_time}`;
          const isInsideNew = targetDefKeySet.has(subKey);

          if (isInsideNew) {
            // Preserved within new window
            preservedSlotsCount++;
            sub.wave_capacity = effectiveCapacity;
            sub.slot_duration = effectiveDuration;

            // Clear previous flags if any appointment on this subslot was previously flagged
            for (const app of activeAppointments) {
              if (app.availability_id === sub.availability_id && app.is_outside_schedule) {
                app.is_outside_schedule = false;
                app.requires_review = false;
                app.review_reason = null;
              }
            }
          } else {
            // Outside new window (shrunk range)
            const appsInSub = activeAppointments.filter((a) => a.availability_id === sub.availability_id);
            if (appsInSub.length === 0) {
              // Unbooked subslot: safely remove from database
              this.state.availability = this.state.availability.filter(
                (a) => a.availability_id !== sub.availability_id
              );
              removedSlotsCount++;
            } else {
              // Subslot has active booked appointments! MUST PRESERVE
              sub.is_available = false; // Soft-deactivate so no new bookings occur
              for (const app of appsInSub) {
                app.is_outside_schedule = true;
                app.requires_review = true;
                app.review_reason = `Booked outside updated working hours (${params.newStartTime} - ${params.newEndTime})`;
                flaggedAppointments.push(app);
              }
            }
          }
        }

        // 2. Process newly added subslots (expansion)
        for (const def of targetNewDefs) {
          const defKey = `${def.startTime}-${def.endTime}`;
          if (!existingKeySet.has(defKey)) {
            this.state.counters.availabilityId += 1;
            const newSub: Availability = {
              availability_id: this.state.counters.availabilityId,
              doctor_id: params.doctorId,
              available_date: targetWindow.available_date,
              start_time: def.startTime,
              end_time: def.endTime,
              slot_duration: def.slotDuration,
              is_available: true,
              is_wave: true,
              wave_capacity: effectiveCapacity,
              wave_booked_count: 0,
              parent_availability_id: targetWindow.availability_id,
              created_at: new Date().toISOString(),
            };
            this.state.availability.push(newSub);
            addedSlotsCount++;
          }
        }

        // 3. Update parent window
        targetWindow.start_time = params.newStartTime;
        targetWindow.end_time = params.newEndTime;
        targetWindow.slot_duration = effectiveDuration;
        targetWindow.wave_capacity = effectiveCapacity;
      } else {
        // Stream Scheduling Mode
        const diff = calculateElasticDiff(
          targetWindow.start_time,
          targetWindow.end_time,
          params.newStartTime,
          params.newEndTime,
          effectiveDuration
        );

        addedSlotsCount = diff.addedSlots.length;
        removedSlotsCount = diff.removedSlots.length;
        preservedSlotsCount = diff.preservedSlots.length;

        // Flag or unflag active appointments on this date
        for (const app of activeAppointments) {
          const consultTime =
            app.estimated_consult_time ||
            (typeof app.appointment_date === "string" ? app.appointment_date.slice(11, 16) : "");
          if (consultTime) {
            const isInside = consultTime >= params.newStartTime && consultTime < params.newEndTime;
            if (isInside) {
              if (app.is_outside_schedule) {
                app.is_outside_schedule = false;
                app.requires_review = false;
                app.review_reason = null;
              }
            } else {
              app.is_outside_schedule = true;
              app.requires_review = true;
              app.review_reason = `Booked outside updated working hours (${params.newStartTime} - ${params.newEndTime})`;
              flaggedAppointments.push(app);
            }
          }
        }

        // Update continuous window
        targetWindow.start_time = params.newStartTime;
        targetWindow.end_time = params.newEndTime;
        targetWindow.slot_duration = effectiveDuration;
        const subDefs = generateTimeSlots(params.newStartTime, params.newEndTime, effectiveDuration);
        targetWindow.wave_capacity = subDefs.length;
      }

      this.commit();

      return {
        window: targetWindow,
        addedSlotsCount,
        removedSlotsCount,
        preservedSlotsCount,
        flaggedAppointmentsCount: flaggedAppointments.length,
        flaggedAppointments: flaggedAppointments.map((a) => this.hydrateAppointment(a)),
      };
    } catch (err) {
      // Atomic rollback on failure
      this.state = JSON.parse(stateSnapshot);
      throw err;
    }
  }

  /**
   * Applies elastic schedule modification across multiple dates or recurring patterns.
   */
  public modifyDoctorScheduleElastic(params: {
    doctorId: number;
    scheduleType: "specific_dates" | "recurring_weekly";
    targetDates?: string[];
    weekdays?: number[];
    startDate?: string;
    endDate?: string;
    newStartTime: string;
    newEndTime: string;
    slotDuration?: number;
    capacity?: number;
    isWave?: boolean;
  }): {
    success: boolean;
    modifiedDatesCount: number;
    addedSlotsCount: number;
    removedSlotsCount: number;
    flaggedAppointmentsCount: number;
    flaggedAppointments: Appointment[];
    message: string;
  } {
    const dates = resolveTargetDates({
      scheduleType: params.scheduleType,
      specificDates: params.targetDates,
      weekdays: params.weekdays,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    if (dates.length === 0) {
      throw new Error("No upcoming operating dates resolved for elastic modification.");
    }

    const stateSnapshot = JSON.stringify(this.state);
    let totalAdded = 0;
    let totalRemoved = 0;
    let modifiedDates = 0;
    const allFlagged: Appointment[] = [];

    try {
      for (const d of dates) {
        if (isSlotInPast(d, params.newStartTime)) continue;

        const existingWindows = this.state.availability.filter(
          (a) => a.doctor_id === params.doctorId && a.available_date === d && a.parent_availability_id == null && !a.is_blocked
        );

        if (existingWindows.length > 0) {
          // Elastically modify the existing window
          const res = this.modifyDoctorAvailabilityWindowElastic({
            doctorId: params.doctorId,
            availabilityId: existingWindows[0].availability_id,
            newStartTime: params.newStartTime,
            newEndTime: params.newEndTime,
            slotDuration: params.slotDuration,
            capacity: params.capacity,
          });
          totalAdded += res.addedSlotsCount;
          totalRemoved += res.removedSlotsCount;
          allFlagged.push(...res.flaggedAppointments);
          modifiedDates++;
        } else {
          // Create fresh schedule on this date
          const created = this.createDoctorSchedule({
            doctorId: params.doctorId,
            scheduleType: "specific_dates",
            schedulingMode: params.isWave ? "wave" : "stream",
            targetDates: [d],
            startTime: params.newStartTime,
            endTime: params.newEndTime,
            slotDuration: params.slotDuration || 30,
            capacity: params.capacity || (params.isWave ? 3 : 1),
            isOverride: false,
          });
          totalAdded += created.addedCount;
          modifiedDates++;
        }
      }

      this.commit();

      return {
        success: true,
        modifiedDatesCount: modifiedDates,
        addedSlotsCount: totalAdded,
        removedSlotsCount: totalRemoved,
        flaggedAppointmentsCount: allFlagged.length,
        flaggedAppointments: allFlagged,
        message: `Successfully updated schedule across ${modifiedDates} date(s). Added ${totalAdded} slot(s), removed ${totalRemoved} slot(s). ${allFlagged.length} appointment(s) preserved outside updated hours.`,
      };
    } catch (err) {
      this.state = JSON.parse(stateSnapshot);
      throw err;
    }
  }

  /**
   * Deterministic preview of elastic schedule changes before saving.
   * Reports newly added slots, removed unbooked slots, preserved slots, and any booked appointments falling outside.
   */
  public previewDoctorScheduleElasticChanges(params: {
    doctorId: number;
    availabilityId?: number;
    scheduleType?: "specific_dates" | "recurring_weekly";
    targetDates?: string[];
    weekdays?: number[];
    startDate?: string;
    endDate?: string;
    newStartTime: string;
    newEndTime: string;
    slotDuration?: number;
    capacity?: number;
    isWave?: boolean;
  }): {
    datesCount: number;
    addedSlots: Array<{ date: string; time: string }>;
    removedSlots: Array<{ date: string; time: string }>;
    preservedSlotsCount: number;
    conflictingAppointments: Array<{
      appointmentId: number;
      patientName: string;
      patientPhone?: string;
      patientEmail?: string;
      date: string;
      time: string;
      reason: string;
      status: string;
    }>;
    hasConflicts: boolean;
  } {
    let dates: string[] = [];
    let singleTargetWindow: Availability | undefined;

    if (params.availabilityId) {
      singleTargetWindow = this.state.availability.find(
        (a) => a.availability_id === params.availabilityId && a.doctor_id === params.doctorId
      );
      if (singleTargetWindow) {
        if (singleTargetWindow.parent_availability_id != null) {
          const parent = this.state.availability.find(
            (a) => a.availability_id === singleTargetWindow!.parent_availability_id
          );
          if (parent) singleTargetWindow = parent;
        }
        dates = [singleTargetWindow.available_date];
      }
    } else {
      dates = resolveTargetDates({
        scheduleType: params.scheduleType || "specific_dates",
        specificDates: params.targetDates,
        weekdays: params.weekdays,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }

    const addedSlots: Array<{ date: string; time: string }> = [];
    const removedSlots: Array<{ date: string; time: string }> = [];
    let preservedSlotsCount = 0;
    const conflictingAppointments: Array<{
      appointmentId: number;
      patientName: string;
      patientPhone?: string;
      patientEmail?: string;
      date: string;
      time: string;
      reason: string;
      status: string;
    }> = [];

    const effectiveDuration = params.slotDuration || singleTargetWindow?.slot_duration || 30;

    for (const d of dates) {
      if (isSlotInPast(d, params.newStartTime)) continue;

      const window =
        singleTargetWindow && singleTargetWindow.available_date === d
          ? singleTargetWindow
          : this.state.availability.find(
              (a) => a.doctor_id === params.doctorId && a.available_date === d && a.parent_availability_id == null && !a.is_blocked
            );

      if (window) {
        const diff = calculateElasticDiff(
          window.start_time,
          window.end_time,
          params.newStartTime,
          params.newEndTime,
          effectiveDuration
        );

        diff.addedSlots.forEach((s) => addedSlots.push({ date: d, time: `${s.startTime} – ${s.endTime}` }));
        diff.removedSlots.forEach((s) => removedSlots.push({ date: d, time: `${s.startTime} – ${s.endTime}` }));
        preservedSlotsCount += diff.preservedSlots.length;

        // Check booked appointments on this date
        const activeApps = this.state.appointments.filter(
          (a) =>
            a.doctor_id === params.doctorId &&
            a.status !== "cancelled" &&
            a.status !== "rejected" &&
            (a.availability_id === window.availability_id ||
              (typeof a.appointment_date === "string" && a.appointment_date.startsWith(d)))
        );

        for (const app of activeApps) {
          const consultTime =
            app.estimated_consult_time ||
            (typeof app.appointment_date === "string" ? app.appointment_date.slice(11, 16) : "");
          if (consultTime && (consultTime < params.newStartTime || consultTime >= params.newEndTime)) {
            const patient = this.getPatientById(app.patient_id);
            conflictingAppointments.push({
              appointmentId: app.appointment_id,
              patientName: patient?.user?.full_name || "Patient",
              patientPhone: patient?.user?.phone,
              patientEmail: patient?.user?.email,
              date: d,
              time: consultTime,
              reason: app.reason,
              status: app.status,
            });
          }
        }
      } else {
        const slots = generateTimeSlots(params.newStartTime, params.newEndTime, effectiveDuration);
        slots.forEach((s) => addedSlots.push({ date: d, time: `${s.startTime} – ${s.endTime}` }));
      }
    }

    return {
      datesCount: dates.length,
      addedSlots,
      removedSlots,
      preservedSlotsCount,
      conflictingAppointments,
      hasConflicts: conflictingAppointments.length > 0,
    };
  }

  /**
   * Retrieves all appointments for a doctor that require review
   * (e.g. booked outside modified working hours).
   */
  public getAppointmentsRequiringReview(doctorId: number): Appointment[] {
    return this.state.appointments
      .filter(
        (a) =>
          a.doctor_id === doctorId &&
          a.status !== "cancelled" &&
          a.status !== "rejected" &&
          (a.requires_review === true || a.is_outside_schedule === true)
      )
      .map((a) => this.hydrateAppointment(a));
  }

  public addAvailabilityBatch(params: {
    doctorId: number;
    slots: Array<{
      available_date: string;
      start_time: string;
      end_time: string;
      slot_duration: number;
      is_wave?: boolean;
      wave_capacity?: number;
      parent_availability_id?: number | null;
    }>;
  }): { addedCount: number; skippedCount: number; slots: Availability[] } {
    const doctor = this.getDoctorById(params.doctorId);
    if (!doctor) throw new Error("Doctor does not exist.");

    const addedSlots: Availability[] = [];
    let skippedCount = 0;

    for (const item of params.slots) {
      if (isSlotInPast(item.available_date, item.start_time)) {
        skippedCount++;
        continue;
      }

      // Conflict protection using unique doctor_date_slot index logic
      const exists = this.state.availability.some(
        (a) =>
          a.doctor_id === params.doctorId &&
          a.available_date === item.available_date &&
          a.start_time === item.start_time &&
          a.end_time === item.end_time
      );

      if (exists) {
        skippedCount++;
        continue;
      }

      const isWave = item.is_wave !== undefined ? item.is_wave : doctor.scheduling_mode === "wave";
      const defaultCap = isWave ? (doctor.wave_capacity || 3) : 1;
      const resolvedCapacity =
        item.wave_capacity && item.wave_capacity > 0 ? item.wave_capacity : defaultCap;

      this.state.counters.availabilityId += 1;
      const newSlot: Availability = {
        availability_id: this.state.counters.availabilityId,
        doctor_id: params.doctorId,
        available_date: item.available_date,
        start_time: item.start_time,
        end_time: item.end_time,
        slot_duration: item.slot_duration,
        is_available: true,
        is_wave: isWave,
        wave_capacity: resolvedCapacity,
        wave_booked_count: 0,
        parent_availability_id: item.parent_availability_id || null,
        created_at: new Date().toISOString(),
      };

      this.state.availability.push(newSlot);
      addedSlots.push(newSlot);
    }

    if (addedSlots.length > 0) {
      this.commit();
    }

    return {
      addedCount: addedSlots.length,
      skippedCount,
      slots: addedSlots,
    };
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

    // If deleting a parent window, check child subslots as well
    const childSubslots = this.state.availability.filter(
      (a) => a.parent_availability_id === availabilityId
    );
    const allSlotIdsToCheck = [availabilityId, ...childSubslots.map((s) => s.availability_id)];

    // Check if any of these slots have active appointments
    const activeAppointment = this.state.appointments.find(
      (app) =>
        allSlotIdsToCheck.includes(app.availability_id) &&
        app.status !== "cancelled" &&
        app.status !== "rejected"
    );
    if (activeAppointment) {
      throw new Error(
        "Cannot delete a slot with an active or confirmed appointment."
      );
    }

    // Remove slot and its child subslots
    this.state.availability = this.state.availability.filter(
      (a) => !allSlotIdsToCheck.includes(a.availability_id)
    );
    this.commit();
    return true;
  }

  // --- Appointment operations (Atomic Booking) ---
  public bookAppointmentAtomic(params: {
    patientId: number;
    doctorId: number;
    availabilityId: number;
    reason: string;
    slotTime?: string;
    bookedByUserId?: number;
    bookedByRole?: UserRole;
  }): Appointment {
    const { patientId, doctorId, availabilityId, reason, slotTime, bookedByUserId, bookedByRole } = params;

    // Verify patient
    const patient = this.getPatientById(patientId);
    if (!patient) throw new Error("Patient record not found.");

    // Verify doctor
    const doctor = this.getDoctorById(doctorId);
    if (!doctor) throw new Error("Doctor record not found.");

    // Receptionist authorization & clinic scope check
    if (bookedByRole === "receptionist") {
      if (!bookedByUserId) {
        throw new Error("Receptionist user ID is required when booking as receptionist.");
      }
      const receptionist = this.getReceptionistByUserId(bookedByUserId);
      if (!receptionist || receptionist.clinic_id !== doctor.clinic_id) {
        throw new Error("Unauthorized: Receptionists can only book appointments for doctors within their assigned clinic.");
      }
    }

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

    if (slot.is_blocked) {
      throw new Error(
        `This schedule is unavailable: ${slot.block_reason || "The doctor has blocked this date/window."}`
      );
    }

    if (isSlotInPast(slot.available_date, slot.start_time)) {
      throw new Error("Cannot book an appointment for a past date or time.");
    }

    let waveNum: number | null = null;
    let estConsult: string | null = null;
    let targetStartTime = slot.start_time;

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

      if (slot.parent_availability_id) {
        const parent = this.getAvailabilityById(slot.parent_availability_id);
        if (parent) {
          parent.wave_booked_count = (parent.wave_booked_count || 0) + 1;
        }
      }
    } else {
      // Stream Mode
      targetStartTime = slotTime || slot.start_time;
      const validSlots = generateTimeSlots(slot.start_time, slot.end_time, slot.slot_duration);
      if (validSlots.length === 0 || !validSlots.some((s) => s.startTime === targetStartTime)) {
        throw new Error(
          `Time slot ${targetStartTime} is unavailable or outside doctor's schedule hours.`
        );
      }
      const subslotCount = validSlots.length;
      const slotTimeCapacity =
        subslotCount > 0
          ? Math.max(1, Math.floor((slot.wave_capacity || subslotCount) / subslotCount))
          : 1;

      // Protection against concurrent or double booking for the exact appointment date and time
      const activeAtSameTime = this.state.appointments.filter(
        (a) =>
          a.doctor_id === doctorId &&
          a.status !== "cancelled" &&
          a.status !== "rejected" &&
          (a.availability_id === slot.availability_id ||
            (typeof a.appointment_date === "string" && a.appointment_date.startsWith(slot.available_date))) &&
          (a.estimated_consult_time === targetStartTime ||
            (typeof a.appointment_date === "string" && a.appointment_date.includes(`T${targetStartTime}:`)))
      );

      if (activeAtSameTime.length >= slotTimeCapacity || !slot.is_available) {
        throw new Error(
          `Time slot ${targetStartTime} has already been booked by another patient. Please choose an alternative slot.`
        );
      }

      slot.wave_booked_count = (slot.wave_booked_count || 0) + 1;
      estConsult = targetStartTime;

      const totalCapacity = slot.wave_capacity && slot.wave_capacity > 0 ? slot.wave_capacity : subslotCount;
      if (slot.wave_booked_count >= totalCapacity) {
        slot.is_available = false;
      }
    }

    // Create appointment
    this.state.counters.appointmentId += 1;
    const appointmentDate = `${slot.available_date}T${targetStartTime}:00.000Z`;

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
      booked_by_user_id: bookedByUserId || null,
      booked_by_role: bookedByRole || null,
      is_outside_schedule: false,
      requires_review: false,
      review_reason: null,
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
    newSlotTime?: string;
    reason?: string;
    requesterUserId: number;
    requesterRole: UserRole;
  }): Appointment {
    const { appointmentId, newAvailabilityId, newSlotTime, reason, requesterUserId, requesterRole } = params;

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
    } else if (requesterRole === "receptionist") {
      const receptionist = this.getReceptionistByUserId(requesterUserId);
      if (!receptionist || receptionist.clinic_id !== doctor.clinic_id) {
        throw new Error("Unauthorized: Receptionists can only reschedule appointments for doctors within their assigned clinic.");
      }
    }

    if (app.status !== "pending" && app.status !== "confirmed") {
      throw new Error(
        `Cannot reschedule an appointment in '${app.status}' status. Only upcoming pending or confirmed appointments are eligible.`
      );
    }

    if (app.availability_id === newAvailabilityId && (!newSlotTime || app.estimated_consult_time === newSlotTime)) {
      throw new Error("The selected appointment slot is identical to your current time slot.");
    }

    const newSlot = this.getAvailabilityById(newAvailabilityId);
    if (!newSlot) {
      throw new Error("The requested new availability slot does not exist.");
    }

    if (newSlot.doctor_id !== app.doctor_id) {
      throw new Error("Rescheduling is only supported with the same consulting practitioner.");
    }

    if (newSlot.is_blocked) {
      throw new Error(
        `Cannot reschedule to this slot: ${newSlot.block_reason || "The doctor has blocked this schedule."}`
      );
    }

    if (isSlotInPast(newSlot.available_date, newSlot.start_time)) {
      throw new Error("Cannot reschedule an appointment to a past date or time.");
    }

    // Check availability of target slot
    let waveNum: number | null = null;
    let estConsult: string | null = null;
    let newTargetStartTime = newSlot.start_time;

    if (newSlot.is_wave) {
      const cap = newSlot.wave_capacity || 3;
      const booked = newSlot.wave_booked_count || 0;
      if (booked >= cap || !newSlot.is_available) {
        throw new Error("The selected wave arrival window is already at full capacity. Please choose another window.");
      }
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
      if (newSlot.parent_availability_id) {
        const parent = this.getAvailabilityById(newSlot.parent_availability_id);
        if (parent) {
          parent.wave_booked_count = (parent.wave_booked_count || 0) + 1;
        }
      }
    } else {
      // Stream mode
      newTargetStartTime = newSlotTime || newSlot.start_time;
      const subslotCount = generateTimeSlots(newSlot.start_time, newSlot.end_time, newSlot.slot_duration).length;
      const slotTimeCapacity =
        subslotCount > 0
          ? Math.max(1, Math.floor((newSlot.wave_capacity || subslotCount) / subslotCount))
          : 1;

      const collision = this.state.appointments.filter(
        (a) =>
          a.doctor_id === app.doctor_id &&
          a.status !== "cancelled" &&
          a.status !== "rejected" &&
          (a.availability_id === newSlot.availability_id ||
            (typeof a.appointment_date === "string" && a.appointment_date.startsWith(newSlot.available_date))) &&
          (a.estimated_consult_time === newTargetStartTime ||
            (typeof a.appointment_date === "string" && a.appointment_date.includes(`T${newTargetStartTime}:`)))
      );
      if (collision.length >= slotTimeCapacity || !newSlot.is_available) {
        throw new Error(
          `Time slot ${newTargetStartTime} has already been reserved. Please select another slot.`
        );
      }
      newSlot.wave_booked_count = (newSlot.wave_booked_count || 0) + 1;
      estConsult = newTargetStartTime;

      const totalCapacity = newSlot.wave_capacity && newSlot.wave_capacity > 0 ? newSlot.wave_capacity : subslotCount;
      if (newSlot.wave_booked_count >= totalCapacity) {
        newSlot.is_available = false;
      }
    }

    // Release old slot
    const oldSlot = this.getAvailabilityById(app.availability_id);
    if (oldSlot) {
      oldSlot.wave_booked_count = Math.max(0, (oldSlot.wave_booked_count || 1) - 1);
      oldSlot.is_available = true;
      if (oldSlot.parent_availability_id) {
        const parent = this.getAvailabilityById(oldSlot.parent_availability_id);
        if (parent) {
          parent.wave_booked_count = Math.max(0, (parent.wave_booked_count || 1) - 1);
          parent.is_available = true;
        }
      }
    }

    const previousSlotId = app.availability_id;
    app.availability_id = newAvailabilityId;
    app.appointment_date = `${newSlot.available_date}T${newTargetStartTime}:00.000Z`;
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
      message: `Your consultation with ${doctor.user?.full_name || "Dr. " + doctor.specialization} has been rescheduled to ${newSlot.available_date} at ${newTargetStartTime} IST.`,
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
    } else if (requesterRole === "receptionist") {
      const receptionist = this.getReceptionistByUserId(requesterUserId);
      if (!receptionist || !doctor || receptionist.clinic_id !== doctor.clinic_id) {
        throw new Error(
          "Unauthorized: Receptionists can only modify appointments for doctors within their assigned clinic."
        );
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
        slot.wave_booked_count = Math.max(0, (slot.wave_booked_count || 1) - 1);
        slot.is_available = true;
        if (slot.parent_availability_id) {
          const parent = this.getAvailabilityById(slot.parent_availability_id);
          if (parent) {
            parent.wave_booked_count = Math.max(0, (parent.wave_booked_count || 1) - 1);
            parent.is_available = true;
          }
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
    category?: InAppNotificationCategory;
    appointmentId?: number | null;
    actionUrl?: string | null;
    idempotencyKey?: string | null;
    type?: NotificationType;
    relatedOfferId?: number | null;
  }): InAppNotification {
    if (params.idempotencyKey) {
      const existing = this.state.inAppNotifications.find(
        (n) => n.idempotency_key === params.idempotencyKey
      );
      if (existing) return existing;
    }

    this.state.counters.notificationId =
      (this.state.counters.notificationId || 0) + 1;
    const notif: InAppNotification = {
      notification_id: this.state.counters.notificationId,
      user_id: params.userId,
      title: params.title,
      message: params.message,
      category: params.category || "general",
      type: params.type || "general",
      appointment_id: params.appointmentId ?? null,
      action_url: params.actionUrl ?? null,
      related_offer_id: params.relatedOfferId ?? null,
      is_read: false,
      read_at: null,
      idempotency_key: params.idempotencyKey ?? null,
      created_at: new Date().toISOString(),
    };
    this.state.inAppNotifications.unshift(notif);
    this.state.notifications.unshift(notif);
    this.commit();
    return notif;
  }

  public getInAppNotificationsForUser(
    userId: number,
    optionsOrLimit?: number | { unreadOnly?: boolean; limit?: number }
  ): InAppNotification[] {
    const resolvedLimit =
      typeof optionsOrLimit === "number"
        ? optionsOrLimit
        : typeof optionsOrLimit === "object" && optionsOrLimit !== null
        ? optionsOrLimit.limit ?? 50
        : 50;
    const unreadOnly =
      typeof optionsOrLimit === "object" && optionsOrLimit !== null
        ? optionsOrLimit.unreadOnly === true
        : false;

    return this.state.inAppNotifications
      .filter((n) => n.user_id === userId && (!unreadOnly || !n.is_read))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, resolvedLimit);
  }

  public getUnreadInAppNotificationCount(userId: number): number {
    return this.state.inAppNotifications.filter(
      (n) => n.user_id === userId && !n.is_read
    ).length;
  }

  public markInAppNotificationRead(
    notificationId: number,
    userId: number
  ): boolean {
    const notif = this.state.inAppNotifications.find(
      (n) => n.notification_id === notificationId && n.user_id === userId
    );
    if (notif) {
      notif.is_read = true;
      notif.read_at = new Date().toISOString();
      const legacy = this.state.notifications.find(
        (n) => n.notification_id === notificationId
      );
      if (legacy) legacy.is_read = true;
      this.commit();
      return true;
    }
    return false;
  }

  public markAllInAppNotificationsRead(userId: number): number {
    const unread = this.state.inAppNotifications.filter(
      (n) => n.user_id === userId && !n.is_read
    );
    const now = new Date().toISOString();
    for (const n of unread) {
      n.is_read = true;
      n.read_at = now;
      const legacy = this.state.notifications.find(
        (l) => l.notification_id === n.notification_id
      );
      if (legacy) legacy.is_read = true;
    }
    this.commit();
    return unread.length;
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
      in_app_enabled: true,
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
