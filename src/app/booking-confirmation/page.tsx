import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { AppointmentStatusBadge } from "@/components/appointments/AppointmentStatusBadge";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { PayNowClientButton } from "@/components/payments/PayNowClientButton";
import {
  CheckCircle2,
  Calendar,
  Clock,
  Stethoscope,
  MapPin,
  ArrowRight,
  FileText,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  Info,
} from "lucide-react";
import { DoctorAvatar } from "@/components/doctor/DoctorAvatar";
import { formatINR } from "@/lib/utils/currency";
import { formatISTDate } from "@/lib/utils/date";

export default async function BookingConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; doctor?: string; paid?: string }>;
}) {
  const { id } = await searchParams;
  const appointmentId = id ? parseInt(id, 10) : null;

  const appointment = appointmentId
    ? await db.getAppointmentById(appointmentId)
    : null;

  const payments = appointmentId
    ? await db.getPaymentsForAppointment(appointmentId)
    : [];

  const refunds = appointmentId
    ? await db.getRefundsForAppointment(appointmentId)
    : [];

  const latestPayment = payments[0] || null;
  const latestRefund = refunds[0] || null;

  const docName =
    appointment?.doctor?.user?.full_name || "Medical Practitioner";
  const appDate = appointment
    ? formatISTDate(appointment.appointment_date)
    : "Confirmed Date";

  const appTime = appointment?.availability
    ? `${appointment.availability.start_time.slice(0, 5)} – ${appointment.availability.end_time.slice(0, 5)} IST`
    : "Scheduled Time";

  const paymentStatus = appointment?.payment_status || "unpaid";

  return (
    <div className="py-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="clinic-card overflow-hidden shadow-lg">
        {/* Success Header Banner */}
        <div className="bg-forest text-ivory p-8 sm:p-10 text-center space-y-3.5 border-b border-forest-dark">
          <div className="w-16 h-16 rounded-xl bg-[#182821] flex items-center justify-center mx-auto border border-terracotta/40">
            <CheckCircle2 className="w-9 h-9 text-terracotta" />
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Consultation Confirmed & Slot Locked
          </h1>
          <p className="text-xs sm:text-sm text-sage max-w-md mx-auto font-sans leading-relaxed">
            Your appointment has been atomically secured in the Medrella clinical database.
            No overlaps or phantom bookings can occur.
          </p>
        </div>

        {/* Details Card */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-warm-border gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block font-sans">
                Clinical Booking Reference
              </span>
              <div className="font-serif text-2xl font-bold text-forest mt-0.5">
                #APT-{String(appointmentId || 1001).padStart(5, "0")}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {appointment && (
                <AppointmentStatusBadge status={appointment.status} />
              )}
              <PaymentStatusBadge status={paymentStatus} />
            </div>
          </div>

          {/* Consultation Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-ivory-light border border-warm-border flex items-start gap-3.5">
              <DoctorAvatar
                doctor={appointment?.doctor}
                size="sm"
                showActiveBadge
              />
              <div className="space-y-0.5 flex-1 min-w-0">
                <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Stethoscope className="w-3.5 h-3.5 text-forest" />
                  Attending Specialist
                </span>
                <div className="font-serif text-sm font-bold text-ink truncate">{docName}</div>
                {appointment?.doctor && (
                  <div className="text-xs text-forest font-medium">
                    {appointment.doctor.specialization}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-ivory-light border border-warm-border space-y-1">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Calendar className="w-3.5 h-3.5 text-forest" />
                Date & Time Window
              </span>
              <div className="font-serif text-sm font-bold text-ink">{appDate}</div>
              <div className="text-xs text-ink-muted flex items-center gap-1 font-sans">
                <Clock className="w-3.5 h-3.5 text-forest" />
                <span>{appTime}</span>
              </div>
            </div>
          </div>

          {/* Payment & Receipt Information Banner */}
          <div className="p-4 rounded-xl border border-warm-border bg-ivory-light space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center text-forest">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block font-sans">
                    Consultation Fee & Payment State
                  </span>
                  <div className="text-sm font-bold text-ink">
                    {appointment?.doctor?.consultation_fee
                      ? formatINR(appointment.doctor.consultation_fee)
                      : "₹0"}
                  </div>
                </div>
              </div>

              {paymentStatus === "paid" ? (
                <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Payment Captured</span>
                </div>
              ) : appointmentId && appointment?.doctor?.consultation_fee ? (
                <PayNowClientButton
                  appointmentId={appointmentId}
                  doctorName={docName}
                  consultationFee={appointment.doctor.consultation_fee}
                />
              ) : null}
            </div>

            {/* Receipt Reference */}
            {latestPayment && (
              <div className="pt-3 border-t border-warm-border/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-ink-muted">
                <div>
                  <span className="font-semibold text-ink">Transaction Ref: </span>
                  <span className="font-mono text-ink">
                    {latestPayment.provider_payment_id || latestPayment.provider_order_id}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-ink">Provider: </span>
                  <span className="uppercase text-forest font-semibold">
                    {latestPayment.provider}
                  </span>
                </div>
              </div>
            )}

            {/* Refund Reference if exists */}
            {latestRefund && (
              <div className="pt-2 border-t border-warm-border/60 flex items-center justify-between text-xs text-purple-900 bg-purple-50/50 p-2.5 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                  <span>
                    Refund Issued: <strong>{formatINR(latestRefund.amount / 100)}</strong>
                  </span>
                </div>
                <span className="font-mono text-[10px] text-purple-700">
                  {latestRefund.provider_refund_id || "Processed"}
                </span>
              </div>
            )}
          </div>

          {/* Cancellation Policy Banner */}
          <div className="p-3.5 rounded-lg bg-sage/20 border border-warm-border flex items-start gap-2.5 text-xs text-forest">
            <Info className="w-4 h-4 text-forest shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-forest">Medrella Cancellation & Refund Policy: </span>
              Cancellations made 24+ hours in advance are eligible for a 100% full refund. Cancellations made between 2 and 24 hours prior receive a 50% partial refund.
            </div>
          </div>

          {/* Reason for consultation */}
          {appointment?.reason && (
            <div className="p-4 rounded-lg bg-ivory-light border border-warm-border space-y-1">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <FileText className="w-3.5 h-3.5 text-forest" />
                Clinical Reason & Notes
              </span>
              <p className="text-xs text-ink leading-relaxed font-sans">
                {appointment.reason}
              </p>
            </div>
          )}

          {/* Venue & Location */}
          {appointment?.doctor?.clinic_address && (
            <div className="p-4 rounded-lg bg-ivory-light border border-warm-border flex items-start gap-2.5 text-xs text-ink-muted">
              <MapPin className="w-4 h-4 text-forest shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-ink">Venue: </span>
                {appointment.doctor.clinic_address}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href="/patient/appointments"
              className="btn-forest w-full sm:w-auto px-6 py-2.5 text-xs font-bold gap-2"
            >
              <span>View In Patient Sanctuary</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/doctors"
              className="btn-ivory w-full sm:w-auto px-5 py-2.5 text-xs font-semibold"
            >
              Browse Other Specialists
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
