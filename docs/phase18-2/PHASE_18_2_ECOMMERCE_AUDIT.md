# GridRetail — Phase 18.2: E-Commerce Catalog, Storefront, Cart & Checkout Audit

**Date:** 2026-11-23  
**Milestone:** Phase 18.2 — Platform-Wide Functional Audit & Interaction Verification  
**Repository:** `D:\grid`  
**Inspected Components:**
- Platform Products Page: [src/app/products/page.tsx](file:///d:/grid/src/app/products/page.tsx)
- Mock Products Data: [src/mock/products.ts](file:///d:/grid/src/mock/products.ts)
- Product Repository: [src/lib/repositories/product.repository.ts](file:///d:/grid/src/lib/repositories/product.repository.ts)
- Storefront View: [src/components/storefront/StorefrontView.tsx](file:///d:/grid/src/components/storefront/StorefrontView.tsx)
- Product Detail Page (PDP): [src/components/storefront/ProductDetailClient.tsx](file:///d:/grid/src/components/storefront/ProductDetailClient.tsx)
- Cart Drawer: [src/components/storefront/StorefrontCartDrawer.tsx](file:///d:/grid/src/components/storefront/StorefrontCartDrawer.tsx)
- Full Cart Page: [src/components/storefront/CartPageClient.tsx](file:///d:/grid/src/components/storefront/CartPageClient.tsx)
- Checkout Page: [src/components/storefront/CheckoutPageClient.tsx](file:///d:/grid/src/components/storefront/CheckoutPageClient.tsx)

---

## 1. Platform Products Catalog Page (`/products`)

### 1.1 In-Memory Mock Isolation & Placeholder Modals (DEF-010, DEF-011)
The operator Products page ([src/app/products/page.tsx](file:///d:/grid/src/app/products/page.tsx)) was audited for data connectivity and interactive controls.

#### Key Findings:
1. **Disconnected from Database / API (DEF-010):**
   - The page imports static mock data directly: `import { MOCK_PRODUCTS } from '@/mock/products';`.
   - It does not fetch from `/api/products` or interact with `ProductRepository`.
   - Changes to products made in generated stores are never reflected on this global catalog page.
2. **"Add Product SKU" Shows Placeholder Modal (DEF-011):**
   - Clicking the primary action button `+ Add Product SKU` triggers `setShowAddModal(true)`.
   - This renders a `PlaceholderModal` stating:
     `"Add Product SKU is an upcoming capability. Global SKU synchronization will be released in an upcoming platform update."`
   - No form exists to create a new product on this page.
3. **"Details" / Row Actions Show Placeholder Modal:**
   - Clicking `"Details"` or `"Edit"` on any product row similarly triggers `PlaceholderModal`.
   - There is no UI to modify price, adjust stock inventory, or upload new images from this screen.
- **Severity:** P2 (Medium Severity — Mock Isolation & Placeholder Actions).

---

## 2. E-Commerce Storefront Architecture & Navigation

### 2.1 Storefront Sections & Product Display
For stores generated with `websiteType: 'ecommerce'` (e.g. Botanica Apothecary, Aura Minimalist):
- **Hero Section:** Features high-resolution imagery, brand mission statement, and primary CTA (`Shop Now` or `Explore Catalog`).
- **Featured Collection Grid:** Renders curated product cards with prices, ratings, and instant `"Add to Bag"` buttons.
- **Category Filter Tabs:** Allows filtering products by category (`Skincare`, `Wellness`, `Accessories`).
- **Responsive Layout:** Responsive grid adapting from 4 columns on desktop, 2 on tablet, and 1 on mobile.

---

## 3. Shopping Cart System (Drawer & Dedicated Page)

### 3.1 Cart Drawer (`StorefrontCartDrawer.tsx`)
- Clicking "Add to Bag" on any product card or PDP immediately invokes `useStorefrontCart().addItem()`.
- The slide-out cart drawer smoothly animates from the right edge.
- Shows item title, thumbnail, price, quantity increment/decrement controls, and remove item trash icon.
- Calculates subtotal in real-time.
- Provides two footer actions:
  - `View Cart`: Navigates to `/store/[slug]/cart`.
  - `Proceed to Checkout`: Navigates to `/store/[slug]/checkout`.

### 3.2 Full-Page Shopping Cart (`CartPageClient.tsx`)
- Displays an expanded tabular layout of cart items.
- Supports coupon / promo code input (accepts test coupon `"DEMO10"` for a 10% discount).
- Shipping estimate calculator and tax computation.
- Seamlessly transitions to checkout.

---

## 4. E-Commerce Checkout Flow & Simulation Status (DEF-012)

### 4.1 Multi-Step Checkout Experience
The checkout flow ([src/components/storefront/CheckoutPageClient.tsx](file:///d:/grid/src/components/storefront/CheckoutPageClient.tsx)) provides a 3-step wizard:
1. **Customer & Shipping Information:** Name, email, shipping address, city, postal code. Form validation ensures required fields are filled.
2. **Shipping Method:** Standard Ground ($5.00) or Express Overnight ($15.00). Subtotal updates automatically.
3. **Payment Method:** Credit Card, PayPal, or Cash on Delivery options.

### 4.2 Simulated Order Placement (DEF-012)
- **Technical Analysis:**
  When the customer clicks `"Place Order"`:
  ```tsx
  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    // Client-side simulation
    setTimeout(() => {
      const orderId = `ORD-SIM-${Date.now().toString(36).toUpperCase()}`;
      setOrderConfirmation({ id: orderId, total: grandTotal });
      clearCart();
      setIsSubmitting(false);
      setStep('confirmed');
    }, 1500);
  };
  ```
- **The Issue:**
  GridRetail does not possess an `OrderRepository` or `orders` collection in MongoDB. The order completion is executed entirely within client-side memory using a fake `setTimeout`.
- **Impact:**
  No order record is recorded in the platform database. Operators cannot see completed customer orders on their dashboard, and no order confirmation email is transmitted.
- **Severity:** P2 (Medium Severity — Simulated Non-Persisted Flow).

---

## 5. Visual Proof Screenshot References

| Screenshot Filename | Viewport | Verified Behavior |
|---|---|---|
| [20-products-page.png](file:///d:/grid/docs/screenshots/phase18-2/20-products-page.png) | 1440 × 900 | Global Products page listing mock SKUs with filter controls |
| [20b-add-product-placeholder-modal.png](file:///d:/grid/docs/screenshots/phase18-2/20b-add-product-placeholder-modal.png) | 1440 × 900 | Evidence of `DEF-011`: Placeholder modal triggered by "Add Product SKU" |
| [34-storefront-ecommerce.png](file:///d:/grid/docs/screenshots/phase18-2/34-storefront-ecommerce.png) | 1440 × 900 | Public E-Commerce storefront featuring product hero and catalog grid |
