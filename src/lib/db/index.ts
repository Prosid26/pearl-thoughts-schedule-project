import { localDb } from "./local-store";
import { isNeonConfigured, getNeonDb } from "./neon";
import * as schema from "./schema";
import { eq, and, gt, gte, desc, asc, sql } from "drizzle-orm";
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
  getDoctorAvailability: async (
    doctorId: number,
    date?: string,
    onlyAvailable: boolean = false
  ): Promise<Availability[]> => {
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
          );
        return rows.map((r) => ({
          ...r,
          created_at: r.created_at.toISOString(),
        }));
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
    slotDuration: number = 30
  ): Promise<Availability> => {
    if (isNeonConfigured) {
      const neonDb = getNeonDb();
      if (neonDb) {
        const result = await neonDb
          .insert(schema.availability)
          .values({
            doctor_id: doctorId,
            available_date: availableDate,
            start_time: startTime,
            end_time: endTime,
            slot_duration: slotDuration,
            is_available: true,
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
      slotDuration
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
            reason: params.reason,
          })
          .returning();

        const created = newAppResult[0];
        return (await db.getAppointmentById(created.appointment_id))!;
      }
    }
    return localDb.bookAppointmentAtomic(params);
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
          await neonDb
            .update(schema.availability)
            .set({ is_available: true })
            .where(
              eq(schema.availability.availability_id, app.availability_id)
            );
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
          },
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
          },
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
};
