# CREDENTIALS AND PLATFORM HANDOVER DECK

This document serves as the official administrative handover guide for the Rerendet Farm Storefront & Admin Portal. It lists the required credentials, hosting environments, and the step-by-step security rotation procedures required to transfer ownership.

> [!WARNING]
> This file contains sensitive architectural metadata. Once populated with actual production secrets, this document MUST be moved to a secure vault (e.g., Bitwarden, 1Password, or AWS Secrets Manager) and deleted from the local codebase directory.

---

## 1. COMPREHENSIVE HANDOVER CHECKLIST

### 1.1. Hosting & Infrastructure
- [ ] Transfer **Vercel** Project Ownership (Frontend React client & Serverless API routes).
- [ ] Transfer **MongoDB Atlas** Project Ownership and database access user credentials.
- [ ] Transfer **Upstash Redis** Console console login and cache access credentials.

### 1.2. Payment Gateways
- [ ] Transfer **Safaricom Daraja API Portal** developer account and update certificate contacts.
- [ ] Rotate **Stripe Developer Dashboard** API Keys (Secret Key, Publishable Key, and Webhook Secret).

### 1.3. Services & APIs
- [ ] Transfer **Cloudinary** account to Client billing email and rotate API credentials.
- [ ] Transfer **Sentry** Workspace billing and ownership to Client.
- [ ] Configure **SMTP Email Provider** account (SendGrid, Mailgun, or custom Microsoft 365/Google Workspace account).

---

## 2. PRODUCTION ENVIRONMENT VARIABLES SCHEMA

Configure the following environment variables on the production hosting platform (e.g., Vercel project settings):

```env
# ================= SYSTEM GENERAL =================
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://rerendet.coffee

# ================= DATABASE CONNECTIONS =================
# MongoDB connection string (Atlas Cluster)
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/rerendet_db?retryWrites=true&w=majority

# Upstash Redis connection string
REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379

# ================= CRITICAL SECURITY SECRETS =================
# Cryptographically secure random strings (e.g., 64-char hex strings)
JWT_SECRET=your_super_secret_jwt_access_token_sign_key_here
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_token_sign_key_here

# Encryption Key (Must be EXACTLY 32 characters for AES-256-CBC field encryption)
ENCRYPTION_KEY=rerendet_secret_key_32chars_!!

# ================= PAYMENT INTEGRATION =================
# Safaricom Daraja API parameters
MPESA_CONSUMER_KEY=your_daraja_consumer_key
MPESA_CONSUMER_SECRET=your_daraja_consumer_secret
MPESA_SHORTCODE=your_daraja_paybill_or_store_number
MPESA_PASSKEY=your_daraja_online_passkey
MPESA_CALLBACK_URL=https://api.rerendet.coffee/api/webhooks/mpesa

# Stripe API parameters
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ================= INTEGRATION SERVICES =================
# Cloudinary credentials
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Sentry Monitoring DSN
SENTRY_DSN=https://your_sentry_public_key@o0.ingest.sentry.io/0000000

# SMTP Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_smtp_provider_access_password
SMTP_FROM="Rerendet Coffee <noreply@rerendetcoffee.com>"
```

---

## 3. CREDENTIAL ROTATION PROCEDURES

### 3.1. DB Encryption Key Rotation
If `ENCRYPTION_KEY` is rotated:
1.  All phone numbers encrypted with the old key will fail to decrypt.
2.  A migration script must be executed to read all users, decrypt their phone numbers using the old key, and re-encrypt them using the new key before saving.

### 3.2. Session JWT Secret Rotation
If `JWT_SECRET` or `JWT_REFRESH_SECRET` is compromised or rotated:
1.  Update the environment variables on Vercel.
2.  Trigger a redeployment (rolling restart).
3.  All active sessions will be invalidated immediately, forcing all users and admins to log back in. No database damage will occur.

### 3.3. Safaricom Daraja Key Rotation
If Daraja keys are rotated:
1.  Generate new keys on the Safaricom Developer portal.
2.  Update `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET`.
3.  Test STK pushes in sandbox mode or small live transactions to verify callbacks.
