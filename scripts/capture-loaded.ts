import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { SignJWT } from "jose";

const SECRET_KEY = new TextEncoder().encode(process.env.SESSION_SECRET);

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

  async connect(wsUrl: string) {
    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data.toString());
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

async function captureLoadedPages() {
  const profileDir = path.resolve(".chrome-qa-profile");
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
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

  const newTabRes = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" });
  const target = await newTabRes.json();
  const cdp = new SimpleCDP();
  await cdp.connect(target.webSocketDebuggerUrl);

  await cdp.send("Page.enable");
  await cdp.send("Network.enable");

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

  // Navigate and wait for loading state to finish
  console.log("Navigating to /patient/appointments...");
  await cdp.send("Page.navigate", { url: "http://localhost:3000/patient/appointments" });
  
  // Wait until loading indicator disappears
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 800));
    const evalRes = await cdp.send("Runtime.evaluate", {
      expression: `!document.body.innerText.includes('Connecting to clinical practice registry')`,
    });
    if (evalRes.result.value === true) {
      console.log(`Page fully hydrated after ${(i + 1) * 800}ms`);
      break;
    }
  }

  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("test-patient-appointments-loaded.png", Buffer.from(shot.data, "base64"));
  console.log("Saved test-patient-appointments-loaded.png");

  cdp.close();
  chromeProcess.kill();
  process.exit(0);
}

captureLoadedPages().catch((err) => {
  console.error(err);
  process.exit(1);
});

