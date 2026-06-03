# SOFTWARE DEVELOPMENT AND DELIVERY AGREEMENT

**THIS SOFTWARE DEVELOPMENT AND DELIVERY AGREEMENT** (the "Agreement") is entered into as of this 3rd day of June, 2026 (the "Effective Date"), by and between:

1.  **RERENDET COFFEE LIMITED**, a limited liability company incorporated under the laws of the Republic of Kenya, with its principal place of business at Bomet, Kenya, and of post office box address info@rerendetcoffee.com (hereinafter referred to as the "**Client**", which expression shall where the context so admits include its successors and permitted assigns); and
2.  **SETH K. KORIR**, an independent software engineering consultant and architect operating under the laws of Kenya (hereinafter referred to as the "**Developer**", which expression shall where the context so admits include its successors and permitted assigns).

Individually, the Client and the Developer may be referred to as a "Party" and, collectively, as the "Parties."

---

## 1. SCOPE OF SERVICES
1.1. The Developer shall design, develop, implement, test, and deliver a custom agricultural and e-commerce web application, colloquially named the **Rerendet Farm Storefront & Admin Portal** (the "Software").  
1.2. The Software consists of the following components as detailed in the technical specification documentation:
- **Client-Side Storefront Application**: Built with React.js, featuring responsive design, coffee shop interfaces, loyalty streak mechanisms, shopping cart management, user profile authentication, and checkout forms.
- **Server-Side RESTful API**: Built with Node.js/Express.js, featuring rate-limiting (via Redis), database interaction (via MongoDB), PDF invoice generation, and transactional email distribution.
- **Admin Control Panel**: Featuring global command-palette search, real-time activity logging, role-based access control (RBAC), database settings panel, and automated maintenance toggling (Super Gate).
- **Asynchronous Processing Workers**: Backed by BullMQ and Redis to execute deferred workflows.

---

## 2. DELIVERY AND MILESTONES
2.1. The Developer agrees to deliver the Software in accordance with the following milestone schedule:
- **Milestone 1**: Database Schemas & Authentication Layer Handover (completed).
- **Milestone 2**: Storefront UI Integration & Cart Persistence Layer (completed).
- **Milestone 3**: M-Pesa Daraja and Stripe API Payment Webhooks Implementation (completed).
- **Milestone 4**: Admin Dashboard, Activity Logging, and Settings Panel (completed).
- **Milestone 5**: Credentials Handover, Final System Audit Integration, and UAT Sign-Off (Current Phase).

---

## 3. COMPENSATION AND PAYMENT TERMS
3.1. In consideration for the development services, the Client shall pay the Developer a total project fee in the currency of Kenya Shillings (KES).  
3.2. Payments shall be disbursed upon verification and acceptance of each milestone. All payments are non-refundable once UAT sign-off is given for the respective milestone.  
3.3. Out-of-pocket costs for third-party hosting, APIs, security vaults, and cloud databases (e.g., MongoDB Atlas, Vercel, Redis/Upstash, Safaricom Daraja, Cloudinary, Sentry) are not included in the project fee and shall be paid directly by the Client.

---

## 4. INTELLECTUAL PROPERTY RIGHTS
4.1. **Work Made for Hire**: Upon full payment of all outstanding invoices, all proprietary source code, assets, schemas, design files, and documentation developed under this Agreement shall belong solely to the Client.  
4.2. **Developer Toolkit**: Notwithstanding Clause 4.1, the Developer retains all rights, title, and interest in any pre-existing code, modules, packages, libraries, or developer tools utilized during development. The Developer grants the Client a non-exclusive, perpetual, royalty-free, worldwide license to use such tools as integrated into the Software.

---

## 5. WARRANTIES AND EXCLUSIONS
5.1. **Developer Warranty**: The Developer warrants that the Software shall perform substantially in accordance with the documentation for a period of ninety (90) days following final deployment (the "Warranty Period").  
5.2. **Exclusions**: The warranty in Clause 5.1 does not cover:
- Defects arising from changes, configurations, or modifications made to the Software by the Client or any third party after the delivery date.
- Outages or failures caused by third-party services (Safaricom M-Pesa, Stripe, Vercel, MongoDB Atlas, Cloudinary, Sentry, Upstash Redis).
- Security compromises resulting from compromised API keys or rotated keys not configured according to the Handover Checklist.
5.3. **DISCLAIMER**: EXCEPT FOR THE EXPRESS WARRANTIES SET FORTH HEREIN, THE DEVELOPER DISCLAIMS ALL OTHER WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.

---

## 6. LIMITATION OF LIABILITY
6.1. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR INDIRECT DAMAGES, INCLUDING LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS INTERRUPTION, ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT.  
6.2. The maximum aggregate liability of the Developer for any claim arising under this Agreement shall not exceed the total fees paid by the Client to the Developer under this Agreement.

---

## 7. CONFIDENTIALITY AND DATA PROTECTION
7.1. Each Party shall maintain the confidentiality of all proprietary or confidential information received from the other Party during the term of this Agreement.  
7.2. Both Parties agree to comply with the provisions of the Kenya Data Protection Act, 2019, concerning the handling, encryption, and protection of Customer Personal Data processed by the Software.

---

## 8. DISPUTE RESOLUTION
8.1. This Agreement shall be governed by, interpreted, and construed in accordance with the Laws of the Republic of Kenya.  
8.2. Any dispute, controversy, or claim arising out of or relating to this contract, including its formation, validity, breach, or termination, shall be referred to and resolved by arbitration under the Nairobi Centre for International Arbitration (NCIA) Rules. The seat of arbitration shall be Nairobi, Kenya, and the language shall be English.

---

## 9. SIGNATURE BLOCKS

**IN WITNESS WHEREOF**, the Parties hereto have executed this Agreement as of the Effective Date.

### FOR THE CLIENT:
**RERENDET COFFEE LIMITED**  
Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Name: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Title: Director / Authorized Officer  
Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  

### FOR THE DEVELOPER:
**SETH K. KORIR** (Independent Consultant)  
Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Name: Seth K. Korir  
Title: Lead Architect & Developer  
Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
