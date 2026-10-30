import crypto from "crypto";

/**
 * Cryptographic Unsubscribe Token Generator & Validator
 * Allows patients to securely unsubscribe from email updates without logging in.
 */

function getSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "medrella_unsub_secret_key_2026_fallback"
  );
}

export function generateUnsubscribeToken(
  userId: number,
  email: string
): string {
  const secret = getSecret();
  const normalizedEmail = email.toLowerCase().trim();
  const timestamp = Date.now();
  const data = `${userId}:${normalizedEmail}:${timestamp}`;

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  return Buffer.from(`${data}:${hmac}`).toString("base64url");
}

export function verifyUnsubscribeToken(
  token: string
): { userId: number; email: string; timestamp: number } | null {
  if (!token) return null;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;

    const [userIdStr, email, timestampStr, signature] = parts;
    const userId = parseInt(userIdStr, 10);
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(userId) || isNaN(timestamp) || !email || !signature) {
      return null;
    }

    const secret = getSecret();
    const data = `${userIdStr}:${email}:${timestampStr}`;
    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("hex");

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedHmac, "hex")
    );

    if (!valid) return null;

    return {
      userId,
      email,
      timestamp,
    };
  } catch {
    return null;
  }
}

