"use client";

import React, { useState } from "react";
import { Clinic, Receptionist, ReceptionistInvitation, Doctor } from "@/types/database";
import {
  createReceptionistInvitationAction,
  revokeReceptionistInvitationAction,
  updateReceptionistClinicAssignmentAction,
} from "@/app/actions/admin.actions";
import {
  Building2,
  Users,
  Mail,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Ban,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
} from "lucide-react";

interface Props {
  clinics: Clinic[];
  receptionists: Receptionist[];
  invitations: ReceptionistInvitation[];
  doctors: Doctor[];
}

export function AdminClinicManager({
  clinics,
  receptionists: initialReceptionists,
  invitations: initialInvitations,
  doctors,
}: Props) {
  const [receptionists, setReceptionists] = useState<Receptionist[]>(initialReceptionists);
  const [invitations, setInvitations] = useState<ReceptionistInvitation[]>(initialInvitations);

  // New invitation form state
  const [inviteClinicId, setInviteClinicId] = useState<number>(clinics[0]?.clinic_id || 1);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Reassignment state
  const [updatingRecId, setUpdatingRecId] = useState<number | null>(null);

  // Revocation state
  const [revokingId, setRevokingId] = useState<number | null>(null);

  // Status alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setGeneratedLink(null);

    const fd = new FormData();
    fd.append("clinic_id", String(inviteClinicId));
    fd.append("email", inviteEmail);

    const res = await createReceptionistInvitationAction(null, fd);
    setIsInviting(false);

    if (res.success && res.data) {
      setSuccessMessage(res.message || "Invitation created successfully!");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = `${origin}${res.data.invitationUrl}`;
      setGeneratedLink(fullUrl);
      setInviteEmail("");

      // Update invitations list
      const clinic = clinics.find((c) => c.clinic_id === inviteClinicId);
      setInvitations((prev) => [
        {
          invitation_id: Date.now(),
          clinic_id: inviteClinicId,
          email: inviteEmail,
          token_hash: "sha256_hash",
          status: "pending",
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          created_by_user_id: 11,
          created_at: new Date().toISOString(),
          clinic,
        },
        ...prev,
      ]);
    } else {
      setErrorMessage(res.error || "Failed to create invitation.");
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleRevokeInvitation = async (invitationId: number) => {
    setRevokingId(invitationId);
    setSuccessMessage(null);
    setErrorMessage(null);

    const res = await revokeReceptionistInvitationAction(invitationId);
    setRevokingId(null);

    if (res.success) {
      setSuccessMessage("Invitation revoked.");
      setInvitations((prev) =>
        prev.map((i) =>
          i.invitation_id === invitationId ? { ...i, status: "revoked" } : i
        )
      );
    } else {
      setErrorMessage(res.error || "Failed to revoke invitation.");
    }
  };

  const handleReassignClinic = async (receptionistId: number, targetClinicId: number) => {
    setUpdatingRecId(receptionistId);
    setSuccessMessage(null);
    setErrorMessage(null);

    const fd = new FormData();
    fd.append("receptionist_id", String(receptionistId));
    fd.append("clinic_id", String(targetClinicId));

    const res = await updateReceptionistClinicAssignmentAction(null, fd);
    setUpdatingRecId(null);

    if (res.success) {
      const newClinic = clinics.find((c) => c.clinic_id === targetClinicId);
      setSuccessMessage("Receptionist clinic assignment updated.");
      setReceptionists((prev) =>
        prev.map((r) =>
          r.receptionist_id === receptionistId
            ? { ...r, clinic_id: targetClinicId, clinic: newClinic }
            : r
        )
      );
    } else {
      setErrorMessage(res.error || "Failed to update clinic assignment.");
    }
  };

  return (
    <div className="space-y-8">
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

      {/* 1. Clinics Directory */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">
              Healthcare Clinics Directory
            </h2>
            <p className="text-xs text-ink-muted">
              Centrally managed clinical centers and associated practice units.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-sage/30 text-forest text-xs font-semibold">
            {clinics.length} Centers Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {clinics.map((clinic) => {
            const clinicDoctors = doctors.filter((d) => d.clinic_id === clinic.clinic_id);
            const clinicStaff = receptionists.filter((r) => r.clinic_id === clinic.clinic_id);

            return (
              <div
                key={clinic.clinic_id}
                className="clinic-card p-5 space-y-3 border-t-4 border-t-forest"
              >
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-forest/10 flex items-center justify-center text-forest">
                    <Building2 className="w-5 h-5 text-forest" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ivory-light border border-warm-border text-ink-muted font-bold">
                    Clinic #{clinic.clinic_id}
                  </span>
                </div>

                <div>
                  <h3 className="font-serif text-sm font-bold text-ink leading-snug">
                    {clinic.name}
                  </h3>
                  <p className="text-[11px] text-ink-muted flex items-start gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-forest" />
                    <span>{clinic.address}</span>
                  </p>
                  <p className="text-[11px] text-ink-muted flex items-center gap-1 mt-1 font-mono">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-forest" />
                    <span>{clinic.phone}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-warm-border/60 flex items-center justify-between text-[11px] text-ink">
                  <span className="font-semibold text-forest">
                    {clinicDoctors.length} Doctor{clinicDoctors.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-muted-text font-medium">
                    {clinicStaff.length} Receptionist{clinicStaff.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Receptionist Staff & Clinic Reassignments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink">
                Receptionist Staff Directory
              </h2>
              <p className="text-xs text-ink-muted">
                Manage clinic assignments and scope for front-desk personnel.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold">
              {receptionists.length} Active Staff
            </span>
          </div>

          <div className="clinic-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-ivory-light border-b border-warm-border text-ink font-semibold">
                  <tr>
                    <th className="px-4 py-3">Receptionist</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Assigned Clinic</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-border/60">
                  {receptionists.map((rec) => (
                    <tr key={rec.receptionist_id} className="hover:bg-ivory/40">
                      <td className="px-4 py-3 font-semibold text-ink">
                        {rec.user?.full_name || `Staff #${rec.receptionist_id}`}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        <div>{rec.user?.email}</div>
                        <div className="font-mono text-[10px]">{rec.user?.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-serif font-medium text-forest block">
                          {rec.clinic?.name || `Clinic #${rec.clinic_id}`}
                        </span>
                        <span className="text-[10px] text-ink-muted">
                          Restricted strictly to this clinic
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          disabled={updatingRecId === rec.receptionist_id}
                          value={rec.clinic_id}
                          onChange={(e) =>
                            handleReassignClinic(rec.receptionist_id, Number(e.target.value))
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-warm-border text-xs bg-white text-ink focus:border-forest cursor-pointer"
                        >
                          {clinics.map((c) => (
                            <option key={c.clinic_id} value={c.clinic_id}>
                              Assign to: {c.name.slice(0, 20)}...
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {receptionists.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-ink-muted">
                        No active receptionists found. Use the invitation panel to onboard staff.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3. Receptionist Invitation Engine */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">
              Invite Receptionist
            </h2>
            <p className="text-xs text-ink-muted">
              Issue single-use expiring cryptographic onboarding tokens.
            </p>
          </div>

          <div className="clinic-card p-6 space-y-4">
            <form onSubmit={handleCreateInvitation} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-ink block mb-1">
                  Target Clinic Center *
                </label>
                <select
                  value={inviteClinicId}
                  onChange={(e) => setInviteClinicId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-warm-border focus:border-forest bg-ivory text-ink cursor-pointer"
                >
                  {clinics.map((c) => (
                    <option key={c.clinic_id} value={c.clinic_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">
                  Receptionist Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. receptionist@clinic.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-warm-border focus:border-forest bg-ivory text-ink"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isInviting}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-ivory bg-forest hover:bg-forest/90 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Secure Link...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Single-Use Invitation Link</span>
                  </>
                )}
              </button>
            </form>

            {generatedLink && (
              <div className="p-3.5 bg-forest/10 border border-forest/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-forest">
                  <span>Generated Onboarding Link:</span>
                  <span className="text-[10px] text-ink-muted font-normal">Valid for 48 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-warm-border text-[11px] font-mono bg-white text-ink select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-lg bg-forest text-ivory text-xs font-semibold flex items-center gap-1 shrink-0 hover:bg-forest/90 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Invitations Table */}
          <div className="clinic-card p-5 space-y-3">
            <h3 className="font-serif text-sm font-bold text-ink">
              Recent Invitations Log
            </h3>
            <div className="divide-y divide-warm-border/60 max-h-60 overflow-y-auto text-xs">
              {invitations.map((inv) => (
                <div
                  key={inv.invitation_id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-ink">{inv.email}</div>
                    <div className="text-[10px] text-ink-muted">
                      {inv.clinic?.name || `Clinic #${inv.clinic_id}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        inv.status === "accepted"
                          ? "bg-sage text-forest"
                          : inv.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : inv.status === "revoked"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {inv.status}
                    </span>
                    {inv.status === "pending" && (
                      <button
                        type="button"
                        disabled={revokingId === inv.invitation_id}
                        onClick={() => handleRevokeInvitation(inv.invitation_id)}
                        className="text-[11px] text-terracotta hover:underline font-semibold cursor-pointer"
                      >
                        {revokingId === inv.invitation_id ? "Revoking..." : "Revoke"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {invitations.length === 0 && (
                <p className="text-[11px] text-ink-muted py-3 text-center">
                  No invitations generated yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

