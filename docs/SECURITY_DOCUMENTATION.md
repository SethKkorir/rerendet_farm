# Enterprise Security Architecture & Incident Response Documentation

<div style="page-break-after: always;"></div>

## 1. Document Control

**Purpose:** This section establishes the governance, provenance, and lifecycle of this security document, ensuring that all stakeholders operate from a verified, up-to-date source of truth during audits, incident response, and regular operations.

### Version History
| Version | Date | Author | Description of Change | Approval |
| :--- | :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-05-19 | Core Engineering | Initial baseline security documentation for e-commerce platform | CTO / CISO |

### Governance
*   **Classification Level:** **RESTRICTED / CONFIDENTIAL**. This document contains sensitive architectural and security control details. Distribution is strictly limited to cleared internal personnel, authorized external auditors, and legal counsel under NDA.
*   **Review Schedule:** Mandatory formal review bi-annually (every 6 months), or within 14 days following any significant architectural change, major release, or security incident.
*   **Document Owner:** Chief Information Security Officer (CISO) / Head of Engineering.

<div style="page-break-after: always;"></div>

## 2. System Overview

**Purpose:** Provides a high-level understanding of the system's architecture, data flows, and technological dependencies to orient incident responders, auditors, and new engineers rapidly.

### Architecture & Tech Stack
The e-commerce application is a distributed web system utilizing a modern JavaScript stack.
*   **Frontend:** React.js Single Page Application (SPA).
*   **Backend:** Node.js / Express.js RESTful API.
*   **Database:** MongoDB (NoSQL) for transactional data; Redis for caching and rate limiting.
*   **Infrastructure:** Cloud-hosted (e.g., AWS/GCP) within a Virtual Private Cloud (VPC), utilizing containerization (Docker) and orchestration.

### Data Flow Summary
1.  **Client to Edge:** Users connect via TLS 1.3 to a Web Application Firewall (WAF) / Load Balancer.
2.  **Edge to API:** The Load Balancer proxies sanitized requests to internal Node.js backend services.
3.  **API to Database:** Backend services query the primary database via private network connections using encrypted credentials.
4.  **API to Third-Parties:** Backend communicates with external Payment Gateways (e.g., Stripe) and Email Providers (e.g., SendGrid) via secure server-to-server HTTPs APIs.

### Third-Party Dependencies
*   **Payment Gateway:** Manages all PCI-sensitive data (card numbers).
*   **Email Delivery:** Handles transactional emails, password resets, and MFA delivery.
*   **Cloud Provider:** Manages underlying hardware, VPC, and managed database services.
*   **Content Delivery Network (CDN) & WAF:** Mitigates DDoS attacks and serves static assets.

<div style="page-break-after: always;"></div>

## 3. Threat Model

**Purpose:** Identifies primary attack vectors against the application, classifies their risk severity, and explicitly maps the corresponding defensive mitigations implemented in the system.

| Attack Vector | Description | Risk Rating | Implemented Mitigation |
| :--- | :--- | :--- | :--- |
| **Account Takeover (ATO)** | Credential stuffing, brute force, or phishing to gain access to user or admin accounts. | **Critical** | MFA enforcement, aggressive rate limiting, bcrypt hashing, breached password detection. |
| **Data Exfiltration** | SQL/NoSQL Injection or IDOR leading to unauthorized data extraction. | **Critical** | Strict ORM/ODM parameterization, object-level authorization checks, WAF rules. |
| **Payment Fraud** | Tampering with checkout payloads or exploiting webhooks to bypass payment. | **High** | Cryptographic webhook signature verification, zero trust in client-side pricing data. |
| **Cross-Site Scripting (XSS)** | Injecting malicious scripts into user-viewable data (e.g., product reviews). | **High** | Context-aware output encoding (React DOM escaping), strict Content Security Policy (CSP). |
| **Cross-Site Request Forgery (CSRF)** | Forcing an authenticated user to execute unwanted actions. | **Medium** | SameSite cookie attributes, Anti-CSRF tokens for state-changing endpoints. |
| **DDoS Attack** | Overwhelming resources to cause availability outages. | **Medium** | Edge caching, CDN scaling, WAF rate limiting, API request throttling. |

<div style="page-break-after: always;"></div>

## 4. Authentication System

**Purpose:** Defines the mechanisms used to verify the identity of users and administrators, detailing cryptographic standards, defensive configurations, and account recovery flows to prevent unauthorized access.

### Password Security & Storage
*   **Hashing Algorithm:** `bcrypt` with a minimum work factor (cost) of 12. Salting is handled natively by the bcrypt library.
*   **Password Policy:** Minimum 12 characters. Must include upper, lower, number, and special character. Checked against a known-breached password database (e.g., HaveIBeenPwned API) during registration and password change.

### Defensive Mechanisms
*   **Login Throttling:** Maximum of 5 failed attempts per IP per 15 minutes, and 5 failed attempts per account username per 15 minutes. Backed by Redis.
*   **Account Lockout:** After 10 consecutive failed attempts, the account is temporarily locked for 30 minutes. An alert is generated and an email notification is sent to the user.
*   **Breach Detection:** System actively monitors for impossible travel anomalies (e.g., login from US, then login from Asia 5 minutes later).

### Password Reset Flow
*   **Token Generation:** Cryptographically secure pseudo-random number generator (CSPRNG) generates a 32-byte hex token.
*   **Token Lifecycle:** Hashed via SHA-256 before storage in the database. Expiration is strictly set to 15 minutes. Single-use only; destroyed immediately upon use or when a new request is made.
*   **Flow:** Application emails a magic link containing the raw token. The backend verifies the hash and enforces the expiration window.

<div style="page-break-after: always;"></div>

## 5. Session Management

**Purpose:** Outlines the strategy for maintaining authenticated state securely across HTTP requests, ensuring sessions cannot be hijacked, fixated, or extended maliciously.

### Token Strategy
The application utilizes JSON Web Tokens (JWT) combined with highly secure HTTP-only cookies to manage state.
*   **Access Token:** Short-lived JWT (expires in 15 minutes) containing non-sensitive claims (User ID, Role).
*   **Refresh Token:** Long-lived opaque string (expires in 7 days) stored securely in the database.

### Cookie Security Flags
All session and authentication cookies **must** be set with the following attributes:
*   `Secure`: Ensures cookies are only sent over HTTPS.
*   `HttpOnly`: Prevents client-side JavaScript from accessing the cookie, mitigating XSS session theft.
*   `SameSite=Strict` (or `Lax` where absolutely necessary for cross-site navigation): Mitigates CSRF attacks.

### Session Lifecycle & Invalidation
*   **Refresh Token Rotation:** Every time a refresh token is used to get a new access token, the old refresh token is invalidated, and a new one is issued. If an invalidated refresh token is presented, a token theft event is assumed, and the entire session family is revoked.
*   **Invalidation Triggers:** Sessions are forcibly invalidated upon: Password change, MFA modification, explicit logout, role demotion, or administrative suspension.
*   **Session Fixation Prevention:** Upon successful login, all pre-authentication session identifiers are destroyed and a completely new session context is established.

<div style="page-break-after: always;"></div>

## 6. Multi-Factor Authentication (MFA)

**Purpose:** Details the secondary authentication requirements utilized to protect accounts from compromise even in the event of credential theft.

### Supported MFA Types
*   **Primary:** Time-Based One-Time Password (TOTP) via authenticator apps (Google Authenticator, Authy, etc.).
*   **Fallback:** Single-use cryptographic recovery codes generated during initial enrollment.

### Enrollment & Lifecycle
*   **Enrollment Flow:** User scans a QR code (containing a securely generated seed). The user must input a valid code to verify configuration before the seed is activated and saved to the database.
*   **Recovery Codes:** 10 backup codes (16 characters each, CSPRNG generated) are provided. Hashed (bcrypt) in the database. Single-use only.

### Enforcement Policy
| Role | MFA Requirement | Grace Period |
| :--- | :--- | :--- |
| **Super Admin** | Mandatory | None. Enforced at creation. |
| **Support / Ops** | Mandatory | None. Enforced at creation. |
| **Customers** | Opt-In (Highly Recommended) | N/A |

<div style="page-break-after: always;"></div>

## 7. Role-Based Access Control (RBAC)

**Purpose:** Defines the authorization model that ensures users and systems only have access to the data and actions strictly necessary for their function, mitigating insider threats and lateral movement.

### Role Matrix

| Permission \ Role | Customer | Support Agent | Ops Manager | Super Admin |
| :--- | :--- | :--- | :--- | :--- |
| **View Own Orders** | Yes | N/A | N/A | N/A |
| **View Any Order** | No | Yes | Yes | Yes |
| **Issue Refunds < $100**| No | Yes | Yes | Yes |
| **Issue Refunds > $100**| No | No | Yes | Yes |
| **Manage Users** | No | No | Yes | Yes |
| **System Config/Roles** | No | No | No | Yes |

### Enforcement & Auditing
*   **Least-Privilege Policy:** Users are granted the absolute minimum access necessary. Default deny is enforced at the API route layer using middleware constraints.
*   **Privilege Escalation Prevention:** Lower-privileged users cannot assign or modify roles higher than or equal to their own.
*   **Audit Trail:** Any change to user roles, permissions, or access levels is logged immutably to the security audit log, recording the actor, timestamp, and previous/new state.

<div style="page-break-after: always;"></div>

## 8. Admin Security

**Purpose:** Outlines the extreme protective measures applied specifically to administrative accounts, recognizing them as the highest-value targets for attackers.

### Authentication & Access
*   **Separation of Duties:** Admin interfaces are logically (and preferably physically) separated from the consumer application. Admins cannot use their admin accounts to shop, nor customer accounts to administer.
*   **IP Allowlisting:** Access to the Super Admin portal is restricted at the network/WAF level to a predefined list of corporate VPN IP addresses.
*   **Re-authentication:** Destructive actions (e.g., bulk data deletion, altering global payment settings, changing roles) require immediate re-entry of the user's password and a fresh TOTP MFA token.

### Admin Audit Logging
*   **Action Logging:** Every single HTTP request made by an admin account (GET, POST, PUT, DELETE) is logged.
*   **Immutable Storage:** Admin logs are shipped directly to an external, write-once-read-many (WORM) storage system (e.g., AWS S3 with Object Lock) to prevent tampering by a compromised admin account.

<div style="page-break-after: always;"></div>

## 9. API Security

**Purpose:** Documents the defensive controls implemented at the application edge and routing layers to protect backend logic from automated abuse, injection, and unauthorized data access.

### Threat Protections
*   **Rate Limiting:**
    *   Global: 100 requests / 1 min per IP.
    *   Authentication endpoints: 5 requests / 15 min per IP.
    *   High-cost endpoints (search, exports): 20 requests / 1 min per IP.
*   **Input Validation & Sanitization:** Strict schema validation is enforced on all incoming payloads using a validation library (e.g., Joi or Zod). Unexpected fields are stripped. All input is treated as untrusted and parameterized before database execution.
*   **CORS Policy:** Cross-Origin Resource Sharing is strictly limited. `Access-Control-Allow-Origin` is explicitly set to the exact frontend domain (no `*` wildcards). `Access-Control-Allow-Credentials` is set to `true` only for the trusted domain.

### API Key Management (If applicable for B2B integrations)
*   **Format:** Keys are generated as CSPRNG strings with a recognizable prefix (e.g., `pk_live_...`).
*   **Storage:** Keys are hashed (SHA-256) in the database. The raw key is only shown to the user once upon generation.

<div style="page-break-after: always;"></div>

## 10. HTTP Security Headers

**Purpose:** Details the HTTP response headers explicitly configured by the web server to enforce browser-side security mechanisms and mitigate client-side vulnerabilities.

| Header | Value | Threat Addressed |
| :--- | :--- | :--- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS; prevents SSL Stripping and Man-in-the-Middle (MitM) attacks. |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-...'; object-src 'none';` | Drastically reduces XSS surface by restricting where scripts/assets can load from. |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-sniffing attacks; forces browser to respect declared content type. |
| `X-Frame-Options` | `DENY` (or `SAMEORIGIN`) | Prevents Clickjacking by disallowing the site from being embedded in iframes. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Prevents leaking sensitive URL parameters to external sites via the Referer header. |
| `Permissions-Policy` | `geolocation=(), camera=(), microphone=()` | Disallows access to sensitive device APIs unless explicitly required. |

<div style="page-break-after: always;"></div>

## 11. Payment Security

**Purpose:** Explains how the application handles financial transactions securely, maintains regulatory compliance, and protects against financial fraud.

### PCI-DSS Compliance & Tokenization
*   **Scope Reduction:** The application architecture is designed to completely offload PCI-DSS scope. Raw Primary Account Numbers (PAN) and CVV codes **never** touch the application servers, memory, or database.
*   **Tokenization:** Client-side libraries (e.g., Stripe.js) securely transmit card data directly to the Payment Gateway. The application only receives and stores an opaque, non-sensitive token representing the payment method.

### Transaction Integrity
*   **Webhook Signature Verification:** All asynchronous payment status updates received via webhooks are cryptographically verified using a shared secret to ensure they originated from the Payment Gateway and were not tampered with.
*   **Refund Controls:** Refunds require distinct RBAC permissions. Refunds exceeding predefined thresholds require secondary approval from an Ops Manager. All refunds are tied to the original transaction IDs.

<div style="page-break-after: always;"></div>

## 12. Data Protection

**Purpose:** Defines the technical and administrative controls used to protect sensitive user data both while stored and while moving across networks.

### Encryption Standards
*   **In Transit:** All external communication is forced over TLS 1.2 or TLS 1.3. Internal service-to-service communication within the VPC is also encrypted.
*   **At Rest:** The underlying database storage volumes are encrypted using AES-256 (managed by the cloud provider). Backups and snapshots are similarly encrypted.

### PII Handling & Lifecycle
*   **PII Policy:** Personally Identifiable Information (Names, Emails, Addresses) is only accessible to roles explicitly requiring it for fulfillment or support.
*   **Data Retention:** Inactive accounts and associated PII are purged or anonymized after 7 years of inactivity, in accordance with financial record-keeping laws and GDPR minimization principles.
*   **Data Deletion:** "Right to be Forgotten" requests trigger a hard delete of PII, replacing identifying fields with irreversible cryptographic hashes to maintain referential integrity of financial records without exposing the user.

<div style="page-break-after: always;"></div>

## 13. Secrets and Credentials Management

**Purpose:** Details how the application securely stores, accesses, and rotates sensitive configuration data (API keys, database passwords, signing secrets).

### Secrets Vault Strategy
*   **Storage:** Application code and repositories contain **zero** hardcoded secrets. All secrets are stored in a centralized, encrypted Key Management System / Secrets Vault (e.g., AWS Secrets Manager, HashiCorp Vault).
*   **Environment Variables:** Secrets are injected directly into the application process memory as environment variables at runtime by the infrastructure orchestration layer.

### Secret Lifecycle
*   **Rotation Schedule:** Database credentials are automatically rotated every 90 days. Third-party API keys are rotated annually or immediately upon suspicion of compromise.
*   **Compromise Protocol:** If a secret is leaked, the Incident Response plan dictates immediate revocation of the secret at the provider, generation of a new secret, deployment to the vault, and a rolling restart of all application instances.

<div style="page-break-after: always;"></div>

## 14. Dependency and Vulnerability Management

**Purpose:** Outlines the strategy for identifying, tracking, and patching vulnerabilities in the open-source libraries and infrastructure components the application relies upon.

### Scanning & Monitoring
*   **Dependency Scanning:** Tools (e.g., Snyk, Dependabot, npm audit) automatically scan the codebase and `package.json` / `package-lock.json` on every Pull Request and daily on the main branch.
*   **Software Bill of Materials (SBOM):** A complete SBOM is generated and archived for every production release to provide immediate visibility during zero-day events (e.g., Log4j).

### Update Policy & Response Time
*   **Critical/High Vulnerabilities:** Must be patched, tested, and deployed to production within **48 hours** of identification.
*   **Medium/Low Vulnerabilities:** Patched during the standard bi-weekly sprint cycle.
*   **Routine Updates:** Non-breaking dependency updates are applied and tested monthly to prevent technical debt and massive upgrade hurdles.

<div style="page-break-after: always;"></div>

## 15. Logging and Monitoring

**Purpose:** Establishes the visibility framework required to detect anomalous behavior, investigate security incidents, and maintain system health.

### Logging Policy
*   **What is Logged:** Authentication successes/failures, authorization failures (403s), critical state changes (password resets, role changes, order placements), application errors/exceptions, and rate limit triggers.
*   **What is NEVER Logged:** Passwords, session tokens, raw API keys, credit card numbers, and highly sensitive PII (unless strictly masked).
*   **Log Retention:** Hot storage (searchable) for 30 days. Cold storage (archived, WORM compliant) for 1 year to support forensic investigations.

### Alerting & Thresholds
*   Alerts are routed to a centralized incident management platform (e.g., PagerDuty) and notify the on-call Security/Ops engineer.
*   **Triggers:**
    *   > 50 failed logins per minute across the platform.
    *   Any occurrence of SQL injection/XSS payloads detected by the WAF.
    *   Sudden spikes in 500 Internal Server Errors.
    *   Unusual outbound network traffic from database servers.

<div style="page-break-after: always;"></div>

## 16. Incident Response Plan

**Purpose:** Provides a deterministic, step-by-step playbook for containing, eradicating, and recovering from a confirmed security breach, minimizing chaos and damage.

### Phases of Response
1.  **Identification:** Triaging alerts to confirm a true positive breach. Documenting the timeline of discovery.
2.  **Containment (Immediate):** Stop the bleeding. May include: invalidating all user sessions, rotating all compromised API keys/database credentials, isolating affected servers from the network, or routing traffic to a static maintenance page.
3.  **Eradication:** Removing the attacker's foothold. Patching the exploited vulnerability, removing backdoors, and redeploying infrastructure from known-clean configurations.
4.  **Recovery:** Restoring services cautiously. Monitoring systems closely for 48 hours for signs of re-entry. Restoring data from backups if integrity was compromised.

### Roles and Communication
*   **Incident Commander:** Leads the response, makes final decisions.
*   **Lead Investigator:** Executes technical containment and forensics.
*   **Communications Lead:** Manages internal updates and drafts external templates (legal, PR, customer notifications).
*   **Evidence Preservation:** Forensically clone affected disk volumes and RAM *before* destroying instances. Archive all WAF, App, and DB logs to secure offline storage.

<div style="page-break-after: always;"></div>

## 17. Backup and Recovery

**Purpose:** Details the resilience strategy ensuring data can be restored completely and securely in the event of catastrophic failure, data corruption, or ransomware.

### Backup Strategy
*   **Frequency:** Database relies on Point-In-Time Recovery (PITR) allowing rollback to any second within the last 7 days. Full snapshots are taken daily.
*   **Storage Location:** Backups are stored in geographically redundant, physically separated data centers (cross-region) from the primary database.
*   **Encryption:** Backups are encrypted at rest using keys distinct from the production environment.

### Restoration & Metrics
*   **Recovery Time Objective (RTO):** System must be fully operational within 4 hours of declaring a catastrophic failure.
*   **Recovery Point Objective (RPO):** Maximum allowable data loss is 5 minutes.
*   **Restoration Testing:** A full automated restoration of production data into a segregated staging environment is executed and validated monthly to ensure backups are viable.

<div style="page-break-after: always;"></div>

## 18. Third-Party and Vendor Security

**Purpose:** Defines the processes for evaluating and managing the security risks introduced by external software vendors and service providers.

### Vetting & Access
*   **Vetting Process:** All critical vendors (Payment, Email, Hosting) must provide a current SOC 2 Type II report or ISO 27001 certification before integration.
*   **Access Controls:** Vendors requiring access to our systems are granted dedicated, scoped service accounts with strictly defined permissions. Vendors do not receive broad network access.

### Breach Protocol
*   **Vendor Compromise:** If a vendor notifies us of a breach, or we detect one, our immediate response protocol is activated:
    1.  Immediately revoke all API keys and service accounts associated with that vendor.
    2.  Halt all data flows to/from the vendor.
    3.  Audit logs to determine if our data was exposed via the vendor's compromised systems.

<div style="page-break-after: always;"></div>

## 19. Compliance and Legal

**Purpose:** Maps the system's security controls to the legal and regulatory frameworks governing the business, providing clear procedures for legal obligations.

### Regulatory Frameworks
*   **GDPR / CCPA:** Governs PII collection, storage, and rights. Supported by data minimization, consent tracking, and automated scripts for Data Subject Access Requests (DSAR) and Right to be Forgotten.
*   **PCI-DSS:** Maintained via complete offloading of cardholder data to compliant third-party gateways (SAQ-A compliance level).

### Breach Notification Obligations
*   In the event of a breach exposing PII, the Legal and Communications teams must be notified immediately.
*   **Timelines:** Under GDPR, the relevant supervisory authority must be notified within **72 hours** of becoming aware of the breach. Affected users must be notified "without undue delay" if the risk to their rights is high.

<div style="page-break-after: always;"></div>

## 20. Security Review Schedule

**Purpose:** Establishes the proactive cadence for auditing, testing, and reviewing the security posture to identify weaknesses before attackers do.

### Proactive Assessments
*   **Penetration Testing:** A gray-box penetration test by an independent, CREST-certified third-party firm is conducted **annually**, or before any major structural release (e.g., launching a new API version).
*   **Code Review Policy:** 100% of code changes require a peer review and approval from at least one senior engineer. Changes touching authentication, authorization, or payments require review by a designated security champion.
*   **Tabletop Exercises:** The Incident Response Plan is tested via a simulated breach scenario (tabletop exercise) involving engineering, legal, and executive teams every 6 months.

---
*End of Document.*
