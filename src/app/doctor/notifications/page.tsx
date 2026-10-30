import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NotificationList } from "@/components/notifications/NotificationList";

export const metadata = {
  title: "Clinical Notifications | Medrella Doctor Workspace",
  description: "View and manage incoming appointment requests, cancellations, and clinical alerts.",
};

export default async function DoctorNotificationsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in?redirect=/doctor/notifications");
  }
  if (session.role !== "doctor" && session.role !== "admin") {
    redirect("/patient/notifications");
  }

  const notifications = await db.getInAppNotificationsForUser(session.user_id, {
    limit: 100,
  });

  return (
    <div className="py-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <NotificationList
        initialNotifications={notifications}
        role="doctor"
        backUrl="/doctor/dashboard"
        backLabel="Doctor Workspace"
      />
    </div>
  );
}

