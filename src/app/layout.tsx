import type { Metadata } from "next";
import "./globals.css";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Pearl Thoughts — Healthcare Appointment Scheduling System",
  description:
    "A Medrella-inspired doctor appointment scheduling platform engineered with atomic slot reservations, real database persistence, and role-based doctor/patient portals.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const dbMode = db.getMode();

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-white">
        <Navbar session={session} dbMode={dbMode} />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
