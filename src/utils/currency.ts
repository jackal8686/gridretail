/**
 * GridRetail Currency Formatting Utility
 * Standardizes all e-commerce prices to Indian Rupees (INR / ₹).
 */

export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_CURRENCY_SYMBOL = "₹";

/**
 * Formats a numeric price into standard Indian Rupee notation (en-IN).
 * e.g., 499 -> "₹499.00", 1299 -> "₹1,299.00", 25000 -> "₹25,000.00"
 */
export function formatINR(amount: number | null | undefined): string {
  const numericValue = typeof amount === "number" && !isNaN(amount) ? amount : 0;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    // Fallback if Intl is unavailable or fails
    const parts = numericValue.toFixed(2).split(".");
    let integerPart = parts[0];
    const decimalPart = parts[1];

    // Standard Indian numbering grouping: last 3 digits, then groups of 2
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    if (otherNumbers !== "") {
      integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    }

    return `₹${integerPart}.${decimalPart}`;
  }
}

/**
 * Standard price formatter supporting currency codes with INR as platform standard.
 */
export function formatPrice(amount: number | null | undefined, currency: string = DEFAULT_CURRENCY): string {
  if (!currency || currency.toUpperCase() === "INR" || currency === "₹") {
    return formatINR(amount);
  }

  const numericValue = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return `${currency.toUpperCase()} ${numericValue.toFixed(2)}`;
  }
}
