"use client";

import React, { useState } from "react";
import { Appointment } from "@/types/database";
import { AppointmentStatusBadge } from "@/components/appointments/AppointmentStatusBadge";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { PaymentCheckoutModal } from "@/components/payments/PaymentCheckoutModal";
import { cancelAppointmentAction } from "@/app/actions/appointment.actions";
import {
  Calendar,
  Clock,
  MapPin,
  XCircle,
  Loader2,
  RotateCcw,
  Layers,
  CreditCard,
  Receipt,
  ShieldAlert,
} from "lucide-react";
import { DoctorAvatar } from "@/components/doctor/DoctorAvatar";
import { formatINR } from "@/lib/utils/currency";
import { formatISTDate, formatISTTime } from "@/lib/utils/date";
import { RescheduleModal } from "@/components/appointments/RescheduleModal";

interface Props {
  initialAppointments: Appointment[];
}

export function PatientAppointmentsList({ initialAppointments }: Props) {
  const [appointments, setAppointments] =
    useState<Appointment[]>(initialAppointments);
  const [activeTab, setActiveTab] = useState<
    "all" | "upcoming" | "completed" | "cancelled"
  >("all");
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [reschedulingAppointment, setReschedulingAppointment] =
    useState<Appointment | null>(null);
  const [payingAppointment, setPayingAppointment] =
    useState<Appointment | null>(null);

  const handleCancel = async (appointmentId: number) => {
    if (
      !confirm(
        "Are you sure you want to cancel this appointment? Your reserved time slot will be released back to the clinic schedule."
      )
    ) {
      return;
    }

    setCancellingId(appointmentId);
    const res = await cancelAppointmentAction(appointmentId);
    if (res.success) {
      setAppointments((prev) =>
        prev.map((app) =>
          app.appointment_id === appointmentId
            ? { ...app, status: "cancelled" }
            : app
        )
      );
    } else {
      alert(res.error || "Failed to cancel appointment.");
    }
    setCancellingId(null);
  };

  const filtered = appointments.filter((app) => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming")
      return app.status === "pending" || app.status === "confirmed";
    if (activeTab === "completed") return app.status === "completed";
    if (activeTab === "cancelled")
      return app.status === "cancelled" || app.status === "rejected";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-warm-border pb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
            activeTab === "all"
              ? "bg-forest text-ivory font-semibold shadow-xs"
              : "text-muted-text hover:text-ink hover:bg-warm-border/30"
          }`}
        >
          All ({appointments.length})
        </button>

        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
            activeTab === "upcoming"
              ? "bg-forest text-ivory font-semibold shadow-xs"
              : "text-muted-text hover:text-ink hover:bg-warm-border/30"
          }`}
        >
          Upcoming (
          {
            appointments.filter(
              (a) => a.status === "pending" || a.status === "confirmed"
            ).length
          }
          )
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
            activeTab === "completed"
              ? "bg-forest text-ivory font-semibold shadow-xs"
              : "text-muted-text hover:text-ink hover:bg-warm-border/30"
          }`}
        >
          Completed (
          {appointments.filter((a) => a.status === "completed").length})
        </button>

        <button
          onClick={() => setActiveTab("cancelled")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
            activeTab === "cancelled"
              ? "bg-forest text-ivory font-semibold shadow-xs"
              : "text-muted-text hover:text-ink hover:bg-warm-border/30"
          }`}
        >
          Cancelled / Declined (
          {
            appointments.filter(
              (a) => a.status === "cancelled" || a.status === "rejected"
            ).length
          }
          )
        </button>
      </div>

      {/* Appointment Cards */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((app) => {
            const isEligibleForChange =
              app.status === "pending" || app.status === "confirmed";
            const dateStr = formatISTDate(app.appointment_date);
            const timeStr = formatISTTime(
              app.availability?.start_time || app.appointment_date
            );

            return (
              <div
                key={app.appointment_id}
                className="clinic-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all hover:border-forest/30"
              >
                <div className="flex items-start gap-4">
                  <DoctorAvatar
                    avatarUrl={app.doctor?.avatar_url}
                    specialization={app.doctor?.specialization}
                    doctorName={app.doctor?.user?.full_name}
                    size="lg"
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif text-lg font-medium text-ink">
                        {app.doctor?.user?.full_name || "Doctor"}
                      </h4>
                      <AppointmentStatusBadge status={app.status} size="sm" />
                      <PaymentStatusBadge status={app.payment_status} size="sm" />
                    </div>

                    <p className="text-xs text-muted-text">
                      {app.doctor?.specialization} • {app.doctor?.qualification}
                    </p>

                    <div className="flex flex-wrap items-center gap-3.5 text-xs text-muted-text pt-1">
                      <div className="flex items-center gap-1.5 font-semibold text-ink">
                        <Calendar className="w-3.5 h-3.5 text-forest" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-text font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-forest" />
                        <span>{timeStr} IST</span>
                      </div>
                      {app.doctor?.consultation_fee && (
                        <span className="font-mono font-semibold text-forest text-xs">
                          {formatINR(app.doctor.consultation_fee)}
                        </span>
                      )}
                    </div>

                    {/* Wave Assignment Banner */}
                    {app.wave_number && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sage/30 border border-warm-border text-[11px] text-forest font-medium">
                        <Layers className="w-3 h-3 text-forest" />
                        <span>
                          Wave Cohort #{app.wave_number} • Est. Consult: {formatISTTime(app.estimated_consult_time) || timeStr} IST
                        </span>
                      </div>
                    )}

                    {app.reason && (
                      <p className="text-xs text-muted-text pt-0.5">
                        <span className="font-semibold text-ink">Notes:</span> {app.reason}
                      </p>
                    )}

                    {app.doctor?.clinic_address && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-text pt-0.5">
                        <MapPin className="w-3 h-3 text-forest shrink-0" />
                        <span>{app.doctor.clinic_address}</span>
                      </div>
                    )}

                    {/* Payment Receipt / Reference if available */}
                    {app.payments && app.payments.length > 0 && (
                      <div className="pt-1 flex items-center gap-2 text-[11px] text-ink-muted">
                        <Receipt className="w-3 h-3 text-forest shrink-0" />
                        <span>Receipt Ref: <strong className="font-mono">{app.payments[0].provider_payment_id || app.payments[0].provider_order_id}</strong></span>
                      </div>
                    )}

                    {/* Clear distinction: Appointment Cancellation vs Refund Completion */}
                    {(app.status === "cancelled" || app.status === "rejected") && (
                      <div className="mt-2 p-2.5 rounded-lg bg-ivory-light border border-warm-border text-xs">
                        {app.refunds && app.refunds.length > 0 ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-purple-900 flex items-center gap-1.5">
                              <RotateCcw className="w-3.5 h-3.5 text-purple-700" />
                              <span>Refund: {app.refunds[0].status.toUpperCase()} ({formatINR(app.refunds[0].amount / 100)})</span>
                            </div>
                            <p className="text-[11px] text-ink-muted">
                              Policy: {app.refunds[0].policy_applied} • Provider Ref: {app.refunds[0].provider_refund_id || "Processed"}
                            </p>
                          </div>
                        ) : (
                          <div className="text-[11px] text-ink-muted flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-ink-muted" />
                            <span>Slot cancelled & released. Refund: Ineligible or cancelled within 2h window per policy.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end">
                  {isEligibleForChange && (
                    <>
                      {app.payment_status !== "paid" && (
                        <button
                          type="button"
                          onClick={() => setPayingAppointment(app)}
                          className="btn-forest inline-flex items-center gap-1.5 text-xs cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-sage" />
                          <span>Pay Online</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setReschedulingAppointment(app)}
                        className="btn-ivory inline-flex items-center gap-1.5 text-xs cursor-pointer"
                        title="Reschedule to another date or time"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-forest" />
                        <span>Reschedule</span>
                      </button>

                      <button
                        type="button"
                        disabled={cancellingId === app.appointment_id}
                        onClick={() => handleCancel(app.appointment_id)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-ink/70 hover:text-ink hover:bg-terracotta/20 border border-warm-border transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {cancellingId === app.appointment_id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Cancelling...</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="clinic-card p-12 text-center max-w-md mx-auto space-y-3">
          <Calendar className="w-8 h-8 text-muted-text/50 mx-auto" />
          <h4 className="font-serif text-lg font-normal text-ink">
            No Consultations Found
          </h4>
          <p className="text-xs text-muted-text leading-relaxed">
            There are no appointment records under this category.
          </p>
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulingAppointment && (
        <RescheduleModal
          appointment={reschedulingAppointment}
          isOpen={Boolean(reschedulingAppointment)}
          onClose={() => setReschedulingAppointment(null)}
          onSuccess={() => setReschedulingAppointment(null)}
        />
      )}

      {/* Payment Checkout Modal */}
      {payingAppointment && (
        <PaymentCheckoutModal
          appointmentId={payingAppointment.appointment_id}
          doctorName={payingAppointment.doctor?.user?.full_name || "Doctor"}
          consultationFee={payingAppointment.doctor?.consultation_fee || 500}
          isOpen={Boolean(payingAppointment)}
          onClose={() => setPayingAppointment(null)}
          onSuccess={() => {
            setAppointments((prev) =>
              prev.map((a) =>
                a.appointment_id === payingAppointment.appointment_id
                  ? { ...a, payment_status: "paid", status: "confirmed" }
                  : a
              )
            );
            setPayingAppointment(null);
          }}
        />
      )}
    </div>
  );
}
