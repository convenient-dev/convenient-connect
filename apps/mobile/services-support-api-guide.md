# Services Support API Guide

Last reviewed: 2026-10-22

This document is the frontend contract for services support. It describes the current Laravel implementation, not a proposed payload.

There are two lanes. They do not share tables, ticket numbers, or the order-ticket endpoints.

| Lane | Who submits | Ticket number | Base path |
|---|---|---|---|
| Provider support | Provider app | `P-10001` upward | `/api/v1/service-provider/support` |
| Customer service support | Customer app | `CS-10001` upward | `/api/customer/support/service-tickets` |

The support dashboard reads both lanes under `/api/customer-support`. Order tickets stay on `/api/customer/support/add-ticket`, `active-tickets`, `ticket-history`, and `support-chat`. Do not send a service complaint to those routes.

## API overview

### Provider app

| API | Endpoint |
|---|---|
| Topics | `GET /topics` |
| FAQs for one topic | `GET /faqs/{topic_id}` |
| FAQ search | `GET /faqs/search?q=` |
| One FAQ | `GET /faqs/detail/{id}` |
| My tickets | `GET /tickets` |
| Create a ticket | `POST /tickets` |
| Ticket detail | `GET /tickets/{ticket_number}` |
| Reply | `POST /tickets/{ticket_number}/reply` |
| Mark read | `POST /tickets/{ticket_number}/mark-read` |
| Close | `POST /tickets/{ticket_number}/close` |

`ticket_number` is the path key, for example `P-10001`. Do not use the numeric id on these provider routes.

### Customer app

| API | Endpoint |
|---|---|
| My service tickets | `GET /api/customer/support/service-tickets` |
| Create a service ticket | `POST /api/customer/support/service-tickets` |
| Ticket and messages | `GET /api/customer/support/service-tickets/{id}` |
| Reply | `POST /api/customer/support/service-tickets/{id}/reply` |

`{id}` is the numeric ticket id, not `CS-10001`.

### Support dashboard

| API | Endpoint |
|---|---|
| Provider ticket list | `GET /api/customer-support/provider-tickets` |
| Provider topics | `GET /api/customer-support/provider-tickets/topics` |
| Provider ticket detail | `GET /api/customer-support/provider-tickets/{id}` |
| Reply to a provider | `POST /api/customer-support/provider-tickets/{id}/reply` |
| Change provider ticket status | `POST /api/customer-support/provider-tickets/{id}/status` |
| Customer service ticket list | `GET /api/customer-support/service-tickets` |
| Customer service ticket detail | `GET /api/customer-support/service-tickets/{id}` |
| Reply to a customer | `POST /api/customer-support/service-tickets/{id}/reply` |
| Change customer ticket status | `POST /api/customer-support/service-tickets/{id}/status` |
| Notification bell | `GET /api/customer-support/notification` |

Dashboard `{id}` is the numeric ticket id. Provider detail also accepts `P-{id}` as a fallback lookup. Customer service detail does not.

## 1. Common API Rules

### Authentication

Every endpoint requires a Sanctum bearer token for that app:

```http
Authorization: Bearer <token>
Accept: application/json
```

Missing or invalid authentication returns HTTP `401`.

Dashboard routes also require the `Customer Support` role. Another role returns HTTP `403` with `Only Customer Support team members are allowed to perform this action.`

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

Validation and domain failures return `422`. A ticket the caller does not own returns `404`. Unexpected failures return `500`.

### Status values

Both lanes use `open`, `in_progress`, `resolved`, and `closed`.

| Status | Meaning |
|---|---|
| `open` | New ticket. An admin reply moves it to `in_progress`. |
| `in_progress` | Support or the other party has replied. |
| `resolved` | Support marked it resolved. A later reply from the ticket owner moves it back to `in_progress`. |
| `closed` | Locked. Neither side can reply. The provider can close their own ticket. The dashboard status buttons offer Open, In Progress, and Resolved. The status API still accepts `closed`. |

The customer app Active tab is `open` and `in_progress`. The Resolved tab is `resolved` and `closed`. The list API returns every status. The app splits them.

## 2. Required Frontend Flow

Provider:

1. Load `GET /topics` for the hub and the submit chips.
2. Load FAQs with `GET /faqs/{topic_id}`. Search uses `GET /faqs/search?q=`.
3. Show the booking id field only when the selected topic name or slug contains `booking`.
4. Submit `POST /tickets` as `multipart/form-data`.
5. Open a ticket with `GET /tickets/{ticket_number}`.
6. Label public messages `You` when `sender_type` is `provider`, and `Support` when it is `admin`. Hide `is_internal_note` true.
7. Reply with `POST /tickets/{ticket_number}/reply`. A reply on a resolved ticket reopens it.

Customer:

1. On Contact Support, Order For keeps `POST /api/customer/support/add-ticket`. Services For uses this guide.
2. Booking ID is `service_requests.request_number`, such as `BK-20261022-001`. A leading `#` is stripped. Do not send `service_bookings.id`.
3. Subject must be one of the eight values in section 8.
4. Submit JSON to `POST /api/customer/support/service-tickets`.
5. Open the returned `id` on `GET /api/customer/support/service-tickets/{id}`.
6. The Support Tickets screen loads order tickets by default. Services Tickets calls `GET /api/customer/support/service-tickets` and opens `ServiceSupportChat`.

Dashboard:

1. Provider Tickets calls `GET /api/customer-support/provider-tickets` with flat query params.
2. Customer Tickets calls `GET /api/customer-support/service-tickets`.
3. Row click uses `data.id`. Do not parse the ticket number into an id.
4. On the customer list, `provider_name` is the customer. `topic` is the booking number. On detail, `provider` is the customer and `service_provider` is the booked provider.

---

# Part A: Provider Support

Base path: `/api/v1/service-provider/support`.

## 3. Topics and FAQs

```http
GET /api/v1/service-provider/support/topics
GET /api/v1/service-provider/support/faqs/{topic_id}
GET /api/v1/service-provider/support/faqs/search?q=algebra
GET /api/v1/service-provider/support/faqs/detail/{id}
```

A topic row has `id`, `name`, `slug`, `display_order`, `is_active`, and `faqs_count` when counted.

An FAQ row has `id`, `topic_id`, `topic_name` when loaded, `question`, `answer`, `display_order`, and `view_count`.

`q` is required for search, 1–100 characters.

## 4. Provider Ticket List

```http
GET /api/v1/service-provider/support/tickets?status=all&page=1&per_page=15
```

| Query | Default | Rules |
|---|---|---|
| `status` | `all` | `all`, `open`, `in_progress`, `resolved`, or `closed`. |
| `page` | 1 | Integer, 1 or greater. |
| `per_page` | 15 | Integer 1–50. |

Each row: `ticket_number`, `subject`, `topic`, `status`, `unread`, `last_message_preview`, `updated_at`, `created_at`. `unread` is the provider unread flag. Timestamps are ISO 8601.

`meta` has `current_page`, `last_page`, `per_page`, and `total`.

## 5. Create a Provider Ticket

```http
POST /api/v1/service-provider/support/tickets
Content-Type: multipart/form-data
```

Success is HTTP `201`.

| Field | Required | Rules |
|---|---:|---|
| `topic_id` | Yes | Existing `provider_support_topics.id`. |
| `subject` | Yes | String, max 80. |
| `description` | Yes | String, max 1000. This becomes the first message. |
| `booking_id` | No | String, max 50. Send it only for a bookings topic. |
| `idempotency_key` | No | String, max 64. The same key returns the existing ticket. |
| `attachments[]` | No | At most 5 files. JPG, JPEG, PNG, or PDF. 10 MB each. |

A provider may have at most 5 tickets in `open` or `in_progress`. The sixth returns `422` with `You have too many open tickets. Please resolve or close some before creating a new one.`

The stored status is `open`. `admin_unread` is true. `provider_unread` is false.

The success `data` object is the detail shape in section 6.

## 6. Provider Ticket Detail

```http
GET /api/v1/service-provider/support/tickets/P-10001
```

`404` means this provider does not own that ticket number.

```json
{
  "status": "Success",
  "message": "Ticket retrieved successfully.",
  "data": {
    "ticket_number": "P-10001",
    "subject": "Cannot see a booking",
    "description": "The booking is missing from my list.",
    "booking_id": "BK-20261022-001",
    "topic": "Bookings",
    "status": "open",
    "provider_unread": false,
    "opened_at": "2026-10-22T10:00:00.000000Z",
    "updated_at": "2026-10-22T10:00:00.000000Z",
    "resolved_at": null,
    "closed_at": null,
    "messages": [],
    "status_history": [],
    "attachments": []
  },
  "meta": []
}
```

Show `messages` where `is_internal_note` is false. Do not render status history as chat speakers.

## 7. Provider Reply, Read, and Close

```http
POST /api/v1/service-provider/support/tickets/P-10001/reply
POST /api/v1/service-provider/support/tickets/P-10001/mark-read
POST /api/v1/service-provider/support/tickets/P-10001/close
```

Reply is multipart when files are attached. `body` is required, max 1000. `attachments[]` follows the create file rules.

A reply on `resolved` sets the ticket back to `in_progress`. A reply on `closed` returns `422` with `This ticket is closed. Please open a new ticket if you need further help.`

Reply success is HTTP `201` and returns `id`, `body`, `sender_type`, and `created_at`.

Mark read clears `provider_unread`. Close sets `closed` and `closed_at`. Closing an already closed ticket is a no-op.

---

# Part B: Customer Service Support

Base path: `/api/customer/support/service-tickets`.

## 8. Create a Customer Service Ticket

```http
POST /api/customer/support/service-tickets
Content-Type: application/json
```

Success is HTTP `201` and the message `Service ticket created.`

| Field | Required | Rules |
|---|---:|---|
| `booking_id` | Yes | String, max 50. Must equal `service_requests.request_number` for the logged-in customer. |
| `ticket_subject` | Yes | One exact subject from the list below. Max 80. |
| `chat` | Yes | Description, max 1000. Stored as the first message. |

Subjects:

```text
Provider did not show up
Service not completed
Poor service quality
Late arrival
Booking cancelled
Wrong service provided
Payment or refund issue
Other
```

Any other subject returns `422` with `Please select a subject.`

A booking number that is not on this customer's `service_requests` row returns `422` with `Booking not found for your account.` The card in the app shows `request_number`. `137` from `service_bookings.id` is not a booking id for this API.

```json
{
  "booking_id": "BK-20261022-001",
  "ticket_subject": "Provider did not show up",
  "chat": "The provider did not arrive for the booked time."
}
```

The ticket is `open`. `admin_unread` is true. `customer_unread` is false. `provider_profile_id` is the latest booking's provider for that request, or the selected invitation's provider. It may be null.

Success `data` is the detail shape in section 10. Use `data.id` to open the chat.

## 9. Customer Ticket List

```http
GET /api/customer/support/service-tickets
```

No query parameters. The list is every service ticket for the logged-in customer, newest id first.

| Field | Meaning |
|---|---|
| `ticket_id` | Numeric id. Use this in the detail path. |
| `ticket_number` | `CS-10001`. Display only. |
| `ticket_subject` | Selected subject. |
| `booking_id` | Stored request number. Show this under the subject. |
| `status` | `open`, `in_progress`, `resolved`, or `closed`. |
| `customer_unread` | True when support has replied and the customer has not opened the ticket. |
| `created_at` | ISO 8601. |

There is no `first_message` on this list.

## 10. Customer Ticket Detail and Reply

```http
GET /api/customer/support/service-tickets/15
POST /api/customer/support/service-tickets/15/reply
```

Opening the detail clears `customer_unread`. `404` is `Ticket not found.` when the id is missing or belongs to another customer.

Detail fields used by the app: `id`, `ticket_number`, `subject`, `booking_id`, `status`, and `messages`. Each message has `id`, `sender_type` (`customer` or `admin`), `sender_name`, `body`, `message`, `time`, and `attachments`. `attachments` is an empty array. Label `customer` as You and `admin` as Support.

Reply JSON accepts `body` or `message`, max 1000. Send one of them.

```json
{ "body": "The provider still has not arrived." }
```

Reply success is HTTP `201` and returns `id`, `body`, and `sender_type`.

A customer reply on `resolved` sets the ticket back to `in_progress` and clears `resolved_at`. A reply on `closed` returns `422` with `This ticket is closed.`

---

# Part C: Support Dashboard

Role: `Customer Support`. Pass list filters as top-level query params. Do not wrap them in `params[page]`.

## 11. Provider Ticket List

```http
GET /api/customer-support/provider-tickets?page=1&per_page=10&status=open&search=booking&topic_id=2&orderBy=id&sequence=desc
```

| Query | Default | Rules |
|---|---|---|
| `page` | 1 | Integer. |
| `per_page` | 10 | Integer. |
| `status` | omitted | `open`, `in_progress`, `resolved`, or `closed`. Omit or `all` for every status. |
| `search` | omitted | Ticket number, subject, status, topic name, or provider name. |
| `topic_id` | omitted | Exact topic id. |
| `subject` | omitted | Partial subject match. |
| `orderBy` | `id` | `id`, `ticket_number`, `subject`, `created_at`, `first_name`, or `topic`. An empty value is `id`. |
| `sequence` | `desc` | `asc` or anything else as `desc`. |

Each row: `id`, `ticket_number`, `subject`, `booking_id`, `topic`, `status`, `admin_unread`, `provider_name`, `created_at`, `last_reply_at`. `provider_name` is the provider user. Show it under Provider Name. `created_at` is `Y-m-d g:i A`.

`meta` has `current_page`, `last_page`, `per_page`, and `total`.

Topics for the filter: `GET /api/customer-support/provider-tickets/topics`.

## 12. Provider Ticket Detail, Reply, and Status

```http
GET /api/customer-support/provider-tickets/12
POST /api/customer-support/provider-tickets/12/reply
POST /api/customer-support/provider-tickets/12/status
```

Opening detail clears `admin_unread`.

Detail includes `id`, `ticket_number`, `subject`, `booking_id`, `description`, `topic`, `status`, `provider` (`id`, `name`, `email`, `phone`), unread flags, dates, `messages`, `status_history`, and `attachments`. A message has `sender_type`, `sender_name`, `body`, `is_internal_note`, `created_at`, and `attachments`. Hide internal notes from the provider-facing transcript. Attachment `url` is the stored public path.

Reply JSON:

| Field | Required | Rules |
|---|---:|---|
| `body` | Yes | String, max 1000. |
| `is_internal_note` | No | Boolean. Default false. |

A normal reply sets `provider_unread` true. If the ticket was `open`, it becomes `in_progress`. An internal note does not push the provider and does not change status. A reply on `closed` returns `422` with `Cannot reply to a closed ticket.`

Status JSON:

| Field | Required | Rules |
|---|---:|---|
| `status` | Yes | `open`, `in_progress`, `resolved`, or `closed`. |
| `note` | No | String, max 500. |

The dashboard buttons send `open`, `in_progress`, and `resolved` only. `resolved` sets `resolved_at`. `closed` sets `closed_at`.

## 13. Customer Service Ticket List

```http
GET /api/customer-support/service-tickets?page=1&per_page=10&status=open&search=BK-20261022-001&topic_id=Poor%20service%20quality&orderBy=id&sequence=desc
```

| Query | Default | Rules |
|---|---|---|
| `page` | 1 | Integer. |
| `per_page` | 10 | Integer. |
| `status` | omitted | One status value, or omit for every status. |
| `search` | omitted | Ticket number, subject, booking number, or customer name. |
| `topic_id` or `subject` | omitted | Exact subject from section 8. The list screen sends the subject as `topic_id`. |
| `orderBy` | `id` | `id`, `ticket_number`, `subject`, `created_at`, or `first_name`. |
| `sequence` | `desc` | `asc` or `desc`. |

Each row:

| Field | UI |
|---|---|
| `id` | Open `GET /api/customer-support/service-tickets/{id}`. |
| `ticket_number` | `CS-10001`. |
| `subject` | Complaint subject. |
| `topic` | Booking number. The Topic column shows this. |
| `booking_id` | Same booking number. |
| `status` | Status pill. |
| `admin_unread` | Unread dot. |
| `provider_name` | Customer full name. The Customer Name column reads this key. |
| `created_at` | `Y-m-d g:i A`. |

## 14. Customer Service Ticket Detail, Reply, and Status

```http
GET /api/customer-support/service-tickets/15
POST /api/customer-support/service-tickets/15/reply
POST /api/customer-support/service-tickets/15/status
```

Opening detail clears `admin_unread`.

`provider` on this payload is the customer: `id`, `name`, `email`, `phone`. The Customer panel reads `ticket.provider`. `service_provider` is the real provider user: `id` and `name`. It may be empty when no provider was stored.

Also returned: `subject`, `description`, `topic`, `booking_id`, `status`, dates, `messages`, and `status_history`. Messages have no files. `attachments` is an empty array.

Reply JSON is `body`, required, max 1000. There is no internal note on this lane. A reply on `open` moves the ticket to `in_progress`. A reply on `closed` returns `422` with `Cannot reply to a closed ticket.` A reply on `resolved` stays `resolved` until the customer writes again.

Status JSON matches section 12. The dashboard buttons are Open, In Progress, and Resolved.

## 15. Notifications

The bell is `GET /api/customer-support/notification`. It returns unread rows for the logged-in support user. Route by `type`. `order_id` on these rows is the ticket id.

| Stored `type` | When | Open |
|---|---|---|
| `provider_new_ticket` | Provider creates a ticket. | Provider ticket detail. |
| `provider_ticket_reply` | Provider replies. | Provider ticket detail. |
| `customer_service_new_ticket` | Customer creates a service ticket. | Customer service ticket detail. |
| `customer_service_ticket_reply` | Customer replies. | Customer service ticket detail. |
| `new_ticket`, `new_message_ticket`, `support_reply`, `new_suggestion` | Order and suggestion tickets. | Leave those routes unchanged. |

Support pushes are sent immediately to every `support_device_tokens` row. FCM `type` for provider events is `provider_support_new_ticket` or `provider_support_reply`. FCM `type` for customer service events matches the stored type. `target_screen` is `customer-support/provider-tickets/detail` or `customer-support/service-tickets/detail`. `ticket_id` is a string.

A provider reply push uses the provider user's `user_device_tokens`. FCM `type` is `provider_ticket_reply`. A status change uses `provider_ticket_status`. An internal note does not push.

A support reply to a customer stores `notifications.type` `customer_service_reply` for that customer and queues the push on `order-notifications`. The app shows it only after that queue runs. FCM `type` is `customer_service_reply`. `target_screen` is `support/service_ticket`. The tap opens Service Support Chat with `ticket_id`. Do not route this type to the order chat.

---

# Part D: Errors and Frontend Checklist

## 16. Important Errors

| HTTP | Example message |
|---:|---|
| 401 | Missing or invalid token. |
| 403 | `Only Customer Support team members are allowed to perform this action.` |
| 404 | `Ticket not found.` |
| 422 | `You have too many open tickets. Please resolve or close some before creating a new one.` |
| 422 | `This ticket is closed. Please open a new ticket if you need further help.` |
| 422 | `Cannot reply to a closed ticket.` |
| 422 | `This ticket is closed.` |
| 422 | `Booking not found for your account.` |
| 422 | `Please select a subject.` |
| 422 | `You can attach a maximum of 5 files.` |
| 422 | `Each file must be 10MB or smaller.` |
| 422 | `Allowed types: jpg, jpeg, png, pdf.` |

Show `message`. Keep the form state.

## 17. Frontend Checklist

- Keep order tickets on `add-ticket`, `active-tickets`, `ticket-history`, and `support-chat`.
- Provider ticket paths use `ticket_number`. Customer and dashboard paths use the numeric id.
- Send the booking request number, not `service_bookings.id`.
- Send a customer subject from the fixed list. Do not free-type it.
- Provider create and reply with files are multipart. Customer create and reply are JSON.
- Show the provider booking field only for a bookings topic.
- Hide internal notes in the provider transcript.
- A resolved ticket reopens when its owner replies. A closed ticket does not.
- Stop at 5 open or in-progress provider tickets.
- Dashboard provider `provider_name` is the provider. Dashboard customer `provider_name` is the customer, and `topic` is the booking number.
- Dashboard customer detail `provider` is the customer. `service_provider` is the provider.
- Route `customer_service_reply` to the service chat, not the order chat.
- Pass dashboard list filters as flat query params.
