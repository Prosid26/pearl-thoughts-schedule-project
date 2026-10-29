"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface RazorpayCheckoutButtonProps {
  amountInPaise: number;
  currency?: string;
  receipt?: string;
  appointmentId?: number;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  buttonText?: string;
  className?: string;
  onSuccess?: (data: { order_id: string; payment_id: string }) => void;
  onFailure?: (error: string) => void;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function RazorpayCheckoutButton({
  amountInPaise,
  currency = "INR",
  receipt,
  appointmentId,
  name = "Medrella Healthcare",
  description = "Online Consultation Fee",
  prefill,
  buttonText = "Pay with Razorpay",
  className = "btn-forest px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer",
  onSuccess,
  onFailure,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Razorpay Standard Checkout SDK
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    setStatus("idle");
    setErrorMessage(null);

    try {
      // Step 1: Create Order via Backend Endpoint
      const createRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          receipt,
          appointmentId,
        }),
      });

      const orderData = await createRes.json();

      if (!createRes.ok || !orderData.order_id) {
        throw new Error(orderData.error || "Failed to create Razorpay order.");
      }

      const keyId =
        orderData.key_id ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        "rzp_test_Ttl82TqJrgtnyV";

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout SDK is still loading. Please check your connection and try again."
        );
      }

      // Step 2: Open Razorpay Standard Checkout Modal
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name,
        description,
        order_id: orderData.order_id,
        prefill: {
          name: prefill?.name || "",
          email: prefill?.email || "",
          contact: prefill?.contact || "",
        },
        theme: {
          color: "#1B3B2B",
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
          ondismiss: () => {
            setLoading(false);
            setVerifying(false);
            setErrorMessage("Checkout closed by user.");
            onFailure?.("Checkout cancelled by user.");
          },
          escape: true,
          backdropclose: false,
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setVerifying(true);
          setLoading(false);

          try {
            // Step 3: Verify Payment Signature via Backend Endpoint
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                appointmentId,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(
                verifyData.error || "Payment signature verification failed."
              );
            }

            setStatus("success");
            setVerifying(false);
            onSuccess?.({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
            });
          } catch (verifyErr: any) {
            setVerifying(false);
            setStatus("error");
            setErrorMessage(verifyErr.message || "Verification failed.");
            onFailure?.(verifyErr.message || "Verification failed.");
          }
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on("payment.failed", (response: any) => {
        setLoading(false);
        setVerifying(false);
        setStatus("error");
        const msg =
          response.error?.description || "Payment failed or was declined.";
        setErrorMessage(msg);
        onFailure?.(msg);
      });

      setLoading(false);
      razorpayInstance.open();
    } catch (err: any) {
      setLoading(false);
      setVerifying(false);
      setStatus("error");
      const msg = err.message || "Checkout failed to initialize.";
      setErrorMessage(msg);
      onFailure?.(msg);
    }
  };

  if (status === "success") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span>Payment Verified</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading || verifying}
        className={className}
      >
        {loading || verifying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-sage" />
            <span>{verifying ? "Verifying..." : "Preparing..."}</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            <span>{buttonText}</span>
          </>
        )}
      </button>

      {status === "error" && errorMessage && (
        <div className="inline-flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

