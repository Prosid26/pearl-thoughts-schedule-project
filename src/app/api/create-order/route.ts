import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let { amount, currency, receipt, appointmentId, notes } = body;

    // If appointmentId is provided and amount is not explicitly provided, resolve fee from database
    if (appointmentId && (!amount || isNaN(Number(amount)))) {
      const appt = await db.getAppointmentById(Number(appointmentId));
      if (!appt || !appt.doctor) {
        return NextResponse.json(
          { error: "Appointment or associated doctor record not found." },
          { status: 404 }
        );
      }
      const docFee = Number(appt.doctor.consultation_fee) || 500;
      amount = Math.round(docFee * 100); // Convert to paise
    }

    // Minimum amount validation: at least 100 paise (₹1)
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 100) {
      return NextResponse.json(
        { error: "Invalid amount. Minimum amount required is 100 paise (₹1)." },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const receiptId = receipt || `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const orderNotes = notes || {};
    if (appointmentId) {
      orderNotes.appointment_id = String(appointmentId);
    }

    const orderOptions = {
      amount: Math.round(numericAmount),
      currency: currency || "INR",
      receipt: receiptId,
      notes: orderNotes,
    };

    const order = await razorpay.orders.create(orderOptions);

    // If linked to an appointment, record payment in DB
    if (appointmentId) {
      try {
        const appt = await db.getAppointmentById(Number(appointmentId));
        if (appt && appt.patient_id) {
          await db.createPayment({
            appointmentId: Number(appointmentId),
            patientId: appt.patient_id,
            provider: "razorpay",
            providerOrderId: order.id,
            amount: Number(order.amount),
            currency: order.currency,
            idempotencyKey: `pay_order_init_${order.id}`,
          });
        }
      } catch (dbErr) {
        console.warn("Could not record payment in database:", dbErr);
      }
    }

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    const statusCode = error.statusCode || 500;
    const errorMessage = error.error?.description || error.message || "Failed to create Razorpay order.";
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

