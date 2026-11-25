"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Store, Product } from "@/types";
import { Template } from "@/types/template";
import { resolveColorTokens } from "@/constants/themes";
import { useCart, parseCartItemKey } from "@/context/CartContext";
import { formatINR } from "@/utils/currency";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  CreditCard,
} from "lucide-react";

interface CheckoutPageClientProps {
  store: Store;
  products: Product[];
  template: Template | null;
  storeSlug: string;
}

export function CheckoutPageClient({
  store,
  products,
  storeSlug,
}: CheckoutPageClientProps) {
  const { lineItems, clearCart, totalQuantity } = useCart();

  const themeId = store.themeId || "minimal-stone";
  const tokens = resolveColorTokens(themeId);
  const primaryColor = store.branding?.primaryColor || tokens.primary;

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [postalCode, setPostalCode] = useState("400001");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string>("");
  const [completedOrderStatus, setCompletedOrderStatus] = useState<string>("Confirmed");
  const [completedPaymentStatus, setCompletedPaymentStatus] = useState<string>("Simulated_Demo_Authorized");
  const [completedSubtotal, setCompletedSubtotal] = useState<number>(0);
  const [completedTax, setCompletedTax] = useState<number>(0);
  const [completedTaxPolicy, setCompletedTaxPolicy] = useState<string>("unconfigured_zero_tax");
  const [completedGrandTotal, setCompletedGrandTotal] = useState<number>(0);

  const cartEntries = Object.entries(lineItems);
  const cartSubtotal = cartEntries.reduce((sum, [, item]) => {
    const prod = products.find((p) => p.id === item.productId);
    return sum + (prod ? prod.price * item.quantity : 0);
  }, 0);

  const storeTaxRate = typeof (store as unknown as { taxRate?: number }).taxRate === "number" && (store as unknown as { taxRate?: number }).taxRate! >= 0
    ? (store as unknown as { taxRate?: number }).taxRate!
    : 0;
  const estimatedTax = Math.round(cartSubtotal * storeTaxRate);
  const estimatedTotal = cartSubtotal + estimatedTax;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartEntries.length === 0) return;

    setIsSubmitting(true);
    setOrderError(null);

    const idempotencyKey = `idem_${store.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const items = cartEntries.map(([, item]) => {
      const prod = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        name: prod?.name || "Product SKU",
        price: prod ? prod.price : 0,
        quantity: item.quantity,
        variant: item.variant,
      };
    });

    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          storeSlug,
          idempotencyKey,
          customer: {
            fullName: fullName || "Demo Customer",
            email: email || "customer@example.demo",
            phone: phone || "+1 555-0100",
            streetAddress: streetAddress || "123 Demo St",
            city: city || "Mumbai",
            postalCode: postalCode || "400001",
            notes,
          },
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("Duplicate order submission detected. Your order has already been received within the last 60 seconds.");
        }
        throw new Error(data.error || "Failed to submit demo order.");
      }

      const ord = data.order;
      setCompletedOrderNumber(ord.orderNumber);
      setCompletedOrderStatus(ord.status || "Confirmed");
      setCompletedPaymentStatus(ord.paymentStatus || "Simulated_Demo_Authorized");
      setCompletedSubtotal(ord.subtotal ?? cartSubtotal);
      setCompletedTax(ord.tax ?? 0);
      setCompletedTaxPolicy(ord.taxPolicy || (storeTaxRate > 0 ? "store_configured" : "unconfigured_zero_tax"));
      setCompletedGrandTotal(ord.grandTotal ?? estimatedTotal);
      setOrderComplete(true);
      clearCart();
    } catch (err: unknown) {
      setOrderError((err as Error).message || "Failed to submit demo order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6"
        style={{ backgroundColor: tokens.background, color: tokens.text }}
      >
        <div
          className="max-w-lg w-full rounded-2xl border p-6 sm:p-8 text-center space-y-6 shadow-xl"
          style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div>
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border text-emerald-800 bg-emerald-50 border-emerald-200"
            >
              Demo Simulation Completed
            </span>
            <h1 className="text-2xl font-black mt-3" style={{ color: tokens.text }}>
              Order Placed Successfully!
            </h1>
            <p className="text-xs mt-1" style={{ color: tokens.textMuted }}>
              Thank you for exploring the GridRetail demonstration checkout journey for {store.name}.
            </p>
          </div>

          {/* Explicit separation of Order Confirmation vs Simulated Payment Status */}
          <div
            className="p-4 rounded-xl border text-left text-xs space-y-2.5"
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
          >
            <div className="flex justify-between items-center">
              <span style={{ color: tokens.textMuted }}>Order Number:</span>
              <span className="font-mono font-bold" style={{ color: tokens.text }}>{completedOrderNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: tokens.textMuted }}>Order Status:</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                {completedOrderStatus}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: tokens.textMuted }}>Payment Status:</span>
              <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px]">
                {completedPaymentStatus === "Simulated_Demo_Authorized"
                  ? "Simulated Demo Authorization"
                  : completedPaymentStatus}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: tokens.textMuted }}>Customer:</span>
              <span className="font-medium" style={{ color: tokens.text }}>{fullName || "Demo Guest"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: tokens.textMuted }}>Delivery Destination:</span>
              <span className="font-medium" style={{ color: tokens.text }}>{city}, India</span>
            </div>

            <div className="pt-2 border-t space-y-1" style={{ borderColor: tokens.border }}>
              <div className="flex justify-between">
                <span style={{ color: tokens.textMuted }}>Items Subtotal:</span>
                <span className="font-medium" style={{ color: tokens.text }}>{formatINR(completedSubtotal)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span style={{ color: tokens.textMuted }}>
                  Tax {completedTaxPolicy === "store_configured" ? `(${Math.round((completedTax / (completedSubtotal || 1)) * 100)}% Store Tax)` : "(0% Unconfigured Store Policy)"}:
                </span>
                <span className="font-medium" style={{ color: tokens.text }}>{formatINR(completedTax)}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold border-t" style={{ borderColor: tokens.border }}>
                <span style={{ color: tokens.text }}>Total Simulated Due:</span>
                <span className="font-black text-sm" style={{ color: primaryColor }}>{formatINR(completedGrandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] text-left flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Simulation Notice:</strong> This order confirmation confirms the simulated submission only. No real payment card was charged, and no funds were transferred.
            </span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href={`/store/${storeSlug}`}
              className="flex-1 py-3 rounded-xl font-bold text-xs text-white shadow-md text-center"
              style={{ backgroundColor: primaryColor }}
            >
              Return to Storefront
            </Link>
            <Link
              href={`/store/${storeSlug}/collections`}
              className="flex-1 py-3 rounded-xl font-semibold text-xs border text-center hover:bg-stone-100/50 transition-colors"
              style={{ borderColor: tokens.border, color: tokens.text }}
            >
              Continue Browsing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: tokens.background, color: tokens.text }}
    >
      {/* Top Header */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{
          backgroundColor: `${tokens.surface}F0`,
          borderColor: tokens.border,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/store/${storeSlug}/cart`}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border hover:bg-stone-200/50 transition-colors"
              style={{ borderColor: tokens.border, color: tokens.text }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Cart</span>
            </Link>
            <span className="hidden sm:inline font-bold text-sm" style={{ color: tokens.text }}>
              {store.name} — Secure Demo Checkout
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
            <Lock className="h-3.5 w-3.5" />
            <span>Demo Simulation Mode</span>
          </div>
        </div>
      </header>

      {/* Main Checkout View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Simulated E-Commerce Checkout</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: tokens.text }}>
            Complete Your Simulated Order
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: tokens.textMuted }}>
            All prices are denominated in Indian Rupees (₹). No payment card required.
          </p>
        </div>

        {cartEntries.length === 0 ? (
          <div
            className="p-12 rounded-2xl border text-center space-y-4 max-w-md mx-auto my-12"
            style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
          >
            <p className="font-semibold text-sm" style={{ color: tokens.text }}>
              Your cart is empty. Please add products to simulate checkout.
            </p>
            <Link
              href={`/store/${storeSlug}/collections`}
              className="inline-block py-2.5 px-5 rounded-xl font-bold text-xs text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Explore Collections
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Form Fields: Shipping & Contact */}
            <div className="lg:col-span-7 space-y-6">
              {orderError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {orderError}
                </div>
              )}
              {/* Customer Contact */}
              <div
                className="p-6 rounded-2xl border space-y-4"
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: tokens.text }}>
                  1. Contact Information
                </h2>
                <p className="text-[11px]" style={{ color: tokens.textMuted }}>
                  Demonstration Notice: Details entered below are used only to generate this demo receipt in your browser. No personal data is stored or transmitted.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold" style={{ color: tokens.text }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1"
                      style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold" style={{ color: tokens.text }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="priya@example.in"
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1"
                      style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold" style={{ color: tokens.text }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1"
                      style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div
                className="p-6 rounded-2xl border space-y-4"
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: tokens.text }}>
                  2. Courier Delivery Address
                </h2>
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold" style={{ color: tokens.text }}>
                      Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="42 Heritage Enclave, MG Road"
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1"
                      style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold" style={{ color: tokens.text }}>
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Mumbai"
                        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1"
                        style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold" style={{ color: tokens.text }}>
                        State
                      </label>
                      <input
                        type="text"
                        defaultValue="Maharashtra"
                        className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                        style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                      />
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <label className="font-semibold" style={{ color: tokens.text }}>
                        PIN Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="400001"
                        className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                        style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="font-semibold" style={{ color: tokens.text }}>
                      Delivery Notes / Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Near City Center Mall, leave at front reception"
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                      style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Mode Disclaimers */}
              <div
                className="p-6 rounded-2xl border space-y-3"
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: tokens.text }}>
                  3. Simulated Payment Selection
                </h2>
                <div
                  className="p-3.5 rounded-xl border flex items-center justify-between"
                  style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
                >
                  <div className="flex items-center gap-3 text-xs">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="font-bold" style={{ color: tokens.text }}>
                        Demo Simulated Instant Pay (₹ INR)
                      </p>
                      <p className="text-[11px]" style={{ color: tokens.textMuted }}>
                        Zero-charge interactive checkout simulation for client review.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-5">
              <div
                className="rounded-2xl border p-6 space-y-5 sticky top-24"
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <h2 className="font-bold text-base" style={{ color: tokens.text }}>
                  Order Review ({totalQuantity} items)
                </h2>

                {/* Items preview list */}
                <div className="max-h-60 overflow-y-auto space-y-3 divide-y" style={{ borderColor: tokens.border }}>
                  {cartEntries.map(([itemKey, item]) => {
                    const prod = products.find((p) => p.id === item.productId);
                    if (!prod) return null;
                    const { variant } = parseCartItemKey(itemKey);
                    const displayVariant = item.variant || variant;

                    return (
                      <div key={itemKey} className="pt-2 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold truncate" style={{ color: tokens.text }}>
                            {prod.name}
                          </p>
                          <p className="text-[11px]" style={{ color: tokens.textMuted }}>
                            Qty: {item.quantity} {displayVariant ? `• ${displayVariant}` : ""}
                          </p>
                        </div>
                        <span className="font-bold shrink-0" style={{ color: tokens.text }}>
                          {formatINR(prod.price * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="border-t pt-3 space-y-2 text-xs" style={{ borderColor: tokens.border }}>
                  <div className="flex justify-between">
                    <span style={{ color: tokens.textMuted }}>Subtotal</span>
                    <span className="font-semibold" style={{ color: tokens.text }}>{formatINR(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: tokens.textMuted }}>
                      {storeTaxRate > 0 ? `Tax (${Math.round(storeTaxRate * 100)}% Store Tax)` : "Tax (0% Unconfigured Policy)"}
                    </span>
                    <span className="font-medium" style={{ color: tokens.text }}>{formatINR(estimatedTax)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t text-sm" style={{ borderColor: tokens.border }}>
                    <span className="font-bold" style={{ color: tokens.text }}>Total Due</span>
                    <span className="font-black text-lg" style={{ color: primaryColor }}>{formatINR(estimatedTotal)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? (
                    <span>Processing Demo Simulation...</span>
                  ) : (
                    <>
                      <span>Place Simulated Order ({formatINR(estimatedTotal)})</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center" style={{ color: tokens.textMuted }}>
                  By clicking Place Simulated Order, you agree that this transaction is a demonstration exercise with no real payment or physical fulfilment.
                </p>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
