# DATA PROCESSING AGREEMENT (DPA)

**THIS DATA PROCESSING AGREEMENT** (the "DPA") is entered into as of this 3rd day of June, 2026, and forms part of the master agreement between:

1.  **RERENDET COFFEE LIMITED** (the "**Data Controller**"); and
2.  **SETH K. KORIR** (the "**Data Processor**").

---

## 1. PURPOSE AND INTERPRETATION
1.1. This DPA governs the processing of Personal Data in connection with the operations, support, and maintenance of the Rerendet Farm Storefront & Admin Portal.  
1.2. This DPA is drafted to align with the requirements of the **Kenya Data Protection Act, 2019 (KDPA)**, the Data Protection (General) Regulations, 2021, and the Data Protection (Complaints Procedures and Advisory Services) Regulations, 2021.

---

## 2. SCOPE AND CATEGORIES OF PERSONAL DATA
2.1. The Data Processor shall process Personal Data on behalf of the Data Controller only for the purposes of system maintenance, secure deployment updates, data migration, and debugging support.  
2.2. The categories of Personal Data stored and processed in the system database include:
- **Identity Information**: First Name, Last Name, Gender, Date of Birth.
- **Contact Details**: Email Address, Encrypted Telephone Number (stored encrypted via AES-256-CBC).
- **Physical Address Details**: Shipping Address, City, County (specifically mapped to the 47 Counties of Kenya), Town, Country, Landmark, and Additional Delivery Locations.
- **Financial Metadata**: Decrypted Safaricom M-Pesa Mobile Number, Masked Credit/Debit Card Details (Holder Name, Card Brand, Expiry Date, Masked Card Number: `**** **** **** 4242`).
- **Loyalty & E-commerce metrics**: Purchase History, Loyalty Points Balance, Store Credit Balance, Reorder Streak Counter, Last Order Date, Average Reorder Days.
- **Technical/Telemetry Logs**: Client IP Address, User Agent, Known Device Locations, Login Timestamps, and Route Activity Logs.

---

## 3. OBLIGATIONS OF THE DATA PROCESSOR
3.1. **Instructions**: The Data Processor shall only process Personal Data on documented instructions from the Data Controller, unless required by laws of the Republic of Kenya.  
3.2. **Confidentiality**: The Data Processor shall ensure that all personnel authorized to access the Personal Data are bound by strict obligations of confidentiality.  
3.3. **Technical Security**: The Data Processor shall implement appropriate technical and organizational measures to safeguard Personal Data:
- Enforcing AES-256-CBC field-level encryption for phone numbers and payment data via `utils/cryptoUtils.js`.
- Utilizing bcrypt with a work factor of 12 or 14 for hashing credentials before storage.
- Ensuring separation of duties and secure HTTP-Only cookies.

---

## 4. SUBPROCESSORS
4.1. The Data Controller hereby gives general authorization to the Data Processor to engage the following subprocessors for infrastructure and service hosting:

| Subprocessor | Purpose | Location / Governance |
| :--- | :--- | :--- |
| **MongoDB Atlas** | Managed database engine hosting primary customer data. | AWS/GCP Frankfurt/Ireland (encrypted at rest) |
| **Upstash Redis** | Caching, session management, and API rate-limiting. | Cloud Infrastructure / EU-West / US |
| **Safaricom Daraja** | Processing M-Pesa payments and webhook callback streams. | Kenya (Local infrastructure) |
| **Cloudinary** | Storing and delivering user profile and product images. | Global CDN |
| **Vercel** | Frontend web application hosting and serverless distribution. | Global Edge Networks |
| **SendGrid / SMTP** | Transactional emails and authentication magic link delivery. | Global servers |

---

## 5. DATA SUBJECT RIGHTS
5.1. Taking into account the nature of the processing, the Data Processor shall assist the Data Controller by implementing technical tools in the Software to allow:
- Execution of the "Right to be Forgotten" (anonymizing or deleting user PII fields in `User` collection).
- Rectification of user profiles.
- Export of personal data in structured, machine-readable formats.

---

## 6. DATA BREACH NOTIFICATION
6.1. The Data Processor shall notify the Data Controller within **forty-eight (48) hours** after becoming aware of any accidental or unauthorized destruction, loss, alteration, disclosure of, or access to Personal Data (a "Security Incident").  
6.2. The notification shall include:
- A description of the nature of the Security Incident, including categories and approximate number of data subjects affected.
- The name and contact details of the technical contact.
- Remedial actions taken or planned to mitigate the incident.

---

## 7. TRANS-BORDER DATA FLOWS
7.1. In accordance with Section 48 of the KDPA 2019, the Data Processor shall ensure that any transfer of Personal Data outside the territory of Kenya is conducted only where the destination country has adequate data protection laws or when using appropriate contractual clauses.

---

## 8. RETURN AND DELETION OF DATA
8.1. Upon termination of the development and delivery services, the Data Processor shall, at the choice of the Data Controller, safely delete or return all Personal Data and delete existing copies, unless laws of Kenya require retention of financial transactions (which must be retained for 7 years under statutory tax laws).
