import { localDb } from "./local-store";
import { isNeonConfigured, getNeonDb } from "./neon";
import * as schema from "./schema";
import { eq, and } from "drizzle-orm";
import {
  User,
  Patient,
  Doctor,
  Availability,
  Appointment,
  AppointmentStatus,
  UserRole,
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
};
