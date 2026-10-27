import fs from "fs";
import path from "path";
import {
  User,
  Patient,
  Doctor,
  Availability,
  Appointment,
  AppointmentStatus,
  UserRole,
} from "@/types/database";

interface DatabaseState {
  users: User[];
  patients: Patient[];
  doctors: Doctor[];
  availability: Availability[];
  appointments: Appointment[];
  counters: {
    userId: number;
    patientId: number;
    doctorId: number;
    availabilityId: number;
    appointmentId: number;
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
      full_name: "John Doe",
      email: "patient@demo.com",
      phone: "+1 (555) 234-5678",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "patient",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 2,
      full_name: "Jane Smith",
      email: "jane@demo.com",
      phone: "+1 (555) 876-5432",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "patient",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 3,
      full_name: "Dr. Sarah Jenkins",
      email: "doctor.sarah@demo.com",
      phone: "+1 (555) 901-2345",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "doctor",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 4,
      full_name: "Dr. Marcus Vance",
      email: "doctor.marcus@demo.com",
      phone: "+1 (555) 345-6789",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "doctor",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 5,
      full_name: "Dr. Elena Rostova",
      email: "doctor.elena@demo.com",
      phone: "+1 (555) 456-7890",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "doctor",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 6,
      full_name: "Dr. David Chen",
      email: "doctor.david@demo.com",
      phone: "+1 (555) 567-8901",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "doctor",
      created_at: new Date().toISOString(),
    },
    {
      user_id: 7,
      full_name: "Dr. Priya Sharma",
      email: "doctor.priya@demo.com",
      phone: "+1 (555) 678-9012",
      password_hash: DEFAULT_PASSWORD_HASH,
      role: "doctor",
      created_at: new Date().toISOString(),
    },
  ];

  const patients: Patient[] = [
    {
      patient_id: 1,
      user_id: 1,
      date_of_birth: "1992-05-14",
      gender: "Male",
      address: "742 Evergreen Terrace, Springfield, IL",
      created_at: new Date().toISOString(),
    },
    {
      patient_id: 2,
      user_id: 2,
      date_of_birth: "1996-11-22",
      gender: "Female",
      address: "128 Beacon St, Boston, MA",
      created_at: new Date().toISOString(),
    },
  ];

  const doctors: Doctor[] = [
    {
      doctor_id: 1,
      user_id: 3,
      specialization: "Cardiology",
      qualification: "MBBS, MD, FACC (Harvard Medical School)",
      experience_years: 15,
      consultation_fee: 120.0,
      bio: "Dr. Sarah Jenkins is an internationally recognized consultant cardiologist specializing in preventive cardiology, echocardiography, hypertension, and heart rhythm management.",
      avatar_url:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300",
      clinic_address: "Pearl Thought Heart Pavilion, Suite 402, Boston, MA",
      created_at: new Date().toISOString(),
    },
    {
      doctor_id: 2,
      user_id: 4,
      specialization: "Dermatology",
      qualification: "MD Dermatology (Johns Hopkins University)",
      experience_years: 11,
      consultation_fee: 95.0,
      bio: "Dr. Marcus Vance provides comprehensive clinical and cosmetic dermatologic care. Specializing in eczema, psoriasis, acne management, and laser therapies.",
      avatar_url:
        "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300",
      clinic_address:
        "Aesthetic & Clinical Derma Center, 5th Floor, New York, NY",
      created_at: new Date().toISOString(),
    },
    {
      doctor_id: 3,
      user_id: 5,
      specialization: "Neurology",
      qualification: "MD, PhD Neurology (Stanford University)",
      experience_years: 18,
      consultation_fee: 160.0,
      bio: "Dr. Elena Rostova is a board-certified neurologist focusing on complex migraine syndromes, neuro-degenerative diseases, and sleep disorders.",
      avatar_url:
        "https://images.unsplash.com/photo-1594824813593-7859c7717462?auto=format&fit=crop&q=80&w=300",
      clinic_address: "Stanford Neurocare Pavilion, Suite 12B, Palo Alto, CA",
      created_at: new Date().toISOString(),
    },
    {
      doctor_id: 4,
      user_id: 6,
      specialization: "Pediatrics",
      qualification: "MD, FAAP Pediatrics (Columbia University)",
      experience_years: 12,
      consultation_fee: 85.0,
      bio: "Dr. David Chen is beloved for his gentle, attentive care with newborns, children, and adolescents. Specializing in childhood immunization and wellness.",
      avatar_url:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300",
      clinic_address: "Columbia Children Wellness Clinic, Chicago, IL",
      created_at: new Date().toISOString(),
    },
    {
      doctor_id: 5,
      user_id: 7,
      specialization: "Orthopedics",
      qualification: "MBBS, MS Ortho, MCh (AIIMS & Oxford)",
      experience_years: 14,
      consultation_fee: 140.0,
      bio: "Dr. Priya Sharma specializes in joint preservation, arthroscopic knee and shoulder reconstruction, and sports medicine rehabilitation for active adults.",
      avatar_url:
        "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=300",
      clinic_address: "Metropolitan Bone & Joint Center, Seattle, WA",
      created_at: new Date().toISOString(),
    },
  ];

  const date1 = getFutureDate(1);
  const date2 = getFutureDate(2);
  const date3 = getFutureDate(3);
  const date4 = getFutureDate(4);

  const availability: Availability[] = [
    // Dr. Sarah Jenkins (doctor_id 1)
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

    // Dr. Marcus Vance (doctor_id 2)
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

    // Dr. Elena Rostova (doctor_id 3)
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

    // Dr. David Chen (doctor_id 4)
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

    // Dr. Priya Sharma (doctor_id 5)
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
  ];

  const appointments: Appointment[] = [
    {
      appointment_id: 1,
      patient_id: 1,
      doctor_id: 1,
      availability_id: 3,
      appointment_date: `${date1}T10:00:00.000Z`,
      status: "confirmed",
      reason: "Annual routine cardiac checkup and blood pressure review.",
      created_at: new Date().toISOString(),
    },
  ];

  return {
    users,
    patients,
    doctors,
    availability,
    appointments,
    counters: {
      userId: 7,
      patientId: 2,
      doctorId: 5,
      availabilityId: 18,
      appointmentId: 1,
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
    return this.state.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );
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
  public getDoctorAvailability(
    doctorId: number,
    date?: string,
    onlyAvailable: boolean = false
  ): Availability[] {
    return this.state.availability.filter((a) => {
      if (a.doctor_id !== doctorId) return false;
      if (date && a.available_date !== date) return false;
      if (onlyAvailable && !a.is_available) return false;
      return true;
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
    slotDuration: number = 30
  ): Availability {
    // Check doctor exists
    const doctor = this.getDoctorById(doctorId);
    if (!doctor) throw new Error("Doctor does not exist.");

    // Validate future date
    const today = new Date().toISOString().split("T")[0];
    if (availableDate < today) {
      throw new Error("Cannot configure availability for past dates.");
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

    this.state.counters.availabilityId += 1;
    const newSlot: Availability = {
      availability_id: this.state.counters.availabilityId,
      doctor_id: doctorId,
      available_date: availableDate,
      start_time: startTime,
      end_time: endTime,
      slot_duration: slotDuration,
      is_available: true,
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
      reason: reason.trim(),
      created_at: new Date().toISOString(),
    };

    this.state.appointments.push(newAppointment);
    this.commit();

    return this.hydrateAppointment(newAppointment);
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
        slot.is_available = true;
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

  private hydrateAppointment(app: Appointment): Appointment {
    const doctor = this.getDoctorById(app.doctor_id);
    const patient = this.getPatientById(app.patient_id);
    const availability = this.getAvailabilityById(app.availability_id);

    return {
      ...app,
      doctor,
      patient,
      availability,
    };
  }
}

export const localDb = LocalDatabase.getInstance();
