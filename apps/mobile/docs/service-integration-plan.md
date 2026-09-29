# Laravel Services Integration Plan

Drafted: 2026-09-28
Source contract: `apps/mobile/service-provider-template-and-service-api-guide.md` and `apps/mobile/api-doc.json`
Branch: `feat/services`

This plan covers wiring the mobile app to the Laravel service-provider endpoints for
services, home, requests, and chats. Availability and date availability are already
integrated in `api/availability.ts` and are out of scope.

## Current state

- The legacy Next.js backend has been removed from the mobile app. Every services
  screen is a stub with `TODO: legacy API removed` markers: the create wizard, edit
  screens, service detail, the services tab, and the home tab. The chats tab is a
  placeholder.
- `app/(services)/create-service-form.tsx` is a 2,490-line hard-coded form built around
  legacy concepts (add-ons, in-person vs remote, custom fields). The guide requires a
  template-driven form: fetch `GET /service-form-template` and render whatever it
  returns.
- `api/services.ts` calls `/service-provider/business/services`, which is the picker for
  assigning categories to a business. It is not the services-management API.
- `api/generated/api-types.ts` has been regenerated from the updated spec and the app
  type-checks.

### Infrastructure gaps

| Gap | Why it matters |
|---|---|
| `laravelFetch` returns only `data` and drops `meta`. | My Services list, requests list, chat inbox, and chat thread paginate through `meta` (`total`, `current_page`, `last_page`). |
| `ApiError` carries only `message` and `statusCode`. | Publishability failures return `422` with `data.type = "commercial_publishability"` and `data.errors` keyed by field. The form must show those per field. |
| No shared multipart builder. | Create, information, and candidate requests need `[]` array suffixes, a JSON-encoded `answers_json`, and index-paired `dynamic_file_keys[]` / `dynamic_files[]`. |

### Spec observations

- The template field schema (`ServiceFormTemplateField`) carries both the guide's keys
  (`field_key`, `label`, `field_type`, `submit_as`, `is_required`, `section`,
  `visible_when`, `required_when`, `validation`, `options`) and a newer `descriptor`
  object with different control names. This plan uses the guide's keys as the contract
  and treats `descriptor` as additive.
- Individual service creation requires the provider's `background_verification` to be
  `Verified`. `AuthContext` already exposes this flag.
- Fetching a template for an individual provider fails with `422` when no default
  address exists. `components/AddressModal.tsx` already exists and can be reused.
- Image and document pickers (`expo-image-picker`, `expo-document-picker`) are already
  installed and cover every attachment type needed for the first release.

## Decisions

1. **Keep the split Information and Pricing edit screens** and save through
   `POST /services/{id}/information` and `POST /services/{id}/pricing`. This matches
   the guide's rule for when to use the focused endpoints. `POST /services/{id}/candidate`
   stays available if the two screens are later merged into one.
2. **Build a new `api/service-management.ts` beside `api/services.ts`** rather than
   replacing it. The existing module still serves the business-management category
   picker.
3. **Use `field_type` and `submit_as` from the template** to drive rendering and
   submission. Do not attach behavior to template IDs or category names.
4. **No video capture in chat for the first release.** The gallery source sends images
   only. No new dependency is needed; `expo-image-picker` and `expo-document-picker`
   cover camera, gallery images, and documents.
5. **Verification without a test runner.** The repo has no test suite and adding one
   is a dependency decision for later. Each phase ends with a verification section:
   type-checks, throwaway `npx tsx` scripts against fixtures for the pure TypeScript
   engine, and manual checks against the UAT backend with the request inspected in the
   network log. A phase is not done until its verification list passes.

## Phase 0: Foundations

Everything else depends on this phase.

- [x] **0.1** Extend `api/client.ts`. Done 2026-09-28: `laravelFetchWithMeta`, `ApiError.data`,
  `isCommercialPublishabilityError`, `getPublishabilityFieldMessages`, `buildQuery`.
  - Add a variant (or option) that returns `{ data, meta }` for paginated endpoints.
  - Attach the error envelope's `data` to `ApiError` so callers can detect
    `type === "commercial_publishability"` and read `errors`.
  - Surface the suspended-provider `403` message unchanged.
- [x] **0.2** Create `api/service-management.ts`, typed from the generated schemas, with
  one function per endpoint. Done 2026-09-28.

  | Function | Endpoint |
  |---|---|
  | `listServiceCategories(businessId?)` | `GET /services/categories` |
  | `listServiceSubcategories(categoryId, businessId?)` | `GET /services/categories/{categoryId}/subcategories` |
  | `getServiceFormTemplate({ categoryId, subcategoryId, providerType, businessId })` | `GET /service-form-template` |
  | `createService(formData)` | `POST /services` |
  | `listMyServices({ tab, status, search, page, perPage })` | `GET /services` (with meta) |
  | `getServiceDetails(id)` | `GET /services/{id}` |
  | `getServiceEditOverview(id)` | `GET /services/{id}/edit` |
  | `getServiceCategory(id)` | `GET /services/{id}/category` |
  | `getServiceInformation(id)` | `GET /services/{id}/information` |
  | `updateServiceInformation(id, formData)` | `POST /services/{id}/information` |
  | `saveServiceCandidate(id, formData)` | `POST /services/{id}/candidate` |
  | `getServicePricing(id)` | `GET /services/{id}/pricing` |
  | `updateServicePricing(id, body)` | `POST /services/{id}/pricing` |
  | `toggleServiceStatus(id)` | `POST /services/{id}/status` |
  | `deleteServiceFile(id, body)` | `DELETE /services/{id}/files` |
  | `listDeleteReasons()` | `GET /services/delete-reasons` |
  | `deleteService(id, body)` | `DELETE /services/{id}` |

  Resolve every returned `/storage/...` path with `toAbsoluteUrl`.
- [x] **0.3** Add a multipart builder helper. Done 2026-09-28 as `api/multipart.ts`
  (`buildFormData`, `appendMultipart`, `appendDynamicFiles`).
  - Append arrays with the `[]` suffix (`fulfillment_type_ids[]`, `portfolio_images[]`).
  - JSON-encode `answers_json` as one string.
  - Pair `dynamic_file_keys[]` and `dynamic_files[]` by index, repeating the key once
    per file.
  - Send booleans as `true` / `false` strings.

### Phase 0 verification

- [x] `npx tsc --noEmit -p .` passes with the new module and client changes. (2026-09-28)
- [x] Contract check: for every function in `api/service-management.ts`, the path,
  method, query names, and body keys match `api-doc.json`. Re-run the spec dump used
  during the endpoint audit and compare by hand. Any mismatch is reported, not
  papered over.
- [x] Paginated fetch returns `meta.total`, `meta.current_page`, and `meta.last_page`
  for `GET /services?per_page=1` against UAT. (Verified in Postman 2026-09-28.) The non-paginated fetch still returns
  bare `data` for an existing endpoint such as `GET /auth-user`.
- [ ] Deferred to Phase 4 UI integration. Trigger a `422` publishability failure (activate an incomplete inactive service)
  and confirm `ApiError.data.type === "commercial_publishability"` and
  `ApiError.data.errors` is populated. Trigger a plain `422` (empty `reason_ids` on
  delete) and confirm `data` is null and `message` is the first validation error.
- [x] Multipart builder: log the built `FormData` entries for a fixture with two
  fulfillment ids, one `answers_json` object, two dynamic files under the same key,
  and one boolean. Expect `fulfillment_type_ids[]` twice, a single JSON string for
  `answers_json`, `dynamic_file_keys[]` and `dynamic_files[]` each twice in the same
  order, and `true` as a string. (Verified 2026-09-28 with a sucrase-transpiled
  script and a recording FormData; all ten assertions passed.)
- [ ] Deferred to Phase 2 UI integration. A `401` from any new function still clears
  the token and redirects to login.

## Phase 1: Template engine

Pure TypeScript under `services/template/` (or `lib/service-template/`). No UI. Each
piece should be small enough to check by hand against the guide's examples.

- [x] **1.1 Predicate evaluator** (`services/template/predicates.ts`, 2026-09-28) for `visible_when`, `required_when`, and
  `prohibited_when`. Support `all`, `any`, `not`, and the operators in the spec:
  `equals`, `not_equals`, `in`, `not_in`, `empty`, `not_empty`, `contains`,
  `not_contains`, `contains_any`, `less_than`, `greater_than`. Fulfillment conditions
  evaluate against option `code`, never the id or label.
- [x] **1.2 Capability resolver** (`services/template/capability.ts` + `visibility.ts`, 2026-09-28) over `provider_listing_capability`.
  - Pick the active format from `business_format` when present, otherwise the entry
    matching the selected fulfillment, otherwise `formats.default`.
  - Filter template `price_units` to `formats[format].pricing[pricing_type]`.
  - Filter fulfillment options to `formats[format].fulfillment`, replaced by
    `fulfillment_by_price_unit[unit]` when present. An empty list hides the control and
    omits `fulfillment_type_ids`.
  - Derive the `profile_pricing_scope` state from
    `profile_pricing_scope.by_pricing_type[pricing_type][unit]`, falling back to
    `default_state`. `required` shows and demands a value, `optional` shows,
    `prohibited` hides and omits.
  - When `is_alias` is true, keep showing `source` names and submit the selected ids.
  - Never render or submit anything in `prohibited_provider_fields`.
- [x] **1.3 Currency resolver** (`services/template/currency.ts`, 2026-09-28) implementing the USD override rules.
  - Default currency USD: submit `USD`, hide Charge in USD.
  - Not USD and `online_remote` not selected: submit the local code.
  - Not USD and `online_remote` selected: offer Charge in USD. Off submits local, on
    submits `USD`. The toggle is frontend-only; only the final `currency` is sent.
- [x] **1.4 Client-side validator** (`services/template/validation.ts`, 2026-09-28).
  - `is_required` and `required_when`.
  - String `minimum_length` / `maximum_length`, numeric min/max, selection counts.
  - Other: `custom_value_key` required when `other` is selected, rejected otherwise.
  - `selection_rules.exclusive_values` (for example `na`) enforced on the client.
  - `0` and `false` count as present.
- [x] **1.5 Payload builders** (`services/template/payload.ts`, 2026-09-28) for create, information-only, and candidate.
  - Route every value by `submit_as.type`: `top_level`, `answers_json`,
    `dynamic_files`, `certificate_bundle`, `pricing_fields`, `display_only`.
  - Omit hidden keys entirely. Never send `null` for a hidden field.
  - Never send `address_id`, `booking_policy`, `schedule_family`, or `profile_mode`.
  - Create only: `category_id`, `subcategory_id`, `provider_type`, `business_id`,
    `information_accuracy_acknowledgement = true`.
  - Information only: no identity, no pricing, no acknowledgement. Supports
    `delete_portfolio_ids[]` and `delete_certificate_ids[]`.
  - Candidate: information plus pricing, `answers_mode = replace`,
    `clear_dynamic_file_keys[]`. No identity, no acknowledgement, no `charge_in_usd`.

### Phase 1 verification

The engine is pure TypeScript. The check script lives at
`services/template/__checks__/phase1.check.ts` and runs with the already-installed
`sucrase` (no new dependency):

```bash
node -r sucrase/register/ts services/template/__checks__/phase1.check.ts
```

Fixtures are under `services/template/__fixtures__/`: the Pet Sitting template is copied
verbatim from the `api-doc.json` example; the Education Tutoring and Personal Holistic
templates are hand-built from the guide (see the README there) and should be replaced
with real UAT responses when available. Result on 2026-09-28: 94 checks passed, 0 failed.

- [x] **Predicates.** For each operator in the spec, one true case and one false case.
  `all` / `any` / `not` nest correctly. A fulfillment predicate matches on `code`
  (`provider_location`) and does not match on the id (`1`) or label.
- [x] **Capability resolver.** Using a real template for a subcategory with
  `business_format` set: changing format changes the allowed price units and
  fulfillment codes. Using a subcategory with `business_format: null` and a single
  `formats.default` entry: the default is used. `fulfillment_by_price_unit` overrides
  the format list when the selected unit is present. An empty fulfillment list hides
  the control. `profile_pricing_scope` resolves to `required`, `optional`, and
  `prohibited` for three different unit and pricing-type combinations, and falls back
  to `default_state` when the lookup is missing.
- [x] **Currency.** Three fixtures: default USD (always `USD`, toggle hidden), CAD with
  no `online_remote` (always `CAD`), CAD with `online_remote` (toggle off gives `CAD`,
  on gives `USD`). `charge_in_usd` never appears in the payload.
- [x] **Validator.** Required field empty fails; `0` and `false` pass. Title of 2 and
  151 characters fail, 3 and 150 pass. `multi_select` with 0 selections fails when
  `minimum_selections` is 1. `other` selected without `custom_value_key` fails;
  `custom_value_key` present without `other` fails. `conditions_worked_with:
  ["na", "injuries"]` fails the exclusivity rule.
- [x] **Payload builders.** Reproduce guide sections 18, 19, and 20 from fixture values
  and diff the produced multipart entries against the guide's examples. Then confirm:
  a hidden dynamic key is absent (not `null`); `address_id`, `booking_policy`,
  `schedule_family`, and `profile_mode` never appear; the information builder omits
  identity, pricing, and the acknowledgement; the candidate builder includes
  `answers_mode=replace`, omits the acknowledgement and `charge_in_usd`, and passes
  through `clear_dynamic_file_keys[]`.
- [x] Every generic field is routed by `submit_as`, so no generic key ever lands in
  `answers_json`.

## Phase 2: Create flow

- [ ] **2.1 Step 1, `app/(services)/create-service.tsx`.**
  - Replace the affiliation stub with `listBusinesses()` from `api/business.ts`,
    filtered to active businesses.
  - Gate the individual option on `backgroundVerification === "Verified"` from
    `AuthContext`. Show why it is disabled otherwise.
  - Pass `providerType` (`individual` | `business`) and `businessId` forward.
- [ ] **2.2 Category and subcategory pickers**
  (`create-service-category.tsx`, `create-service-subcategory.tsx`).
  - Switch to `listServiceCategories` and `listServiceSubcategories` with `business_id`
    for business providers so only assigned subcategories appear.
  - Pass `categoryId`, `subcategoryId`, `providerType`, and `businessId` forward.
- [ ] **2.3 Rewrite `create-service-form.tsx` as a template renderer.**
  - Fetch the template with the full context.
  - Render `sections[]` in `display_order`; inside each, render `field_keys` using the
    matching `fields[]` entries.
  - Build a `TemplateField` component keyed on `field_type`: `text`, `textarea`,
    `number`, `multi_select` (with Other input), `yes_no`, `file_upload` (dynamic
    files), `address` (display-only, shows the default address), service radius with
    unit, and a `pricing` block (pricing type, amount, currency / Charge in USD, price
    unit, profile pricing scope).
  - Re-evaluate visibility after every change to business format, pricing type, price
    unit, or fulfillment.
  - Keep the existing review step, driven by the same field list.
  - Submit through the create builder. On `422` with publishability errors, map each
    `errors[field]` message onto its field. Otherwise show `message` in `ConfirmModal`
    and keep form state.
  - On success, route to the detail screen and explain that the service is
    `pending_review`.
  - Retire the add-on, in-person/remote, and legacy custom-field code.
- [ ] **2.4** When the template request fails because no default address exists, open
  `AddressModal` and retry after save.

### Phase 2 verification

Run on a device or simulator against UAT. Use a provider with a Verified background
check and a default address, plus one business with at least one assigned subcategory.

- [ ] Step 1 lists only active businesses. With `background_verification` not
  Verified, the individual option is disabled and explains why.
- [ ] Category and subcategory pickers for a business provider show only subcategories
  assigned to that business. Switching to individual shows the full list.
- [ ] The form renders every section in `display_order` and every field within its
  section. Compare the rendered field count against `fields.length` in the network
  response for at least one generic (Automotive) and one dynamic (Education Tutoring)
  subcategory.
- [ ] Labels, placeholders, help text, options, and required markers come from the
  template. No asterisk is added to the label text itself.
- [ ] Selecting `provider_location` shows the address block as display-only with the
  default address. Selecting `customer_location` shows radius and unit and hides the
  address. Selecting only `online_remote` hides both.
- [ ] Changing pricing type, price unit, or fulfillment re-filters the dependent
  controls and removes now-hidden keys from the outgoing payload (inspect the request
  in the Metro network log or a proxy).
- [ ] Charge in USD appears only for a non-USD provider who selected `online_remote`.
- [ ] Submitting without a required field is blocked client-side with the field
  highlighted and no request sent.
- [ ] Successful create returns `201`, the app shows the pending-review notice, and
  the new service appears in `GET /services` with `status_label: pending_review`.
- [ ] Force a server `422` (submit a 2-character title by bypassing client validation
  temporarily) and confirm the message is shown in `ConfirmModal` and form state is
  intact.
- [ ] Remove the default address, start the individual flow, and confirm
  `AddressModal` opens and the template loads after saving an address.
- [ ] Guide examples 18, 19, and 20 can each be created end to end through the UI.

## Phase 3: List, detail, home

- [ ] **3.1 Services tab, `app/(tabs)/services.tsx`.**
  - Wire `listMyServices`. Map tabs All / Freelance / Business to `all` /
    `independent` / `affiliated`.
  - Add status filter, title search, and page loading through `meta`.
  - Map `status_label` onto `ServiceStatusBadge` (`pending_review` to `pendingReview`).
  - Card fields come from `ServiceListItem`: title, category and subcategory names,
    business name, first `portfolio`, pricing.
- [ ] **3.2 Service detail, `app/(services)/service-detail/[id].tsx`.**
  - Load `getServiceDetails`.
  - Render `service_info`, `fulfillment_types`, `portfolio_images`, `certificate`,
    `pricing`, and `dynamic_answers` using `display_value`.
  - Show `publishability.issues` when `is_publishable` is false.
- [ ] **3.3 Home tab, `app/(tabs)/home.tsx`.**
  - One call to `GET /home`.
  - `my_services.items` into `MyServiceCard` using `price`, `service_unit`,
    `portfolio`, and `rating`. Show "See all" when `total` exceeds `items.length`.
  - `provider_promotions.items` as the banner carousel. Empty is a valid state.
  - `new_requests.items` into `BookingRequestCard`. Remove the placeholder avatar and
    photo generators. Navigate by `invitation_id`.

### Phase 3 verification

- [ ] Services tab: All shows every visible service. Freelance shows only
  `provider_type: individual`. Business shows only `provider_type: business`. Counts
  match `meta.total` for each `tab` value.
- [ ] Status filter and title search send the right query parameters and the list
  updates. Scrolling past `per_page` loads the next page and appends without
  duplicates.
- [ ] Badge colour and text for `active`, `inactive`, and `pending_review` match
  `ServiceStatusBadge`. A deleted service never appears.
- [ ] Every card image resolves to an absolute URL. A service with no portfolio shows
  the placeholder, not a broken image.
- [ ] Detail screen: title, description, fulfillment labels, portfolio, certificate
  files, and pricing match `GET /services/{id}` for the same id. Each dynamic answer
  shows `display_value`. A non-publishable service shows its issues.
- [ ] Home: `my_services` shows at most 8 cards with price, unit, and rating from the
  payload. "See all" appears only when `total` is greater than `items.length`.
  Promotions render in order and an empty list shows no banner and no error.
  `new_requests` cards show status labels from the payload, `client_type` badge,
  and hide the schedule block when `schedule` is null.
- [ ] Tapping a home request card navigates using `invitation_id` (confirm in the
  route params).
- [ ] Empty states: a brand-new provider with zero services sees the empty list and
  empty home blocks, and no request errors.

## Phase 4: Edit flows

- [ ] **4.1 Edit overview, `app/(services)/edit-service/[id]/index.tsx`.**
  - Load `getServiceEditOverview`.
  - Drive the search toggle from `search_setting.is_active`; disable when
    `can_update` is false (pending review).
  - Toggle through `toggleServiceStatus`. On `422` publishability failure, show each
    field message and leave the service inactive. Replace the status from `data`.
  - Label `individual` as Freelance; show `business_name` for business.
- [ ] **4.2 Category screen, `category.tsx`.** Read-only from `getServiceCategory`.
- [ ] **4.3 Information screen, `information.tsx`.**
  - Load `getServiceInformation`. Render `template` (pricing removed) with
    `current_values` and `answers_json` prefill through the same `TemplateField`
    renderer from Phase 2.
  - Show existing portfolio and certificate files with delete selection feeding
    `delete_portfolio_ids[]` and `delete_certificate_ids[]`.
  - New dynamic files go through the paired arrays. Existing dynamic files are shown
    from `answers_json` URLs.
  - Save through `updateServiceInformation`. Do not send pricing, identity, or the
    acknowledgement.
  - Single-file removal uses `deleteServiceFile` with `file_type` `portfolio`,
    `certificate`, or `dynamic` (dynamic needs `field_key` and the exact `file_path`).
  - Show `publishability.issues` on the screen.
- [ ] **4.4 Pricing screen, `pricing.tsx`.**
  - Load `getServicePricing` for saved values and `getServiceInformation` for
    `candidate_template` (the `pricing` field's `price_units` and `pricing_types`) and
    capability.
  - Apply the Phase 1 capability and currency resolvers.
  - Save through `updateServicePricing`. Send `price_unit_id` for quote-required too.
    Send `profile_pricing_scope` only when the state is `required` or `optional`.
- [ ] **4.5 Delete, `delete.tsx` and `delete-reason.tsx`.**
  - Replace the hard-coded reasons with `listDeleteReasons`.
  - Require `other_reason` (3-500 chars) when a selected reason has `is_other`.
  - Call `deleteService` with `reason_ids`. Route back to the list on success.
  - Rewire the "inactivate" action in `delete.tsx` to `toggleServiceStatus`.

### Phase 4 verification

- [ ] Edit overview for an active service: toggle on, enabled. For an inactive
  service: toggle off, enabled. For a pending-review service: toggle disabled with
  the explanation, and no request is sent when tapped.
- [ ] Toggling active to inactive returns `200` and the badge updates from `data`.
  Toggling an incomplete inactive service to active shows each `errors[field]`
  message and the service stays inactive.
- [ ] Category screen shows category and subcategory names, is read-only, and
  shows the selected names even when `capability.is_alias` is true.
- [ ] Information screen prefills every generic field from `current_values` and every
  dynamic field from `answers_json`, including `multi_select` arrays and `yes_no`
  booleans. The pricing field is not rendered.
- [ ] Existing portfolio images and certificate files display with absolute URLs.
  Marking one for deletion adds its id to the right `delete_*_ids[]` array and the
  file is gone after save. Adding a certificate appends under the existing
  description.
- [ ] Deleting one portfolio image, one certificate file, and one dynamic file through
  the file endpoint each return `200` and the item disappears without a full reload
  regression.
- [ ] Information save never sends `pricing_type`, `amount`, `currency`,
  `price_unit_id`, `category_id`, or `information_accuracy_acknowledgement` (inspect
  the request).
- [ ] Pricing screen shows only price units allowed for the current format and
  pricing type. Switching to quote-required clears amount and currency but still
  sends `price_unit_id`. `profile_pricing_scope` is present only when the state is
  `required` or `optional`.
- [ ] Delete flow lists reasons from the API. Selecting an `is_other` reason requires
  3 to 500 characters of text. Successful delete returns to the list and the service
  is gone from every tab.
- [ ] After any edit, `GET /services/{id}` reflects the change.

## Phase 5: Requests and chats

Independent of Phases 2 to 4 and could be a separate branch.

- [ ] **5.1 `api/requests.ts`.** Paginated list (with meta), summary, details with
  optional `profile_id`, chat context.
- [ ] **5.2 Requests screens** (new route group, for example `app/(requests)/`).
  - List: cards from `GET /requests`, "load more" through `meta`.
  - Summary: branch `request_info` on the three shapes (profile-based, booking-only,
    empty). Pricing is display only; never recalculate the fee.
  - Details: render `profiles[]` and `sections[]` as `about`, label/value `fields`, and
    `lines`.
  - Every path uses `invitation_id`, never `request_id`.
- [ ] **5.3 `api/chats.ts`.** Inbox with `q` search (with meta), unread count, thread
  with reverse pagination, and send message: JSON for text only, multipart with
  `source` for attachments.
- [ ] **5.4 Chats screens.**
  - Inbox in `app/(tabs)/chats.tsx` with search. "No messages yet" when
    `last_message` is null.
  - Wire `unread_total` into the badge slot in `components/ui/bottom-tab-bar.tsx`.
    Do not sum page `unread_count` values.
  - Thread screen: open on page 1, load older pages above, render the `kind: request`
    opening message only when the API includes it. Header from chat context.
  - Composer gated on `can_send`. Camera: one image. Gallery: up to 3 images (no
    video in the first release). File: up to 2 documents. Refresh inbox unread state
    after a thread load.
  - Render incoming `video` attachments from the customer as a thumbnail or link only.

### Phase 5 verification

- [ ] Requests list count equals home `new_requests.total` at the same moment. Loading
  a second page appends and `meta.last_page` stops further loads.
- [ ] Summary renders all three `request_info` shapes: a profile-based request opens
  details filtered by `profile_id`, a booking-only request opens unfiltered details,
  and an empty one has no details action.
- [ ] Summary pricing shows `subtotal_label`, `service_fee_label`, tip fields when
  present, and `expected_earning` exactly as returned. No client-side arithmetic.
- [ ] Details render `profiles[]` blocks and booking `sections[]`. Filtering by
  `profile_id` returns one profile and the same booking sections.
- [ ] Inbox lists invitations including ones with zero messages. `last_message` null
  shows "No messages yet". Search with `q` filters by customer name and service
  title.
- [ ] Tab badge equals `unread_total` from the unread-count endpoint, not a sum of
  page counts. It refreshes after a thread is opened.
- [ ] Thread opens on page 1 with newest messages at the bottom. Scrolling up loads
  the next page above. The `kind: request` opening message appears once, only when
  `current_page === meta.last_page`.
- [ ] Composer is hidden when `can_send` is false. Sending text uses JSON and returns
  `201`. Camera sends one image with `source=camera`. Gallery sends up to three
  images with `source=gallery` and blocks a fourth. File sends up to two documents
  with `source=file`. Each attachment URL renders from an absolute path.
- [ ] A `422` from send (oversized file, closed conversation) shows `message` and
  leaves the composer content intact.
- [ ] An incoming `video` attachment renders as a thumbnail or link and does not
  crash the thread.
- [ ] Opening an invitation that belongs to another provider shows the `404` error
  state, not a blank screen.

## Phase 6: Cleanup and final regression

- [ ] **6.1** Remove all `TODO: legacy API removed` stubs and the `userId` plumbing
  that only existed for the legacy API.
- [ ] **6.2** Remove debug `console.log` calls added during the phases above.

### Phase 6 verification

- [ ] `grep -rn "legacy API removed" app api components` returns nothing.
- [ ] `npx tsc --noEmit -p .` and `npm run lint` pass in `apps/mobile`.
- [ ] `npx expo start --clear` boots the dev build with no red-box errors on Home,
  Services, Calendar, Chats, and Profile.
- [ ] Every alert in the new screens uses `components/ConfirmModal.tsx`; no native
  `Alert` import remains in touched files.
- [ ] End-to-end regression matrix against the UAT backend. Each row must pass on both
  iOS and Android:

  | Case | What it exercises |
  |---|---|
  | Automotive (generic-only), fixed price, two portfolio images | Generic fields, `answers_json: {}`, certificate bundle |
  | Education Tutoring, `online_remote`, Other subject | Dynamic multi_select with Other, Charge in USD toggle |
  | Personal as a business with CORI and business verification files | Paired dynamic files, business context, `business_id` subcategory filter |
  | Caregiving with a required CORI file | Required dynamic file, `yes_no` fields |
  | Quote-required pricing | `amount` / `currency` omitted, `price_unit_id` still sent |
  | Edit information: delete a portfolio image, add a certificate | `delete_portfolio_ids[]`, certificate append, file delete endpoint |
  | Edit pricing on a fixed-price service | Allowed unit filtering, profile pricing scope state |
  | Toggle status on a pending-review service | Disabled toggle, `422` handling |
  | Activate an inactive service that is not publishable | Per-field publishability errors |
  | Delete with an Other reason | `other_reason` validation |
  | Home with no default address | Empty promotions is a success state |
  | Chat thread with more than one page | Reverse pagination, request opening message on last page |

## Suggested order

1. Phase 0 and Phase 1 first. Everything else depends on them.
2. Phase 2 next. It is the largest single piece because it retires the old form.
3. Phases 3 and 4 in parallel once Phase 1 exists.
4. Phase 5 independently, possibly on its own branch.
5. Phase 6 last.
