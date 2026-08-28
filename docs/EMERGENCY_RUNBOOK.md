# 🚨 Emergency Downtime & Incident Response Runbook

This document provides step-by-step procedures for handling server outages, payment gateway disruptions, and executing break-glass emergency procedures for Rerendet Farm.

---

## 8-Step Emergency Response Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. DETECT   │ ──> │  2. CONTAIN  │ ──> │3. COMMUNICATE│ ──> │  4. ASSESS   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                                                              │
       ▼                                                              ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 8. POST-MORT │ <── │ 7. RECONCILE │ <── │  6. RECOVER  │ <── │5. BREAK-GLASS│
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

### Step 1: Detect
- **Triggers**: Cloudinary/Redis/MongoDB health monitor fires alert, rate limit/5xx error spike, or customer report.
- **Verification**: Check application status via `/api/health` or server logs.

### Step 2: Contain (Prevent Double Charging)
- If checkout or payment gateway is unstable, **enable Maintenance Mode immediately** to prevent customers from attempting checkouts mid-outage:
  ```bash
  # Via Break-Glass CLI:
  node scripts/breakGlassEmergency.js maintenance on
  ```
  *(Or flip Maintenance Mode toggle in Admin Settings if web panel is reachable).*

### Step 3: Communicate
- Update independent status page or customer notice:
  * *"Checkout is temporarily paused for maintenance. Orders already placed are safe — please do not retry payments."*

### Step 4: Assess Infrastructure Failure Point
- Test individual infrastructure components:
  1. **Database**: `mongosh "$MONGODB_URI"` or provider portal dashboard.
  2. **Application Server**: Node.js process / Vercel deployment status.
  3. **Payment Provider**: Check Safaricom Daraja API status / PayPal Status Portal.

### Step 5: Break-Glass Emergency Data Access
- If application server is down but MongoDB is reachable, use the **Break-Glass CLI Tool** to inspect state:
  ```bash
  # Check live database status and pending orders:
  node scripts/breakGlassEmergency.js status

  # Export recent paid orders JSON:
  node scripts/breakGlassEmergency.js dump-orders
  ```

### Step 6: Recover
- Restart app server / redeploy build.
- Perform sanity check on health route: `curl -I https://rerendet-farm.vercel.app/api/health`.
- Turn Maintenance Mode off:
  ```bash
  node scripts/breakGlassEmergency.js maintenance off
  ```

### Step 7: Reconcile (Catch Missed Webhooks)
- Run the payment reconciliation tool to process any delayed Daraja/PayPal webhooks delivered during the outage window:
  ```bash
  node scripts/breakGlassEmergency.js reconcile
  ```

### Step 8: Post-Incident Review
- Log outage duration, root cause, and audit actions in `ActivityLog`.

---

## Safety Guarantees During Outages

1. **Payment Webhook Retries**: M-Pesa & PayPal retry failed webhook payloads automatically for up to 24 hours. Once the server recovers, incoming webhooks process idempotently.
2. **Ledger Persistence**: All orders and transactions persist in MongoDB independently of application server state.
3. **Double-Charge Protection**: Maintenance mode blocks new checkout attempts while payment reconciliation resolves pending transactions safely.
