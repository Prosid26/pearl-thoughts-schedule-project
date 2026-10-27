import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { SessionUser } from "@/types/database";

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET ||
    "medrella_super_secure_healthcare_jwt_session_secret_2026_key"
);

const COOKIE_NAME = "medrella_session";
const EXPIRATION_TIME = "7d"; // 7 days

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRATION_TIME)
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      user_id: payload.user_id as number,
      email: payload.email as string,
      full_name: payload.full_name as string,
      role: payload.role as SessionUser["role"],
      patient_id: (payload.patient_id as number) ?? null,
      doctor_id: (payload.doctor_id as number) ?? null,
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: Please sign in to continue.");
  }
  return session;
}

export async function requirePatient(): Promise<
  SessionUser & { patient_id: number }
> {
  const user = await requireUser();
  if (user.role !== "patient" || !user.patient_id) {
    throw new Error("Access Denied: Patient privileges required.");
  }
  return user as SessionUser & { patient_id: number };
}

export async function requireDoctor(): Promise<
  SessionUser & { doctor_id: number }
> {
  const user = await requireUser();
  if (user.role !== "doctor" || !user.doctor_id) {
    throw new Error("Access Denied: Doctor privileges required.");
  }
  return user as SessionUser & { doctor_id: number };
}
