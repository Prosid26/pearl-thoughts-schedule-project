"use client";

import React, { useState, useMemo } from "react";
import { Clinic, Receptionist, Doctor, Appointment, Availability, Patient } from "@/types/database";
import {
  receptionistBookAppointmentAction,
  receptionistCancelAppointmentAction,
  receptionistRescheduleAppointmentAction,
  receptionistSearchPatientsAction,
  receptionistRegisterPatientAction,
} from "@/app/actions/reception.actions";
import {
  Building2,
  Calendar,
  Clock,
  Search,
  UserPlus,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Stethoscope,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Plus,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { formatISTDate, getTodayIST, isSlotInPast } from "@/lib/utils/date";

interface Props {
  receptionist: Receptionist;
  clinic: Clinic;
  doctors: Doctor[];
  initialAppointments: Appointment[];
  patients: Patient[];
}

export function ReceptionWorkspace({
  receptionist,
  clinic,
  doctors,
  initialAppointments,
  patients: initialPatients,
}: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);

  // Selected Doctor for slot inspection & booking
  const [selectedDoctorId, setSelectedDoctorId] = useState<number>(
    doctors[0]?.doctor_id || 0
  );

  // Patient live search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  // Booking Form State
  const [bookingAvailabilityId, setBookingAvailabilityId] = useState<number | null>(null);
  const [bookingSlotTime, setBookingSlotTime] = useState<string>("");
  const [bookingReason, setBookingReason] = useState<string>("Routine in-person clinic consultation");
  const [isBooking, setIsBooking] = useState(false);

  // New Patient Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("+91 ");
  const [newPatientDob, setNewPatientDob] = useState("");
  const [newPatientGender, setNewPatientGender] = useState<"Male" | "Female" | "Other">("Male");
  const [newPatientAddress, setNewPatientAddress] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Reschedule Modal State
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [newAvailabilityId, setNewAvailabilityId] = useState<number | null>(null);
  const [newSlotTime, setNewSlotTime] = useState<string>("");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Cancellation State
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Notifications / Alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected Doctor Object
  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.doctor_id === selectedDoctorId),
    [doctors, selectedDoctorId]
  );

  // Filtered patients
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients.slice(0, 8);
    const q = searchQuery.toLowerCase().trim();
    return patients.filter((p) => {
      const name = p.user?.full_name?.toLowerCase() || "";
      const phone = p.user?.phone?.toLowerCase() || "";
      const email = p.user?.email?.toLowerCase() || "";
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [patients, searchQuery]);

  // Selected patient object
  const selectedPatient = useMemo(
    () => patients.find((p) => p.patient_id === selectedPatientId),
    [patients, selectedPatientId]
  );

  // Handle Book Appointment
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setErrorMessage("Please select a patient before confirming booking.");
      return;
    }
    if (!bookingAvailabilityId) {
      setErrorMessage("Please select an available consultation slot.");
      return;
    }

    setIsBooking(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const fd = new FormData();
    fd.append("patient_id", String(selectedPatientId));
    fd.append("doctor_id", String(selectedDoctorId));
    fd.append("availability_id", String(bookingAvailabilityId));
    if (bookingSlotTime) fd.append("slot_time", bookingSlotTime);
    fd.append("reason", bookingReason);

    const res = await receptionistBookAppointmentAction(null, fd);
    setIsBooking(false);

    if (res.success && res.data) {
      setSuccessMessage(res.message || "Appointment successfully scheduled!");
      setAppointments((prev) => [res.data!.appointment, ...prev]);
      setBookingAvailabilityId(null);
      setBookingSlotTime("");
    } else {
      setErrorMessage(res.error || "Failed to book appointment.");
    }
  };

  // Handle Register Patient
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setErrorMessage(null);

    const fd = new FormData();
    fd.append("full_name", newPatientName);
    fd.append("email", newPatientEmail);
    fd.append("phone", newPatientPhone);
    if (newPatientDob) fd.append("date_of_birth", newPatientDob);
    if (newPatientGender) fd.append("gender", newPatientGender);
    if (newPatientAddress) fd.append("address", newPatientAddress);

    const res = await receptionistRegisterPatientAction(null, fd);
    setIsRegistering(false);

    if (res.success && res.data) {
      setSuccessMessage(res.message || "New patient registered.");
      setPatients((prev) => [res.data!.patient, ...prev]);
      setSelectedPatientId(res.data!.patient.patient_id);
      setShowRegisterModal(false);
      setNewPatientName("");
      setNewPatientEmail("");
      setNewPatientPhone("+91 ");
      setNewPatientDob("");
      setNewPatientAddress("");
    } else {
      setErrorMessage(res.error || "Failed to register patient.");
    }
  };

  // Handle Cancel Appointment
  const handleCancelAppointment = async (appointmentId: number) => {
    if (!confirm("Are you sure you want to cancel this appointment? Slot capacity will be restored.")) {
      return;
    }

    setCancellingId(appointmentId);
    setSuccessMessage(null);
    setErrorMessage(null);

    const res = await receptionistCancelAppointmentAction(appointmentId, "Cancelled by Receptionist");
    setCancellingId(null);

    if (res.success) {
      setSuccessMessage(res.message || "Appointment cancelled.");
      setAppointments((prev) =>
        prev.map((a) => (a.appointment_id === appointmentId ? { ...a, status: "cancelled" } : a))
      );
    } else {
      setErrorMessage(res.error || "Failed to cancel appointment.");
    }
  };

  // Handle Reschedule Appointment
  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingAppointment || !newAvailabilityId) {
      setErrorMessage("Please select a target slot for rescheduling.");
      return;
    }

    setIsRescheduling(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const fd = new FormData();
    fd.append("appointment_id", String(reschedulingAppointment.appointment_id));
    fd.append("new_availability_id", String(newAvailabilityId));
    if (newSlotTime) fd.append("new_slot_time", newSlotTime);
    if (rescheduleReason) fd.append("reason", rescheduleReason);

    const res = await receptionistRescheduleAppointmentAction(null, fd);
    setIsRescheduling(false);

    if (res.success && res.data) {
      setSuccessMessage(res.message || "Appointment rescheduled.");
      setAppointments((prev) =>
        prev.map((a) =>
          a.appointment_id === reschedulingAppointment.appointment_id
            ? res.data!.appointment
            : a
        )
      );
      setReschedulingAppointment(null);
      setNewAvailabilityId(null);
      setNewSlotTime("");
      setRescheduleReason("");
    } else {
      setErrorMessage(res.error || "Failed to reschedule appointment.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Clinic Header Banner */}
      <div className="clinic-card p-6 bg-forest text-ivory flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sage" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-sage">
              Assigned Clinic Scope
            </span>
            <span className="text-[10px] bg-ivory/15 text-ivory px-2 py-0.5 rounded font-mono">
              Clinic #{clinic.clinic_id}
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold tracking-tight">
            {clinic.name}
          </h2>
          <p className="text-xs text-ivory/80 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sage shrink-0" />
            <span>{clinic.address}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-ivory/20">
          <div className="text-left md:text-right">
            <div className="text-[11px] text-sage font-medium">Logged in Receptionist</div>
            <div className="text-sm font-bold">{receptionist.user?.full_name || "Receptionist"}</div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-ivory/20 border border-ivory/30 text-xs font-semibold">
            {doctors.length} Doctors in Clinic
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-3.5 bg-sage/40 border border-forest/20 rounded-xl flex items-center gap-2 text-xs text-forest">
          <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-terracotta/20 border border-terracotta/40 rounded-xl flex items-center gap-2 text-xs text-ink">
          <AlertCircle className="w-4 h-4 text-ink shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Left = Patient & Slot Booking; Right = Clinic Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 cols): Patient Search + Slot Selector + Booking Form */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 1: Patient Selection */}
          <div className="clinic-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-forest" />
                <h3 className="font-serif text-base font-bold text-ink">
                  1. Select or Register Patient
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="btn-forest text-[11px] px-2.5 py-1 gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Patient</span>
              </button>
            </div>

            {/* Live Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-warm-border text-xs bg-ivory text-ink focus:border-forest"
              />
            </div>

            {/* Search Results List */}
            <div className="divide-y divide-warm-border/60 max-h-48 overflow-y-auto rounded-lg border border-warm-border">
              {filteredPatients.map((p) => {
                const isSelected = selectedPatientId === p.patient_id;
                return (
                  <button
                    key={p.patient_id}
                    type="button"
                    onClick={() => setSelectedPatientId(p.patient_id)}
                    className={`w-full p-2.5 text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-forest/10 border-l-4 border-l-forest font-bold text-forest"
                        : "hover:bg-ivory text-ink"
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{p.user?.full_name}</div>
                      <div className="text-[10px] text-ink-muted flex items-center gap-2">
                        <span>{p.user?.phone}</span>
                        <span>•</span>
                        <span>{p.user?.email}</span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-forest" />}
                  </button>
                );
              })}
              {filteredPatients.length === 0 && (
                <div className="p-4 text-center text-xs text-ink-muted">
                  No matching patients found. Click &quot;New Patient&quot; above to register.
                </div>
              )}
            </div>

            {selectedPatient && (
              <div className="p-3 bg-sage/30 rounded-xl border border-forest/20 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-forest block">
                    Selected Patient
                  </span>
                  <span className="font-bold text-ink text-sm">{selectedPatient.user?.full_name}</span>
                  <span className="text-ink-muted block text-[11px] font-mono">{selectedPatient.user?.phone}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatientId(null)}
                  className="text-ink-muted hover:text-ink text-xs underline cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Clinic Doctor & Slot Selection */}
          <div className="clinic-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-forest" />
              <h3 className="font-serif text-base font-bold text-ink">
                2. Select Consulting Specialist
              </h3>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">
                Doctor within {clinic.name} *
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => {
                  setSelectedDoctorId(Number(e.target.value));
                  setBookingAvailabilityId(null);
                  setBookingSlotTime("");
                }}
                className="w-full px-3 py-2 rounded-xl border border-warm-border text-xs bg-ivory text-ink focus:border-forest cursor-pointer"
              >
                {doctors.map((d) => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    {d.user?.full_name} ({d.specialization}) — Mode: {d.scheduling_mode?.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {selectedDoctor && (
              <div className="p-3 bg-ivory border border-warm-border rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink">{selectedDoctor.user?.full_name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-forest/10 text-forest">
                    {selectedDoctor.scheduling_mode?.toUpperCase()} Mode
                  </span>
                </div>
                <div className="text-[11px] text-ink-muted">
                  Fee: ₹{selectedDoctor.consultation_fee} • Exp: {selectedDoctor.experience_years} yrs •{" "}
                  {selectedDoctor.scheduling_mode === "wave"
                    ? `${selectedDoctor.wave_capacity || 3} patients / wave`
                    : "Continuous stream"}
                </div>
              </div>
            )}

            {/* Doctor Slots Quick Booking Selector */}
            <form onSubmit={handleBookAppointment} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Availability Slot ID *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Enter slot ID or check doctor calendar"
                  value={bookingAvailabilityId || ""}
                  onChange={(e) => setBookingAvailabilityId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border text-xs bg-ivory text-ink focus:border-forest"
                />
                <span className="text-[10px] text-ink-muted mt-0.5 block">
                  Tip: Visit Specialists & Slots to review open slots for Dr. {selectedDoctor?.user?.full_name}.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Time Slot (HH:mm) - Optional for Stream
                </label>
                <input
                  type="time"
                  value={bookingSlotTime}
                  onChange={(e) => setBookingSlotTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border text-xs bg-ivory text-ink focus:border-forest"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Clinical Reason for Visit *
                </label>
                <textarea
                  rows={2}
                  required
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border text-xs bg-ivory text-ink focus:border-forest"
                />
              </div>

              <button
                type="submit"
                disabled={isBooking || !selectedPatientId || !bookingAvailabilityId}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-ivory bg-forest hover:bg-forest/90 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isBooking ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Confirming Booking...</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book Appointment on Behalf of Patient</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (7 cols): Clinic Appointments Registry */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-warm-border">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink">
                Clinic Consultations Registry
              </h2>
              <p className="text-xs text-ink-muted">
                All scheduled, confirmed, and completed visits for doctors in {clinic.name}.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-forest text-ivory text-xs font-semibold font-mono">
              {appointments.length} Appointments
            </span>
          </div>

          <div className="clinic-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-ivory-light border-b border-warm-border text-ink font-semibold">
                  <tr>
                    <th className="px-4 py-3">ID / Date</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Consultant</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-border/60">
                  {appointments.map((app) => {
                    const isCancelling = cancellingId === app.appointment_id;
                    const datePart = (app.appointment_date || "").slice(0, 10);
                    const timePart = app.estimated_consult_time || (app.appointment_date || "").slice(11, 16);

                    return (
                      <tr key={app.appointment_id} className="hover:bg-ivory/40">
                        <td className="px-4 py-3 font-mono">
                          <div className="font-bold text-ink">#{app.appointment_id}</div>
                          <div className="text-[11px] text-ink-muted">{datePart}</div>
                          <div className="text-[10px] text-forest font-semibold">
                            {timePart} IST {app.wave_number ? `(Wave ${app.wave_number})` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-ink">
                            {app.patient?.user?.full_name || `Patient #${app.patient_id}`}
                          </div>
                          <div className="text-[10px] text-ink-muted font-mono">
                            {app.patient?.user?.phone}
                          </div>
                          {app.booked_by_role === "receptionist" && (
                            <span className="text-[9px] px-1 py-0.2 bg-teal-50 text-teal-800 rounded font-semibold">
                              Via Reception
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-ink">
                            {app.doctor?.user?.full_name || `Doctor #${app.doctor_id}`}
                          </div>
                          <div className="text-[10px] text-ink-muted">
                            {app.doctor?.specialization}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              app.status === "confirmed"
                                ? "bg-sage text-forest"
                                : app.status === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : app.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {app.status !== "cancelled" && app.status !== "completed" && (
                            <>
                              <button
                                type="button"
                                onClick={() => setReschedulingAppointment(app)}
                                className="text-forest hover:underline font-semibold text-[11px] cursor-pointer"
                              >
                                Reschedule
                              </button>
                              <button
                                type="button"
                                disabled={isCancelling}
                                onClick={() => handleCancelAppointment(app.appointment_id)}
                                className="text-terracotta hover:underline font-semibold text-[11px] cursor-pointer"
                              >
                                {isCancelling ? "Cancelling..." : "Cancel"}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {appointments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                        No active clinic appointments scheduled yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* New Patient Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="clinic-card p-6 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-warm-border">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-forest" />
                <h3 className="font-serif text-lg font-bold text-ink">
                  Register New Patient
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-ink block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border bg-ivory text-ink"
                />
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@example.com"
                  value={newPatientEmail}
                  onChange={(e) => setNewPatientEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border bg-ivory text-ink"
                />
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98200 12345"
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border bg-ivory text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-ink block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={newPatientDob}
                    onChange={(e) => setNewPatientDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-warm-border bg-ivory text-ink"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Gender</label>
                  <select
                    value={newPatientGender}
                    onChange={(e) => setNewPatientGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-warm-border bg-ivory text-ink"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Street address, city"
                  value={newPatientAddress}
                  onChange={(e) => setNewPatientAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border bg-ivory text-ink"
                />
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-ivory bg-forest hover:bg-forest/90 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Registering Patient...</span>
                  </>
                ) : (
                  <>
                    <span>Register Patient</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulingAppointment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="clinic-card p-6 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-warm-border">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-forest" />
                <h3 className="font-serif text-lg font-bold text-ink">
                  Reschedule Appointment #{reschedulingAppointment.appointment_id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReschedulingAppointment(null)}
                className="text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReschedule} className="space-y-3 text-xs">
              <div className="p-3 bg-ivory rounded-lg border border-warm-border space-y-1">
                <div className="font-semibold text-ink">
                  Patient: {reschedulingAppointment.patient?.user?.full_name}
                </div>
                <div className="text-[11px] text-ink-muted">
                  Doctor: {reschedulingAppointment.doctor?.user?.full_name}
                </div>
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">
                  New Availability Slot ID *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Enter new slot ID"
                  value={newAvailabilityId || ""}
                  onChange={(e) => setNewAvailabilityId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border bg-ivory text-ink"
                />
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">
                  New Slot Time (HH:mm) - Optional for Stream
                </label>
                <input
                  type="time"
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border bg-ivory text-ink"
                />
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">
                  Reason for Rescheduling
                </label>
                <input
                  type="text"
                  placeholder="e.g. Patient requested morning slot"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border bg-ivory text-ink"
                />
              </div>

              <button
                type="submit"
                disabled={isRescheduling || !newAvailabilityId}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-ivory bg-forest hover:bg-forest/90 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isRescheduling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rescheduling...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Reschedule</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

