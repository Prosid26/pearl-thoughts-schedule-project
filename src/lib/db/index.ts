import { localDb } from "./local-store";
import { isNeonConfigured, getNeonDb } from "./neon";
import * as schema from "./schema";
import { eq, and, or, gt, gte, desc, asc, sql } from "drizzle-orm";
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
  InAppNotificationCategory,
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

export const getDatabaseMode = (): "neon" | "local" => {
  return isNeonConfigured ? "neon" : "local";
};

/**
 * Universal Database Repository (Drizzle ORM + Neon PostgreSQL with Local Fallback)
 * Strongly typed interface adhering to schedule-project-er-diagram.png.png
 */
// High-performance in-memory cache for public doctor catalog
let cachedDoctorsList: Doctor[] | null = null;
let cachedDoctorsExpiry = 0;
const DOCTORS_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export const invalidateDoctorsCache = () => {
  cachedDoctorsList = null;
  cachedDoctorsExpiry = 0;
};

export const db = {
  getMode: getDatabaseMode,
  invalidateDoctorsCache,

  // --- Users ---
  getUserByEmail: async (email: string): Promise<User | null> => {
    const normalized = email.toLowerCase().trim();
    const legacyAliases: Record<string, string> = {
      "doctor.sarah@demo.com": "doctor.ananya@demo.com",
      "doctor.marcus@demo.com": "doctor.priya@demo.com",
      "doctor.elena@demo.com": "doctor.rohan@demo.com",
      "doctor.david@demo.com": "doctor.sneha@demo.com",
    };
    const targetEmail = legacyAliases[normalized] || normalized;

    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        let result = await neonDb
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, targetEmail))
          .limit(1);

        if (result.length === 0 && targetEmail !== normalized) {
          result = await neonDb
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, normalized))
            .limit(1);
        }

        if (result.length > 0) {
          const u = result[0];
          return {
            ...u,
            role: u.role as UserRole,
            created_at: u.created_at.toISOString(),
          };
        }
        return null;
      }
    }
    return localDb.getUserByEmail(email) || null;
  },

  getUserById: async (userId: number): Promise<User | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const result = await neonDb
          .select()
          .from(schema.users)
          .where(eq(schema.users.user_id, userId))
          .limit(1);
        if (result.length > 0) {
          const u = result[0];
          return {
            ...u,
            role: u.role as UserRole,
            created_at: u.created_at.toISOString(),
          };
        }
        return null;
      }
    }
    return localDb.getUserById(userId) || null;
  },

  createUser: async (
    fullName: string,
    email: string,
    phone: string,
    passwordHash: string,
    role: UserRole
  ): Promise<User> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const result = await neonDb
          .insert(schema.users)
          .values({
            full_name: fullName.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password_hash: passwordHash,
            role,
          })
          .returning();
        const u = result[0];
        return {
          ...u,
          role: u.role as UserRole,
          created_at: u.created_at.toISOString(),
        };
      }
    }
    return localDb.createUser(fullName, email, phone, passwordHash, role);
  },

  // --- Patients ---
  getPatientByUserId: async (userId: number): Promise<Patient | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const result = await neonDb
          .select({
            patient: schema.patients,
            user: {
              full_name: schema.users.full_name,
              email: schema.users.email,
              phone: schema.users.phone,
            },
          })
          .from(schema.patients)
          .innerJoin(
            schema.users,
            eq(schema.patients.user_id, schema.users.user_id)
          )
          .where(eq(schema.patients.user_id, userId))
          .limit(1);

        if (result.length > 0) {
          const { patient, user } = result[0];
          return {
            ...patient,
            created_at: patient.created_at.toISOString(),
            user,
          };
        }
        return null;
      }
    }
    return localDb.getPatientByUserId(userId) || null;
  },

  getPatientById: async (patientId: number): Promise<Patient | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const result = await neonDb
          .select({
            patient: schema.patients,
            user: {
              full_name: schema.users.full_name,
              email: schema.users.email,
              phone: schema.users.phone,
            },
          })
          .from(schema.patients)
          .innerJoin(
            schema.users,
            eq(schema.patients.user_id, schema.users.user_id)
          )
          .where(eq(schema.patients.patient_id, patientId))
          .limit(1);

        if (result.length > 0) {
          const { patient, user } = result[0];
          return {
            ...patient,
            created_at: patient.created_at.toISOString(),
            user,
          };
        }
        return null;
      }
    }
    return localDb.getPatientById(patientId) || null;
  },

  createPatient: async (
    userId: number,
    dob?: string,
    gender?: string,
    address?: string
  ): Promise<Patient> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const result = await neonDb
          .insert(schema.patients)
          .values({
            user_id: userId,
            date_of_birth: dob || null,
            gender: gender || null,
            address: address || null,
          })
          .returning();
        const p = result[0];
        return {
          ...p,
          created_at: p.created_at.toISOString(),
        };
      }
    }
    return localDb.createPatient(userId, dob, gender, address);
  },

  updatePatient: async (
    patientId: number,
    data: {
      full_name?: string;
      phone?: string;
      date_of_birth?: string;
      gender?: string;
      address?: string;
    }
  ): Promise<Patient> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const existing = await db.getPatientById(patientId);
        if (!existing) throw new Error("Patient not found");

        await neonDb
          .update(schema.patients)
          .set({
            date_of_birth: data.date_of_birth,
            gender: data.gender,
            address: data.address,
          })
          .where(eq(schema.patients.patient_id, patientId));

        if (data.full_name || data.phone) {
          await neonDb
            .update(schema.users)
            .set({
              ...(data.full_name && { full_name: data.full_name.trim() }),
              ...(data.phone && { phone: data.phone.trim() }),
            })
            .where(eq(schema.users.user_id, existing.user_id));
        }

        return (await db.getPatientById(patientId))!;
      }
    }
    return localDb.updatePatient(patientId, data);
  },

  // --- Doctors ---
  getDoctorByUserId: async (userId: number): Promise<Doctor | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const result = await neonDb
          .select({
            doctor: schema.doctors,
            user: {
              full_name: schema.users.full_name,
              email: schema.users.email,
              phone: schema.users.phone,
            },
          })
          .from(schema.doctors)
          .innerJoin(schema.users, eq(schema.doctors.user_id, schema.users.user_id))
          .where(eq(schema.doctors.user_id, userId))
          .limit(1);

        if (result.length > 0) {
          const { doctor, user } = result[0];
          return {
            ...doctor,
            scheduling_mode: (doctor.scheduling_mode || "stream") as "stream" | "wave",
            consultation_fee: parseFloat(doctor.consultation_fee),
            created_at: doctor.created_at.toISOString(),
            user,
          };
        }
        return null;
      }
    }
    return localDb.getDoctorByUserId(userId) || null;
  },

  getDoctorById: async (doctorId: number): Promise<Doctor | null> => {
    // Check active memory cache first for instant sub-millisecond response
    if (cachedDoctorsList && Date.now() < cachedDoctorsExpiry) {
      const match = cachedDoctorsList.find((d) => d.doctor_id === doctorId);
      if (match) return match;
    }

    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const result = await neonDb
          .select({
            doctor: schema.doctors,
            user: {
              full_name: schema.users.full_name,
              email: schema.users.email,
              phone: schema.users.phone,
            },
          })
          .from(schema.doctors)
          .innerJoin(schema.users, eq(schema.doctors.user_id, schema.users.user_id))
          .where(eq(schema.doctors.doctor_id, doctorId))
          .limit(1);

        if (result.length > 0) {
          const { doctor, user } = result[0];
          return {
            ...doctor,
            scheduling_mode: (doctor.scheduling_mode || "stream") as "stream" | "wave",
            consultation_fee: parseFloat(doctor.consultation_fee),
            created_at: doctor.created_at.toISOString(),
            user,
          };
        }
        return null;
      }
    }
    return localDb.getDoctorById(doctorId) || null;
  },

  getDoctors: async (filters?: {
    search?: string;
    specialization?: string;
    minExperience?: number;
  }): Promise<Doctor[]> => {
    const now = Date.now();
    let baseList: Doctor[];

    if (cachedDoctorsList && now < cachedDoctorsExpiry) {
      baseList = cachedDoctorsList;
    } else {
      if (isNeonConfigured) {
        const neonDb = getNeonDb();
        if (neonDb) {
          const query = neonDb
            .select({
              doctor: schema.doctors,
              user: {
                full_name: schema.users.full_name,
                email: schema.users.email,
                phone: schema.users.phone,
              },
            })
            .from(schema.doctors)
            .innerJoin(
              schema.users,
              eq(schema.doctors.user_id, schema.users.user_id)
            );

          const rows = await query;
          baseList = rows.map(({ doctor, user }) => ({
            ...doctor,
            scheduling_mode: (doctor.scheduling_mode || "stream") as "stream" | "wave",
            consultation_fee: parseFloat(doctor.consultation_fee),
            created_at: doctor.created_at.toISOString(),
            user,
          }));
          cachedDoctorsList = baseList;
          cachedDoctorsExpiry = now + DOCTORS_CACHE_TTL_MS;
        } else {
          baseList = localDb.getDoctors();
        }
      } else {
        baseList = localDb.getDoctors();
      }
    }

    let list = [...baseList];

    if (filters?.specialization && filters.specialization !== "All") {
      list = list.filter(
        (d) =>
          d.specialization.toLowerCase() ===
          filters.specialization!.toLowerCase()
      );
    }
    if (filters?.minExperience) {
      list = list.filter(
        (d) => d.experience_years >= filters.minExperience!
      );
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.user?.full_name?.toLowerCase().includes(q) ||
          d.specialization.toLowerCase().includes(q) ||
          d.qualification.toLowerCase().includes(q)
      );
    }
    return list;
  },

  createDoctor: async (
    userId: number,
    specialization: string,
    qualification: string,
    experienceYears: number,
    consultationFee: number,
    bio?: string,
    avatarUrl?: string,
    clinicAddress?: string
  ): Promise<Doctor> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const result = await neonDb
          .insert(schema.doctors)
          .values({
            user_id: userId,
            specialization,
            qualification,
            experience_years: experienceYears,
            consultation_fee: consultationFee.toFixed(2),
            bio: bio || null,
            avatar_url: avatarUrl || null,
            clinic_address: clinicAddress || null,
          })
          .returning();
        const d = result[0];
        invalidateDoctorsCache();
        return {
          ...d,
          scheduling_mode: (d.scheduling_mode || "stream") as "stream" | "wave",
          consultation_fee: parseFloat(d.consultation_fee),
          created_at: d.created_at.toISOString(),
        };
      }
    }
    invalidateDoctorsCache();
    return localDb.createDoctor(
      userId,
      specialization,
      qualification,
      experienceYears,
      consultationFee,
      bio,
      avatarUrl,
      clinicAddress
    );
  },

  updateDoctor: async (
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
  ): Promise<Doctor> => {
    invalidateDoctorsCache();
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const existing = await db.getDoctorById(doctorId);
        if (!existing) throw new Error("Doctor not found");

        await neonDb
          .update(schema.doctors)
          .set({
            ...(data.specialization && { specialization: data.specialization }),
            ...(data.qualification && { qualification: data.qualification }),
            ...(data.experience_years !== undefined && {
              experience_years: data.experience_years,
            }),
            ...(data.consultation_fee !== undefined && {
              consultation_fee: data.consultation_fee.toFixed(2),
            }),
            ...(data.bio !== undefined && { bio: data.bio }),
            ...(data.clinic_address !== undefined && {
              clinic_address: data.clinic_address,
            }),
            ...(data.scheduling_mode !== undefined && {
              scheduling_mode: data.scheduling_mode,
            }),
            ...(data.wave_capacity !== undefined && {
              wave_capacity: data.wave_capacity,
            }),
            ...(data.wave_interval_minutes !== undefined && {
              wave_interval_minutes: data.wave_interval_minutes,
            }),
          })
          .where(eq(schema.doctors.doctor_id, doctorId));

        if (data.full_name) {
          await neonDb
            .update(schema.users)
            .set({ full_name: data.full_name.trim() })
            .where(eq(schema.users.user_id, existing.user_id));
        }

        invalidateDoctorsCache();
        return (await db.getDoctorById(doctorId))!;
      }
    }
    return localDb.updateDoctor(doctorId, data);
  },

  // --- Availability ---
  ensureDoctorAvailabilityWindow: async (
    doctorId: number,
    daysAhead: number = 14
  ): Promise<void> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const doctor = await db.getDoctorById(doctorId);
        if (!doctor) return;

        const dates = getRollingDateWindow(daysAhead);
        const todayStr = dates[0];

        // Fetch existing slots for doctor in this rolling window
        const existingSlots = await neonDb
          .select({
            available_date: schema.availability.available_date,
            start_time: schema.availability.start_time,
          })
          .from(schema.availability)
          .where(
            and(
              eq(schema.availability.doctor_id, doctorId),
              gte(schema.availability.available_date, todayStr)
            )
          );

        const existingSet = new Set(
          existingSlots.map((s) => `${s.available_date}_${s.start_time}`)
        );

        const slotsToInsert: Array<typeof schema.availability.$inferInsert> = [];

        for (const dateStr of dates) {
          const candidateSlots = generateDoctorSlotsForDate(
            doctorId,
            dateStr,
            doctor.scheduling_mode as "stream" | "wave",
            doctor.wave_capacity || 3
          );

          for (const slotDef of candidateSlots) {
            const key = `${dateStr}_${slotDef.startTime}`;
            if (!existingSet.has(key)) {
              slotsToInsert.push({
                doctor_id: doctorId,
                available_date: dateStr,
                start_time: slotDef.startTime,
                end_time: slotDef.endTime,
                slot_duration: slotDef.slotDuration,
                is_available: true,
                is_wave: slotDef.isWave,
                wave_capacity: slotDef.waveCapacity,
                wave_booked_count: 0,
              });
              existingSet.add(key);
            }
          }
        }

        if (slotsToInsert.length > 0) {
          await neonDb.insert(schema.availability).values(slotsToInsert);
        }

        // Sync unbooked future slots with current doctor scheduling policy
        const resolvedIsWave = doctor.scheduling_mode === "wave";
        const resolvedCap = resolvedIsWave ? doctor.wave_capacity || 3 : 1;
        await neonDb
          .update(schema.availability)
          .set({ is_wave: resolvedIsWave, wave_capacity: resolvedCap })
          .where(
            and(
              eq(schema.availability.doctor_id, doctorId),
              gte(schema.availability.available_date, todayStr),
              eq(schema.availability.is_available, true),
              eq(schema.availability.wave_booked_count, 0)
            )
          );
        return;
      }
    }
    localDb.ensureDoctorAvailabilityWindow(doctorId, daysAhead);
  },

  getDoctorAvailability: async (
    doctorId: number,
    date?: string,
    onlyAvailable: boolean = false
  ): Promise<Availability[]> => {
    // Dynamically ensure rolling window exists
    await db.ensureDoctorAvailabilityWindow(doctorId, 14);

    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb
          .select()
          .from(schema.availability)
          .where(
            and(
              eq(schema.availability.doctor_id, doctorId),
              date ? eq(schema.availability.available_date, date) : undefined,
              onlyAvailable ? eq(schema.availability.is_available, true) : undefined
            )
          )
          .orderBy(
            asc(schema.availability.available_date),
            asc(schema.availability.start_time)
          );

        let mapped = rows.map((r) => ({
          ...r,
          created_at: r.created_at.toISOString(),
        }));

        if (onlyAvailable) {
          mapped = mapped.filter(
            (slot) => !isSlotInPast(slot.available_date, slot.start_time)
          );
        }

        return mapped;
      }
    }
    return localDb.getDoctorAvailability(doctorId, date, onlyAvailable);
  },

  getAvailabilityById: async (
    availabilityId: number
  ): Promise<Availability | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const result = await neonDb
          .select()
          .from(schema.availability)
          .where(eq(schema.availability.availability_id, availabilityId))
          .limit(1);
        if (result.length > 0) {
          const r = result[0];
          return {
            ...r,
            created_at: r.created_at.toISOString(),
          };
        }
        return null;
      }
    }
    return localDb.getAvailabilityById(availabilityId) || null;
  },

  addAvailabilitySlot: async (
    doctorId: number,
    availableDate: string,
    startTime: string,
    endTime: string,
    slotDuration: number = 30,
    isWave?: boolean,
    waveCapacity?: number
  ): Promise<Availability> => {
    if (isSlotInPast(availableDate, startTime)) {
      throw new Error("Cannot add availability for a past date or time.");
    }

    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const doctor = await db.getDoctorById(doctorId);
        const resolvedIsWave = isWave !== undefined ? isWave : doctor?.scheduling_mode === "wave";
        const resolvedWaveCapacity = resolvedIsWave
          ? (waveCapacity && waveCapacity > 0 ? waveCapacity : doctor?.wave_capacity || 3)
          : 1;

        const result = await neonDb
          .insert(schema.availability)
          .values({
            doctor_id: doctorId,
            available_date: availableDate,
            start_time: startTime,
            end_time: endTime,
            slot_duration: slotDuration,
            is_available: true,
            is_wave: resolvedIsWave,
            wave_capacity: resolvedWaveCapacity,
            wave_booked_count: 0,
          })
          .returning();
        const r = result[0];
        return {
          ...r,
          created_at: r.created_at.toISOString(),
        };
      }
    }
    return localDb.addAvailabilitySlot(
      doctorId,
      availableDate,
      startTime,
      endTime,
      slotDuration,
      isWave,
      waveCapacity
    );
  },

  deleteAvailabilitySlot: async (
    availabilityId: number,
    doctorId: number
  ): Promise<boolean> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        await neonDb
          .delete(schema.availability)
          .where(
            and(
              eq(schema.availability.availability_id, availabilityId),
              eq(schema.availability.doctor_id, doctorId)
            )
          );
        return true;
      }
    }
    return localDb.deleteAvailabilitySlot(availabilityId, doctorId);
  },

  // --- Atomic Appointment Booking ---
  bookAppointmentAtomic: async (params: {
    patientId: number;
    doctorId: number;
    availabilityId: number;
    reason: string;
  }): Promise<Appointment> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        // Neon Drizzle atomic check & reservation
        const slotResult = await neonDb
          .select()
          .from(schema.availability)
          .where(eq(schema.availability.availability_id, params.availabilityId))
          .limit(1);

        if (slotResult.length === 0) {
          throw new Error("Availability slot does not exist.");
        }
        const slot = slotResult[0];
        if (slot.doctor_id !== params.doctorId) {
          throw new Error("Slot does not belong to the selected doctor.");
        }
        if (isSlotInPast(slot.available_date, slot.start_time)) {
          throw new Error("Cannot book an appointment for a past date or time.");
        }

        let waveNum: number | null = null;
        let estConsult: string | null = null;

        if (slot.is_wave) {
          const cap = slot.wave_capacity || 3;
          const currentBooked = slot.wave_booked_count || 0;
          if (currentBooked >= cap || !slot.is_available) {
            throw new Error(
              "This wave arrival window has reached its maximum capacity. Please choose another wave or slot."
            );
          }
          const nextCount = currentBooked + 1;
          waveNum = nextCount;
          const [sh, sm] = slot.start_time.split(":").map(Number);
          const totalMinutes = sh * 60 + sm + (waveNum - 1) * 20;
          const eh = Math.floor(totalMinutes / 60) % 24;
          const em = totalMinutes % 60;
          estConsult = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

          await neonDb
            .update(schema.availability)
            .set({
              wave_booked_count: nextCount,
              ...(nextCount >= cap ? { is_available: false } : {}),
            })
            .where(eq(schema.availability.availability_id, params.availabilityId));
        } else {
          if (!slot.is_available) {
            throw new Error(
              "This time slot has already been booked by another patient. Please choose an alternative slot."
            );
          }

          // Atomically mark slot unavailable
          await neonDb
            .update(schema.availability)
            .set({ is_available: false })
            .where(
              and(
                eq(schema.availability.availability_id, params.availabilityId),
                eq(schema.availability.is_available, true)
              )
            );
        }

        const appointmentDate = new Date(
          `${slot.available_date}T${slot.start_time}:00Z`
        );

        const newAppResult = await neonDb
          .insert(schema.appointments)
          .values({
            patient_id: params.patientId,
            doctor_id: params.doctorId,
            availability_id: params.availabilityId,
            appointment_date: appointmentDate,
            status: "pending",
            payment_status: "unpaid",
            reason: params.reason,
            wave_number: waveNum,
            estimated_consult_time: estConsult,
          })
          .returning();

        const created = newAppResult[0];
        return (await db.getAppointmentById(created.appointment_id))!;
      }
    }
    return localDb.bookAppointmentAtomic(params);
  },

  // --- Atomic Rescheduling ---
  rescheduleAppointmentAtomic: async (params: {
    appointmentId: number;
    newAvailabilityId: number;
    reason?: string;
    requesterUserId: number;
    requesterRole: UserRole;
  }): Promise<Appointment> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const app = await db.getAppointmentById(params.appointmentId);
        if (!app) throw new Error("Appointment record not found.");

        const doctor = await db.getDoctorById(app.doctor_id);
        const patient = await db.getPatientById(app.patient_id);
        if (!doctor || !patient) throw new Error("Practitioner or patient not found.");

        if (params.requesterRole === "patient" && patient.user_id !== params.requesterUserId) {
          throw new Error("Unauthorized");
        }
        if (params.requesterRole === "doctor" && doctor.user_id !== params.requesterUserId) {
          throw new Error("Unauthorized");
        }

        if (app.status !== "pending" && app.status !== "confirmed") {
          throw new Error(`Cannot reschedule an appointment in '${app.status}' status.`);
        }

        const newSlot = await db.getAvailabilityById(params.newAvailabilityId);
        if (!newSlot) throw new Error("Target availability slot does not exist.");
        if (newSlot.doctor_id !== app.doctor_id) {
          throw new Error("Rescheduling is only supported with the same practitioner.");
        }
        if (isSlotInPast(newSlot.available_date, newSlot.start_time)) {
          throw new Error("Cannot reschedule an appointment to a past date or time.");
        }

        // Release old slot
        const oldSlot = await db.getAvailabilityById(app.availability_id);
        if (oldSlot) {
          if (oldSlot.is_wave) {
            const nextOldBooked = Math.max(0, (oldSlot.wave_booked_count || 1) - 1);
            await neonDb
              .update(schema.availability)
              .set({ wave_booked_count: nextOldBooked, is_available: true })
              .where(eq(schema.availability.availability_id, oldSlot.availability_id));
          } else {
            await neonDb
              .update(schema.availability)
              .set({ is_available: true })
              .where(eq(schema.availability.availability_id, oldSlot.availability_id));
          }
        }

        // Secure new slot
        let waveNum: number | null = null;
        let estConsult: string | null = null;

        if (newSlot.is_wave) {
          const cap = newSlot.wave_capacity || 3;
          const currentNewBooked = newSlot.wave_booked_count || 0;
          if (currentNewBooked >= cap || !newSlot.is_available) {
            throw new Error("Wave window at full capacity.");
          }
          const nextCount = currentNewBooked + 1;
          waveNum = nextCount;
          const [sh, sm] = newSlot.start_time.split(":").map(Number);
          const totalMinutes = sh * 60 + sm + (waveNum - 1) * 20;
          const eh = Math.floor(totalMinutes / 60) % 24;
          const em = totalMinutes % 60;
          estConsult = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

          await neonDb
            .update(schema.availability)
            .set({
              wave_booked_count: nextCount,
              ...(nextCount >= cap ? { is_available: false } : {}),
            })
            .where(eq(schema.availability.availability_id, newSlot.availability_id));
        } else {
          if (!newSlot.is_available) {
            throw new Error("Requested time slot is already booked.");
          }
          await neonDb
            .update(schema.availability)
            .set({ is_available: false })
            .where(eq(schema.availability.availability_id, newSlot.availability_id));
        }

        const newDate = new Date(`${newSlot.available_date}T${newSlot.start_time}:00Z`);
        await neonDb
          .update(schema.appointments)
          .set({
            availability_id: params.newAvailabilityId,
            appointment_date: newDate,
            rescheduled_from_id: app.availability_id,
            wave_number: waveNum,
            estimated_consult_time: estConsult,
            ...(params.reason ? { reason: `${app.reason} (Rescheduled: ${params.reason.trim()})` } : {}),
          })
          .where(eq(schema.appointments.appointment_id, params.appointmentId));

        await db.createNotification({
          userId: patient.user_id,
          title: "Appointment Rescheduled",
          message: `Your consultation with ${doctor.user?.full_name || "Dr. " + doctor.specialization} has been rescheduled to ${newSlot.available_date} at ${newSlot.start_time} IST.`,
          type: "rescheduled",
        });

        return (await db.getAppointmentById(params.appointmentId))!;
      }
    }
    return localDb.rescheduleAppointmentAtomic(params);
  },

  // --- Status & Appointments ---
  updateAppointmentStatus: async (params: {
    appointmentId: number;
    newStatus: AppointmentStatus;
    requesterUserId: number;
    requesterRole: UserRole;
  }): Promise<Appointment> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const app = await db.getAppointmentById(params.appointmentId);
        if (!app) throw new Error("Appointment not found");

        if (
          params.requesterRole === "doctor" &&
          app.doctor?.user_id !== params.requesterUserId
        ) {
          throw new Error("Unauthorized");
        }
        if (
          params.requesterRole === "patient" &&
          app.patient?.user_id !== params.requesterUserId
        ) {
          throw new Error("Unauthorized");
        }

        await neonDb
          .update(schema.appointments)
          .set({ status: params.newStatus })
          .where(eq(schema.appointments.appointment_id, params.appointmentId));

        if (params.newStatus === "cancelled" || params.newStatus === "rejected") {
          const slot = await db.getAvailabilityById(app.availability_id);
          if (slot) {
            if (slot.is_wave) {
              const nextBooked = Math.max(0, (slot.wave_booked_count || 1) - 1);
              await neonDb
                .update(schema.availability)
                .set({ wave_booked_count: nextBooked, is_available: true })
                .where(eq(schema.availability.availability_id, slot.availability_id));
            } else {
              await neonDb
                .update(schema.availability)
                .set({ is_available: true })
                .where(eq(schema.availability.availability_id, slot.availability_id));
            }
          }
        }

        return (await db.getAppointmentById(params.appointmentId))!;
      }
    }
    return localDb.updateAppointmentStatus(params);
  },

  getAppointmentsForPatient: async (
    patientId: number
  ): Promise<Appointment[]> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.appointments.findMany({
          where: eq(schema.appointments.patient_id, patientId),
          with: {
            doctor: { with: { user: true } },
            availability: true,
            payments: { with: { refunds: true } },
            refunds: true,
          },
          orderBy: [desc(schema.appointments.created_at)],
        });
        return rows as unknown as Appointment[];
      }
    }
    return localDb.getAppointmentsForPatient(patientId);
  },

  getAppointmentsForDoctor: async (
    doctorId: number
  ): Promise<Appointment[]> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.appointments.findMany({
          where: eq(schema.appointments.doctor_id, doctorId),
          with: {
            patient: { with: { user: true } },
            availability: true,
            payments: { with: { refunds: true } },
            refunds: true,
          },
          orderBy: [desc(schema.appointments.created_at)],
        });
        return rows as unknown as Appointment[];
      }
    }
    return localDb.getAppointmentsForDoctor(doctorId);
  },

  getAppointmentById: async (
    appointmentId: number
  ): Promise<Appointment | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.appointments.findMany({
          where: eq(schema.appointments.appointment_id, appointmentId),
          with: {
            doctor: { with: { user: true } },
            patient: { with: { user: true } },
            availability: true,
            payments: { with: { refunds: true } },
            refunds: true,
          },
          limit: 1,
        });
        return (rows[0] as unknown as Appointment) || null;
      }
    }
    return localDb.getAppointmentById(appointmentId) || null;
  },

  // =========================================================================
  // --- WAITING QUEUE (Walk-ins & Clinic Checked-in Patients) ---
  // =========================================================================
  addToWaitingQueue: async (params: {
    doctorId: number;
    patientId?: number | null;
    patientName: string;
    patientPhone: string;
    notes?: string;
  }): Promise<WaitingQueueEntry> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const result = await neonDb
          .insert(schema.waitingQueue)
          .values({
            doctor_id: params.doctorId,
            patient_id: params.patientId || null,
            patient_name: params.patientName.trim(),
            patient_phone: params.patientPhone.trim(),
            status: "waiting",
            check_in_time: new Date(),
            notes: params.notes?.trim() || null,
          })
          .returning();

        const created = result[0];
        const hydrated = await db.getWaitingQueueById(created.queue_id);
        return hydrated!;
      }
    }
    return localDb.addToWaitingQueue(params);
  },

  getWaitingQueue: async (
    doctorId?: number,
    status?: WaitingQueueStatus
  ): Promise<WaitingQueueEntry[]> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.waitingQueue.findMany({
          where: and(
            doctorId ? eq(schema.waitingQueue.doctor_id, doctorId) : undefined,
            status ? eq(schema.waitingQueue.status, status) : undefined
          ),
          with: {
            doctor: { with: { user: true } },
            patient: { with: { user: true } },
          },
          orderBy: [asc(schema.waitingQueue.check_in_time)],
        });

        return rows.map((r) => ({
          ...r,
          status: r.status as WaitingQueueStatus,
          check_in_time: r.check_in_time.toISOString(),
          created_at: r.created_at.toISOString(),
          doctor: r.doctor as unknown as Doctor,
          patient: r.patient as unknown as Patient,
        }));
      }
    }
    return localDb.getWaitingQueue(doctorId, status);
  },

  getWaitingQueueById: async (
    queueId: number
  ): Promise<WaitingQueueEntry | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.waitingQueue.findMany({
          where: eq(schema.waitingQueue.queue_id, queueId),
          with: {
            doctor: { with: { user: true } },
            patient: { with: { user: true } },
          },
          limit: 1,
        });

        if (rows.length === 0) return null;
        const r = rows[0];
        return {
          ...r,
          status: r.status as WaitingQueueStatus,
          check_in_time: r.check_in_time.toISOString(),
          created_at: r.created_at.toISOString(),
          doctor: r.doctor as unknown as Doctor,
          patient: r.patient as unknown as Patient,
        };
      }
    }
    return localDb.getWaitingQueueById(queueId) || null;
  },

  updateWaitingQueueStatus: async (
    queueId: number,
    status: WaitingQueueStatus
  ): Promise<WaitingQueueEntry> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        await neonDb
          .update(schema.waitingQueue)
          .set({ status })
          .where(eq(schema.waitingQueue.queue_id, queueId));
        return (await db.getWaitingQueueById(queueId))!;
      }
    }
    return localDb.updateWaitingQueueStatus(queueId, status);
  },

  // =========================================================================
  // --- IN-APP NOTIFICATIONS ---
  // =========================================================================
  createNotification: async (params: {
    userId: number;
    title: string;
    message: string;
    type: NotificationType;
    relatedOfferId?: number;
  }): Promise<InAppNotification> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const result = await neonDb
          .insert(schema.notifications)
          .values({
            user_id: params.userId,
            title: params.title,
            message: params.message,
            type: params.type,
            related_offer_id: params.relatedOfferId || null,
            is_read: false,
          })
          .returning();
        const r = result[0];
        return {
          ...r,
          type: r.type as NotificationType,
          created_at: r.created_at.toISOString(),
        };
      }
    }
    return localDb.createNotification(params);
  },

  getNotificationsForUser: async (
    userId: number
  ): Promise<InAppNotification[]> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.notifications.findMany({
          where: eq(schema.notifications.user_id, userId),
          with: {
            offer: {
              with: {
                doctor: { with: { user: true } },
                slot: true,
              },
            },
          },
          orderBy: [desc(schema.notifications.created_at)],
        });

        return rows.map((r) => ({
          ...r,
          type: r.type as NotificationType,
          created_at: r.created_at.toISOString(),
          offer: r.offer as unknown as EarlySlotOffer,
        }));
      }
    }
    return localDb.getNotificationsForUser(userId);
  },

  markNotificationRead: async (
    notificationId: number,
    userId: number
  ): Promise<boolean> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        await neonDb
          .update(schema.notifications)
          .set({ is_read: true })
          .where(
            and(
              eq(schema.notifications.notification_id, notificationId),
              eq(schema.notifications.user_id, userId)
            )
          );
        return true;
      }
    }
    return localDb.markNotificationRead(notificationId, userId);
  },

  // =========================================================================
  // --- EARLY SLOT OFFERS (Smart Waiting Queue & Fallbacks) ---
  // =========================================================================
  createEarlySlotOffer: async (params: {
    slotId: number;
    doctorId: number;
    patientId: number;
    queueId?: number | null;
    originalAppointmentId?: number | null;
    responseWindowMinutes?: number;
  }): Promise<EarlySlotOffer> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        // Prevent duplicate active offer for the same patient
        const existing = await neonDb
          .select()
          .from(schema.earlySlotOffers)
          .where(
            and(
              eq(schema.earlySlotOffers.patient_id, params.patientId),
              eq(schema.earlySlotOffers.status, "pending"),
              gt(schema.earlySlotOffers.expires_at, new Date())
            )
          );

        if (existing.length > 0) {
          throw new Error("Patient already has an active pending offer.");
        }

        const windowMinutes = params.responseWindowMinutes || 2; // Default 2 minutes
        const expiresAt = new Date(Date.now() + windowMinutes * 60 * 1000);

        const result = await neonDb
          .insert(schema.earlySlotOffers)
          .values({
            slot_id: params.slotId,
            doctor_id: params.doctorId,
            patient_id: params.patientId,
            queue_id: params.queueId || null,
            original_appointment_id: params.originalAppointmentId || null,
            status: "pending",
            expires_at: expiresAt,
          })
          .returning();

        const created = result[0];

        // Send in-app notification to patient
        const patient = await db.getPatientById(params.patientId);
        const doctor = await db.getDoctorById(params.doctorId);
        const slot = await db.getAvailabilityById(params.slotId);

        if (patient?.user_id) {
          await db.createNotification({
            userId: patient.user_id,
            title: "Earlier Appointment Slot Available!",
            message: `Dr. ${doctor?.user?.full_name || "Doctor"} completed an appointment early! An earlier slot is available on ${slot?.available_date} at ${slot?.start_time}. You have 2 minutes to respond.`,
            type: "early_offer",
            relatedOfferId: created.offer_id,
          });
        }

        return (await db.getOfferById(created.offer_id))!;
      }
    }
    return localDb.createEarlySlotOffer(params);
  },

  getActiveOfferForPatient: async (
    patientId: number
  ): Promise<EarlySlotOffer | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        // First: find and expire any pending offers that reached countdown expiry
        const expiredOffers = await neonDb
          .select()
          .from(schema.earlySlotOffers)
          .where(
            and(
              eq(schema.earlySlotOffers.patient_id, patientId),
              eq(schema.earlySlotOffers.status, "pending"),
              sql`${schema.earlySlotOffers.expires_at} <= NOW()`
            )
          );

        for (const exp of expiredOffers) {
          await neonDb
            .update(schema.earlySlotOffers)
            .set({ status: "expired" })
            .where(eq(schema.earlySlotOffers.offer_id, exp.offer_id));

          // Auto-fallback: offer slot to next eligible patient!
          await db.advanceOfferToNextEligiblePatient(exp.slot_id, exp.doctor_id);
        }

        // Return active pending offer if still within window
        const rows = await neonDb.query.earlySlotOffers.findMany({
          where: and(
            eq(schema.earlySlotOffers.patient_id, patientId),
            eq(schema.earlySlotOffers.status, "pending"),
            gt(schema.earlySlotOffers.expires_at, new Date())
          ),
          with: {
            slot: true,
            doctor: { with: { user: true } },
            patient: { with: { user: true } },
            originalAppointment: true,
          },
          orderBy: [desc(schema.earlySlotOffers.created_at)],
          limit: 1,
        });

        if (rows.length === 0) return null;
        const r = rows[0];
        return {
          ...r,
          status: r.status as EarlyOfferStatus,
          offered_at: r.offered_at.toISOString(),
          expires_at: r.expires_at.toISOString(),
          responded_at: r.responded_at ? r.responded_at.toISOString() : null,
          created_at: r.created_at.toISOString(),
          slot: r.slot as unknown as Availability,
          doctor: r.doctor as unknown as Doctor,
          patient: r.patient as unknown as Patient,
          original_appointment: r.originalAppointment as unknown as Appointment,
        };
      }
    }
    return localDb.getActiveOfferForPatient(patientId);
  },

  getOffersForDoctor: async (doctorId: number): Promise<EarlySlotOffer[]> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.earlySlotOffers.findMany({
          where: eq(schema.earlySlotOffers.doctor_id, doctorId),
          with: {
            slot: true,
            patient: { with: { user: true } },
            originalAppointment: true,
          },
          orderBy: [desc(schema.earlySlotOffers.created_at)],
        });

        return rows.map((r) => ({
          ...r,
          status: r.status as EarlyOfferStatus,
          offered_at: r.offered_at.toISOString(),
          expires_at: r.expires_at.toISOString(),
          responded_at: r.responded_at ? r.responded_at.toISOString() : null,
          created_at: r.created_at.toISOString(),
          slot: r.slot as unknown as Availability,
          patient: r.patient as unknown as Patient,
          original_appointment: r.originalAppointment as unknown as Appointment,
        }));
      }
    }
    return localDb.getOffersForDoctor(doctorId);
  },

  getAllOffers: async (): Promise<EarlySlotOffer[]> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.earlySlotOffers.findMany({
          with: {
            slot: true,
            doctor: { with: { user: true } },
            patient: { with: { user: true } },
            originalAppointment: true,
          },
          orderBy: [desc(schema.earlySlotOffers.created_at)],
        });

        return rows.map((r) => ({
          ...r,
          status: r.status as EarlyOfferStatus,
          offered_at: r.offered_at.toISOString(),
          expires_at: r.expires_at.toISOString(),
          responded_at: r.responded_at ? r.responded_at.toISOString() : null,
          created_at: r.created_at.toISOString(),
          slot: r.slot as unknown as Availability,
          doctor: r.doctor as unknown as Doctor,
          patient: r.patient as unknown as Patient,
          original_appointment: r.originalAppointment as unknown as Appointment,
        }));
      }
    }
    return localDb.getAllOffers();
  },

  getOfferById: async (offerId: number): Promise<EarlySlotOffer | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.earlySlotOffers.findMany({
          where: eq(schema.earlySlotOffers.offer_id, offerId),
          with: {
            slot: true,
            doctor: { with: { user: true } },
            patient: { with: { user: true } },
            originalAppointment: true,
          },
          limit: 1,
        });

        if (rows.length === 0) return null;
        const r = rows[0];
        return {
          ...r,
          status: r.status as EarlyOfferStatus,
          offered_at: r.offered_at.toISOString(),
          expires_at: r.expires_at.toISOString(),
          responded_at: r.responded_at ? r.responded_at.toISOString() : null,
          created_at: r.created_at.toISOString(),
          slot: r.slot as unknown as Availability,
          doctor: r.doctor as unknown as Doctor,
          patient: r.patient as unknown as Patient,
          original_appointment: r.originalAppointment as unknown as Appointment,
        };
      }
    }
    return localDb.getOfferById(offerId) || null;
  },

  /**
   * Atomic Conditional Acceptance of an Early Slot Offer
   * Uses SQL atomic update with row condition:
   * WHERE offer_id = $id AND status = 'pending' AND expires_at > NOW()
   * Eliminates race conditions and prevents double claim.
   */
  acceptEarlySlotOfferAtomic: async (
    offerId: number,
    patientUserId: number
  ): Promise<{ success: boolean; appointment: Appointment; offer: EarlySlotOffer }> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        // Atomic conditional claim
        const updated = await neonDb
          .update(schema.earlySlotOffers)
          .set({
            status: "accepted",
            responded_at: new Date(),
          })
          .where(
            and(
              eq(schema.earlySlotOffers.offer_id, offerId),
              eq(schema.earlySlotOffers.status, "pending"),
              gt(schema.earlySlotOffers.expires_at, new Date())
            )
          )
          .returning();

        if (updated.length === 0) {
          // Check if it was expired or already claimed
          const current = await db.getOfferById(offerId);
          if (!current) throw new Error("Offer not found.");
          if (current.status === "pending" && new Date(current.expires_at) <= new Date()) {
            await neonDb
              .update(schema.earlySlotOffers)
              .set({ status: "expired" })
              .where(eq(schema.earlySlotOffers.offer_id, offerId));
            await db.advanceOfferToNextEligiblePatient(current.slot_id, current.doctor_id);
            throw new Error("This offer has expired. The slot was offered to the next patient.");
          }
          throw new Error(`Offer is no longer available (current status: ${current.status}).`);
        }

        const offer = updated[0];

        // Patient authorization check
        const patient = await db.getPatientById(offer.patient_id);
        if (!patient || patient.user_id !== patientUserId) {
          throw new Error("Unauthorized to accept this offer.");
        }

        const newSlot = await db.getAvailabilityById(offer.slot_id);
        if (!newSlot) {
          throw new Error("Target availability slot does not exist.");
        }

        let finalAppointment: Appointment;

        if (offer.original_appointment_id) {
          // Scheduled patient reschedule: update appointment safely without double charge or duplicate
          const originalApp = await db.getAppointmentById(offer.original_appointment_id);
          if (!originalApp) throw new Error("Original appointment not found.");

          // Free old slot
          await neonDb
            .update(schema.availability)
            .set({ is_available: true })
            .where(eq(schema.availability.availability_id, originalApp.availability_id));

          // Claim new slot
          await neonDb
            .update(schema.availability)
            .set({ is_available: false })
            .where(eq(schema.availability.availability_id, offer.slot_id));

          const appointmentDate = new Date(`${newSlot.available_date}T${newSlot.start_time}:00Z`);

          // Update appointment in place
          await neonDb
            .update(schema.appointments)
            .set({
              availability_id: offer.slot_id,
              appointment_date: appointmentDate,
              status: "confirmed",
            })
            .where(eq(schema.appointments.appointment_id, offer.original_appointment_id));

          finalAppointment = (await db.getAppointmentById(offer.original_appointment_id))!;
        } else if (offer.queue_id) {
          // Walk-in queue patient
          await neonDb
            .update(schema.waitingQueue)
            .set({ status: "in_consultation" })
            .where(eq(schema.waitingQueue.queue_id, offer.queue_id));

          await neonDb
            .update(schema.availability)
            .set({ is_available: false })
            .where(eq(schema.availability.availability_id, offer.slot_id));

          const appointmentDate = new Date(`${newSlot.available_date}T${newSlot.start_time}:00Z`);

          const createdApp = await neonDb
            .insert(schema.appointments)
            .values({
              patient_id: offer.patient_id,
              doctor_id: offer.doctor_id,
              availability_id: offer.slot_id,
              appointment_date: appointmentDate,
              status: "confirmed",
              reason: "Early Waiting Queue Consultation",
            })
            .returning();

          finalAppointment = (await db.getAppointmentById(createdApp[0].appointment_id))!;
        } else {
          // General direct patient acceptance
          await neonDb
            .update(schema.availability)
            .set({ is_available: false })
            .where(eq(schema.availability.availability_id, offer.slot_id));

          const appointmentDate = new Date(`${newSlot.available_date}T${newSlot.start_time}:00Z`);

          const createdApp = await neonDb
            .insert(schema.appointments)
            .values({
              patient_id: offer.patient_id,
              doctor_id: offer.doctor_id,
              availability_id: offer.slot_id,
              appointment_date: appointmentDate,
              status: "confirmed",
              reason: "Early Slot Fast-Track Offer Accepted",
            })
            .returning();

          finalAppointment = (await db.getAppointmentById(createdApp[0].appointment_id))!;
        }

        // Send confirmation notification
        await db.createNotification({
          userId: patient.user_id,
          title: "Earlier Slot Confirmed!",
          message: `Your appointment has been successfully rescheduled to ${newSlot.available_date} at ${newSlot.start_time}.`,
          type: "offer_accepted",
          relatedOfferId: offer.offer_id,
        });

        const refreshedOffer = (await db.getOfferById(offer.offer_id))!;
        return {
          success: true,
          appointment: finalAppointment,
          offer: refreshedOffer,
        };
      }
    }
    return localDb.acceptEarlySlotOfferAtomic(offerId, patientUserId);
  },

  declineEarlySlotOffer: async (
    offerId: number,
    patientUserId: number
  ): Promise<{ success: boolean }> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const offer = await db.getOfferById(offerId);
        if (!offer) throw new Error("Offer not found.");

        const patient = await db.getPatientById(offer.patient_id);
        if (!patient || patient.user_id !== patientUserId) {
          throw new Error("Unauthorized to decline this offer.");
        }

        if (offer.status === "pending") {
          await neonDb
            .update(schema.earlySlotOffers)
            .set({
              status: "declined",
              responded_at: new Date(),
            })
            .where(eq(schema.earlySlotOffers.offer_id, offerId));

          // Automatically cascade offer to next eligible patient!
          await db.advanceOfferToNextEligiblePatient(offer.slot_id, offer.doctor_id);
        }

        return { success: true };
      }
    }
    return localDb.declineEarlySlotOffer(offerId, patientUserId);
  },

  findNextEligiblePatientForSlot: async (
    slotId: number,
    doctorId: number
  ): Promise<{
    patientId: number;
    queueId?: number | null;
    originalAppointmentId?: number | null;
  } | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const slot = await db.getAvailabilityById(slotId);
        if (!slot) return null;
        const slotDateTime = new Date(`${slot.available_date}T${slot.start_time}:00Z`);

        // 1. Priority: Patients waiting at clinic in waiting_queue
        const queueEntries = await neonDb.query.waitingQueue.findMany({
          where: and(
            eq(schema.waitingQueue.doctor_id, doctorId),
            eq(schema.waitingQueue.status, "waiting")
          ),
          orderBy: [asc(schema.waitingQueue.check_in_time)],
        });

        for (const q of queueEntries) {
          if (!q.patient_id) continue;
          // Check if this patient already received an offer for this slot
          const existing = await neonDb
            .select()
            .from(schema.earlySlotOffers)
            .where(
              and(
                eq(schema.earlySlotOffers.slot_id, slotId),
                eq(schema.earlySlotOffers.patient_id, q.patient_id)
              )
            );
          if (existing.length === 0) {
            return {
              patientId: q.patient_id,
              queueId: q.queue_id,
            };
          }
        }

        // 2. Priority: Next scheduled patient for that doctor
        const scheduled = await neonDb.query.appointments.findMany({
          where: and(
            eq(schema.appointments.doctor_id, doctorId),
            gt(schema.appointments.appointment_date, slotDateTime)
          ),
          orderBy: [asc(schema.appointments.appointment_date)],
        });

        for (const app of scheduled) {
          if (app.status !== "confirmed" && app.status !== "pending") continue;

          // Check if patient already received offer for this slot
          const slotOffer = await neonDb
            .select()
            .from(schema.earlySlotOffers)
            .where(
              and(
                eq(schema.earlySlotOffers.slot_id, slotId),
                eq(schema.earlySlotOffers.patient_id, app.patient_id)
              )
            );
          if (slotOffer.length > 0) continue;

          // Check if patient has any other active pending offer
          const activeOffer = await neonDb
            .select()
            .from(schema.earlySlotOffers)
            .where(
              and(
                eq(schema.earlySlotOffers.patient_id, app.patient_id),
                eq(schema.earlySlotOffers.status, "pending"),
                gt(schema.earlySlotOffers.expires_at, new Date())
              )
            );
          if (activeOffer.length > 0) continue;

          return {
            patientId: app.patient_id,
            originalAppointmentId: app.appointment_id,
          };
        }

        return null;
      }
    }
    return localDb.findNextEligiblePatientForSlot(slotId, doctorId);
  },

  advanceOfferToNextEligiblePatient: async (
    slotId: number,
    doctorId: number
  ): Promise<EarlySlotOffer | null> => {
    const candidate = await db.findNextEligiblePatientForSlot(slotId, doctorId);
    if (candidate) {
      return await db.createEarlySlotOffer({
        slotId,
        doctorId,
        patientId: candidate.patientId,
        queueId: candidate.queueId,
        originalAppointmentId: candidate.originalAppointmentId,
        responseWindowMinutes: 2,
      });
    } else {
      // No eligible candidates remain: restore slot for normal booking
      if (isNeonConfigured) {
        const neonDb = getNeonDb();
        if (neonDb) {
          await neonDb
            .update(schema.availability)
            .set({ is_available: true })
            .where(eq(schema.availability.availability_id, slotId));
        }
      } else {
        const slot = localDb.getAvailabilityById(slotId);
        if (slot) slot.is_available = true;
      }
      return null;
    }
  },

  completeConsultationAndCheckEarlyOffer: async (
    appointmentId: number,
    doctorUserId: number
  ): Promise<{
    appointment: Appointment;
    earlySlotOffered: boolean;
    offer?: EarlySlotOffer;
    message: string;
  }> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const app = await db.getAppointmentById(appointmentId);
        if (!app) throw new Error("Appointment not found");

        const doctor = await db.getDoctorById(app.doctor_id);
        if (!doctor || doctor.user_id !== doctorUserId) {
          throw new Error("Unauthorized: Only the attending doctor can complete this appointment.");
        }

        // Complete appointment
        await neonDb
          .update(schema.appointments)
          .set({ status: "completed" })
          .where(eq(schema.appointments.appointment_id, appointmentId));

        const appDateStr = (
          typeof app.appointment_date === "string"
            ? app.appointment_date
            : (app.appointment_date as any).toISOString()
        ).split("T")[0];

        // Detect available slots for this doctor on or after consultation date
        const availSlots = await neonDb
          .select()
          .from(schema.availability)
          .where(
            and(
              eq(schema.availability.doctor_id, doctor.doctor_id),
              eq(schema.availability.is_available, true),
              gte(schema.availability.available_date, appDateStr)
            )
          )
          .orderBy(
            asc(schema.availability.available_date),
            asc(schema.availability.start_time)
          );

        let createdOffer: EarlySlotOffer | null = null;
        if (availSlots.length > 0) {
          const targetSlot = availSlots[0];
          // Check if this slot already has an active pending offer
          const activeOffer = await neonDb
            .select()
            .from(schema.earlySlotOffers)
            .where(
              and(
                eq(schema.earlySlotOffers.slot_id, targetSlot.availability_id),
                eq(schema.earlySlotOffers.status, "pending"),
                gt(schema.earlySlotOffers.expires_at, new Date())
              )
            );

          if (activeOffer.length === 0) {
            createdOffer = await db.advanceOfferToNextEligiblePatient(
              targetSlot.availability_id,
              doctor.doctor_id
            );
          }
        }

        const updatedApp = (await db.getAppointmentById(appointmentId))!;
        return {
          appointment: updatedApp,
          earlySlotOffered: Boolean(createdOffer),
          offer: createdOffer || undefined,
          message: createdOffer
            ? "Consultation completed. An earlier slot was detected and offered to the next eligible patient!"
            : "Consultation marked as completed successfully.",
        };
      }
    }
    return localDb.completeConsultationAndCheckEarlyOffer(appointmentId, doctorUserId);
  },

  // =========================================================================
  // DAY 4: PAYMENTS, REFUNDS, WEBHOOK IDEMPOTENCY & DURABLE REMINDERS
  // =========================================================================

  // --- Payments ---
  createPayment: async (params: {
    appointmentId: number;
    patientId: number;
    provider: string;
    providerOrderId: string;
    amount: number;
    currency?: string;
    idempotencyKey?: string;
  }): Promise<Payment> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        if (params.idempotencyKey) {
          const existing = await neonDb
            .select()
            .from(schema.payments)
            .where(eq(schema.payments.idempotency_key, params.idempotencyKey))
            .limit(1);
          if (existing.length > 0) {
            return {
              ...existing[0],
              status: existing[0].status as PaymentStatus,
              created_at: existing[0].created_at.toISOString(),
              updated_at: existing[0].updated_at.toISOString(),
            };
          }
        }

        const inserted = await neonDb
          .insert(schema.payments)
          .values({
            appointment_id: params.appointmentId,
            patient_id: params.patientId,
            provider: params.provider || "razorpay",
            provider_order_id: params.providerOrderId,
            amount: params.amount,
            currency: params.currency || "INR",
            status: "pending",
            idempotency_key: params.idempotencyKey || null,
          })
          .returning();

        // Update appointment payment_status to pending if unpaid
        await neonDb
          .update(schema.appointments)
          .set({ payment_status: "pending" })
          .where(
            and(
              eq(schema.appointments.appointment_id, params.appointmentId),
              eq(schema.appointments.payment_status, "unpaid")
            )
          );

        const p = inserted[0];
        return {
          ...p,
          status: p.status as PaymentStatus,
          created_at: p.created_at.toISOString(),
          updated_at: p.updated_at.toISOString(),
        };
      }
    }
    return localDb.createPayment(params);
  },

  getPaymentById: async (paymentId: number): Promise<Payment | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.payments.findMany({
          where: eq(schema.payments.payment_id, paymentId),
          with: { refunds: true },
          limit: 1,
        });
        if (rows.length === 0) return null;
        const p = rows[0];
        return {
          ...p,
          status: p.status as PaymentStatus,
          created_at: p.created_at.toISOString(),
          updated_at: p.updated_at.toISOString(),
          refunds: (p.refunds || []).map((r: any) => ({
            ...r,
            status: r.status as RefundStatus,
            created_at: r.created_at.toISOString(),
            processed_at: r.processed_at ? r.processed_at.toISOString() : null,
          })),
        };
      }
    }
    return localDb.getPaymentById(paymentId);
  },

  getPaymentByOrderId: async (orderId: string): Promise<Payment | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.payments.findMany({
          where: eq(schema.payments.provider_order_id, orderId),
          with: { refunds: true },
          limit: 1,
        });
        if (rows.length === 0) return null;
        const p = rows[0];
        return {
          ...p,
          status: p.status as PaymentStatus,
          created_at: p.created_at.toISOString(),
          updated_at: p.updated_at.toISOString(),
          refunds: (p.refunds || []).map((r: any) => ({
            ...r,
            status: r.status as RefundStatus,
            created_at: r.created_at.toISOString(),
            processed_at: r.processed_at ? r.processed_at.toISOString() : null,
          })),
        };
      }
    }
    return localDb.getPaymentByOrderId(orderId);
  },

  getPaymentByProviderPaymentId: async (
    providerPaymentId: string
  ): Promise<Payment | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.payments.findMany({
          where: eq(schema.payments.provider_payment_id, providerPaymentId),
          with: { refunds: true },
          limit: 1,
        });
        if (rows.length === 0) return null;
        const p = rows[0];
        return {
          ...p,
          status: p.status as PaymentStatus,
          created_at: p.created_at.toISOString(),
          updated_at: p.updated_at.toISOString(),
          refunds: (p.refunds || []).map((r: any) => ({
            ...r,
            status: r.status as RefundStatus,
            created_at: r.created_at.toISOString(),
            processed_at: r.processed_at ? r.processed_at.toISOString() : null,
          })),
        };
      }
    }
    return localDb.getPaymentByProviderPaymentId(providerPaymentId);
  },

  getPaymentsForAppointment: async (appointmentId: number): Promise<Payment[]> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.payments.findMany({
          where: eq(schema.payments.appointment_id, appointmentId),
          with: { refunds: true },
          orderBy: [desc(schema.payments.created_at)],
        });
        return rows.map((p: any) => ({
          ...p,
          status: p.status as PaymentStatus,
          created_at: p.created_at.toISOString(),
          updated_at: p.updated_at.toISOString(),
          refunds: (p.refunds || []).map((r: any) => ({
            ...r,
            status: r.status as RefundStatus,
            created_at: r.created_at.toISOString(),
            processed_at: r.processed_at ? r.processed_at.toISOString() : null,
          })),
        }));
      }
    }
    return localDb.getPaymentsForAppointment(appointmentId);
  },

  getPaymentsForPatient: async (patientId: number): Promise<Payment[]> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb.query.payments.findMany({
          where: eq(schema.payments.patient_id, patientId),
          with: {
            appointment: {
              with: {
                doctor: { with: { user: true } },
                availability: true,
              },
            },
            refunds: true,
          },
          orderBy: [desc(schema.payments.created_at)],
        });
        return rows.map((p: any) => ({
          ...p,
          status: p.status as PaymentStatus,
          created_at: p.created_at.toISOString(),
          updated_at: p.updated_at.toISOString(),
          appointment: p.appointment as unknown as Appointment,
          refunds: (p.refunds || []).map((r: any) => ({
            ...r,
            status: r.status as RefundStatus,
            created_at: r.created_at.toISOString(),
            processed_at: r.processed_at ? r.processed_at.toISOString() : null,
          })),
        }));
      }
    }
    return localDb.getPaymentsForPatient(patientId);
  },

  updatePaymentStatus: async (params: {
    paymentId: number;
    status: PaymentStatus;
    providerPaymentId?: string;
    providerSignature?: string;
    failureReason?: string;
  }): Promise<Payment> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const updateValues: Record<string, any> = {
          status: params.status,
          updated_at: new Date(),
        };
        if (params.providerPaymentId) updateValues.provider_payment_id = params.providerPaymentId;
        if (params.providerSignature) updateValues.provider_signature = params.providerSignature;
        if (params.failureReason) updateValues.failure_reason = params.failureReason;

        const updated = await neonDb
          .update(schema.payments)
          .set(updateValues)
          .where(eq(schema.payments.payment_id, params.paymentId))
          .returning();

        if (updated.length === 0) throw new Error("Payment record not found");
        const p = updated[0];

        // Mirror to appointment payment_status & confirm appointment if captured
        if (params.status === "captured") {
          await neonDb
            .update(schema.appointments)
            .set({ payment_status: "paid", status: "confirmed" })
            .where(eq(schema.appointments.appointment_id, p.appointment_id));
        } else if (params.status === "failed") {
          await neonDb
            .update(schema.appointments)
            .set({ payment_status: "failed" })
            .where(eq(schema.appointments.appointment_id, p.appointment_id));
        } else if (params.status === "refunded") {
          await neonDb
            .update(schema.appointments)
            .set({ payment_status: "refunded" })
            .where(eq(schema.appointments.appointment_id, p.appointment_id));
        } else if (params.status === "partially_refunded") {
          await neonDb
            .update(schema.appointments)
            .set({ payment_status: "partially_refunded" })
            .where(eq(schema.appointments.appointment_id, p.appointment_id));
        } else if (params.status === "abandoned") {
          await neonDb
            .update(schema.appointments)
            .set({ payment_status: "unpaid" })
            .where(eq(schema.appointments.appointment_id, p.appointment_id));
        }

        return {
          ...p,
          status: p.status as PaymentStatus,
          created_at: p.created_at.toISOString(),
          updated_at: p.updated_at.toISOString(),
        };
      }
    }
    return localDb.updatePaymentStatus(params);
  },

  updateAppointmentPaymentStatus: async (
    appointmentId: number,
    paymentStatus: AppointmentPaymentStatus
  ): Promise<void> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        await neonDb
          .update(schema.appointments)
          .set({ payment_status: paymentStatus })
          .where(eq(schema.appointments.appointment_id, appointmentId));
        return;
      }
    }
    return localDb.updateAppointmentPaymentStatus(appointmentId, paymentStatus);
  },

  // --- Refunds ---
  createRefundRecord: async (params: {
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
  }): Promise<Refund> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        if (params.idempotencyKey) {
          const existing = await neonDb
            .select()
            .from(schema.refunds)
            .where(eq(schema.refunds.idempotency_key, params.idempotencyKey))
            .limit(1);
          if (existing.length > 0) {
            const r = existing[0];
            return {
              ...r,
              status: r.status as RefundStatus,
              created_at: r.created_at.toISOString(),
              processed_at: r.processed_at ? r.processed_at.toISOString() : null,
            };
          }
        }

        const payment = await db.getPaymentById(params.paymentId);
        if (!payment) throw new Error("Payment not found for refund creation");

        // Sum prior non-failed refunds
        const existingRefunds = await neonDb
          .select()
          .from(schema.refunds)
          .where(
            and(
              eq(schema.refunds.payment_id, params.paymentId),
              sql`${schema.refunds.status} != 'failed'`
            )
          );
        const existingTotal = existingRefunds.reduce((sum, r) => sum + r.amount, 0);

        if (existingTotal + params.amount > payment.amount) {
          throw new Error(
            `Refund amount (${params.amount}) exceeds captured payment ceiling (total: ${payment.amount}, already refunded: ${existingTotal}).`
          );
        }

        const inserted = await neonDb
          .insert(schema.refunds)
          .values({
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
            processed_at: params.status === "processed" ? new Date() : null,
          })
          .returning();

        const r = inserted[0];

        // Update payment and appointment status if processed
        if (params.status === "processed") {
          const totalRefunded = existingTotal + params.amount;
          const newStatus =
            totalRefunded >= payment.amount ? "refunded" : "partially_refunded";
          await neonDb
            .update(schema.payments)
            .set({ status: newStatus, updated_at: new Date() })
            .where(eq(schema.payments.payment_id, params.paymentId));
          await neonDb
            .update(schema.appointments)
            .set({ payment_status: newStatus })
            .where(eq(schema.appointments.appointment_id, params.appointmentId));
        }

        return {
          ...r,
          status: r.status as RefundStatus,
          created_at: r.created_at.toISOString(),
          processed_at: r.processed_at ? r.processed_at.toISOString() : null,
        };
      }
    }
    return localDb.createRefundRecord(params);
  },

  getRefundsForPayment: async (paymentId: number): Promise<Refund[]> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb
          .select()
          .from(schema.refunds)
          .where(eq(schema.refunds.payment_id, paymentId))
          .orderBy(desc(schema.refunds.created_at));
        return rows.map((r) => ({
          ...r,
          status: r.status as RefundStatus,
          created_at: r.created_at.toISOString(),
          processed_at: r.processed_at ? r.processed_at.toISOString() : null,
        }));
      }
    }
    return localDb.getRefundsForPayment(paymentId);
  },

  getRefundsForAppointment: async (appointmentId: number): Promise<Refund[]> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb
          .select()
          .from(schema.refunds)
          .where(eq(schema.refunds.appointment_id, appointmentId))
          .orderBy(desc(schema.refunds.created_at));
        return rows.map((r) => ({
          ...r,
          status: r.status as RefundStatus,
          created_at: r.created_at.toISOString(),
          processed_at: r.processed_at ? r.processed_at.toISOString() : null,
        }));
      }
    }
    return localDb.getRefundsForAppointment(appointmentId);
  },

  updateRefundStatus: async (params: {
    refundId: number;
    status: RefundStatus;
    providerRefundId?: string;
    errorMessage?: string;
  }): Promise<Refund> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const updateValues: Record<string, any> = {
          status: params.status,
        };
        if (params.providerRefundId) updateValues.provider_refund_id = params.providerRefundId;
        if (params.errorMessage) updateValues.error_message = params.errorMessage;
        if (params.status === "processed") updateValues.processed_at = new Date();

        const updated = await neonDb
          .update(schema.refunds)
          .set(updateValues)
          .where(eq(schema.refunds.refund_id, params.refundId))
          .returning();

        if (updated.length === 0) throw new Error("Refund record not found");
        const r = updated[0];

        if (params.status === "processed") {
          const payment = await db.getPaymentById(r.payment_id);
          if (payment) {
            const allProcessed = await neonDb
              .select()
              .from(schema.refunds)
              .where(
                and(
                  eq(schema.refunds.payment_id, r.payment_id),
                  eq(schema.refunds.status, "processed")
                )
              );
            const totalRefunded = allProcessed.reduce((sum, ref) => sum + ref.amount, 0);
            const newStatus =
              totalRefunded >= payment.amount ? "refunded" : "partially_refunded";
            await neonDb
              .update(schema.payments)
              .set({ status: newStatus, updated_at: new Date() })
              .where(eq(schema.payments.payment_id, r.payment_id));
            await neonDb
              .update(schema.appointments)
              .set({ payment_status: newStatus })
              .where(eq(schema.appointments.appointment_id, r.appointment_id));
          }
        }

        return {
          ...r,
          status: r.status as RefundStatus,
          created_at: r.created_at.toISOString(),
          processed_at: r.processed_at ? r.processed_at.toISOString() : null,
        };
      }
    }
    return localDb.updateRefundStatus(params);
  },

  // --- Webhook Events (Idempotency) ---
  recordWebhookEvent: async (params: {
    provider: string;
    providerEventId: string;
    eventType: string;
    payload: string;
    status?: "processing" | "processed" | "failed";
    errorMessage?: string;
  }): Promise<WebhookEvent> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const existing = await neonDb
          .select()
          .from(schema.webhookEvents)
          .where(
            and(
              eq(schema.webhookEvents.provider, params.provider),
              eq(schema.webhookEvents.provider_event_id, params.providerEventId)
            )
          )
          .limit(1);
        if (existing.length > 0) {
          const e = existing[0];
          return {
            ...e,
            status: e.status as "processing" | "processed" | "failed",
            created_at: e.created_at.toISOString(),
          };
        }

        const inserted = await neonDb
          .insert(schema.webhookEvents)
          .values({
            provider: params.provider,
            provider_event_id: params.providerEventId,
            event_type: params.eventType,
            payload: params.payload,
            status: params.status || "processed",
            error_message: params.errorMessage || null,
          })
          .returning();

        const e = inserted[0];
        return {
          ...e,
          status: e.status as "processing" | "processed" | "failed",
          created_at: e.created_at.toISOString(),
        };
      }
    }
    return localDb.recordWebhookEvent(params);
  },

  getWebhookEvent: async (
    provider: string,
    providerEventId: string
  ): Promise<WebhookEvent | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb
          .select()
          .from(schema.webhookEvents)
          .where(
            and(
              eq(schema.webhookEvents.provider, provider),
              eq(schema.webhookEvents.provider_event_id, providerEventId)
            )
          )
          .limit(1);
        if (rows.length === 0) return null;
        const e = rows[0];
        return {
          ...e,
          status: e.status as "processing" | "processed" | "failed",
          created_at: e.created_at.toISOString(),
        };
      }
    }
    return localDb.getWebhookEvent(provider, providerEventId);
  },

  // --- Notification Logs ---
  createNotificationLog: async (params: {
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
  }): Promise<NotificationLog> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        if (params.idempotencyKey) {
          const existing = await neonDb
            .select()
            .from(schema.notificationLogs)
            .where(eq(schema.notificationLogs.idempotency_key, params.idempotencyKey))
            .limit(1);
          if (existing.length > 0) {
            const l = existing[0];
            return {
              ...l,
              channel: l.channel as "email" | "sms" | "whatsapp",
              status: l.status as any,
              created_at: l.created_at.toISOString(),
            };
          }
        }

        const inserted = await neonDb
          .insert(schema.notificationLogs)
          .values({
            user_id: params.userId,
            recipient_email: params.recipientEmail,
            channel: params.channel || "email",
            event_type: params.eventType,
            subject: params.subject,
            appointment_id: params.appointmentId || null,
            status: params.status || "delivered",
            provider: params.provider || "console",
            provider_message_id: params.providerMessageId || null,
            idempotency_key: params.idempotencyKey || null,
            error_message: params.errorMessage || null,
          })
          .returning();

        const l = inserted[0];
        return {
          ...l,
          channel: l.channel as "email" | "sms" | "whatsapp",
          status: l.status as any,
          created_at: l.created_at.toISOString(),
        };
      }
    }
    return localDb.createNotificationLog(params);
  },

  getNotificationLogsForAppointment: async (
    appointmentId: number
  ): Promise<NotificationLog[]> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb
          .select()
          .from(schema.notificationLogs)
          .where(eq(schema.notificationLogs.appointment_id, appointmentId))
          .orderBy(schema.notificationLogs.created_at);
        return rows.map((l) => ({
          ...l,
          channel: l.channel as "email" | "sms" | "whatsapp",
          status: l.status as any,
          created_at: l.created_at.toISOString(),
        }));
      }
    }
    return localDb.getNotificationLogsForAppointment(appointmentId);
  },

  getNotificationLogByIdempotency: async (
    idempotencyKey: string
  ): Promise<NotificationLog | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb
          .select()
          .from(schema.notificationLogs)
          .where(eq(schema.notificationLogs.idempotency_key, idempotencyKey))
          .limit(1);
        if (rows.length === 0) return null;
        const l = rows[0];
        return {
          ...l,
          channel: l.channel as "email" | "sms" | "whatsapp",
          status: l.status as any,
          created_at: l.created_at.toISOString(),
        };
      }
    }
    return localDb.getNotificationLogByIdempotency(idempotencyKey);
  },

  getNotificationLogByMessageId: async (
    providerMessageId: string
  ): Promise<NotificationLog | null> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb
          .select()
          .from(schema.notificationLogs)
          .where(eq(schema.notificationLogs.provider_message_id, providerMessageId))
          .limit(1);
        if (rows.length === 0) return null;
        const l = rows[0];
        return {
          ...l,
          channel: l.channel as "email" | "sms" | "whatsapp",
          status: l.status as any,
          created_at: l.created_at.toISOString(),
        };
      }
    }
    return localDb.getNotificationLogByMessageId(providerMessageId);
  },

  updateNotificationLogStatus: async (
    providerMessageId: string,
    status: "sent" | "delivered" | "failed",
    errorMessage?: string
  ): Promise<void> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        await neonDb
          .update(schema.notificationLogs)
          .set({
            status,
            error_message: errorMessage || null,
          })
          .where(eq(schema.notificationLogs.provider_message_id, providerMessageId));
        return;
      }
    }
    return localDb.updateNotificationLogStatus(
      providerMessageId,
      status,
      errorMessage
    );
  },

  createInAppNotification: async (params: {
    userId: number;
    title: string;
    message: string;
    category?: InAppNotificationCategory;
    appointmentId?: number | null;
    actionUrl?: string | null;
    idempotencyKey?: string | null;
    type?: NotificationType;
    relatedOfferId?: number | null;
  }): Promise<InAppNotification> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        if (params.idempotencyKey) {
          const existing = await neonDb
            .select()
            .from(schema.inAppNotifications)
            .where(eq(schema.inAppNotifications.idempotency_key, params.idempotencyKey))
            .limit(1);
          if (existing.length > 0) {
            const e = existing[0];
            return {
              notification_id: e.notification_id,
              user_id: e.user_id,
              title: e.title,
              message: e.message,
              category: e.category as InAppNotificationCategory,
              appointment_id: e.appointment_id,
              action_url: e.action_url,
              is_read: e.is_read,
              read_at: e.read_at?.toISOString() || null,
              idempotency_key: e.idempotency_key,
              created_at: e.created_at.toISOString(),
            };
          }
        }

        const inserted = await neonDb
          .insert(schema.inAppNotifications)
          .values({
            user_id: params.userId,
            title: params.title,
            message: params.message,
            category: params.category || "general",
            appointment_id: params.appointmentId || null,
            action_url: params.actionUrl || null,
            is_read: false,
            idempotency_key: params.idempotencyKey || null,
          })
          .returning();
        const n = inserted[0];

        // Also keep legacy notifications table populated if relatedOfferId is set (for backwards compat)
        if (params.relatedOfferId) {
          await neonDb
            .insert(schema.notifications)
            .values({
              user_id: params.userId,
              title: params.title,
              message: params.message,
              type: params.type || "early_offer",
              related_offer_id: params.relatedOfferId,
              is_read: false,
            })
            .catch(() => {});
        }

        return {
          notification_id: n.notification_id,
          user_id: n.user_id,
          title: n.title,
          message: n.message,
          category: n.category as InAppNotificationCategory,
          appointment_id: n.appointment_id,
          action_url: n.action_url,
          is_read: n.is_read,
          read_at: n.read_at?.toISOString() || null,
          idempotency_key: n.idempotency_key,
          created_at: n.created_at.toISOString(),
        };
      }
    }
    return localDb.createInAppNotification(params);
  },

  getInAppNotificationsForUser: async (
    userId: number,
    optionsOrLimit?: number | { unreadOnly?: boolean; limit?: number }
  ): Promise<InAppNotification[]> => {
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

    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const conditions = [eq(schema.inAppNotifications.user_id, userId)];
        if (unreadOnly) {
          conditions.push(eq(schema.inAppNotifications.is_read, false));
        }

        const rows = await neonDb
          .select()
          .from(schema.inAppNotifications)
          .where(and(...conditions))
          .orderBy(desc(schema.inAppNotifications.created_at))
          .limit(resolvedLimit);

        return rows.map((r) => ({
          notification_id: r.notification_id,
          user_id: r.user_id,
          title: r.title,
          message: r.message,
          category: r.category as InAppNotificationCategory,
          appointment_id: r.appointment_id,
          action_url: r.action_url,
          is_read: r.is_read,
          read_at: r.read_at?.toISOString() || null,
          idempotency_key: r.idempotency_key,
          created_at: r.created_at.toISOString(),
        }));
      }
    }
    return localDb.getInAppNotificationsForUser(userId, optionsOrLimit);
  },

  getUnreadInAppNotificationCount: async (userId: number): Promise<number> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb
          .select({ id: schema.inAppNotifications.notification_id })
          .from(schema.inAppNotifications)
          .where(
            and(
              eq(schema.inAppNotifications.user_id, userId),
              eq(schema.inAppNotifications.is_read, false)
            )
          );
        return rows.length;
      }
    }
    return localDb.getUnreadInAppNotificationCount(userId);
  },

  markInAppNotificationRead: async (
    notificationId: number,
    userId: number
  ): Promise<boolean> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const res = await neonDb
          .update(schema.inAppNotifications)
          .set({ is_read: true, read_at: new Date() })
          .where(
            and(
              eq(schema.inAppNotifications.notification_id, notificationId),
              eq(schema.inAppNotifications.user_id, userId)
            )
          )
          .returning();
        return res.length > 0;
      }
    }
    return localDb.markInAppNotificationRead(notificationId, userId);
  },

  markAllInAppNotificationsRead: async (userId: number): Promise<number> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const res = await neonDb
          .update(schema.inAppNotifications)
          .set({ is_read: true, read_at: new Date() })
          .where(
            and(
              eq(schema.inAppNotifications.user_id, userId),
              eq(schema.inAppNotifications.is_read, false)
            )
          )
          .returning();
        return res.length;
      }
    }
    return localDb.markAllInAppNotificationsRead(userId);
  },

  // --- Scheduled Reminders ---
  upsertScheduledReminder: async (params: {
    appointmentId: number;
    reminderType: string;
    scheduledFor: Date | string;
  }): Promise<ScheduledReminder> => {
    const scheduledDate =
      params.scheduledFor instanceof Date
        ? params.scheduledFor
        : new Date(params.scheduledFor);

    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const existing = await neonDb
          .select()
          .from(schema.scheduledReminders)
          .where(
            and(
              eq(schema.scheduledReminders.appointment_id, params.appointmentId),
              eq(schema.scheduledReminders.reminder_type, params.reminderType)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          const updated = await neonDb
            .update(schema.scheduledReminders)
            .set({
              scheduled_for: scheduledDate,
              status: "scheduled",
              updated_at: new Date(),
            })
            .where(
              eq(schema.scheduledReminders.reminder_id, existing[0].reminder_id)
            )
            .returning();
          const r = updated[0];
          return {
            ...r,
            status: r.status as any,
            scheduled_for: r.scheduled_for.toISOString(),
            sent_at: r.sent_at ? r.sent_at.toISOString() : null,
            created_at: r.created_at.toISOString(),
            updated_at: r.updated_at.toISOString(),
          };
        }

        const inserted = await neonDb
          .insert(schema.scheduledReminders)
          .values({
            appointment_id: params.appointmentId,
            reminder_type: params.reminderType,
            scheduled_for: scheduledDate,
            status: "scheduled",
          })
          .returning();

        const r = inserted[0];
        return {
          ...r,
          status: r.status as any,
          scheduled_for: r.scheduled_for.toISOString(),
          sent_at: r.sent_at ? r.sent_at.toISOString() : null,
          created_at: r.created_at.toISOString(),
          updated_at: r.updated_at.toISOString(),
        };
      }
    }
    return localDb.upsertScheduledReminder(params);
  },

  cancelRemindersForAppointment: async (appointmentId: number): Promise<void> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        await neonDb
          .update(schema.scheduledReminders)
          .set({ status: "cancelled", updated_at: new Date() })
          .where(
            and(
              eq(schema.scheduledReminders.appointment_id, appointmentId),
              eq(schema.scheduledReminders.status, "scheduled")
            )
          );
        return;
      }
    }
    return localDb.cancelRemindersForAppointment(appointmentId);
  },

  getDueScheduledReminders: async (limit?: number): Promise<ScheduledReminder[]> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        let query = neonDb
          .select()
          .from(schema.scheduledReminders)
          .where(
            and(
              or(
                eq(schema.scheduledReminders.status, "scheduled"),
                and(
                  eq(schema.scheduledReminders.status, "processing"),
                  sql`${schema.scheduledReminders.updated_at} < NOW() - INTERVAL '5 minutes'`
                )
              ),
              sql`${schema.scheduledReminders.scheduled_for} <= NOW()`
            )
          )
          .orderBy(schema.scheduledReminders.scheduled_for);

        const rows = typeof limit === "number" ? await query.limit(limit) : await query;
        return rows.map((r) => ({
          ...r,
          status: r.status as any,
          scheduled_for: r.scheduled_for.toISOString(),
          sent_at: r.sent_at ? r.sent_at.toISOString() : null,
          created_at: r.created_at.toISOString(),
          updated_at: r.updated_at.toISOString(),
        }));
      }
    }
    return localDb.getDueScheduledReminders(limit);
  },

  claimScheduledReminder: async (reminderId: number): Promise<boolean> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb
          .update(schema.scheduledReminders)
          .set({
            status: "processing",
            updated_at: new Date(),
          })
          .where(
            and(
              eq(schema.scheduledReminders.reminder_id, reminderId),
              or(
                eq(schema.scheduledReminders.status, "scheduled"),
                and(
                  eq(schema.scheduledReminders.status, "processing"),
                  sql`${schema.scheduledReminders.updated_at} < NOW() - INTERVAL '5 minutes'`
                )
              )
            )
          )
          .returning({ reminder_id: schema.scheduledReminders.reminder_id });
        return rows.length > 0;
      }
    }
    return localDb.claimScheduledReminder(reminderId);
  },

  countDueScheduledReminders: async (): Promise<number> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const rows = await neonDb
          .select({ count: sql<number>`count(*)` })
          .from(schema.scheduledReminders)
          .where(
            and(
              eq(schema.scheduledReminders.status, "scheduled"),
              sql`${schema.scheduledReminders.scheduled_for} <= NOW()`
            )
          );
        return Number(rows[0]?.count || 0);
      }
    }
    return localDb.countDueScheduledReminders();
  },

  updateReminderStatus: async (
    reminderId: number,
    status: "scheduled" | "processing" | "sent" | "cancelled" | "failed",
    errorMessage?: string
  ): Promise<void> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        await neonDb
          .update(schema.scheduledReminders)
          .set({
            status,
            sent_at: status === "sent" ? new Date() : null,
            error_message: errorMessage || null,
            updated_at: new Date(),
          })
          .where(eq(schema.scheduledReminders.reminder_id, reminderId));
        return;
      }
    }
    return localDb.updateReminderStatus(reminderId, status, errorMessage);
  },

  // --- Patient Notification Preferences ---
  getNotificationPreferences: async (
    userId: number
  ): Promise<PatientNotificationPreferences> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        try {
          const rows = await neonDb
            .select()
            .from(schema.notificationPreferences)
            .where(eq(schema.notificationPreferences.user_id, userId))
            .limit(1);

          if (rows.length > 0) {
            const r = rows[0];
            return {
              ...r,
              consent_timestamp: r.consent_timestamp ? r.consent_timestamp.toISOString() : null,
              created_at: r.created_at.toISOString(),
              updated_at: r.updated_at.toISOString(),
            };
          }

          // Insert defaults
          const inserted = await neonDb
            .insert(schema.notificationPreferences)
            .values({
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
            })
            .returning();

          if (inserted.length > 0) {
            const r = inserted[0];
            return {
              ...r,
              consent_timestamp: r.consent_timestamp ? r.consent_timestamp.toISOString() : null,
              created_at: r.created_at.toISOString(),
              updated_at: r.updated_at.toISOString(),
            };
          }
        } catch (err) {
          console.error("Neon getNotificationPreferences failed, falling back to localDb:", err);
        }
      }
    }
    return localDb.getNotificationPreferences(userId);
  },

  updateNotificationPreferences: async (
    userId: number,
    updates: Partial<Omit<PatientNotificationPreferences, "preference_id" | "user_id" | "created_at">>
  ): Promise<PatientNotificationPreferences> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        try {
          const existing = await db.getNotificationPreferences(userId);
          const setValues: any = {
            ...updates,
            updated_at: new Date(),
          };
          if (updates.consent_timestamp !== undefined) {
            setValues.consent_timestamp = updates.consent_timestamp
              ? new Date(updates.consent_timestamp)
              : null;
          }

          const updated = await neonDb
            .update(schema.notificationPreferences)
            .set(setValues)
            .where(eq(schema.notificationPreferences.user_id, userId))
            .returning();

          if (updated.length > 0) {
            const r = updated[0];
            return {
              ...r,
              consent_timestamp: r.consent_timestamp ? r.consent_timestamp.toISOString() : null,
              created_at: r.created_at.toISOString(),
              updated_at: r.updated_at.toISOString(),
            };
          }
        } catch (err) {
          console.error("Neon updateNotificationPreferences failed, falling back to localDb:", err);
        }
      }
    }
    return localDb.updateNotificationPreferences(userId, updates);
  },

  unsubscribeAll: async (
    userId: number
  ): Promise<PatientNotificationPreferences> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        try {
          const pref = await db.updateNotificationPreferences(userId, {
            unsubscribed_all: true,
            email_enabled: false,
            sms_enabled: false,
            whatsapp_enabled: false,
          });

          // Cancel scheduled reminders for patient
          const patient = await db.getPatientByUserId(userId);
          if (patient) {
            const appts = await db.getAppointmentsForPatient(patient.patient_id);
            for (const a of appts) {
              await db.cancelRemindersForAppointment(a.appointment_id);
            }
          }
          return pref;
        } catch (err) {
          console.error("Neon unsubscribeAll failed, falling back to localDb:", err);
        }
      }
    }
    return localDb.unsubscribeAll(userId);
  },

  unsubscribeChannelByPhone: async (
    phone: string,
    channel: "sms" | "whatsapp"
  ): Promise<{ success: boolean; userId?: number }> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        try {
          const cleanTarget = phone.replace(/\D/g, "");
          const allUsers = await neonDb.select().from(schema.users);
          const user = allUsers.find((u) => {
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
            await db.updateNotificationPreferences(user.user_id, { sms_enabled: false });
          } else if (channel === "whatsapp") {
            await db.updateNotificationPreferences(user.user_id, { whatsapp_enabled: false });
          }
          return { success: true, userId: user.user_id };
        } catch (err) {
          console.error("Neon unsubscribeChannelByPhone failed, falling back to localDb:", err);
        }
      }
    }
    return localDb.unsubscribeChannelByPhone(phone, channel);
  },

  resubscribeChannelByPhone: async (
    phone: string,
    channel: "sms" | "whatsapp"
  ): Promise<{ success: boolean; userId?: number }> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        try {
          const cleanTarget = phone.replace(/\D/g, "");
          const allUsers = await neonDb.select().from(schema.users);
          const user = allUsers.find((u) => {
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
            await db.updateNotificationPreferences(user.user_id, {
              sms_enabled: true,
              sms_consent: true,
              consent_timestamp: new Date().toISOString(),
              unsubscribed_all: false,
            });
          } else if (channel === "whatsapp") {
            await db.updateNotificationPreferences(user.user_id, {
              whatsapp_enabled: true,
              whatsapp_consent: true,
              consent_timestamp: new Date().toISOString(),
              unsubscribed_all: false,
            });
          }
          return { success: true, userId: user.user_id };
        } catch (err) {
          console.error("Neon resubscribeChannelByPhone failed, falling back to localDb:", err);
        }
      }
    }
    return localDb.resubscribeChannelByPhone(phone, channel);
  },
};
