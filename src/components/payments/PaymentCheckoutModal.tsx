"use client";

import React, { useState, useEffect } from "react";
import {
  createPaymentOrderAction,
  verifyPaymentAction,
  recordPaymentAbandonedAction,
} from "@/app/actions/payment.actions";
import { formatINR } from "@/lib/utils/currency";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  X,
  Sparkles,
  QrCode,
  Info,
  ExternalLink,
} from "lucide-react";

interface Props {
  appointmentId: number;
  doctorName: string;
  consultationFee: number | string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: number) => void;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function PaymentCheckoutModal({
  appointmentId,
  doctorName,
  consultationFee,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [razorpayScriptLoaded, setRazorpayScriptLoaded] = useState(false);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const [accountMethods, setAccountMethods] = useState<{
    upi: boolean;
    card: boolean;
    netbanking: boolean;
    wallet: boolean;
    keyIdPrefix?: string;
  } | null>(null);

  // Check live Razorpay merchant account capabilities
  useEffect(() => {
    if (isOpen) {
      fetch("/api/payment-methods")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setAccountMethods(data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Load official Razorpay checkout script if not already present
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.Razorpay) {
        setRazorpayScriptLoaded(true);
        return;
      }
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (existingScript) {
        setRazorpayScriptLoaded(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setRazorpayScriptLoaded(true);
      script.onerror = () => setRazorpayScriptLoaded(false);
      document.body.appendChild(script);
    }
  }, []);

  if (!isOpen) return null;

  const handleStartPayment = async (forceMockSimulation = false) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Initialize order on server (fee fetched securely from DB)
      const orderRes = await createPaymentOrderAction(appointmentId);
      if (!orderRes.success || !orderRes.data) {
        setError(orderRes.error || "Failed to initialize payment order.");
        setLoading(false);
        return;
      }

      const {
        orderId,
        amount,
        currency,
        keyId,
        paymentId,
        patientName,
        patientEmail,
        patientPhone,
        isLive,
      } = orderRes.data;

      // 2A. If genuine Razorpay keys are configured and real checkout is selected
      const hasRealKeys = isLive && keyId && keyId.startsWith("rzp_");

      if (hasRealKeys && !forceMockSimulation) {
        // Ensure Razorpay Checkout script is ready
        if (!window.Razorpay) {
          setError(
            "Razorpay Checkout SDK is still loading. Please check your internet connection and try again."
          );
          setLoading(false);
          return;
        }

        // 2B. Build official Razorpay Checkout options with prioritized UPI / QR Code
        const options = {
          key: keyId,
          amount,
          currency: currency || "INR",
          name: "Medrella Healthcare",
          description: `Consultation Fee with ${doctorName}`,
          order_id: orderId,
          prefill: {
            name: patientName || "",
            email: patientEmail || "",
            contact: patientPhone || "",
          },
          notes: {
            appointment_id: String(appointmentId),
            doctor_name: doctorName,
          },
          theme: {
            color: "#1B3B2B", // Forest green branding
          },
          config: {
            display: {
              blocks: {
                cards: {
                  name: "Cards",
                  instruments: [{ method: "card" }],
                },
                netbanking: {
                  name: "NetBanking & Wallets",
                  instruments: [
                    { method: "netbanking" },
                    { method: "wallet" },
                  ],
                },
                upi: {
                  name: "UPI",
                  instruments: [
                    {
                      method: "upi",
                      flows: ["qr", "intent", "collect"],
                    },
                  ],
                },
              },
              sequence: ["block.cards", "block.netbanking", "block.upi"],
              preferences: {
                show_default_blocks: true,
              },
            },
          },
          modal: {
            ondismiss: async function () {
              setLoading(false);
              setVerifying(false);
              // Handle patient closing checkout without paying (abandoned payment)
              await recordPaymentAbandonedAction({
                appointmentId,
                paymentId,
                orderId,
                reason:
                  "Patient closed Razorpay Checkout popup without completing payment.",
              });
              setError(
                "Checkout was closed without completing payment. Your appointment reservation remains pending."
              );
            },
            escape: true,
            backdropclose: false,
          },
          handler: async function (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) {
            setVerifying(true);
            setLoading(false);

            // Server-side cryptographic HMAC verification
            const verifyRes = await verifyPaymentAction({
              appointmentId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setVerifying(false);

            if (verifyRes.success && verifyRes.data) {
              setSuccessMessage("Payment captured and cryptographically verified!");
              setTimeout(() => {
                onSuccess(verifyRes.data!.paymentId);
              }, 1200);
            } else {
              setError(
                verifyRes.error ||
                  "Cryptographic payment signature mismatch. Transaction flagged."
              );
            }
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", async function (response: any) {
          setLoading(false);
          setVerifying(false);
          setError(
            response.error?.description ||
              "Payment authorization was declined by the bank or gateway."
          );
        });

        setLoading(false);
        rzp.open();
        return;
      }

      // 2C. If keys are missing and patient clicked real checkout, or explicitly clicked sandbox test
      if (!hasRealKeys && !forceMockSimulation) {
        setLoading(false);
        setError(
          "Razorpay Test Mode credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are not configured in your environment. You can run in Sandbox Mock Mode below, or configure keys to test real Razorpay Checkout."
        );
        setShowConfigHelp(true);
        return;
      }

      // 2D. Explicit Sandbox Simulation (Dev Mode Only)
      setLoading(false);
      setVerifying(true);

      const mockPaymentId = `pay_mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const mockSignature = `mock_sig_${orderId}_${mockPaymentId}_validated`;

      const verifyRes = await verifyPaymentAction({
        appointmentId,
        razorpayOrderId: orderId,
        razorpayPaymentId: mockPaymentId,
        razorpaySignature: mockSignature,
      });

      setVerifying(false);

      if (verifyRes.success && verifyRes.data) {
        setSuccessMessage("Sandbox Mock Payment captured successfully!");
        setTimeout(() => {
          onSuccess(verifyRes.data!.paymentId);
        }, 1200);
      } else {
        setError(verifyRes.error || "Sandbox verification failed.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected payment error occurred."
      );
      setLoading(false);
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="clinic-card w-full max-w-md overflow-hidden shadow-2xl bg-white border border-warm-border">
        {/* Modal Header */}
        <div className="p-6 bg-forest text-ivory flex items-center justify-between border-b border-forest-dark">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-dark flex items-center justify-center text-sage">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-sage block font-sans">
                Official Razorpay Checkout
              </span>
              <h3 className="font-serif text-lg font-bold text-white">
                Online Consultation Payment
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ivory/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Fee Summary */}
          <div className="p-4 rounded-xl bg-ivory-light border border-warm-border space-y-3">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Attending Specialist</span>
              <span className="font-semibold text-ink">{doctorName}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Consultation Reference</span>
              <span className="font-mono text-ink">
                #APT-{String(appointmentId).padStart(5, "0")}
              </span>
            </div>
            <div className="pt-2 border-t border-warm-border flex items-center justify-between">
              <span className="text-xs font-bold text-ink">Total Fee Due</span>
              <span className="font-serif text-2xl font-bold text-terracotta">
                {formatINR(consultationFee)}
              </span>
            </div>
          </div>

          {/* Supported Methods Pill */}
          <div className="p-3 rounded-lg bg-sage-light/40 border border-sage-dark/30 flex items-center justify-between text-xs text-forest">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-forest shrink-0" />
              <span className="font-medium">Cards, NetBanking &amp; Online Payment</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-forest text-ivory px-2 py-0.5 rounded">
              INR
            </span>
          </div>

          {/* Live Razorpay Merchant Capabilities Status */}
          {accountMethods && !accountMethods.upi && (
            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs space-y-1 text-amber-900 font-sans">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Razorpay Gateway Payment Methods ({accountMethods.keyIdPrefix})</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Cards, NetBanking, and Wallets are active for online consultation payments.
                UPI availability is governed by your Razorpay merchant account activation in the dashboard.
              </p>
            </div>
          )}

          {accountMethods && accountMethods.upi && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Cards, NetBanking &amp; UPI active on merchant account ({accountMethods.keyIdPrefix})</span>
            </div>
          )}

          {/* Feedback messages */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg space-y-2 text-xs text-rose-800">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{error}</div>
              </div>
            </div>
          )}

          {showConfigHelp && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1.5 font-sans">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <Info className="w-3.5 h-3.5 text-amber-700" />
                <span>To Enable Real Razorpay Test Mode:</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Add your Razorpay Test Key pair into your <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env.local</code> file:
              </p>
              <div className="bg-white/80 p-2 rounded border border-amber-200 font-mono text-[10px] space-y-0.5 text-ink">
                <div>NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...</div>
                <div>RAZORPAY_KEY_ID=rzp_test_...</div>
                <div>RAZORPAY_KEY_SECRET=your_test_key_secret</div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="font-semibold">{successMessage}</div>
            </div>
          )}

          {verifying && (
            <div className="p-4 bg-sage-light border border-sage-dark/40 rounded-lg text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-forest mx-auto" />
              <p className="text-xs font-semibold text-forest">
                Cryptographically Verifying Server-Side Signature...
              </p>
              <p className="text-[11px] text-ink-muted">
                Validating HMAC-SHA256 signature against secret to prevent payment tampering.
              </p>
            </div>
          )}

          {/* Action buttons */}
          {!verifying && !successMessage && (
            <div className="space-y-2.5 pt-2">
              {/* Primary Real Razorpay Checkout Action */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStartPayment(false)}
                className="btn-forest w-full py-3.5 text-sm font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-ivory" />
                    <span>Opening Razorpay Gateway...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-sage" />
                    <span>Pay Online via Razorpay ({formatINR(consultationFee)})</span>
                  </>
                )}
              </button>

              {/* Explicitly Labelled Development Sandbox Mode */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStartPayment(true)}
                className="w-full py-2.5 text-xs font-semibold text-ink/70 hover:text-ink bg-ivory-light hover:bg-warm-border/30 border border-warm-border rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-terracotta" />
                <span>Simulate Mock Sandbox Payment (Dev / QA Only)</span>
              </button>
            </div>
          )}

          {/* Security badge */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink-muted pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-forest" />
            <span>256-bit encrypted • Server-Side HMAC-SHA256 Signature Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
