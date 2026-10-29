import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

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

async function diagnose() {
  console.log("Starting Razorpay Checkout Diagnostic Harness...");
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const profileDir = path.resolve(".chrome-qa-profile");
  const chromeArgs = [
    "--headless=new",
    "--remote-debugging-port=9222",
    `--user-data-dir=${profileDir}`,
    "--window-size=1280,1000",
    "--disable-gpu",
    "about:blank",
  ];

  const chromeProcess: ChildProcess = spawn(chromePath, chromeArgs);

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

  const newTabRes = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" });
  const target = await newTabRes.json();
  const cdp = new SimpleCDP();
  await cdp.connect(target.webSocketDebuggerUrl);

  await cdp.send("Page.enable");
  await cdp.send("Network.enable");
  await cdp.send("Runtime.enable");

  const networkUrls: string[] = [];
  const consoleMessages: string[] = [];

  cdp.onEvent = (method: string, params: any) => {
    if (method === "Network.requestWillBeSent") {
      const url = params.request?.url || "";
      if (url.includes("razorpay")) {
        networkUrls.push(`[REQ] ${params.request.method} ${url}`);
      }
    }
    if (method === "Network.responseReceived") {
      const url = params.response?.url || "";
      if (url.includes("razorpay")) {
        networkUrls.push(`[RES ${params.response.status}] ${url}`);
      }
    }
    if (method === "Runtime.consoleAPICalled") {
      const text = params.args?.map((a: any) => a.value || a.description || "").join(" ") || "";
      consoleMessages.push(`[CONSOLE ${params.type}]: ${text}`);
    }
  };

  const patientToken = await makeToken({
    user_id: 1,
    email: "patient@demo.com",
    full_name: "Aarav Sharma",
    role: "patient",
    patient_id: 1,
    doctor_id: null,
  });

  await cdp.send("Network.setCookie", {
    name: "medrella_session",
    value: patientToken,
    url: "http://localhost:3000",
  });

  console.log("Navigating to http://localhost:3000/patient/appointments...");
  await cdp.send("Page.navigate", { url: "http://localhost:3000/patient/appointments" });
  await new Promise((r) => setTimeout(r, 2500));

  console.log("Opening Medrella payment modal...");
  await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Pay Online'));
      if (btn) btn.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 1500));

  console.log("Clicking 'Pay Online via Razorpay' button inside modal...");
  const clickRes = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Pay Online via Razorpay'));
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.textContent };
      }
      return { clicked: false };
    })()`,
    returnByValue: true,
  });
  console.log("Click result:", clickRes.result?.value);

  // Wait for Razorpay Checkout iframe to render
  await new Promise((r) => setTimeout(r, 6000));

  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("test-razorpay-popup-diagnostics.png", Buffer.from(shot.data, "base64"));
  console.log("Captured test-razorpay-popup-diagnostics.png");

  console.log("\n--- Razorpay Network Requests ---");
  networkUrls.forEach((u) => console.log(" ", u));

  console.log("\n--- Browser Console Messages ---");
  consoleMessages.forEach((m) => console.log(" ", m));

  cdp.close();
  chromeProcess.kill();
  process.exit(0);
}

diagnose().catch((err) => {
  console.error("Diagnosis error:", err);
  process.exit(1);
});

