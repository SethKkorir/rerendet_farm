# THIRD-PARTY SERVICES DISCLOSURE AND ARCHITECTURE DECK

The Rerendet Farm storefront and administration system relies on several external Cloud Service Providers (CSPs), Payment Gateways, and Software-as-a-Service (SaaS) APIs. Below is a detailed breakdown of their roles, security postures, cost metrics, and management guidelines.

---

## 1. SERVICES MATRIX

| Provider & Service | Core Role in Rerendet | Security Configuration | Pricing / Tier Level |
| :--- | :--- | :--- | :--- |
| **MongoDB Atlas** | Primary operational database for Users, Orders, Products, Carts, and Settings. | AES-256 Volume Encryption, IP Whitelisting, DB-User Roles, Connection via SSL/TLS. | Shared Tier (M0/M20) or Serverless. Pay-per-read/write or standard monthly cluster cost. |
| **Safaricom Daraja API** | Processes all M-Pesa payments, triggers STK pushes, and returns transaction webhooks. | SSL validation, OAuth2 Tokenization, raw callback signature payload checks. | Pay-per-transaction standard rates determined by Safaricom merchant terms. |
| **Upstash Redis** | Session store, rate limiting, and BullMQ worker queue backing. | TLS connection strings, automated token expiration, connection pool bounds. | Free/Pay-as-you-go based on total command requests ($0.20 per 100k commands). |
| **Vercel** | Hosts and serves the React.js client build and handles serverless API routing edge. | SSL certificates automatically managed by Let's Encrypt, DDoS mitigation. | Pro Plan ($20/member/month) or Hobby Tier for development staging. |
| **Cloudinary** | Handles storage, resizing, and delivery of product showcase and profile assets. | Signed upload signatures, delivery via secure HTTPS CDN URLs. | Free Tier (up to 25 credits/month) or Plus/Advanced Tier ($99/month). |
| **Sentry** | Live application crash telemetry, exception capturing, and performance monitoring. | Data scrubbing rules (masks passwords, credit card numbers, and tokens). | Developer tier or Team Plan ($26/month). |

---

## 2. SECURITY CONSIDERATIONS
2.1. **Strict Secrets Separation**: No API secret keys, certificates, or tokens are allowed in the repository source files. All keys must be defined in the Vercel project configuration or `.env` files.  
2.2. **Webhook Verification**: Both Safaricom M-Pesa callback URLs and Stripe webhook endpoints must perform cryptographic integrity checks to verify that updates (e.g., changing order status to `paid`) come exclusively from verified payment gateways.  
2.3. **Cross-Origin Resource Sharing (CORS)**: Access to the Node.js API must be strictly limited via CORS configuration to the official storefront domains (e.g., `https://rerendet.coffee`, `https://rerendet-farm.vercel.app`).

---

## 3. COST MANAGEMENT AND BUDGET CONTROLS
3.1. **Rate Limiting**: To prevent third-party API cost inflation (specifically from SMS, email, or database lookup triggers), strict rate limiting is enforced on authentication routes (30 attempts/15 min) and global endpoints (500 requests/15 min).  
3.2. **Cloudinary Asset Optimization**: All product images uploaded to Cloudinary must use dynamic quality transformations (e.g., `q_auto,f_auto`) in the React code to minimize bandwidth consumption.  
3.3. **Redis Expiry**: Cache keys stored in Upstash Redis must have an explicit TTL (Time To Live) to prevent memory bloating and subsequent billing penalties.
