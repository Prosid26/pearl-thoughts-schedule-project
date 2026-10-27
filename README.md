# Pearl Thoughts — Medrella-Inspired Appointment Booking System

> **Fullstack Internship — Schedule Project Module**  
> An end-to-end, production-ready doctor appointment booking platform inspired by Medrella. Built with atomic slot locking, role-based authorization, server-side Zod validation, and Drizzle ORM with Neon PostgreSQL persistence.

---

## 📌 ER Diagram Architecture

This application strictly implements the 5 core entities and relationships defined in the repository's ER specification:

![Pearl Thoughts Schedule ER Diagram](./schedule-project-er-diagram.png.png)

### Entity Mappings & Relational Constraints

| Entity | Primary Key | Foreign Keys & Relational Rules | Key Attributes |
| :--- | :--- | :--- | :--- |
| **`USER`** | `user_id` (PK) | 1-to-0..1 with `PATIENT`, 1-to-0..1 with `DOCTOR` | `full_name`, `email` (UK), `phone`, `password_hash`, `role` (`patient` / `doctor`), `created_at` |
| **`PATIENT`** | `patient_id` (PK) | `user_id` (FK $\to$ `users.user_id` ON DELETE CASCADE) | `date_of_birth`, `gender`, `address`, `created_at` |
| **`DOCTOR`** | `doctor_id` (PK) | `user_id` (FK $\to$ `users.user_id` ON DELETE CASCADE) | `specialization`, `qualification`, `experience_years`, `consultation_fee`, `bio`, `clinic_address` |
| **`AVAILABILITY`**| `availability_id` (PK) | `doctor_id` (FK $\to$ `doctors.doctor_id` ON DELETE CASCADE) | `available_date`, `start_time`, `end_time`, `slot_duration`, `is_available` (UK on `[doctor_id, date, start_time]`) |
| **`APPOINTMENT`** | `appointment_id` (PK) | `patient_id` (FK), `doctor_id` (FK), `availability_id` (FK UNIQUE) | `appointment_date`, `status` (`pending`, `confirmed`, `completed`, `cancelled`, `rejected`), `reason` |

---

## 🚀 Key Features

### 1. Patient Portal
- **Practitioner Directory**: Real-time search by doctor name, specialty filtering (Cardiology, Dermatology, Neurology, Pediatrics, Orthopedics), and experience filtering.
- **Doctor Profiles**: Comprehensive credentials, qualifications, fees, biography, clinic address, and available slots.
- **Interactive Booking**: Multi-date slot selector, symptom/visit reason form, atomic slot lock.
- **Appointment Management**: View upcoming vs. past history, track live doctor status confirmation, and cancel appointments with automatic slot restoration.
- **Patient Profile**: Manage contact phone, date of birth, gender, and residential address.

### 2. Doctor Portal
- **Dedicated Dashboard**: Overview of today's consults, urgent pending confirmation alerts, active confirmed patients, and completed visits.
- **Appointment Action Center**: Accept/Confirm pending bookings, decline/reject requests, and mark visits completed.
- **Availability Schedule Manager**: Create new date/time intervals with custom slot durations (15/30/45/60 mins), prevent overlaps or past dates, and delete unbooked slots.
- **Practitioner Settings**: Update consultation fees, specialization, degrees, and clinic address.

### 3. Concurrency & Security Architecture
- **Atomic Slot Locking**: Eliminates race conditions and guarantees zero double-bookings.
- **Controlled Doctor Provisioning**: Restricts doctor role assignment behind a Clinic Authorization Key (`MEDRELLA_CLINIC_ADMIN_2026`).
- **Server-Side Validation**: Every Server Action validates payloads against strict **Zod** schemas.
- **Secure Authentication**: Pure JavaScript Bcrypt hashing and HTTP-Only JWT session cookies with role guards.
- **1-Click Evaluation Switcher**: Built-in test account picker for fast grading and testing.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS 4 with custom healthcare palette
- **ORM**: Drizzle ORM
- **Database**: Neon-hosted PostgreSQL (with embedded local ACID fallback for zero-setup execution)
- **Validation**: Zod
- **Auth**: JWT HTTP-Only Cookies + Bcryptjs
- **Icons**: Lucide React
- **Deployment**: Vercel

---

## 🔑 Demo Accounts (Pre-Seeded)

All demo accounts use the default password: **`Password123!`**

| Role | Name | Email | Specialty / Description |
| :--- | :--- | :--- | :--- |
| **Patient** | John Doe | `patient@demo.com` | Sample patient with active cardiology booking |
| **Patient** | Jane Smith | `jane@demo.com` | Sample patient |
| **Doctor** | Dr. Sarah Jenkins | `doctor.sarah@demo.com` | Senior Cardiologist (Harvard Medical, 15 yrs) |
| **Doctor** | Dr. Marcus Vance | `doctor.marcus@demo.com` | Chief of Dermatology (Johns Hopkins, 11 yrs) |
| **Doctor** | Dr. Elena Rostova | `doctor.elena@demo.com` | Consultant Neurologist (Stanford, 18 yrs) |
| **Doctor** | Dr. David Chen | `doctor.david@demo.com` | Pediatric Specialist (Columbia, 12 yrs) |
| **Doctor** | Dr. Priya Sharma | `doctor.priya@demo.com` | Orthopedic Surgeon (AIIMS / Oxford, 14 yrs) |

> 💡 **Tip:** Use the **"1-Click Demo Logins"** dropdown at the top-right of the application to switch accounts instantly without typing.

---

## 💻 Local Setup & Execution

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Prosid26/pearl-thoughts-schedule-project.git
cd pearl-thoughts-schedule-project
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@ep-sample.neon.tech/neondb?sslmode=require` |
| `SESSION_SECRET` | Secret key for signing JWT cookies | `medrella_super_secure_healthcare_jwt_session_secret_2026_key` |
| `DOCTOR_PROVISIONING_SECRET` | Secret for creating doctor accounts | `MEDRELLA_CLINIC_ADMIN_2026` |

> *Note: If `DATABASE_URL` is omitted, the application runs on the embedded local ACID database store with full persistence and pre-seeded demo doctors.*

### 3. Generate Drizzle Migrations & Push (Optional when connecting to Neon)
```bash
npm run db:generate
npm run db:push
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing & Verification

The repository includes an automated end-to-end QA verification suite testing 19 discrete assertions:

```bash
npm test
```

### Verified Test Cases:
1. **Password Security**: Bcryptjs password hashing and salt verification.
2. **Patient Registration**: Creation of user and linked patient records.
3. **Doctor Directory**: Search and filtering by specialization and experience.
4. **Availability Slots**: Extraction of future bookable slots.
5. **Atomic Booking**: Slot reservation, appointment creation with `#APT` ID.
6. **Concurrency Protection**: Preventing a second patient from booking the same slot.
7. **Doctor Dashboard**: Verification that the appointment appears only in the correct doctor's list.
8. **Doctor Status Update**: Transition from `pending` to `confirmed`.
9. **Cancellation & Restoration**: Patient cancellation and automatic restoration of slot `is_available = true`.
10. **Doctor Slot Management**: Adding and deleting availability slots.

### Production Build Check:
```bash
npm run build
```

---

## 🌐 Vercel Deployment Instructions

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete medrella doctor appointment booking application"
   git push origin main
   ```
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import `Prosid26/pearl-thoughts-schedule-project`.
4. In the **Environment Variables** section, add:
   - `DATABASE_URL` (Your Neon connection string)
   - `SESSION_SECRET` (A 32+ character random string)
   - `DOCTOR_PROVISIONING_SECRET` (`MEDRELLA_CLINIC_ADMIN_2026`)
5. Click **Deploy**. Vercel will build the Next.js App Router application automatically.

---

## 📄 License & Attribution
Developed for the **Pearl Thoughts Fullstack Internship Assignment**.  
Designed and engineered with Next.js App Router, TypeScript, Drizzle ORM, Neon PostgreSQL, and Tailwind CSS.
