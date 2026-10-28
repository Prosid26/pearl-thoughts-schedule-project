import fs from "fs";
import path from "path";

const p = path.resolve("data/medrella_db.json");
if (fs.existsSync(p)) {
  fs.unlinkSync(p);
  console.log("Deleted old data/medrella_db.json");
}

import { localDb } from "../src/lib/db/local-store";

const docs = localDb.getDoctors();
console.log(`Generated fresh local database with ${docs.length} doctors:`);
for (const d of docs) {
  console.log(`  • ID ${d.doctor_id}: ${d.user?.full_name} (${d.specialization}) - ₹${d.consultation_fee} @ ${d.clinic_address}`);
}
