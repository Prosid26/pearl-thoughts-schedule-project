import { NextResponse } from "next/server";

export async function GET() {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId) {
      return NextResponse.json(
        { success: false, error: "Razorpay Key ID not configured in environment." },
        { status: 400 }
      );
    }

    // Razorpay Methods API requires HTTP Basic Auth with Key ID only (Key Secret is omitted)
    const authHeader = `Basic ${Buffer.from(`${keyId}:`).toString("base64")}`;
    const res = await fetch("https://api.razorpay.com/v1/methods", {
      headers: {
        Authorization: authHeader,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { success: false, error: "Failed to query Razorpay Methods API", details: errText },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      keyIdPrefix: keyId.slice(0, 10) + "...",
      upi: Boolean(data.upi),
      upi_intent: Boolean(data.upi_intent),
      card: Boolean(data.card),
      netbanking: Boolean(data.netbanking && Object.keys(data.netbanking).length > 0),
      wallet: Boolean(data.wallet && Object.keys(data.wallet).length > 0),
      dashboardActivationRequired: !data.upi,
      recommendation: !data.upi
        ? "UPI is currently turned OFF on your Razorpay account. Enable it in Razorpay Dashboard -> Account & Settings -> Payment Methods -> UPI."
        : "UPI and QR code payments are active on your Razorpay account.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal error querying payment methods." },
      { status: 500 }
    );
  }
}

