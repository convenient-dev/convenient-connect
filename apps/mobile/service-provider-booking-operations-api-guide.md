# Service Provider Booking, Chat, Calendar, Earnings & Notifications Guide

Last reviewed: 2026-10-23

Provider-side integration for everything **after** a listing exists: customer requests, offers, payment, confirmed bookings, calendar, earnings, push, and the in-app notification inbox.

**Prerequisite:** Listing create/edit, home, requests (read paths), chats (read/send), weekly hours, and date overrides are documented in [service-provider-template-and-service-api-guide.md](./service-provider-template-and-service-api-guide.md) (or your local copy `service-provider-template-and-service-api-guide.md`). This guide **extends** that doc; it does not replace it.

**Base URL:** `/api/v1/service-provider`  
**Auth:** `Authorization: Bearer <token>` and `Accept: application/json` on every call below.

**Swagger:** Service Provider API docs (`service-provider-api-docs.json`) — tags: *Service Provider Bookings*, *Requests* (offer paths), *Chats*, *Calendar*, *Earnings*, *Notifications*, *Support*.

Image URLs remain relative (`/storage/...`). Prefix with the API host.

---

## Module map (this guide)

| Screen / feature | Primary APIs | Key ID |
|---|---|---|
| Home new requests (preview) | `GET /home`, `GET /requests` | `invitation_id` |
| Request summary & details | `GET /requests/{invitation_id}/summary`, `.../details` | `invitation_id` |
| Offers & accept/decline | `GET/POST .../requests/{invitation_id}/offers`, accept/decline | `invitation_id`, `offer_id` |
| Chat thread | `GET /chats`, `GET /chats/{invitation_id}`, `POST .../messages` | `invitation_id` |
| Confirmed bookings list | `GET /bookings` | `booking_id` |
| Booking execution | `GET /bookings/{bookingId}/status`, start/complete/cancel | `booking_id` |
| Paid booking summary | `GET /bookings/{bookingId}/summary` | `booking_id` |
| Calendar month + day | `GET /calendar` | `month`, `date` |
| Schedule segments | `GET /schedule` | `segment` |
| Earnings & withdraw | `GET /earnings`, history, withdrawals, payout link | `source_type` |
| Push on/off | `GET/PUT /settings/notification/status/{device_token}` | FCM token |
| Notification inbox | `GET /notifications`, unread, mark read | `notificationId` |
| Support | `GET /support/topics`, tickets, FAQs | — |

**Rule:** For anything tied to a **conversation or unpaid request**, route and deep-link with **`invitation_id`**. After the customer pays, use **`booking_id`** for execution, earnings release, and provider cancel of a confirmed job.

---

## End-to-end lifecycle (customer ↔ provider)

Understanding the customer app explains what appears on the provider side.

```text
Customer                          Backend                           Provider
────────                          ───────                           ────────
POST customer-services/           Creates service_requests row
  service-requests/               + invitation(s) + optional
  (submit quote)                    Offer v1 (fixed_price)

                                  request_number assigned
                                  (numeric display id)

POST .../invitations              More invitations on SAME
  (invite more providers)           request_number

GET/POST customer-services/       Offer thread per invitation
  .../offers

Provider GET offers               available_actions drive UI
Provider accept offer             → request status awaiting_payment
                                  (no booking yet)

POST .../checkout (pay)           → service_bookings confirmed
                                  → wallet upcoming credit

Provider start/complete           execution_status timeline
Provider/customer cancel          chat timeline "Canceled" step
                                  (after last completed milestone)
Provider earnings                 upcoming → available after
                                  customer completes booking
```

| Phase | Customer status (request) | Provider sees | Primary key |
|---|---|---|---|
| Sent / negotiating | `sent`, `negotiating` | Home/requests/chat cards | `invitation_id` |
| Awaiting payment | `awaiting_payment` | Same + offer accepted | `invitation_id` |
| Confirmed | `confirmed` | `GET /bookings`, calendar dots | `booking_id` + `request_number` |
| Cancelled / expired | terminal | Pending lists hide open cards; **Schedule** `status=cancelled` still lists paid cancels (`refunded`) | `booking_id` when paid |

**One `request_number` per customer job.** Extra providers = extra **invitations** on the same request, not new numbers.

---

## Offers and request actions (provider)

These paths were added for the booking/commerce flow. They sit under **`/requests/{invitation_id}/...`**.

| Method | Path | Purpose |
|---|---|---|
| GET | `/requests/{invitation_id}/offers` | Offer history + **`available_actions`** |
| POST | `/requests/{invitation_id}/offers` | Create or counter (quote-required only) |
| POST | `/requests/{invitation_id}/offers/{offer_id}/accept` | Accept latest pending customer offer |
| POST | `/requests/{invitation_id}/offers/{offer_id}/decline` | Decline pending offer |
| POST | `/requests/{invitation_id}/decline` | Decline entire invitation |
| POST | `/requests/{invitation_id}/cancel` | Provider cancel **unpaid** path (awaiting payment rules) |

### How to design the offer UI

1. **Always load** `GET /requests/{invitation_id}/offers` (or use the same payload embedded in chat offer cards when present).
2. **Never hard-code buttons.** Render only actions listed in **`available_actions`**.
3. **`pricing_type`** on the response:
   - **`fixed_price`:** Customer Offer v1 exists at submit. Provider may **accept**, **decline** offer, or **decline_invitation**. Do **not** show “Make an offer” or counter.
   - **`quote_required`:** Provider may **create_offer** / **counter** when they are the opposite party; customer may counter back. Money is negotiated until someone accepts.
4. **Accept** moves the request to **`awaiting_payment`**. It does **not** charge the customer and does **not** create a booking.
5. **Counter** requires `supersedes_offer_id` pointing at the latest pending offer when the API expects it (see Swagger `ServiceRequestOfferWriteRequest`).
6. **Body for create/counter:** `service_price` (string decimal), optional `description`, optional `supersedes_offer_id`.

### Offer section layout (recommended)

| Area | Source |
|---|---|
| Status badges | `request_status`, `invitation_status` + labels from summary/home card |
| Price line | Latest offer in `offers[]` (amount, author, version) |
| Action bar | `available_actions` only |
| Thread link | Same `invitation_id` → `GET /chats/{invitation_id}` |
| After accept | Show “Waiting for customer payment” until webhook/checkout completes; then navigate to booking |

### Customer mirror (for full-stack devs)

| Provider | Customer (`/api/v1/customer-services`) |
|---|---|
| `GET .../offers` | `GET service-requests/{requestId}/invitations/{invitationId}/offers` |
| `POST .../offers` | `POST` same path |
| accept/decline offer | `POST .../offers/{offerId}/accept|decline` |
| — | `POST .../checkout` pays and creates booking |

Customer chat and provider chat share the same **`invitation_id`** namespace.

---

## Chats (integration recap + offer cards)

Full inbox/thread rules are in the template guide. Booking-era additions:

- **Offer cards** appear as structured chat items (`kind: offer`) linked to `offer_id`. Actions on the card must match **`available_actions`** from the offers API, not inferred from message text.
- **Request opener** (`kind: request`) is injected on the oldest chat page only. It shows the customer message text, schedule summary (date/times), and status — **not** booking-form file attachments. Photos/files from the request form stay on **request details** (`GET /requests/{invitation_id}/details`); do not render `attachments` on the opener card in provider chat UI.
- **Booking timeline** (`kind: booking_timeline`): system cards for confirmed execution — Booking Confirmed → Service Started → Service Completed → Booking Completed. When a **paid booking is cancelled** (provider or customer), the thread receives an updated timeline card with a **Canceled** step (`step_key: booking_cancelled`, red in UI):
  - Cancel **after payment only** (before start): Confirmed ✓ → **Canceled** → remaining steps grey/pending.
  - Cancel **after start-service**: Confirmed ✓ → Started ✓ → **Canceled** → later steps pending.
  - Cancel **after complete-service** (before customer completes booking): Confirmed ✓ → Started ✓ → Completed ✓ → **Canceled** → Booking Completed pending.
  - Timestamps use provider-local formatting in `timeline_snapshot.steps[].at`. Older threads cancelled before this feature may lack the card until a new cancel occurs.
- **Composer:** Respect `can_send` on the thread. Cancelled/expired requests disable send.
- **Unread badge (tab):** `GET /chats/unread-count` → `unread_total` (count of invitations with ≥1 unread message, not message count).

### Provider web reference

| Piece | Location (provider web app) |
|---|---|
| Inbox route | Chats list page → `GET /chats` |
| Thread | `GET /chats/{invitationId}` paginated upward |
| Send | `POST /chats/{invitationId}/messages` JSON or multipart |
| Header context | `GET /requests/{invitationId}/chat-context` |

### Customer app reference

| Piece | Customer API |
|---|---|
| Inbox | `GET /customer-services/chats` |
| Thread | `GET /customer-services/chats/{invitationId}` |
| Send | `POST /customer-services/chats/{invitationId}/messages` |

Use the same pagination model: page 1 = newest; scroll up for older pages.

---

## Bookings (confirmed / paid)

| Method | Path | Notes |
|---|---|---|
| GET | `/bookings` | All provider bookings, newest first |
| GET | `/bookings/{bookingId}/summary` | Paid summary (extends invitation summary) |
| GET | `/bookings/{bookingId}/status` | Timeline + **`available_actions`** (start, complete, cancel, review) |
| POST | `/bookings/{bookingId}/start-service` | Marks in progress |
| POST | `/bookings/{bookingId}/complete-service` | Optional message to customer |
| POST | `/bookings/{bookingId}/cancel` | Provider cancel confirmed; customer refunded (`status` → `refunded` when refund > 0); provider wallet debited **`provider_service_fee`** from frozen booking snapshot (not legacy flat `cancellation_fee` alone); posts chat timeline **Canceled** |
| GET/POST | `/bookings/{bookingId}/customer-review` | Private provider→customer review (not public service review) |

### Fields to show

| Field | Meaning |
|---|---|
| `request_number` | Customer-facing job number (same on request before pay) |
| `booking_id` | Internal confirmed booking key |
| `provider_net` | Earning amount (not customer `total`) |
| `cancellation_fee` on provider payload | Provider-side cancel penalty hint (from snapshot) |
| `status` | `confirmed`, `completed`, `cancelled`, `refunded`, … — **`refunded`** is the usual paid cancel; treat like cancelled in schedule filters and badges |
| `list_badge` (schedule cards) | **Cancelled** for both `cancelled` and `refunded` |

### Execution flow

1. Open booking from calendar, schedule, or list → `GET /bookings/{id}/status`.
2. Show actions from **`available_actions`** only.
3. **Start** → **Complete** (optional `message` in body).
4. **Cancel** → require `reason` (see Swagger `ProviderCancelBookingRequest`); full customer refund; provider wallet debited per platform rules.

### Customer mirror

| Action | Customer API |
|---|---|
| List bookings | `GET /customer-services/bookings?status=active|history|requested` |
| Cancel confirmed | `POST /customer-services/bookings/{bookingId}/cancel` |
| Complete | `POST /customer-services/bookings/{bookingId}/complete` |
| Pay | `POST .../invitations/{invitationId}/checkout` |

---

## Calendar and schedule

Two complementary APIs:

### Month grid + selected day — `GET /calendar`

| Query | Purpose |
|---|---|
| `month` | `YYYY-MM` for dot aggregation |
| `date` | `YYYY-MM-DD` selected day |
| `page` | Confirmed bookings on that day (5 per page) |

| Block | Use |
|---|---|
| `calendar_dots` | Map date → `{ total, colors[], has_more }` for dot UI |
| `service_legend` | Colors per service title in month |
| `new_requests` | Preview cards (max 2), same shape as home |
| `confirmed_bookings` | Day list with **`manage_actions`** |

Invalid month/date → `422`.

### List segments — `GET /schedule`

| Query | Purpose |
|---|---|
| `segment` | `new` \| `today` \| `week` \| `all` (default `today`) |
| `status` | Optional comma list: `active`, `completed`, `cancelled` — **`cancelled` includes both `cancelled` and `refunded` rows** (paid provider/customer cancels). Omit `status` to include active, completed, and all cancelled paths. |
| `page`, `per_page` | Pagination where applicable (1–50) |

| Segment | Content |
|---|---|
| `new` | Full paginated pending invitation cards |
| `today` / `week` | Confirmed bookings in provider timezone (not cancelled/refunded) |
| `all` | Grouped past / today / upcoming; use `status=cancelled` to review cancel history |

**Provider web:** Schedule filters send `GET /schedule?segment=all&status=cancelled` for the Cancelled tab; badge **Cancelled** on refunded jobs.

### Provider web integration notes

- Load **`GET /calendar`** when the calendar screen mounts; refetch when month or selected date changes.
- Use **`GET /schedule?segment=today`** (or week/all) for list-first layouts without a grid.
- Deep link: booking row → `booking_id` → status/summary routes above.
- Pending card → **`invitation_id`** → summary or chat.

Weekly **`GET /availability`** and **`GET /date-availability`** (template guide) define when the provider can take work; calendar shows what is already booked.

---

## Earnings and payouts

Wallet money is **provider net**, split by **`source_type`:**

| `source_type` | Typical use |
|---|---|
| `personal_service` | Individual listings |
| `business_service` | Business-affiliated bookings |
| `event` | Events wallet (if used) |
| `fundraiser` | Fundraiser wallet (if used) |

| Method | Path | Purpose |
|---|---|---|
| GET | `/earnings?source_type=` | Balances **`available`** / **`upcoming`** + live Stripe **`payout`** state |
| GET | `/earnings/history?view=calendar\|list&...` | Calendar dots or filtered earning rows |
| GET | `/earnings/withdrawals?source_type=` | Past transfers |
| POST | `/earnings/withdrawals` | Withdraw available balance |
| GET | `/earnings/payout-account` | Connect state: `none` \| `connected` \| `restricted` |
| POST | `/earnings/payout-account/link` | Stripe Account Link URL for onboarding |

### Money rules (display copy)

- **Upcoming:** Provider net on paid bookings the customer has **not** marked complete yet.
- **Available:** Released after customer completion; withdrawable subject to Stripe Connect.
- **History rows:** Show `listing_price`, `convenient_fee`, and net — do not show customer card total as provider earnings.

### Withdraw flow

1. `GET /earnings/payout-account` — if `none` or `restricted`, prompt Connect onboarding via **`POST .../payout-account/link`** (open returned URL).
2. Show `available` from `GET /earnings`.
3. `POST /earnings/withdrawals` with amount ≤ available (see Swagger `ProviderWithdrawRequest`).
4. Refresh balances from response or re-fetch `GET /earnings`.

---

## Notifications

Two layers: **push (FCM)** and **in-app inbox**. They are independent:

| Channel | Requires device token? | When it works |
|---|---|---|
| **In-app inbox** (`GET /notifications`) | No | Always after login; booking/chat events are stored server-side |
| **Push (FCM)** | **Yes** | Only after Firebase is configured **and** this install registered an active token |

### A. Push — Firebase + device token (required for FCM)

Backend push uses **Firebase Cloud Messaging**. The server sends to tokens stored for the logged-in user (`UserDeviceTokenService`). **No token → no push**, even if inbox rows are created.

#### Prerequisites (ops + client)

1. **Server:** Firebase credentials configured for the API (FCM send from backend jobs). Without this, push jobs fail silently or log warnings; inbox still works.
2. **Client:** Obtain an FCM **device token** from Firebase SDK (web: messaging + VAPID; mobile: FCM/APNS).
3. **Register token with API** before expecting push:

| Method | Path | Purpose |
|---|---|---|
| GET | `/settings/notification/status/{device_token}` | `enabled`: `1`, `0`, or `null` if unknown |
| PUT | `/settings/notification/status/{device_token}` | **Register or refresh** token; body optional `enabled` (1/0), `device_type` (`web`, `android`, `ios`) |

**URL-encode** the token in the path (tokens contain special characters).

4. **Enable:** `PUT` with `enabled: 1` after user grants notification permission.
5. **Web Firebase config:** Provider web loads project config (see `ensureFirebaseConfigLoaded` / public config endpoint). If Firebase is not configured in the environment, the settings UI should explain that push is unavailable — inbox remains usable.

#### When to register the token

| Event | Action |
|---|---|
| Email/phone/social **login or signup** success | **Recommended:** send `device_token` + `device_type` on auth body (backend registers via `UserDeviceTokenService`) so push works immediately after first login |
| User toggles notifications **on** in settings | Request browser/OS permission → obtain FCM token → **`PUT .../status/{token}`** with `enabled: 1`, `device_type: web` or `android` / `ios` — **required** if token was not sent at login |
| User toggles **off** | `PUT` with `enabled: 0` (or omit `enabled` to toggle) |
| **Logout** | Send `device_token` on `POST /auth/logout` so push stops for that install |
| New browser / reinstall | Generate a new FCM token and **`PUT`** again; old tokens may be disabled |

#### Provider web reference (keys & files)

| Concern | Where |
|---|---|
| Firebase web config | Loaded for FCM (env / `firebase config` endpoint pattern in web app) |
| VAPID / messaging SW | `public/firebase-messaging-sw.js` |
| Token storage key | `localStorage` key `provider_device_token` |
| Permission + token helper | `src/lib/providerPush.js` — `registerProviderPushAfterLogin()`, `getDeviceTokenForApi()` |
| Settings toggle UI | `src/pages/settings/Notifications.jsx`, `SettingsDrawer.jsx` |
| Foreground push → navigate | `src/components/ProviderPushBridge.jsx` (uses payload `data` for deep links) |
| API client | `src/api/notifications.js` |

**Requirements for web push:** HTTPS or `localhost`, service worker, user permission, **registered device token**. LAN HTTP (`http://192.168.x.x`) will not receive FCM even if Firebase is configured.

#### Mobile provider app (pattern)

1. Integrate FCM (or APNS via FCM).
2. On login/signup, pass **`device_token`** and **`device_type`** in the same auth payload the backend already accepts.
3. Settings screen: mirror web — read status GET, write PUT.
4. Notification bell badge: use inbox unread (below), not FCM alone.

### B. In-app inbox (booking events)

| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications?page=&per_page=` | Paginated list (default 20, max 50) |
| GET | `/notifications/unread-count` | Badge count |
| PATCH | `/notifications/read-all` | Mark all read |
| PATCH | `/notifications/{notificationId}/read` | Mark one read |

Customer app uses parallel paths under **`/api/v1/customer-services/service-notifications`**.

Each row should deep-link using payload fields (typically **`invitation_id`** and/or **`booking_id`**) — read the item schema in Swagger *ServiceBookingNotification*.

### Provider web reference

| Piece | File |
|---|---|
| Inbox API | `src/api/serviceNotificationInbox.js` |
| Notifications settings page | `src/pages/settings/Notifications.jsx` |

---

## Support (post-booking ops)

Under **`/support`** (authenticated provider):

| Area | Paths |
|---|---|
| Topics & FAQs | `GET /support/topics`, `GET /support/faqs/{topic_id}`, `GET /support/faqs/search?q=`, `GET /support/faqs/detail/{id}` |
| Tickets | `GET/POST /support/tickets`, `GET /support/tickets/{ticket_number}`, reply, mark-read, close |

Use for provider-help center screens unrelated to a single booking.

---

## Account status

```http
GET /api/v1/service-provider/account-status
```

Use on app boot or before writes: suspended providers receive **`403`** with `Your provider account is suspended.` on mutating routes (services, offers, availability saves, etc.).

---

## Home and requests (quick pointer)

If your team only has the **template** guide from 2026-09-25, note that **home and requests are already live**:

```http
GET /api/v1/service-provider/home
GET /api/v1/service-provider/requests?page=1&per_page=10
```

Home **`new_requests.items`** and requests **`data`** share the same card contract. **`new_requests.total`** matches list **`meta.total`** at that moment.

Open **`invitation_id`** → summary → details → offers/chat/booking as status evolves.

---

## Auth envelope (unchanged)

Success:

```json
{
  "status": "Success",
  "message": "...",
  "data": {},
  "meta": []
}
```

Error: show **`message`**. Validation/domain failures are usually **`422`**. Offer/booking conflicts may be **`409`**. Wrong owner → **`404`** or **`403`**.

---

## Endpoint checklist (added after template/home/chat era)

Use this as a implementation checklist for provider mobile or web:

- [ ] Offers: list, create, accept, decline, decline invitation, cancel unpaid
- [ ] Bookings: list, summary, status, start, complete, cancel, customer review
- [ ] Calendar: month/day grid
- [ ] Schedule: new / today / week / all
- [ ] Earnings: balances, history, withdrawals, Connect link
- [ ] Push: token on auth + settings PUT/GET
- [ ] Inbox: list, unread, mark read
- [ ] Support: topics, FAQs, tickets
- [ ] Account status on launch

---

## Provider web vs provider mobile

| Feature | Provider web (reference) | Mobile provider app |
|---|---|---|
| Requests/offers | Web routes under `/requests/:id` | Same APIs; native navigation |
| Chat | `ProviderChat` + invitation id | Same pagination/send rules |
| Calendar | Calendar page → `GET /calendar` | Same query params |
| Earnings | Earnings + Stripe redirect | WebView or Stripe SDK + same APIs |
| Push | FCM web + service worker | FCM native |
| Notifications list | Settings → Notifications | Dedicated inbox screen recommended |

---

## Related customer APIs (integration testing)

When testing provider flows end-to-end, the customer app typically calls:

| Step | API |
|---|---|
| Quote | `POST /customer-services/services/{serviceId}/request-quote` |
| Submit request | `POST /customer-services/service-requests` |
| Invite more providers | `POST /customer-services/service-requests/{requestId}/invitations` |
| Offers | under `.../invitations/{invitationId}/offers` |
| Pay | `POST .../checkout` |
| My bookings | `GET /customer-services/bookings` |
| Customer calendar | `GET /customer-services/calendar` |

Align **`invitation_id`** and **`booking_id`** in deep links across both apps.

---

## Document history

| Date | Notes |
|---|---|
| 2026-10-23 | Initial booking-operations guide: offers, bookings, calendar, schedule, earnings, notifications, support; mirrors Swagger and provider web patterns. |
| 2026-10-23 | Provider: schedule **`cancelled`** filter includes **`refunded`**; chat request opener omits form attachments; booking timeline **Canceled** step after paid cancel; notifications doc — FCM requires Firebase + **device token** registration (`PUT /settings/notification/status/{device_token}`); provider cancel fee uses frozen **`provider_service_fee`**. |

For OpenAPI field-level schemas, generate or open **Service Provider** Swagger and search by operationId names listed in each section above.
