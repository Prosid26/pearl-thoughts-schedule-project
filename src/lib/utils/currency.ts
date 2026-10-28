/**
 * Utility for formatting currency in Indian Rupees (INR)
 * Adheres to Indian number grouping system (e.g., ₹1,000, ₹15,000, ₹1,00,000)
 */
export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "₹0";
  }

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formats a plain number according to the Indian numbering system
 */
export function formatIndianNumber(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "0";
  }

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return "0";
  }

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(num);
}
