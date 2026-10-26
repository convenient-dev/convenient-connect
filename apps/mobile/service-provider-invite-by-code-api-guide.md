# Service Provider Invite By Code API Guide

Last reviewed: 2026-10-22

This document is the frontend integration contract for invite-by-code. Every path below is under `/api/v1/service-provider` unless a full path is written. The sections after this overview explain the request, response, and branching rules.

It describes the current Laravel implementation, not a proposed payload. Runtime IDs in examples are illustrative. Always use the `business_id` and `service_sub_category_id` values returned by the APIs in the current environment.

Invite-by-code is not the email invite flow. Email invite stays on `/business-members/invite`. Do not reuse `business_members.invite_code` (the 6-character email token) as the 5-character join code.

## API overview

### Invite codes (owner)

| API | Endpoint |
|---|---|
| Create a one-time code | `POST /business-invite-codes` |
| List codes for a business | `GET /business-invite-codes` |

### Join with a code (invitee)

| API | Endpoint |
|---|---|
| Preview a code without using it | `POST /business-invite-codes/preview` |
| Redeem a code and join | `POST /business-invite-codes/redeem` |

### After join

| API | Endpoint |
|---|---|
| My collaborations | `GET /account-settings/my-affiliations` |

`business_id` is the owner’s `provider_businesses.id`. The join APIs take `code`, not `business_id`.

## 1. Sources Reviewed

The contract below was verified against:

- `routes/services.php`
- `BusinessInviteCodeController`, `ProviderProfileController::myAffiliations`
- `BusinessInviteCode`, `BusinessMember`, `ProviderBusiness`
- `BusinessInviteCodeResource`
- `config/invite.php`
- `BusinessInviteCodeTest`
- Service Provider Swagger annotations under `app/Swagger/ServiceProvider/BusinessInviteCodes`

## 2. Common API Rules

### Authentication

Every endpoint in this guide requires a valid Sanctum bearer token:

```http
Authorization: Bearer <token>
Accept: application/json
```

Missing or invalid authentication returns HTTP `401`.

`POST /business-invite-codes` and `POST /business-invite-codes/redeem` also use `provider.operational`. A suspended provider receives HTTP `403` with `data.code` = `PROVIDER_ACCOUNT_SUSPENDED`. List and preview stay available while suspended.

### Response envelope

Success:

```json
{
  "status": "Success",
  "message": "Human-readable success message.",
  "data": {},
  "meta": []
}
```

Error:

```json
{
  "status": "Error",
  "message": "The first validation or domain error.",
  "data": null,
  "meta": []
}
```

Validation and domain failures normally return `422`, missing owned records or an unknown code return `404`, and unexpected failures return `500`.

### Code rules

| Rule | Value |
|---|---|
| Length | 5 |
| Alphabet | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `I`, `O`, `0`, `1`) |
| Case | Always uppercase. The API normalizes input. |
| Uses | One person, one redeem |
| TTL | 48 hours from create (`INVITE_CODE_TTL_HOURS`, default 48) |
| Deep link | `{INVITE_CODE_JOIN_URL}/{code}` |

The stored `status` column is `active` or `used`. The API `status` field is computed:

| `status` | Meaning |
|---|---|
| `active` | Unused and `expires_at` is still in the future, or `expires_at` is null |
| `used` | Someone redeemed it. Used wins over the clock. |
| `expired` | Still unused and `expires_at` is in the past |

Do not treat `expired` as a stored enum on the row. Filter list `status=expired` as unused rows whose `expires_at` has passed.

## 3. Required Frontend Flow

### Owner: create and share

1. Open Invite Member on an owned business. Keep By Email on `POST /business-members/invite`.
2. On Invite Code, require a code name and at least one service from `GET /business/{id}` subcategories (or the business subcategory list you already use).
3. Submit `POST /business-invite-codes` with `business_id`, `name`, and `service_sub_category_ids`.
4. On success, go to Invite Codes. Do not invent the 5-character code on the client.
5. Load `GET /business-invite-codes?business_id={id}` for Active and Used.
6. Active tab: `status === "active"`. Show copy code and copy link.
7. Used tab: `status === "used"` or `status === "expired"`. No copy or share.
8. Under the code, show `Used` for used rows. Show `Expired` with a red border and red text for expired rows.
9. Build the share URL as `{window.location.origin}/join/{code}` in the sandbox. The API `link` field uses `INVITE_CODE_JOIN_URL`.

### Invitee: join

1. Open `/join/{code}` or type the code on Add Collaboration.
2. If the user is not logged in, send them to login and return to `/join/{code}`. Do not require them to click the link again in the same tab.
3. Prefill the 5-character code. Call `POST /business-invite-codes/preview`, then `POST /business-invite-codes/redeem` on Continue.
4. Preview does not consume the code. Redeem creates the member as `active` with `invite_type=code` and marks the code `used`.
5. Show You’re in with `business_name`, `joined_at`, and `sub_categories`.
6. My Collaborations is `GET /account-settings/my-affiliations`. Do not merge local mock rows.

### After join

The member may publish services under that business only in the assigned subcategories. Create already rejects a subcategory that is not on the membership. The create-service picker should list the affiliation and only those assigned chips.

---

# Part A: Owner

## 4. Create A Code

```http
POST /api/v1/service-provider/business-invite-codes
Content-Type: application/json
```

Requires `provider.operational`.

| Field | Required | Rules |
|---|---:|---|
| `business_id` | Yes | Integer. Must be an owned `provider_businesses.id`. |
| `name` | Yes | String, max 100. Label for the intended person, not the generated code. |
| `service_sub_category_ids` | Yes | Array, min 1. Each id must exist and belong to that business. Duplicates are ignored. |

```json
{
  "business_id": 64,
  "name": "Sarahh McMahon",
  "service_sub_category_ids": [12, 13]
}
```

Success message: `Invite code created successfully.`

`data` is one code object (section 6). `expires_at` is now + 48 hours. `status` is `active`. `code` is server-generated.

### Create errors

| HTTP | Message | When |
|---|---|---|
| 404 | `Business profile not found.` | The caller does not own that business. |
| 422 | First validation message | Missing name, empty services, bad ids. |
| 422 | `Assigned service sub categories must belong to the selected business.` | A service is not on the business. |
| 403 | Suspended account | `provider.operational`. |

## 5. List Codes

```http
GET /api/v1/service-provider/business-invite-codes?business_id=64
GET /api/v1/service-provider/business-invite-codes?business_id=64&status=active
```

`business_id` is required. `status` is optional: `active`, `used`, or `expired`.

Counts always describe the whole business, even when `status` filters `codes`.

```json
{
  "status": "Success",
  "message": "Invite codes retrieved successfully.",
  "data": {
    "active_count": 1,
    "used_count": 3,
    "expired_count": 2,
    "total_count": 6,
    "codes": []
  },
  "meta": []
}
```

Newest `created_at` first. The sandbox loads all codes once and splits tabs on the client. That is valid. `Manage existing codes (N)` can use `total_count`.

If the caller does not own the business: `404` `Business profile not found.`

## 6. Code Object

```json
{
  "id": 10,
  "business_id": 64,
  "business_name": "khanshan store",
  "name": "Sarahh McMahon",
  "code": "HTMX8",
  "status": "active",
  "link": "http://localhost:5174/join/HTMX8",
  "expires_at": "2026-10-24T12:00:00.000000Z",
  "used_at": null,
  "services": [
    { "sub_category_id": 12, "sub_category_name": "Detailing" },
    { "sub_category_id": 13, "sub_category_name": "Mechanic" }
  ],
  "extra_services_count": 0
}
```

`extra_services_count` is `max(0, services.length - 2)`. Use it for a `+N` chip after the first two names.

`link` is `INVITE_CODE_JOIN_URL` + `/` + `code`. Local sandbox should copy `{origin}/join/{code}` so the person lands on the provider web join page, not Apache `/join`.

---

# Part B: Invitee

## 7. Preview

```http
POST /api/v1/service-provider/business-invite-codes/preview
Content-Type: application/json
```

```json
{ "code": "htmx8" }
```

`code` is required, max 10 characters. The server strips non-alphanumerics and uppercases. Preview does not mark the code used and does not create a member.

Success message: `Invite code is valid.` `data` is the code object in section 6.

Use preview to fail early. Then call redeem. If you only need one request, redeem alone is enough.

## 8. Redeem

```http
POST /api/v1/service-provider/business-invite-codes/redeem
Content-Type: application/json
```

Requires `provider.operational`. Body is the same as preview: `{ "code": "HTMX8" }`.

Redeem, in one transaction:

1. Locks the code row.
2. Re-runs the same block checks as preview.
3. Ensures the caller has a provider profile.
4. Creates `business_members` with `invite_type=code`, `status=active`, `accepted_at=now`, and the code’s services.
5. Sets the code to `used`, `used_at`, and `used_by_user_id`.

Success message: `You have joined this business.`

```json
{
  "status": "Success",
  "message": "You have joined this business.",
  "data": {
    "business_member_id": 88,
    "business_id": 64,
    "business_name": "khanshan store",
    "joined_at": "Oct 22, 2026",
    "sub_categories": ["Detailing", "Mechanic"],
    "invite_code": "HTMX8"
  },
  "meta": []
}
```

`joined_at` is `M d, Y` in local EST, not ISO. `sub_categories` is an array of names, not objects.

The member is Active immediately. They do not appear under Pending. Pending is only for email invites that were sent and not accepted.

## 9. Preview And Redeem Errors

| HTTP | Message | When |
|---|---|---|
| 404 | `Invalid code.` | Unknown code, or the business is gone. |
| 422 | `This code has already been used.` | Used by someone else. |
| 422 | `You’re already part of this business.` | This user already redeemed it, or they already have a pending/active membership on that business (email or code). |
| 422 | `This code has expired.` | Unused and past `expires_at`. |
| 422 | `You can’t join your own business.` | Caller owns the business or created the code. |
| 403 | Suspended account | Redeem only. |

Show `message` as-is.

## 10. Deep Link

Share URL: `{INVITE_CODE_JOIN_URL}/{code}`.

Provider sandbox route: `/join/:code`.

1. Logged out → login with `from=/join/{code}`, then return to that path.
2. Logged in → Join Business with the code filled.
3. Continue runs preview then redeem.

The return path lives in router state. A refresh on login, or signup started from Home, loses it. Then they must enter the code again.

No AppsFlyer / store fallback is wired for this link. A person without the native app still uses the website. They need a provider account before redeem.

---

# Part C: After Join

## 11. My Collaborations

```http
GET /api/v1/service-provider/account-settings/my-affiliations
```

Success message: `Affiliations retrieved successfully`.

`data` is an array. No profile returns `[]`.

```json
{
  "business_member_id": 88,
  "business_name": "khanshan store",
  "joined_at": "Oct 22, 2026",
  "sub_categories": ["Detailing", "Mechanic"]
}
```

`sub_categories` are names. `joined_at` matches redeem’s date format.

Reload this list when the user opens My Collaborations after redeem. Do not seed local businesses.

## 12. Assigned Services When Publishing

Redeem copies the code’s subcategories onto the member.

When the member creates a service with `provider_type=business` and that `business_id`:

- The backend accepts only a subcategory on that membership.
- A subcategory on the owner’s catalog but not on the member returns `The selected subcategory is not assigned to the selected business.`

Their own individual listings are not limited by the invite. The owner can later add or remove member services on `/business-members/{id}/services`.

Category list endpoints still resolve owned businesses. A collaborator’s create UI should use affiliations plus the assigned chips, not the owner’s full catalog.

## 13. Email Invite Versus Code

| | By email | By code |
|---|---|---|
| Endpoint | `POST /business-members/invite` | `POST /business-invite-codes` |
| Who can be invited | Existing `role_id=3` user | Any signed-in provider on redeem |
| Token | 6-character `business_members.invite_code` | 5-character row on `business_invite_codes` |
| Member status after send | `pending` | No member until redeem |
| After accept / redeem | `active` | `active` |
| Expiry | 7 days on the pending invite | 48 hours on an unused code |
| List screen | Members Pending | Invite Codes Used tab if unused past 48h |

Do not mix the two tokens. Accept-invitation is email only.

---

## 14. Important Errors

### Create and list

| HTTP | Message |
|---|---|
| 401 | Unauthenticated |
| 403 | Provider account is suspended (create) |
| 404 | `Business profile not found.` |
| 422 | Validation, or services not on the business |

### Preview and redeem

| HTTP | Message |
|---|---|
| 401 | Unauthenticated |
| 403 | Provider account is suspended (redeem) |
| 404 | `Invalid code.` |
| 422 | Expired, used, own business, or already a member |

## 15. Frontend Implementation Checklist

1. Create uses `POST /business-invite-codes`. Do not generate or store codes in `sessionStorage`.
2. List uses `GET /business-invite-codes`. Split Active vs Used+Expired on `status`.
3. Copy the 5-character `code` on Active only. Copy `{origin}/join/{code}` as the link.
4. Used pill is gray. Expired pill is red border and red text. Same Used tab.
5. Join page accepts `/join/:code` and Add Collaboration manual entry.
6. Continue: preview, then redeem. Show `message` on failure.
7. You’re in uses redeem `data`. View affiliation reloads `GET /account-settings/my-affiliations`.
8. Do not send the owner through redeem. The API returns `You can’t join your own business.`
9. After join, only offer assigned subcategories when publishing under that business.
10. Keep email invite on `/business-members/*`.

## 16. Maintenance Rule

When you add, change, or remove an invite-code or affiliation field:

1. Update this guide in the same change.
2. Update OpenAPI annotations under `app/Swagger/ServiceProvider/BusinessInviteCodes`.
3. Run `php artisan l5-swagger:generate service-provider`.
4. Put a new service-provider migration only in `database/migrations/service_providers`.
