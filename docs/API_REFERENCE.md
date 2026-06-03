# API Reference Manual

This manual details all API endpoints exposed by the Rerendet Farm backend server, including authentication requirements, request/response models, rate-limiting rules, token lifecycles, and a troubleshooting error code directory.

---

## 1. Global API Standards

### Base URL
All API paths listed are relative to the root backend URL, prefixed with `/api`.
*   Development: `http://localhost:5000/api`
*   Production: `https://[app-name].vercel.app/api` or `https://[custom-domain]/api`

### Security and Headers
*   **Content-Type**: Requests with a body must pass `Content-Type: application/json`.
*   **CSRF Protection**: Non-GET/HEAD/OPTIONS requests must include double-submit cookies matching the `_csrf` protection validation scheme.
*   **Authentication Header**: Secure endpoints verify the JSON Web Token (JWT) transmitted via:
    1.  The `token` HttpOnly cookie.
    2.  `Authorization: Bearer <Access_Token>` header fallback.

---

## 2. Authentication Rate-Limiting Tiers

```
[Incoming Request]
  ├── /api/auth/customer/login ──> Strict Auth Limiter (5 requests per 15 minutes)
  ├── /api/auth/*               ──> Standard Auth Limiter (30 requests per 15 minutes)
  ├── /api/orders               ──> Checkout Limiter (prevents carding/inventory locking)
  └── /api/*                    ──> Global Limiter (500 requests per 15 minutes)
```

1.  **Global Limiter**: Applied to all `/api` routes. Limits clients to `500` requests per 15 minutes.
2.  **Auth Limiter**: Applied to `/api/auth` routes. Limits clients to `30` requests per 15 minutes (extended to `1000` in development).
3.  **Strict login/MFA Limiter**: Applied to `/api/auth/*/login`, `/api/auth/*/verify-2fa`, `/api/auth/2fa/verify`, and `/api/auth/2fa/verify-backup`. Limits clients to `5` attempts per 15 minutes per IP.
4.  **Checkout Rate Limiter**: Applied to `/api/orders` to stop automated payment processing.

---

## 3. Token Lifecycle & Session Management

### Token Pairs
1.  **Access Token**:
    *   **Expires**: 15 minutes.
    *   **Context**: Cryptographically signed (`JWT_SECRET`). Encodes identity (`userId`, `email`, `role`, `twoFactorEnabled`, session ID `jti`, and context fingerprint `fpt`).
    *   **Cookie**: Transmitted in cookie named `token` (HttpOnly, Secure, SameSite: Strict).
2.  **Refresh Token**:
    *   **Expires**: 7 days.
    *   **Context**: Signed (`JWT_REFRESH_SECRET`). Contains `userId`, `tokenVersion`, and the transaction identifier `jti`.
    *   **Cookie**: Transmitted in cookie named `refreshToken` (HttpOnly, Secure, SameSite: Strict).

### Silent Refresh Flow (`POST /api/auth/refresh`)
*   **Authentication**: Reads `refreshToken` cookie.
*   **Validation**: Resolves token signatures, verifies fingerprint matches origin, and tests existence against active sessions recorded in Redis (`refresh:<userId>:<jti>`).
*   **Action**: Rotates the short-lived access token and sets it back in cookies.

---

## 4. Endpoints Catalog

### 4.1. Authentication & Session Control (`/api/auth`)

#### `POST /auth/customer/register`
*   **Access**: Public (Rate Limit: 5/hr per IP)
*   **Body**:
    ```json
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "johndoe@example.com",
      "password": "StrongPassword123!",
      "phone": "+254712345678",
      "gender": "male",
      "dateOfBirth": "1995-04-12"
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "Registration successful! Please check your email for verification.",
      "data": {
        "id": "603d2e1f4f1a2c3d4e5f6g7h",
        "email": "johndoe@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+254712345678",
        "userType": "customer"
      }
    }
    ```
*   **Error Response (400 Bad Request)**:
    ```json
    {
      "success": false,
      "message": "Password is too weak. Must score at least 3/4 on security complexity."
    }
    ```

#### `POST /auth/customer/login`
*   **Access**: Public (Strict rate limit: 5 per 15 minutes)
*   **Body**:
    ```json
    {
      "email": "johndoe@example.com",
      "password": "StrongPassword123!"
    }
    ```
*   **Success Response (200 OK - Direct Auth)**:
    ```json
    {
      "success": true,
      "message": "Login successful",
      "data": {
        "user": {
          "id": "603d2e1f4f1a2c3d4e5f6g7h",
          "firstName": "John",
          "lastName": "Doe",
          "email": "johndoe@example.com",
          "userType": "customer",
          "role": "customer",
          "isVerified": true,
          "twoFactorEnabled": false,
          "shippingInfo": {},
          "wallet": {},
          "cart": []
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```
*   **Success Response (200 OK - 2FA Required)**:
    ```json
    {
      "success": true,
      "message": "Verification code sent to your email",
      "requires2FA": true,
      "email": "johndoe@example.com"
    }
    ```

#### `POST /auth/customer/verify-2fa`
*   **Access**: Public (Strict rate limit: 5 per 15 minutes)
*   **Body**:
    ```json
    {
      "email": "johndoe@example.com",
      "code": "123456"
    }
    ```
*   **Success Response (200 OK)**: (Same structure as login success, returning session token).

#### `POST /auth/admin/login`
*   **Access**: Public (Strict rate limit: 5 per 15 minutes)
*   **Body**:
    ```json
    {
      "email": "admin@rerendetcoffee.com",
      "password": "SuperSecureAdminPassword!"
    }
    ```

#### `POST /auth/google`
*   **Access**: Public
*   **Body**:
    ```json
    {
      "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
      "accessToken": "ya29.a0AfH6SMA..."
    }
    ```
*   **Success Response (200 OK)**: Authenticates or registers the client, returning a session token.

#### `POST /auth/refresh`
*   **Access**: Public (Reads `refreshToken` cookie)
*   **Success Response (200 OK)**:
    ```json
    {
      "success": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5..."
    }
    ```

#### `POST /auth/logout`
*   **Access**: Protected
*   **Success Response (200 OK)**: Clears all authentication cookies and invalidates the session in Redis.

#### `GET /auth/me`
*   **Access**: Protected
*   **Success Response (200 OK)**: Returns the current user's profile information.

---

### 4.2. E-Commerce & Order Management (`/api/orders`)

#### `POST /orders`
*   **Access**: Protected (Rate Limited)
*   **Body**:
    ```json
    {
      "items": [
        {
          "product": "603d2e1f4f1a2c3d4e5f6g7b",
          "name": "Rerendet Medium Roast",
          "price": 1200,
          "quantity": 2,
          "image": "https://res.cloudinary.com/...",
          "size": "500g",
          "itemTotal": 2400
        }
      ],
      "shippingAddress": {
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "janedoe@example.com",
        "phone": "+254722334455",
        "country": "Kenya",
        "county": "Nairobi",
        "town": "Westlands",
        "address": "Delta Corner, Tower 2"
      },
      "paymentMethod": "mpesa",
      "couponCode": "WELCOME10"
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "success": true,
      "data": {
        "orderNumber": "ORD-16239483-8472",
        "subtotal": 2400,
        "shippingCost": 150,
        "discountAmount": 240,
        "total": 2310,
        "orderStatus": "open",
        "paymentStatus": "pending",
        "fulfillmentStatus": "unfulfilled",
        "_id": "603d2e1f4f1a2c3d4e5f6g9a"
      }
    }
    ```

#### `POST /orders/shipping-cost`
*   **Access**: Public
*   **Body**:
    ```json
    {
      "county": "Mombasa",
      "itemsCount": 3
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "success": true,
      "shippingCost": 400
    }
    ```

#### `GET /orders/my`
*   **Access**: Protected
*   **Success Response (200 OK)**: Returns an array of orders associated with the logged-in user.

---

### 4.3. Payment Operations (`/api/payments`)

#### `POST /payments/mpesa/stk`
*   **Access**: Protected
*   **Body**:
    ```json
    {
      "orderId": "603d2e1f4f1a2c3d4e5f6g9a",
      "phone": "0712345678"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Payment initiated successfully",
      "checkoutRequestId": "ws_CO_02062026131454152"
    }
    ```

#### `GET /payments/mpesa/status/:checkoutRequestId`
*   **Access**: Protected
*   **Success Response (200 OK)**:
    ```json
    {
      "success": true,
      "status": "SUCCESS",
      "receipt": "QFG1234567"
    }
    ```

---

### 4.4. Catalog Administration (`/api/products`)

#### `GET /products`
*   **Access**: Public
*   **Params**: `page`, `limit`, `search`, `category`, `minPrice`, `maxPrice`
*   **Success Response (200 OK)**:
    ```json
    {
      "success": true,
      "count": 48,
      "pagination": { "page": 1, "pages": 5 },
      "data": [...]
    }
    ```

#### `POST /products`
*   **Access**: Protected + Admin
*   **Format**: Multipart/Form-Data
*   **Body Fields**: `name`, `description`, `categoryId`, `sizes` (JSON array), `images` (Files).
*   **Success Response (201 Created)**: Returns the saved product object.

---

## 5. Structured Error Codes Lookup

When an endpoint fails, the payload returns a standard structure:
```json
{
  "success": false,
  "message": "Error description details",
  "errorCode": "ERROR_ENUM_CODE",
  "stack": "...only in development mode..."
}
```

| HTTP Status | Error Code | Trigger Condition |
| :--- | :--- | :--- |
| `401` | `UNAUTHORIZED` | Invalid or missing authentication headers/cookies. |
| `403` | `FORBIDDEN` | Endpoint requires admin permissions. |
| `403` | `MAINTENANCE_ACTIVE` | Server is locked down; only Super-Gate cookies can bypass. |
| `429` | `RATE_LIMIT_EXCEEDED` | Client has sent too many requests within the rate limit window. |
| `400` | `INSUFFICIENT_STOCK` | Available stock (`physical - reserved`) is lower than requested quantity. |
| `423` | `ACCOUNT_LOCKED` | Account is locked due to consecutive authentication failures. |
| `400` | `INVALID_COUPON` | The coupon code is expired, fully claimed, or does not meet minimum totals. |
| `400` | `IP_BLOCKED` | Webhook route accessed from non-whitelisted provider address range. |
| `503` | `SERVICE_UNAVAILABLE` | Health ping checks report that a critical dependency (MongoDB/Redis) is offline. |
