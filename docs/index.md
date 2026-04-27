# Backend API & Database Design

Backend: Next.js (App Router) under `apps/web`, Prisma + PostgreSQL, Supabase Storage for uploaded files.

- API routes live in `apps/web/app/api/**/route.ts`
- Schema lives in `apps/web/prisma/schema.prisma`
- Prisma client is exported from `apps/web/lib/prisma.ts`
- Supabase client is exported from `apps/web/lib/supabase.ts`

All endpoints accept and return JSON unless noted (uploads use `multipart/form-data`). Responses use standard HTTP status codes; errors are returned as `{ "error": string }`.

---

## Database Design

### Enums

| Enum            | Values                                                                          |
| --------------- | ------------------------------------------------------------------------------- |
| `AccountType`   | `individual`, `business`                                                        |
| `ServiceStatus` | `active`, `inactive`, `pendingReview` (mapped to `pending-review`)              |
| `ServiceType`   | `inPerson` (`in-person`), `remote`                                              |
| `ServiceMode`   | `freelance`, `business`                                                         |
| `RateUnit`      | `booking`, `hour`                                                               |
| `RadiusUnit`    | `mile`, `km`                                                                    |
| `FieldType`     | `text`, `number`, `boolean`, `select`, `multiSelect`, `url`, `date`, `textarea` |

### Entity overview

```
User ──┬── UserAddress ──── Address ──── BusinessAddress ──── Business
       │                                                       │
       ├── BusinessAffiliation ────────────────────────────────┘
       │           │
       └── Service ┘
              │
              ├── ServiceImage
              ├── ServiceCertification
              ├── ServiceAddon ──── SubcategoryAddonTemplate
              ├── ServiceCustomValue ──── ServiceCustomField
              └── Subcategory ──── Category
```

### Schema

![Database Schema](./supabase-schema.png)

### Models

#### User

Account for both individuals and business owners/affiliates.

- `id` (PK), `email` (unique), `firstName`, `lastName`, `password`, `phoneNumber`, `avatarUrl`
- `accountType: AccountType`, `isVerified: Boolean`
- Relations: `addresses` (M:N via `UserAddress`), `ownedBusiness` (1:1, named `BusinessOwner`), `businessAffiliations`, `services`
- `createdAt`, `updatedAt`

#### Business

Owned by exactly one `User`.

- `id` (PK), `name`
- `ownerId` (unique FK → `User`)
- Relations: `addresses` (M:N via `BusinessAddress`), `affiliations`
- `createdAt`, `updatedAt`

#### BusinessAffiliation

Join table linking users that work for / under a business.

- `id` (PK), `userId`, `businessId`
- Unique on `(userId, businessId)`
- Relation: `services` (services delivered under this affiliation)

#### Address / UserAddress / BusinessAddress

- `Address`: shared bag of physical locations (`address`, `latitude`, `longitude`).
- `UserAddress`: composite PK `(userId, addressId)`, plus `isDefault`.
- `BusinessAddress`: composite PK `(businessId, addressId)`.
- A `Service` references an `Address` directly via `addressId`; the route handlers verify the address belongs to either the user (freelance) or the business (business mode).

#### Category / Subcategory

Two-level taxonomy for services.

- `Category`: `id`, `name`, has many `subcategories` and `customFields`.
- `Subcategory`: `id`, `name`, `categoryId`, has many `services`, `customFields`, `addonTemplates`.

#### Service

Core listing record.

- `id` (PK), `userId`, `subcategoryId?`, `addressId`, `businessAffiliationId?`
- `serviceMode: ServiceMode`, `serviceType: ServiceType`, `status: ServiceStatus` (default `pendingReview`)
- `title` (unique), `description`, `aboutYou`, `slogan?`
- `baseRate: Decimal(12,2)`, `baseRateUnit: RateUnit`
- `areaRadius?: Decimal(10,2)`, `unit: RadiusUnit` (default `mile`)
- `createdAt`, `updatedAt`, `deletedAt?` (soft delete), `deletionReason?`
- Relations: `images`, `certifications`, `addons`, `customValues`

#### ServiceImage

- `id`, `serviceId`, `url`, `altText?`, `createdAt`
- `onDelete: Cascade` from `Service`
- Stored in Supabase bucket `service_images`

#### ServiceCertification

- `id`, `serviceId`, `name`, `url`, `fileName?`, `createdAt`
- `onDelete: Restrict` from `Service`
- Stored in Supabase bucket `service_certifications` (PDFs only)

#### ServiceAddon

Concrete add-on attached to a service, sourced from a template.

- `id`, `serviceId`, `templateId`, `price: Decimal(12,2)`, `rateUnit: RateUnit`
- Unique on `(serviceId, templateId)`

#### SubcategoryAddonTemplate

Pre-canned add-ons offered for a subcategory.

- `id`, `subcategoryId`, `name`, `description?`, `defaultPrice?`, `defaultRateUnit`, `isRequired`, `displayOrder`
- Unique on `(subcategoryId, name)`

#### ServiceCustomField

Schema-less form fields scoped to a category OR subcategory.

- `id`, `categoryId?`, `subcategoryId?`, `fieldName`, `fieldLabel`, `fieldType: FieldType`
- `isRequired`, `displayOrder`, `options: Json?` (used by `select` / `multiSelect`)
- Unique on `(categoryId, subcategoryId, fieldName)`

#### ServiceCustomValue

The user-supplied answer for a `ServiceCustomField` on a given service.

- `id`, `serviceId`, `fieldId`
- One of: `valueText`, `valueNumber: Decimal(15,4)`, `valueBoolean`, `valueJson` (used for `multiSelect`)
- Unique on `(serviceId, fieldId)`; index on `(fieldId, valueText)`

---

## API Endpoints

Base path: `/api`.

### Health

#### `GET /api/health`

Liveness probe.

- **200** → `{ "ok": true }`

---

### Categories & Subcategories

#### `GET /api/categories`

List all categories (no nesting), ordered by `id`.

- **200** → `Category[]`

#### `GET /api/categories/:id/subcategories`

List subcategories of a category.

- Path: `id` — numeric category id.
- **200** → `Subcategory[]`
- **400** → invalid id

#### `GET /api/subcategories/:id`

Returns a subcategory with its category, plus the merged `customFields` (category + subcategory) and `addonTemplates` needed to render the create/edit-service form.

- **200** → `Subcategory & { category, customFields[], addonTemplates[] }`
- **400** → invalid id
- **404** → not found

---

### Users

#### `GET /api/users/:id`

Fetch a user with addresses flattened into `address[]`.

- **200** → `User & { address: { id, userId, address, latitude, longitude, isDefault }[] }`
- **404** → not found

#### `GET /api/users/:id/affiliations`

List businesses the user is affiliated with (including their first address).

- **200** → `{ id, name, address, addressId }[]`

---

### Services (per user)

#### `GET /api/users/:id/services`

List a user's services.

- Query: `deleted=false` → exclude soft-deleted services.
- **200** → trimmed `Service[]` (id, title, status, type/mode, base rate, description, radius, timestamps, first image, subcategory + category names, optional business).

#### `POST /api/users/:id/services`

Create a service. Server validates required fields, enum values, that `addressId` belongs to the user (or to the business, when `serviceMode === "business"`), and that addon templates / custom fields belong to the chosen subcategory. Performs the insert + `serviceCustomValue` + `serviceAddon` writes inside a single Prisma transaction.

Body:

```jsonc
{
  "subcategoryId": 12,
  "serviceMode": "freelance" | "business",
  "businessAffiliationId": 3,           // required when serviceMode === "business"
  "title": "Window cleaning",
  "serviceType": "in-person" | "remote",
  "addressId": 7,
  "areaRadius": 10,
  "unit": "mile" | "km",                // defaults to "mile"
  "description": "...",
  "aboutYou": "...",
  "slogan": "Sparkle every time",
  "baseRate": 75,
  "baseRateUnit": "booking" | "hour",
  "customValues": [
    { "fieldId": 4, "value": "string-or-number-or-bool-or-json-string" }
  ],
  "addons": [
    { "templateId": 9, "price": 20, "rateUnit": "booking" }
  ]
}
```

- **201** → created `Service` with `subcategory`, `addons.template`, `customValues.field`, `address`
- **400** → missing fields, invalid enum, invalid address, addons or fields don't match subcategory

#### `GET /api/users/:id/services/:serviceId`

Fetch full service detail (images, certifications, addons + templates, customValues + fields, subcategory tree, address, business). Returns 404 if soft-deleted.

- **200** → `Service & { searchActive: status === "active" }`

#### `PATCH /api/users/:id/services/:serviceId`

Partial update. Accepts any subset of the create body's fields, plus:

- `status`: explicit `ServiceStatus`. Takes precedence over `searchActive`.
- `searchActive: boolean`: only applied when status is not `pendingReview`; maps to `active` / `inactive`.

The handler replaces `customValues` and `addons` wholesale when those keys are present (delete-all + recreate inside a transaction). 404 if soft-deleted.

- **200** → updated `Service & { searchActive }`

#### `DELETE /api/users/:id/services/:serviceId`

Soft delete. Sets `deletedAt = now()` and optional `deletionReason` from the JSON body (`{ "reason": "..." }`).

- **204** on success
- **404** when missing or already deleted

---

### Uploads

#### `POST /api/uploads/images`

`multipart/form-data` with:

- `serviceId` (required)
- `file` (required) — `image/jpeg` | `image/png` | `image/webp`, ≤ 5 MB
- `altText` (optional)

Uploads to Supabase bucket `service_images` at `{serviceId}/{timestamp}.{ext}` and inserts a `ServiceImage` row.

- **201** → `ServiceImage`
- **400** → missing fields, invalid type, size limit
- **404** → service not found
- **500** → storage error

#### `DELETE /api/uploads/images/:id`

Removes the storage object (best-effort) and deletes the `ServiceImage` row.

- **204** on success
- **404** → image not found

#### `POST /api/uploads/pdfs`

`multipart/form-data` with:

- `serviceId` (required)
- `name` (required) — display name for the certification
- `file` (required) — `application/pdf`, ≤ 10 MB

Uploads to Supabase bucket `service_certifications` at `{serviceId}/{timestamp}.pdf` and inserts a `ServiceCertification` row.

- **201** → `ServiceCertification`
- **400** / **404** / **500** as above

#### `PATCH /api/uploads/pdfs/:id`

Rename a certification.

- Body: `{ "name": "string" }`
- **200** → updated row
- **400** → empty name; **404** → not found

#### `DELETE /api/uploads/pdfs/:id`

Removes the storage object and deletes the row.

- **204** on success; **404** → not found

---

## Cross-cutting notes

- **Soft delete**: only `Service` is soft-deletable (`deletedAt`, `deletionReason`). All read paths skip rows where `deletedAt` is set; the list endpoint exposes `?deleted=false` to opt out explicitly.
- **Address ownership**: services can only point at addresses linked to either the owning `User` (`UserAddress`) or, in business mode, the `Business` (`BusinessAddress`). This is enforced in both `POST` and `PATCH`.
- **Custom fields**: a service's allowed custom fields are the union of its subcategory's fields and its parent category's fields. Storage column is chosen per `fieldType` (`number → valueNumber`, `boolean → valueBoolean`, `multiSelect → valueJson`, otherwise `valueText`).
- **Status transitions**: `searchActive` is a UI affordance; it is ignored while a service is in `pendingReview` so reviewers control activation.
- **Storage layout**: object keys are namespaced by `serviceId` so deleting a service in the future can be paired with a recursive prefix delete.
