# Onboarding API Payload Documentation

> **Note:** Please feel free to modify the API design as needed.

## Overview

The onboarding flow supports two sign-up methods:

1. **Sign up with Phone Number** — OTP-based verification → provider type selection → collects profile details → email verification → account created
2. **Sign up with Google / Facebook / Email / Apple** — Same flow as the store app (post-auth)

## Flow Summary Diagram

```
[Splash Screen]
      |
      └─── Sign up with Number ──────────────────────────────────────────┐
      |         |                                                         |
      |    [Enter Phone] ──► [Enter OTP] ──► [OTP Success]               |
      |                                           |                       |
      |                              ┌────────────┴──────┐               |
      |                         [Individual]         [Business]           |
      |                              |                    |               |
      |                     [Personal Details]   [Personal Details]       |
      |                              |                    |               |
      |                    [Email Sent — pending] [Business Details]      |
      |                              |                    |               |
      |                    [User clicks email]   [Email Sent — pending]   |
      |                              |                    |               |
      |                    [GET /email/verify]   [User clicks email]      |
      |                              |                    |               |
      |                       [Account Active]  [GET /email/verify]       |
      |                       [Tokens Issued]   [Account Active]          |
      |                                         [Tokens Issued]           |
      |
      └─── Sign up with Google/Facebook/Email/Apple ──► [Same as store app]
```

## Figma Prototype

## ![Onboarding Screenshot](https://raw.githubusercontent.com/convenient-dev/convenient-connect/main/docs/onboarding.png)

## Base URL

```
POST /api/v1/auth/...
```

---

## Flow 1: Sign Up with Phone Number

### Step 1 — Request OTP

**Endpoint:**

```
POST /api/v1/auth/otp/request
```

**Request Body:**

```json
{
  "phone_number": "+12345678900",
  "country_code": "+1"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "OTP sent to your phone number.",
  "data": {
    "otp_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 300
  }
}
```

**Response (400 Bad Request):**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PHONE_NUMBER",
    "message": "The phone number provided is not valid."
  }
}
```

---

### Step 2 — Verify OTP (4-digit code)

**Endpoint:**

```
POST /api/v1/auth/otp/verify
```

**Request Body:**

```json
{
  "otp_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "otp_code": "2337"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Phone number verified successfully.",
  "data": {
    "verification_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "is_new_user": true
  }
}
```

**Response (401 Unauthorized):**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_OTP",
    "message": "The OTP entered is incorrect or has expired."
  }
}
```

> `verification_token` is a short-lived token passed in subsequent registration steps.

---

### Step 3 — Select Provider Type

**Endpoint:**

```
POST /api/v1/auth/onboarding/provider-type
```

**Headers:**

```
Authorization: Bearer <verification_token>
```

**Request Body:**

```json
{
  "provider_type": "individual"
}
```

> **Accepted values for `provider_type`:** `"individual"` | `"business"`

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Provider type selected.",
  "data": {
    "provider_type": "individual",
    "next_step": "personal_details"
  }
}
```

---

## Flow 1A: Individual — Personal Details

### Step 4A — Submit Personal Details

**Endpoint:**

```
POST /api/v1/auth/onboarding/personal-details
```

**Headers:**

```
Authorization: Bearer <verification_token>
```

**Request Body:**

```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane.doe@example.com"
}
```

| Field        | Type   | Required | Notes                       |
| ------------ | ------ | -------- | --------------------------- |
| `first_name` | string | Yes      | Min 2 character             |
| `last_name`  | string | Yes      | Min 2 character             |
| `email`      | string | Yes      | Valid email format required |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Personal details saved. A verification email has been sent to jane.doe@example.com.",
  "data": {
    "user_id": "usr_01J3XKPQD9FGRHTV2B7CNWM8A",
    "provider_type": "individual",
    "email": "jane.doe@example.com",
    "account_status": "pending_verification",
    "next_step": "email_verification"
  }
}
```

**Response (409 Conflict):**

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "An account with this email address already exists."
  }
}
```

> On success, the user record is created with `account_status: "pending_verification"`. A verification email is dispatched automatically.

---

---

## Step 5A — Email Verification (Individual)

After submitting personal details, the backend sends an email containing a unique verification link. When the user clicks it, the client must call the confirmation endpoint.

### 5A-i — Confirm Email via Link (GET — triggered by email click)

This endpoint is called when the user clicks the "Verify" button/link in their email. It is typically opened in a browser or deep-linked back into the app.

**Endpoint:**

```
GET /api/v1/auth/email/verify?token=<email_verification_token>
```

**Query Parameters:**

| Parameter | Type   | Required | Notes                                              |
| --------- | ------ | -------- | -------------------------------------------------- |
| `token`   | string | Yes      | Signed, single-use token embedded in the email URL |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Email verified successfully. Your account is now active.",
  "data": {
    "user_id": "usr_01J3XKPQD9FGRHTV2B7CNWM8A",
    "provider_type": "individual",
    "account_status": "active",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

**Response (400 Bad Request — token invalid or already used):**

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_TOKEN_INVALID",
    "message": "This verification link is invalid or has already been used."
  }
}
```

**Response (410 Gone — token expired):**

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_TOKEN_EXPIRED",
    "message": "This verification link has expired. Please request a new one."
  }
}
```

> On success, `account_status` transitions from `pending_verification` → `active` and the full auth tokens are issued. The app should redirect the user to the main experience.

### 5A-ii — Resend Verification Email

Used when the user did not receive the email or the link expired.

**Endpoint:**

```
POST /api/v1/auth/email/resend-verification
```

**Headers:**

```
Authorization: Bearer <verification_token>
```

**Request Body:**

```json
{
  "user_id": "usr_01J3XKPQD9FGRHTV2B7CNWM8A",
  "email": "jane.doe@example.com"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "A new verification email has been sent to jane.doe@example.com.",
  "data": {
    "email": "jane.doe@example.com",
    "expires_in": 86400
  }
}
```

**Response (429 Too Many Requests):**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many resend attempts. Please wait before trying again."
  }
}
```

> Email verification tokens should expire after **24 hours**. Resend requests should be rate-limited (suggested: max 3 per hour per user).

---

## Flow 1B: Business — Personal + Business Details

### Step 4B — Submit Personal Details (Business Path)

Same endpoint and payload as **Step 4A**, but `provider_type` is `"business"`.

**Endpoint:**

```
POST /api/v1/auth/onboarding/personal-details
```

**Headers:**

```
Authorization: Bearer <verification_token>
```

**Request Body:**

```json
{
  "first_name": "John",
  "last_name": "Smith",
  "email": "john.smith@mybusiness.com"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Personal details saved.",
  "data": {
    "next_step": "business_details"
  }
}
```

---

### Step 5B — Submit Business Details

**Endpoint:**

```
POST /api/v1/auth/onboarding/business-details
```

**Headers:**

```
Authorization: Bearer <verification_token>
```

**Request Body:**

```json
{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+12345678900",
  "email": "john.smith@mybusiness.com",
  "business_name": "Smith Supplies LLC",
  "address_line_1": "123 Main Street",
  "address_line_2": "Suite 4B",
  "city": "Boston",
  "state": "MA",
  "zip_code": "02101",
  "country": "US"
}
```

| Field            | Type   | Required | Notes                             |
| ---------------- | ------ | -------- | --------------------------------- |
| `first_name`     | string | Yes      | Min 2 character                   |
| `last_name`      | string | Yes      | Min 2 character                   |
| `email`          | string | Yes      | Valid email format required       |
| `business_name`  | string | Yes      | Legal name of the business        |
| `phone`          | string | Yes      | Valid phone format required       |
| `address_line_1` | string | Yes      | Street address                    |
| `address_line_2` | string | No       | Apt, suite, unit, etc.            |
| `city`           | string | Yes      |                                   |
| `state`          | string | Yes      | 2-letter state/province code      |
| `zip_code`       | string | Yes      |                                   |
| `country`        | string | Yes      | ISO 3166-1 alpha-2 (e.g., `"US"`) |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Business details saved. A verification email has been sent to contact@smithsupplies.com.",
  "data": {
    "user_id": "usr_01J3XKPQD9FGRHTV2B7CNWM8A",
    "business_id": "biz_01J3XKPQD9FGRHTV2B7CNWM8B",
    "provider_type": "business",
    "email": "contact@smithsupplies.com",
    "account_status": "pending_verification",
    "next_step": "email_verification"
  }
}
```

**Response (409 Conflict):**

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "An account with this email address already exists."
  }
}
```

> Same as the individual path — the account is created in `pending_verification` state and no tokens are issued until the email link is clicked.

---

## Step 6B — Email Verification (Business)

Shares the **same two endpoints** as the individual email verification step:

- **`GET /api/v1/auth/email/verify?token=<email_verification_token>`** — Confirms email and activates account
- **`POST /api/v1/auth/email/resend-verification`** — Resends the verification email

See **Step 5A-i** and **Step 5A-ii** above for full request/response payloads.

**Verify response for business (200 OK):**

```json
{
  "success": true,
  "message": "Email verified successfully. Your account is now active.",
  "data": {
    "user_id": "usr_01J3XKPQD9FGRHTV2B7CNWM8A",
    "business_id": "biz_01J3XKPQD9FGRHTV2B7CNWM8B",
    "provider_type": "business",
    "account_status": "active",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

## Flow 2: Sign Up with Google / Facebook / Email / Apple

> This flow mirrors the store app's existing social auth flow. Please add the payload here.

---

## Shared Endpoints

### Resend OTP

**Endpoint:**

```
POST /api/v1/auth/otp/resend
```

**Request Body:**

```json
{
  "otp_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "A new OTP has been sent.",
  "data": {
    "otp_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 300
  }
}
```

---

### Refresh Access Token

**Endpoint:**

```
POST /api/v1/auth/token/refresh
```

**Request Body:**

```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

---

## Error Codes Reference

| Code                     | HTTP Status | Description                                    |
| ------------------------ | ----------- | ---------------------------------------------- |
| `INVALID_PHONE_NUMBER`   | 400         | Phone number format is invalid                 |
| `INVALID_OTP`            | 401         | OTP is incorrect or expired                    |
| `OTP_EXPIRED`            | 401         | OTP has passed its TTL (300s)                  |
| `TOKEN_EXPIRED`          | 401         | verification_token or access_token has expired |
| `TOKEN_INVALID`          | 401         | Token is malformed or tampered                 |
| `EMAIL_ALREADY_EXISTS`   | 409         | Email is already registered                    |
| `PHONE_ALREADY_EXISTS`   | 409         | Phone number is already registered             |
| `MISSING_REQUIRED_FIELD` | 422         | A required field is absent or empty            |
| `INVALID_FIELD_FORMAT`   | 422         | A field value does not match expected format   |
| `RATE_LIMIT_EXCEEDED`    | 429         | Too many OTP requests; back off and retry      |
| `SERVER_ERROR`           | 500         | Internal server error                          |
