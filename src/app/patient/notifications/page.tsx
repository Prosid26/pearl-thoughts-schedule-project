import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NotificationList } from "@/components/notifications/NotificationList";

export const metadata = {
  title: "Notification Center | Medrella Healthcare",
  description: "View and manage your real-time clinical notifications and appointment alerts.",
};

export default async function PatientNotificationsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in?redirect=/patient/notifications");
  }
  if (session.role !== "patient") {
    redirect("/doctor/notifications");
  }

  const notifications = await db.getInAppNotificationsForUser(session.user_id, {
    limit: 100,
  });

  return (
    <div className="py-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <NotificationList
        initialNotifications={notifications}
        role="patient"
        backUrl="/patient/dashboard"
        backLabel="Patient Portal"
      />
    </div>
  );
}

