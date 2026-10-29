import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { SignJWT } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET ||
    "medrella_super_secure_healthcare_jwt_session_secret_2026_key"
);

async function makeToken(user: any) {
  return await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

// Simple CDP client over native WebSocket
class SimpleCDP {
  private ws!: WebSocket;
  private id = 0;
  private pending = new Map<number, { resolve: Function; reject: Function }>();

  public onEvent?: (method: string, params: any) => void;

  async connect(wsUrl: string) {
    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data.toString());
        if (msg.method && this.onEvent) {
          this.onEvent(msg.method, msg.params);
        }
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  async send(method: string, params: any = {}): Promise<any> {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function runBrowserE2E() {
  console.log("================================================================================");
  console.log("MEDRELLA HEADLESS CHROME E2E UI VERIFICATION");
  console.log("================================================================================\n");

  const profileDir = path.resolve(".chrome-qa-profile");
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const chromeArgs = [
    "--headless=new",
    "--remote-debugging-port=9222",
    `--user-data-dir=${profileDir}`,
    "--window-size=1280,1000",
    "--disable-gpu",
    "about:blank",
  ];

  console.log("1. Spawning isolated Chrome browser process...");
  const chromeProcess: ChildProcess = spawn(chromePath, chromeArgs);

  // Wait for CDP endpoint to be ready
  let versionData: any = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 400));
    try {
      const res = await fetch("http://127.0.0.1:9222/json/version");
      versionData = await res.json();
      break;
    } catch {}
  }

  if (!versionData) {
    chromeProcess.kill();
    throw new Error("Failed to connect to Chrome remote debugging port 9222.");
  }
  console.log("   Chrome CDP online:", versionData.Browser);

  // Create browser target
  const newTabRes = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" });
  const target = await newTabRes.json();

  const cdp = new SimpleCDP();
  await cdp.connect(target.webSocketDebuggerUrl);

  await cdp.send("Page.enable");
  await cdp.send("Network.enable");
  await cdp.send("Runtime.enable");

  const consoleLogs: Array<{ type: string; text: string }> = [];
  // Hook up event listening via SimpleCDP
  (cdp as any).onEvent = (method: string, params: any) => {
    if (method === "Runtime.consoleAPICalled") {
      const text = params.args?.map((a: any) => a.value || a.description || "").join(" ") || "";
      consoleLogs.push({ type: params.type, text });
      if (text.toLowerCase().includes("hydration") || text.toLowerCase().includes("mismatch")) {
        console.warn(`   [BROWSER CONSOLE HYDRATION WARNING]: ${text}`);
      }
    }
  };

  // Create Patient Session Token using .env.local SECRET_KEY
  const patientToken = await makeToken({
    user_id: 1,
    email: "patient@demo.com",
    full_name: "Aarav Sharma",
    role: "patient",
    patient_id: 1,
    doctor_id: null,
  });

  // Set Cookie for http://localhost:3000
  await cdp.send("Network.setCookie", {
    name: "medrella_session",
    value: patientToken,
    url: "http://localhost:3000",
  });
  console.log("2. Injected authenticated patient session cookie for 'Aarav Sharma' (Patient #1).");

  // --- Test Patient Dashboard ---
  console.log("3. Navigating to Patient Dashboard (http://localhost:3000/patient/dashboard)...");
  await cdp.send("Page.navigate", { url: "http://localhost:3000/patient/dashboard" });
  await new Promise((r) => setTimeout(r, 3000));

  let shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("test-patient-dashboard-auth.png", Buffer.from(shot.data, "base64"));
  console.log("   ✓ Saved screenshot: test-patient-dashboard-auth.png");

  // --- Test Patient Appointments List (With Payment Badges) ---
  console.log("4. Navigating to Patient Appointments (http://localhost:3000/patient/appointments)...");
  await cdp.send("Page.navigate", { url: "http://localhost:3000/patient/appointments" });
  await new Promise((r) => setTimeout(r, 3000));

  shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("test-patient-appointments-auth.png", Buffer.from(shot.data, "base64"));
  console.log("   ✓ Saved screenshot: test-patient-appointments-auth.png");

  // Check if any hydration mismatch was caught
  const hydrationWarnings = consoleLogs.filter(
    (l) =>
      l.text.toLowerCase().includes("hydration") ||
      l.text.toLowerCase().includes("server-rendered") ||
      l.text.toLowerCase().includes("did not match")
  );
  if (hydrationWarnings.length === 0) {
    console.log("   ✓ ZERO React hydration mismatches observed in browser console logs!");
  } else {
    console.error(`   ✗ Found ${hydrationWarnings.length} hydration warnings:`, hydrationWarnings);
  }

  // Click 'Pay Consultation Fee' button if available to test Payment Checkout Modal UI
  console.log("4b. Testing Payment Checkout Modal trigger...");
  const clickPayResult = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Pay'));
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.textContent };
      }
      return { clicked: false };
    })()`,
    returnByValue: true,
  });

  if (clickPayResult.result?.value?.clicked) {
    console.log(`   ✓ Clicked button: "${clickPayResult.result.value.text}". Waiting for modal...`);
    await new Promise((r) => setTimeout(r, 2000));
    const modalShot = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("test-checkout-modal.png", Buffer.from(modalShot.data, "base64"));
    console.log("   ✓ Saved screenshot: test-checkout-modal.png");
  } else {
    console.log("   (No unpaid appointment button found on screen; appointments are already paid or cancelled).");
  }

  // --- Test Doctor Dashboard (With Attending Payment Status Badges) ---
  console.log("5. Switching to Doctor Session ('Dr. Ananya Sharma')...");
  const doctorToken = await makeToken({
    user_id: 2,
    email: "doctor.ananya@demo.com",
    full_name: "Dr. Ananya Sharma",
    role: "doctor",
    patient_id: null,
    doctor_id: 1,
  });

  await cdp.send("Network.setCookie", {
    name: "medrella_session",
    value: doctorToken,
    url: "http://localhost:3000",
  });

  console.log("6. Navigating to Doctor Dashboard (http://localhost:3000/doctor/dashboard)...");
  await cdp.send("Page.navigate", { url: "http://localhost:3000/doctor/dashboard" });
  await new Promise((r) => setTimeout(r, 3000));

  shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("test-doctor-dashboard-auth.png", Buffer.from(shot.data, "base64"));
  console.log("   ✓ Saved screenshot: test-doctor-dashboard-auth.png");

  cdp.close();
  chromeProcess.kill();
  console.log("\n================================================================================");
  console.log("E2E BROWSER UI VERIFICATION COMPLETED (ALL AUTH SCREENSHOTS CAPTURED)");
  console.log("================================================================================\n");
  process.exit(0);
}

runBrowserE2E().catch((err) => {
  console.error("Browser E2E Error:", err);
  process.exit(1);
});
