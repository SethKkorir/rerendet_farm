# Rerendet Farm — System Operational Runbook

This runbook provides plain-language operational workflows and diagnostic procedures for Rerendet Farm owners and system administrators. Use this guide to maintain platform availability, handle transaction exceptions, and respond to security alerts.

---

## 1. Handling 503 Service Unavailable Errors

A `503 Service Unavailable` error indicates that the backend server is running but one or more critical infrastructure services failed their automated health checks.

### Diagnostic Workflow
1.  **Access the Health Endpoint:**
    Navigate to `https://your-domain.com/api/health` in a browser or run:
    ```bash
    curl -i https://your-domain.com/api/health
    ```
2.  **Analyze the JSON Response:**
    *   **MongoDB Status `"unhealthy"`:** The database is unreachable or down. Log in to the [MongoDB Atlas Dashboard](https://cloud.mongodb.com) and check cluster status, network access rules, and database user passwords.
    *   **Redis Status `"unhealthy"`:** The cache layer is disconnected. Verify Redis credentials, check host status in Railway, and verify that the instance is not hitting memory limits.
    *   **Queues Status `"unhealthy"`:** The BullMQ worker queue is disconnected. Verify the connection to Redis. Restart the worker process.
    *   **Cloudinary Status `"unhealthy"`:** The media upload gateway is unreachable. Check API keys in environment settings. (Note: Cloudinary failure will not prevent basic customer browsing, but will block admin uploads).

---

## 2. Reconciling Pending Payments & STK Push Failures

Lipa Na M-Pesa transactions are processed asynchronously. If a client's device loses network connection or terminates the checkout session before Safaricom issues the callback webhook, an order may remain stuck in a `Pending` state.

### Resolution Steps
1.  **Locate the Transaction in the Admin Panel:**
    *   Navigate to **Admin Dashboard -> Payments** or **Orders**.
    *   Search for the order number or customer email. Locate the payment record marked `pending` with the reference format `RCD{orderNumber}{timestamp}`.
2.  **Verify Status in Safaricom Portal:**
    *   Log in to your [Safaricom M-Pesa Organization Portal](https://org.ke.m-pesa.com) or Daraja Developer Console.
    *   Query the reference number (`RCD...`) or check the business transaction logs.
3.  **Perform Manual Reconciliation:**
    *   If the portal indicates a **Successful Payment** but the system did not receive the callback:
        *   Locate the order in the Admin Dashboard, click **Mark as Paid**, and input the Safaricom `MpesaReceiptNumber` (e.g. `QHD47FH389`). This updates the order to `confirmed` and executes post-purchase workflows.
    *   If the portal indicates a **Failed/Cancelled Transaction**:
        *   No actions are required. The customer's cart will remain intact, allowing them to retry the checkout.

---

## 3. Resolving Admin Account Lockouts

Admin accounts are locked for 30 minutes after 10 consecutive failed login attempts to prevent brute-force attacks.

### Resolution Steps
1.  **Unlock via Admin Dashboard (Self-Service by another Admin):**
    *   Another administrator or the owner must log in to the dashboard.
    *   Navigate to **Admin Dashboard -> Admin Management -> Active Sessions** or **Users**.
    *   Select the locked account and click **Unlock Account**. This resets the login attempts.
2.  **Manual Unlock via API (Requires Developer Access):**
    *   Submit a authenticated `PUT` request to the unlock endpoint using Postman or cURL:
        ```bash
        curl -X PUT https://your-domain.com/api/auth/admin/unlock/{userId} \
          -H "Authorization: Bearer <your_admin_token>"
        ```

---

## 4. Emergency Kill-Switches & Maintenance Mode

The application contains built-in toggles to protect database integrity during high-load traffic events, payment failures, or cyberattacks.

### 4.1 Master Operations Controls (Admin Dashboard)
Navigate to **Admin Dashboard -> Settings -> Operational Controls** to manage active features:
*   **Orders Master Toggle (`ordersEnabled`):** Disabling this blocks checkout routes for all users.
*   **M-Pesa STK Push (`mpesaEnabled`):** Disabling this disables M-Pesa checkout, forcing customers to use alternative payment methods.
*   **Cash on Delivery (`cashOnDeliveryEnabled`):** Toggles Cash on Delivery availability.
*   **Category Overrides:** Turn off checkouts for specific product categories (e.g. fresh crop beans).

*Note: Disabling any master toggle requires inputting an operational justification reason, which is logged to the system audit records.*

### 4.2 Out-of-Band Emergency Maintenance Magic Link
If the primary user interface is inaccessible or the authentication system is compromised:
1.  **Locate the Pre-Generated Magic Link:**
    *   On startup, settings generate a single-use emergency link sent to the super-admin's email.
    *   Alternatively, retrieve the raw link directly from the settings database in MongoDB:
        ```javascript
        db.settings.findOne({}, { "maintenance.magicLinkRaw": 1 })
        ```
2.  **Trigger Maintenance Mode:**
    *   Access the URL in your browser:
        `https://your-domain.com/api/settings/super-gate/<token>`
    *   This bypasses standard web portal logins and toggles the platform-wide **Maintenance Mode** immediately.
3.  **Exit Maintenance Mode:**
    *   Access the same URL to toggle the maintenance status back to inactive once operational stability is restored.

---

## 5. Responding to Health Alert Breaches

The always-on backend worker monitors infrastructure health every 2 minutes. If a service drops:
1.  A critical `AdminAlert` record is generated.
2.  Email alerts are dispatched to all active admins and owners.

### Escalation Steps
1.  Log in to the dashboard and check the **Notifications/Alerts Center**.
2.  Identify the affected category (e.g., `failed_payment`, `dlq_item`, `killswitch_event`, `sla_breach`, `low_stock`).
3.  Check system logs via Railway or server logs for database timeouts or out-of-memory errors.
4.  If the service is unresponsive and the database dashboard indicates normal health, trigger a rolling restart of the backend services in your Railway portal.

---

## 6. Investigating Suspicious Logins

To protect administrative accounts, the system tracks and flags geographic and session anomalies:

### 6.1 Geographic Logins (New Country Login)
*   **Trigger:** The system detects an administrator logging in from a country not present in their last 5 sessions.
*   **Action:** A critical alert is generated and warning emails are dispatched.
*   **Resolution:** Verify with the administrator if they are using a VPN or traveling. If unauthorized:
    *   Go to **Admin Dashboard -> Sessions**.
    *   Locate the administrator's active sessions and click **Revoke Session**.
    *   Instruct the admin to request a new login token, which automatically invalidates previous session hashes.

### 6.2 Magic Link Device Mismatch
*   **Trigger:** A magic link is verified on a browser or IP signature different from the one that requested it.
*   **Action:** The system raises a `killswitch_event` alert and restricts the verification flow.
*   **Resolution:** This indicates potential session interception or links forwarded across different devices. Invalidate the session immediately and instruct the administrator to request a new magic link on the target device without forwarding the link email.
