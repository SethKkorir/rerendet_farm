# Rerendet Farm — Production Deployment & Configuration Guide

This deployment guide provides comprehensive, step-by-step instructions for provisioning, configuring, launching, and rolling back the Rerendet Farm application in both development and production environments.

---

## 1. Prerequisites & Version Requirements

To ensure runtime stability and compatibility, the production infrastructure must adhere to the following software specifications:

| Dependency | Required Version | Verification Command | Description |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20.x` or `v22.x` (LTS) | `node -v` | JavaScript runtime engine |
| **npm** | `v10.x` or higher | `npm -v` | Package manager |
| **MongoDB** | `v6.0` or `v7.0` | `mongod --version` | Database server (Atlas or self-hosted) |
| **Redis** | `v7.x` or higher | `redis-server --version` | Cache store and queue backing database |
| **BullMQ** | Matches codebase lock | N/A | Worker queue manager |

---

## 2. Local Environment Setup

To boot the Rerendet Farm stack locally for testing or development:

1. **Clone the Repository:**
   ```bash
   git clone <repository_url>
   cd rerendet_farm
   ```

2. **Install Root and Client Dependencies:**
   ```bash
   # Install backend dependencies
   npm install

   # Install frontend dependencies
   cd client && npm install
   cd ..
   ```

3. **Configure Local Environment:**
   Copy the example file to create your active configuration file:
   ```bash
   cp .env.example .env
   ```

4. **Verify Local Databases:**
   Make sure MongoDB and Redis are running locally.
   ```bash
   # Verify Redis connectivity
   redis-cli ping
   # Expected output: PONG
   ```

5. **Run Database Migrations & Indexing:**
   ```bash
   node db/migrations/addIndexes.js
   ```

6. **Start the Application in Development Mode:**
   ```bash
   # Backend and frontend concurrently
   npm run dev
   ```

---

## 3. Environment Variables Reference

Create a `.env` file in the root directory. The application relies on the following configurations:

### Core Server Settings
*   `PORT` (Default: `5000`): The local port the Express server binds to.
*   `NODE_ENV` (Values: `development`, `production`, `test`): Affects error stack logs, rate limiters, and cookie security flags.
*   `FRONTEND_URL` (e.g. `http://localhost:5173`): The origin URL of the customer frontend interface. Used in CORS configurations.
*   `BASE_URL` (e.g. `http://localhost:5000`): The root URL of the backend server. Used in building webhook URLs.

### Database Settings
*   `MONGO_URI` (e.g. `mongodb+srv://...`): MongoDB connection string. Must include authentication credentials and database name.
*   `REDIS_URL` (e.g. `redis://default:password@host:port`): Connection string for Redis. Backs session management, rate limits, and BullMQ task queues.

### Security & Authentication
*   `JWT_SECRET`: Random 256-bit key used for signing access tokens.
*   `JWT_REFRESH_SECRET`: Separate secure secret used to verify refresh tokens.
*   `SESSION_SECRET`: Secret used for signing cookie sessions.
*   `ENCRYPTION_KEY`: 32-byte key used for encrypting PII (e.g., customer phone numbers and wallets) at rest.
*   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Optional): Credentials for Google Social Login.

### Administrative Controls
*   `SUPER_ADMIN_EMAIL`: The default email address associated with the platform's super-administrator account.
*   `ADMIN_DASHBOARD_ENABLED` (Default: `true`): Flag to toggle admin dashboard endpoints.
*   `ADMIN_DASHBOARD_USERNAME` / `ADMIN_DASHBOARD_PASSWORD`: Initial credentials used for bootstrap administration.
*   `ADMIN_REGISTRATION_SECRET`: Token required in header or payload to register new administrative roles.

### Email Configuration (SMTP)
*   `EMAIL_HOST`: SMTP mail server address (e.g., `smtp.gmail.com`).
*   `EMAIL_PORT`: SMTP port (typically `587` for TLS or `465` for SSL).
*   `EMAIL_FROM_NAME`: Display name on outgoing emails.
*   `EMAIL_USER`: Authentication username for the SMTP service.
*   `EMAIL_PASS`: Password/app-specific password for the SMTP user.

### Cloudinary (Media Asset Management)
*   `CLOUDINARY_CLOUD_NAME`: Cloudinary account name.
*   `CLOUDINARY_API_KEY`: Credentials for image upload API authorization.
*   `CLOUDINARY_API_SECRET`: Private signature secret.

### Safaricom Daraja M-Pesa Settings
*   `MPESA_CONSUMER_KEY`: Safaricom Developer Portal Consumer Key.
*   `MPESA_CONSUMER_SECRET`: Safaricom Developer Portal Consumer Secret.
*   `MPESA_SHORTCODE`: Paybill/Store Number used to receive payments (typically 6 digits).
*   `MPESA_PASSKEY`: LNM (Lipa Na M-Pesa) Online Passkey.
*   `MPESA_CALLBACK_URL`: Server route where Safaricom sends HTTP POST callback payloads.
*   `MPESA_ENVIRONMENT` (Values: `sandbox`, `production`): Safaricom API base URL switcher.

### Airtel Money Settings
*   `AIRTEL_CLIENT_ID` / `AIRTEL_CLIENT_SECRET`: Airtel Money developer API credentials.
*   `AIRTEL_MERCHANT_ID`: Scoped merchant ID.

### PayPal Settings
*   `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`: PayPal integration keys.
*   `PAYPAL_ENVIRONMENT` (Values: `sandbox`, `live`): Gateway switch.

---

## 4. Database Setup & Configurations

### MongoDB (Atlas)
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Provision a cluster using Cloud Providers (AWS/GCP/Azure) closest to your deployment server (e.g., `eu-west-1` for Railway/Vercel).
3. Under **Database Access**, create a user with `readWriteAnyDatabase` or scoped read/write access to the `rerendet_farm` database.
4. Under **Network Access**, allow access from the IP addresses of your hosting provider (or `0.0.0.0/0` if deploying on dynamic platforms like Vercel and Railway, securing connectivity via strong credentials).
5. Extract the Connection String (URI) and assign it to `MONGO_URI`.

### Redis
1. Provision a Redis instance (e.g., via Railway Redis, Upstash, or Redis Labs).
2. Ensure the eviction policy is set to `noeviction` or `volatile-lru` to prevent session loss.
3. Configure `REDIS_URL` using the standard format: `redis://:<password>@<host>:<port>`.

---

## 5. Deployment Setup

Rerendet Farm is built to deploy split-stack or monolithic-style on modern cloud platforms.

### Frontend Deployment on Vercel
Vercel is the recommended environment for the React Single Page Application (SPA).
1. Install the Vercel CLI or link your repository to the Vercel dashboard.
2. The project's root contains a `vercel.json` file configuring rewrite headers.
3. Configure the following build settings in Vercel:
   *   **Framework Preset:** `Vite` (or `Other` if importing static build directories)
   *   **Root Directory:** `client` (or root if using default workspace configurations)
   *   **Build Command:** `npm run build`
   *   **Output Directory:** `dist` or `build`
4. Add the following environment variables to the Vercel dashboard:
   *   `VITE_API_URL` (Points to the backend API base URL, e.g., `https://rerendet-api.railway.app`)

### Backend Deployment on Railway
Railway is the recommended host for the Express server and worker dynos due to native Redis/MongoDB support and persistent connection management.
1. Create a new project in Railway.
2. Select **Deploy from GitHub repo** and select `rerendet_farm`.
3. Add a Redis plugin to your project or configure an external Redis connection.
4. In the service settings, define the start command using the repository `Procfile` or explicitly:
   ```bash
   node server.js
   ```
5. Set the Port mapping to `PORT=5000` (Railway will automatically map dynamic ports to public URLs).
6. Fill in all environment variables listed in the environment section of this document.

---

## 6. Integration Configurations

### Cloudinary Upload Configuration
Ensure Cloudinary is configured to handle media asset uploads (such as blog thumbnails and product images):
*   Create a media preset for image sizing in the Cloudinary settings dashboard.
*   Assign `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to the environment.
*   Verify the `/api/health` check indicates `cloudinary: healthy`.

### Safaricom Daraja M-Pesa Configuration
For production transactional stability:
1. Register a Lipa Na M-Pesa shortcode (Paybill or Buy Goods Till) at Safaricom.
2. Obtain production developer keys from the Safaricom Daraja portal.
3. Set `MPESA_ENVIRONMENT` to `production`.
4. Ensure the `MPESA_CALLBACK_URL` is accessible publicly. It must be an HTTPS URL pointing to `/api/payments/mpesa-callback`. M-Pesa sandbox or production APIs will drop payloads sent to HTTP URLs.
5. In your network firewall or routing layer, make sure Safaricom's IP ranges are whitelisted to access the callback endpoint.

---

## 7. Verification Checklist

Post-deployment, execute the following steps to verify production readiness:

1. **Verify Health Endpoint:**
   Send a GET request to `${BASE_URL}/api/health`. Make sure all listed systems (`mongodb`, `redis`, `queues`, `cloudinary`) report `"status": "healthy"`.
2. **Execute Database Indexing:**
   Ensure database indexing has successfully finished without crashing:
   ```bash
   node db/migrations/addIndexes.js
   ```
3. **Verify TLS Termination:**
   Confirm all requests are forced to HTTPS. Verify security headers via browser devtools:
   *   `Strict-Transport-Security` is active.
   *   `Content-Security-Policy` doesn't throw console blocks.
4. **Test Payment Lifecycles:**
   Trigger a test payment using the sandbox phone number `254708374149` (or a production test account) to verify STK Push generation and callback handling.

---

## 8. Rollback Procedures

If a deployment fails, exhibits high latency, or corrupts production state, follow the rollback plan immediately:

### Step 1: Identify the Failure
Check system logs using Railway or Sentry to locate the stack trace. Check `/api/health` status.

### Step 2: Rollback the Deployment
*   **Vercel (Frontend):** Go to the Vercel Deployments dashboard, find the last known-stable deployment (marked by passing integration checks), click the three dots, and select **Redeploy** or **Promote to Production**.
*   **Railway (Backend):** Go to the Railway deployments list, select the previous successful build, click the options menu, and click **Rollback**.

### Step 3: Database Rollback (If Schema Migrations Occurred)
If a destructive migration occurred:
1. Stop the application server (put it in maintenance mode by logging in to the command line or generating the out-of-band magic link).
2. Restore the database using MongoDB Atlas Point-in-Time Recovery (PITR) to a timestamp immediately preceding the deployment.
3. Verify database integrity.
4. Redeploy the previous backend commit.
5. Deactivate maintenance mode.
