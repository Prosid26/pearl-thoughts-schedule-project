import http from "http";
import { SignJWT } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET ||
    "medrella_super_secure_healthcare_jwt_session_secret_2026_key"
);

async function generateTestToken(user: {
  user_id: number;
  email: string;
  full_name: string;
  role: "patient" | "doctor" | "admin";
  patient_id?: number | null;
  doctor_id?: number | null;
}) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

function fetchRoute(url: string, cookie?: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: cookie ? { Cookie: `medrella_session=${cookie}` } : {},
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode || 0, text: data }));
    });

    req.on("error", reject);
    req.end();
  });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

async function verify() {
  console.log("================================================================================");
  console.log("MEDRELLA LIVE PRODUCTION SERVER E2E VERIFICATION (PORT 3005)");
  console.log("================================================================================\n");

  // 1. Home page
  console.log("1. Public Homepage (SSR)");
  const home = await fetchRoute("http://localhost:3005/");
  assert(home.status === 200, "Home page returned 200 OK");
  assert(!home.text.includes("Unexpected Clinical Exception"), "Home page has no error boundary");

  // 2. Patient Token
  const patientToken = await generateTestToken({
    user_id: 1,
    email: "patient@demo.com",
    full_name: "Aarav Sharma",
    role: "patient",
    patient_id: 1,
  });

  // 3. Patient Dashboard
  console.log("\n2. Patient Dashboard (SSR with Neon / Local Store)");
  const patientDash = await fetchRoute("http://localhost:3005/patient/dashboard", patientToken);
  assert(patientDash.status === 200, "Patient dashboard returned 200 OK");
  assert(
    !patientDash.text.includes("Unexpected Clinical Exception"),
    "Patient dashboard DOES NOT trigger 'Unexpected Clinical Exception'"
  );
  assert(
    !patientDash.text.includes("Minified React error #441"),
    "Patient dashboard DOES NOT throw 'Minified React error #441'"
  );
  assert(
    patientDash.text.includes("Notification Preferences"),
    "Patient dashboard successfully rendered Notification Preferences section"
  );
  assert(
    patientDash.text.includes("Aarav Sharma") && patientDash.text.includes("Welcome"),
    "Patient dashboard personalized header rendered correctly"
  );

  // 4. Patient Profile
  console.log("\n3. Patient Profile (SSR with Neon / Local Store)");
  const patientProfile = await fetchRoute("http://localhost:3005/patient/profile", patientToken);
  assert(patientProfile.status === 200, "Patient profile returned 200 OK");
  assert(
    !patientProfile.text.includes("Unexpected Clinical Exception"),
    "Patient profile DOES NOT trigger 'Unexpected Clinical Exception'"
  );
  assert(
    patientProfile.text.includes("Notification Preferences"),
    "Patient profile successfully rendered Notification Preferences section"
  );

  // 5. Doctor Token & Dashboard
  console.log("\n4. Doctor Dashboard (SSR)");
  const doctorToken = await generateTestToken({
    user_id: 3,
    email: "doctor.ananya@demo.com",
    full_name: "Dr. Ananya Sharma",
    role: "doctor",
    doctor_id: 1,
  });
  const doctorDash = await fetchRoute("http://localhost:3005/doctor/dashboard", doctorToken);
  assert(doctorDash.status === 200, "Doctor dashboard returned 200 OK");
  assert(!doctorDash.text.includes("Unexpected Clinical Exception"), "Doctor dashboard has no error boundary");

  console.log("\n================================================================================");
  console.log("PRODUCTION SERVER E2E: ALL SSR CHECKS PASSED WITH ZERO ERRORS (100%)");
  console.log("================================================================================\n");
}

verify().catch((err) => {
  console.error("E2E verification failed:", err);
  process.exit(1);
});
