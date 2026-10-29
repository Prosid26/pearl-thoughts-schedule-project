"use client";

import React, { useState } from "react";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { formatINR } from "@/lib/utils/currency";
import { PaymentCheckoutModal } from "./PaymentCheckoutModal";
import { useRouter } from "next/navigation";

interface Props {
  appointmentId: number;
  doctorName: string;
  consultationFee: number | string;
}

export function PayNowClientButton({
  appointmentId,
  doctorName,
  consultationFee,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [paid, setPaid] = useState(false);

  if (paid) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span>Payment Verified</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-forest px-4 py-2 text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
      >
        <CreditCard className="w-3.5 h-3.5 text-sage" />
        <span>Pay Consultation Fee ({formatINR(consultationFee)})</span>
      </button>

      {isOpen && (
        <PaymentCheckoutModal
          appointmentId={appointmentId}
          doctorName={doctorName}
          consultationFee={consultationFee}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            setPaid(true);
            setIsOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

