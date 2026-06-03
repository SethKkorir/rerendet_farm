# Standard Operating Procedure (SOP): Order Fulfillment
**Role:** Fulfillment Officers, Roastery Staff, and Cashiers  
**Objective:** Maintain 100% accuracy in physical coffee packing, courier handoff, and payment validation.

---

## 1. Physical Order Packing Checklist

Before sealing any shipping package, fulfillment staff must verify the physical parameters against the digital order receipt.

- [ ] **Item & SKU Verification:**
  - Check the coffee variety (e.g., Single Origin Arabica vs Blend).
  - Match the roast profile (Light, Medium, Medium-Dark, Dark, Espresso) against the label.
- [ ] **Grind Profile Check:**
  - Verify if the customer selected **Whole Beans** or a specific grind size (e.g., **Fine/Espresso**, **Medium/Drip**, **Coarse/French Press**).
- [ ] **Weight Audit:**
  - Weigh the package on a calibrated digital scale.
  - Ensure net weight matches the ordered size (**250g**, **500g**, or **1kg**) with a maximum tolerance of $+5\text{g}$ (never underweight).
- [ ] **Sealing & Freshness Integrity:**
  - Inspect the degassing valve on the bag; it must be free of debris.
  - Apply the heat sealer to the top header for exactly 2 seconds. Verify that the seal is 100% airtight and shows no creases.
- [ ] **Packing Slip Insertion:**
  - Print the invoice/packing slip via the admin console (`GET /api/orders/:id/invoice`).
  - Place the slip inside the secondary shipping envelope along with the coffee bags.

---

## 2. Dispatch Stages & Tracking Workflow

Orders must transition sequentially through the fulfillment lifecycle to ensure tracking notifications trigger correctly.

```
[Unfulfilled] ➔ [Packed] ➔ [Shipped] ➔ [Delivered]
```

### Stage Procedures
*   **Unfulfilled (Default):** The order has been paid or confirmed via COD but has not been assembled.
*   **Packed:** The physical items are sealed and boxed. Update the digital status to `packed` (`fulfillmentStatus`).
*   **Shipped:** 
    1.  The tracking number (automatically generated in the format `RCxxxxxx` where `x` is alphanumeric) must be verified on the package label.
    2.  Update the status to `shipped` via the admin panel (`PUT /api/orders/:id/status`). 
    3.  *Note: The system will block saving an order as `shipped` if the tracking number is missing.*
    4.  The system automatically sends a shipping confirmation email to the customer.
*   **Delivered:**
    1.  Upon confirmation of delivery from the courier, mark the order as `delivered`.
    2.  This automatically awards the customer their loyalty points (computed at 5% of order total, adjusted for reorder streaks).

---

## 3. Payment Verification Protocol

To prevent dispatching orders on unpaid transactions, cashiers must verify all financial entries.

### A. M-Pesa STK Push Transactions
*   **Automated Verification:** The Safaricom Daraja API updates the order `paymentStatus` to `paid` upon successful PIN entry.
*   **Manual Override Audit:**
    1.  If a client completes payment but the API status remains `pending`, request the transaction code (e.g., `SFC89X12YZ`).
    2.  Search the admin Safaricom statement dashboard for the code.
    3.  Once verified, enter the code in the **Manual Transaction ID** (`manualTransactionId`) field.
    4.  Update `paymentVerificationStatus` to `verified` and `paymentStatus` to `paid`.
    5.  If no matching transaction is found in Safaricom records, mark `paymentVerificationStatus` as `rejected`.

### B. Cash on Delivery (COD) Transactions
- [ ] Verify that the order's `paymentMethod` is explicitly set to `cashOnDelivery`.
- [ ] Instruct the courier to collect cash or M-Pesa Paybill payment *before* releasing the package to the customer.
- [ ] Once the courier confirms receipt of funds, the cashier must update `paymentStatus` to `paid` and `fulfillmentStatus` to `delivered` in the admin console.
- [ ] Log a transaction note with the courier receipt number for auditing.
