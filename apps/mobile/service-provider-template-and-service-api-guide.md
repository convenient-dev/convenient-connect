# Service Provider Template and Service Write API Guide

Last reviewed: 2026-09-25

This document is the frontend integration contract for the provider web app. Every path below is under `/api/v1/service-provider`. The sections after this overview explain the request, response, and branching rules.

It describes the current Laravel implementation, not a proposed payload. Runtime IDs in examples are illustrative. Always use the category, subcategory, fulfillment, price-unit, business, and service IDs returned by the APIs in the current environment.

## API overview

### Service Provider Home

| API | Endpoint |
|---|---|
| Load the home screen | `GET /home` |

### Service Provider Requests

| API | Endpoint |
|---|---|
| Pending request list | `GET /requests` |
| Request summary | `GET /requests/{invitation_id}/summary` |
| Request details | `GET /requests/{invitation_id}/details` |
| One profile on that request | `GET /requests/{invitation_id}/details?profile_id={profile_id}` |
| Chat screen header | `GET /requests/{invitation_id}/chat-context` |

`invitation_id` is the path key. Do not use `request_id` here.

### Service Provider Chats

| API | Endpoint |
|---|---|
| Chat inbox | `GET /chats` |
| Unread tab count | `GET /chats/unread-count` |
| One conversation | `GET /chats/{invitation_id}` |
| Send a message | `POST /chats/{invitation_id}/messages` |

### Service Provider Services

| API | Endpoint |
|---|---|
| Category list | `GET /services/categories` |
| Subcategory list | `GET /services/categories/{categoryId}/subcategories` |
| My Services list | `GET /services` |
| Service details | `GET /services/{id}` |
| Edit overview | `GET /services/{id}/edit` |
| Saved category, read only | `GET /services/{id}/category` |
| Create a service | `POST /services` |
| Read the edit form | `GET /services/{id}/information` |
| Save information only | `POST /services/{id}/information` |
| Save the full listing | `POST /services/{id}/candidate` |
| Read pricing | `GET /services/{id}/pricing` |
| Save pricing only | `POST /services/{id}/pricing` |
| Turn active or inactive | `POST /services/{id}/status` |
| Delete one file | `DELETE /services/{id}/files` |
| Delete reasons | `GET /services/delete-reasons` |
| Delete the service | `DELETE /services/{id}` |

### Service Provider Availability

| API | Endpoint |
|---|---|
| Weekday list | `GET /availability/days` |
| Timezone list | `GET /availability/timezones` |
| Saved weekly hours | `GET /availability` |
| Turn weekly availability on or off | `POST /availability/toggle-status` |
| Save weekly hours | `POST /availability/save` |

### Service Provider Date Availability

| API | Endpoint |
|---|---|
| One date | `GET /date-availability?date=YYYY-MM-DD` |
| Save that date | `POST /date-availability` |

### Service Provider Service Templates

| API | Endpoint |
|---|---|
| Create form | `GET /service-form-template` |

The create form is also what `GET /services/{id}/information` returns as `candidate_template` when editing. Create uses `POST /services`. A full edit uses `POST /services/{id}/candidate`. Those two writes are listed under Services above.

Image and file URLs in these payloads are relative, for example `/storage/service_portfolios/91/dog.jpg`. Prefix them with the API host before rendering.

## 1. Sources Reviewed

The contract below was verified against:

- `routes/services.php`
- `ServiceFormTemplateController`, `ServiceController`
- `GetServiceFormTemplateRequest`, `StoreServiceRequest`, `UpdateServiceInformationRequest`
- `ServiceFormTemplateResolver`, `ServiceManagementService`
- `ServiceFormTemplateResource`, `ServiceInformationResource`, `ServiceDetailsResource`
- `ServiceFormTemplateSeeder`, `ServiceSubcategoryPriceUnitSeeder`
- Service template and service management feature tests
- Existing Service Provider Swagger annotations

## 2. Common API Rules

### Authentication

Every endpoint in this guide requires a valid Sanctum bearer token:

```http
Authorization: Bearer <token>
Accept: application/json
```

Missing or invalid authentication returns HTTP `401`.

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

Validation and domain failures normally return `422`, missing owned records return `404`, and unexpected failures return `500`.

## 3. Required Frontend Flow

1. Select `provider_type`: `individual` or `business`.
2. If business, select an owned active business and use only categories/subcategories assigned to it.
3. Select a category and subcategory.
4. Call `GET /service-form-template` with the complete context.
5. Render `sections[]` in `display_order`, and inside each section render that section's `field_keys` using the matching objects in `fields[]`. Do not hard-code a separate category form.
6. Route each value using the field's `submit_as` object.
7. After the provider changes business format, pricing type, price unit, or fulfillment, show only the fields that are still visible. Omit hidden answer keys. Do not send them as `null`.
8. Submit service creation as `multipart/form-data`.
9. Save the returned `service_id`. A new service is status `3` (`pending_review`).
10. For a full edit, call `GET /services/{id}/information` and render `candidate_template`, not the pricing-removed `template`. Save with `POST /services/{id}/candidate`.
11. Use `POST /services/{id}/information` only when the screen edits information and files and does not change pricing. Use `POST /services/{id}/pricing` only when the screen edits pricing alone.

The category, subcategory, provider type, and business affiliation are fixed after creation. Neither the information endpoint nor the candidate endpoint can change them. Do not send `booking_policy`, `schedule_family`, or `profile_mode`. The server derives booking policy from the business fields.

---

# Part A: GET Service Form Template

## 4. Endpoint

```http
GET /api/v1/service-provider/service-form-template
```

Example:

```http
GET /api/v1/service-provider/service-form-template?category_id=6&subcategory_id=41&provider_type=individual
```

Business example:

```http
GET /api/v1/service-provider/service-form-template?category_id=6&subcategory_id=41&provider_type=business&business_id=12
```

## 5. Query Parameters

| Parameter | Required | Rules |
|---|---:|---|
| `category_id` | Yes | Integer; active, non-deleted `services_categories.id`. |
| `subcategory_id` | Yes | Integer; active, non-deleted `services_sub_categories.id`; must belong to `category_id`. |
| `provider_type` | Yes | Exact value `individual` or `business`. |
| `business_id` | Business only | Required for business, prohibited for individual. Must be active, non-deleted, owned by the authenticated provider, and assigned to `subcategory_id`. |

## 6. Template Resolution

Templates are inherited in this order:

```text
generic template -> category template -> optional subcategory template
```

- A child field with the same `field_key` replaces the parent field.
- An inactive child field removes that inherited field.
- If a subcategory has no child template, the response contains generic plus category fields.
- If a category has no dynamic configuration, the response contains generic fields only.
- Final fields are returned as one sorted, flat `fields[]` array.

The `resolved_template.template_chain` shows the database template IDs used for that response. Frontend code must not attach behavior to those IDs; use fields and stable `field_key` values instead.

## 7. Field Contract

Every returned field contains these core keys:

| Key | Meaning |
|---|---|
| `field_key` | Stable backend key. |
| `label` | Display label. Use it directly. |
| `field_type` | Control type such as `text`, `textarea`, `number`, `multi_select`, `yes_no`, `file_upload`, `address`, or `pricing`. |
| `field_scope` | `generic` or `dynamic`. |
| `is_required` | Unconditional required state. |
| `submit_as` | Exact request destination. |
| `section` | Suggested form section. |
| `placeholder`, `help_text` | Frontend copy. |
| `validation` | Min/max/type/selection constraints. |
| `visible_when` | Conditional display rule, when present. |
| `required_when` | Conditional required rule, when present. |

Use `is_required` and `required_when` for the required marker. Do not add an asterisk to the saved label.

### `submit_as` routing

| `submit_as.type` | Frontend action |
|---|---|
| `top_level` | Add the value to multipart using `submit_as.key`. |
| `answers_json` | Add the value under `answers_json[submit_as.key]`, then JSON-encode the complete object. |
| `dynamic_files` | Append the exact field key to `dynamic_file_keys[]` and its file to the same index in `dynamic_files[]`. |
| `certificate_bundle` | Send one `certificate_description` and zero or more `certificate_files[]`. |
| `pricing_fields` | Send `pricing_type`, `amount`, `currency`, `price_unit_id`, and, when the capability allows it, `profile_pricing_scope` as top-level multipart values. |
| `display_only` | Render the value but do not submit it. The address is resolved by the backend. |

## 8. Template Response Shape

```json
{
  "status": "Success",
  "message": "Service form template fetched successfully.",
  "data": {
    "category": {
      "id": 6,
      "name": "Education"
    },
    "subcategory": {
      "id": 41,
      "category_id": 6,
      "name": "Tutoring"
    },
    "currency_context": {
      "provider_type": "individual",
      "business_id": null,
      "country_id": 39,
      "default_currency": {
        "code": "CAD",
        "symbol": "C$"
      },
      "is_usd_currency": false,
      "can_charge_in_usd": true
    },
    "resolved_template": {
      "id": 9,
      "template_chain": [1, 5, 9]
    },
    "fields": [
      {
        "field_key": "title",
        "label": "Service Title",
        "field_type": "text",
        "field_scope": "generic",
        "is_required": true,
        "submit_as": {
          "type": "top_level",
          "key": "title"
        },
        "section": "Service Information",
        "placeholder": "Enter a clear and specific service title",
        "help_text": "Use a short title that clearly describes the service you provide.",
        "value_key": "title",
        "validation": {
          "data_type": "string",
          "minimum_length": 3,
          "maximum_length": 150
        }
      },
      {
        "field_key": "fulfillment_types",
        "label": "Fulfillment Type",
        "field_type": "multi_select",
        "field_scope": "generic",
        "is_required": true,
        "submit_as": {
          "type": "top_level",
          "key": "fulfillment_type_ids"
        },
        "options": [
          {"label": "At my location", "value": 1, "code": "provider_location"},
          {"label": "At customer location", "value": 2, "code": "customer_location"},
          {"label": "Pickup & Delivery", "value": 3, "code": "pickup_delivery"},
          {"label": "Online / Remote", "value": 4, "code": "online_remote"}
        ],
        "validation": {
          "minimum_selections": 1,
          "maximum_selections": 4
        }
      },
      {
        "field_key": "subjects_taught",
        "label": "Subjects Taught",
        "field_type": "multi_select",
        "field_scope": "dynamic",
        "is_required": false,
        "submit_as": {
          "type": "answers_json",
          "key": "subjects_taught"
        },
        "options": [
          {"label": "Math", "value": "math"},
          {"label": "Science", "value": "science"},
          {"label": "English", "value": "english"},
          {"label": "History", "value": "history"},
          {"label": "Computer Science", "value": "computer_science"},
          {
            "label": "Other",
            "value": "other",
            "allows_custom_value": true,
            "custom_value_key": "subjects_taught_other",
            "custom_value_label": "Other Subject"
          }
        ]
      },
      {
        "field_key": "pricing",
        "label": "Service Price",
        "field_type": "pricing",
        "field_scope": "generic",
        "is_required": true,
        "submit_as": {
          "type": "pricing_fields",
          "keys": ["pricing_type", "amount", "currency", "price_unit_id"]
        },
        "pricing_types": [
          {"label": "Fixed Price", "value": "fixed_price"},
          {"label": "Quote Required", "value": "quote_required"}
        ],
        "price_units": [
          {"label": "Per hour", "value": 2, "code": "per_hour"},
          {"label": "Per session", "value": 3, "code": "per_session"}
        ]
      }
    ]
  },
  "meta": []
}
```

The real response contains every resolved field and its complete flattened configuration. The example above demonstrates the shape; it does not limit the fields returned.

The same `data` object also includes `sections` and `provider_listing_capability`. Render sections first, then use the capability object for format, unit, and fulfillment compatibility.

```json
"sections": [
  {
    "section_key": "service_information",
    "title": "Service Information",
    "help_text": "Core listing identity, fulfillment, and location inputs.",
    "display_order": 1,
    "field_keys": ["title", "fulfillment_types", "pricing"]
  },
  {
    "section_key": "service_capability",
    "title": "Service Capability",
    "help_text": "Business format, duration, bounds, and supported options for this taxonomy. Omit hidden keys from answers_json.",
    "display_order": 2,
    "field_keys": ["learner_delivery", "session_duration_minutes"]
  }
]
```

`provider_listing_capability` is the compatibility source for the selected subcategory:

| Key | Frontend use |
|---|---|
| `source` | Category and subcategory the provider selected. Show these names. |
| `canonical_owner` | Form owner when `is_alias` is true. Keep showing `source`. Do not switch the screen to the owner category. |
| `is_alias` | True for the five aliases below. Submit the selected category and subcategory ids. |
| `business_format` | Format dropdown when not null. Submit `option.value` in `answers_json` under `field_key`. |
| `formats` | Allowed price-unit codes, fulfillment codes, profile-pricing state, and capability fields for each format. |
| `prohibited_provider_fields` | Never render or submit these. They include `booking_policy`, `booking_policy.schedule_family`, and `booking_policy.profile_mode`. |

When `business_format` is null, use the `formats` entry that matches the selected fulfillment, or `formats.default` when that is the only entry.

| Selected subcategory | Form owner |
|---|---|
| Events Catering | Culinary Catering |
| Misc Gardening | Maintenance Gardening |
| Misc Movers | Delivery Movers |
| Music Education | Education Skill-Based |
| Music Live Music | Events Live Music |

`formats[format].pricing[pricing_type]` is the list of allowed price-unit codes. Filter the template `price_units` to those codes. `formats[format].fulfillment` is the allowed fulfillment codes. An empty list means hide fulfillment and do not send `fulfillment_type_ids`. When `fulfillment_by_price_unit` contains the selected unit, that list replaces the format fulfillment list.

`per_weight` is valid only for Laundry. Roadside never accepts `per_mile`. Automotive arrival hourly is `quote_required` only.

## 9. Generic Fields

These fields are present for every service unless a child template explicitly removes/overrides one.

| Field | Submit location | Required and behavior |
|---|---|---|
| `title` | Top-level `title` | Required; string, 3-150 characters. |
| `fulfillment_types` | Top-level `fulfillment_type_ids[]` | Required when the selected format has a non-empty fulfillment list. One or more IDs from this template's `options`, further limited by `formats[format].fulfillment`. Hide the control when that list is empty. |
| `address` | Do not submit | Visible/required for `provider_location` or `pickup_delivery`; backend snapshots the provider default address. |
| `service_radius` | Top-level `service_radius` and `service_radius_unit` | Both required for `customer_location` or `pickup_delivery`. Radius `0.01-99999999.99`; unit exactly `mile` or `km`. |
| `description` | Top-level `description` | Required; 20-5000 characters; formatting is preserved. |
| `additional_information` | Top-level | Optional; maximum 3000 characters; formatting is preserved. |
| `tagline` | Top-level | Optional; maximum 150 characters. |
| `portfolio_images` | `portfolio_images[]` | Required on create only when this subcategory's capability requires visual proof. Maximum 10 stored; JPG/JPEG/PNG/WEBP, max 5 MB each. If create returns `At least one portfolio image is required.`, the image is required for that subcategory. |
| `certificates` | `certificate_description`, `certificate_files[]` | Optional; one shared description for all files; max 10 stored; PDF/JPG/JPEG/PNG, max 5 MB each. |
| `pricing` | Top-level pricing fields | Required on create. Includes `profile_pricing_scope` when the capability says that control applies. See pricing rules below. |
| `information_accuracy_acknowledgement` | Top-level boolean | Required and must be `true` on create. Stored in `answers_json`. |

### Fulfillment option sets

- Generic categories and Caregiving: `provider_location`, `customer_location`, `pickup_delivery`.
- Education, Fitness, and Personal: all three above plus `online_remote`.
- Always submit option IDs, but evaluate conditions using option `code`.
- After 1 September 2026 the capability fulfillment list can be narrower than these category defaults. If `formats[format].fulfillment` does not include a code, do not offer that option even if an older category note listed it.

### Address and radius combinations

| Selected code | Address snapshot | Radius/unit |
|---|---:|---:|
| `provider_location` | Required | Not required |
| `customer_location` | Not required | Required |
| `pickup_delivery` | Required | Required |
| `online_remote` only | Not required | Not required |

Do not submit `address_id`. For both individual and business services, the backend uses the authenticated provider's default `customer_addresses` record for the service location snapshot. Business country is used for currency, but it is not used as the operational service-address snapshot.

### Pricing

`pricing_type=fixed_price` requires:

- `amount`: numeric `0.01-9999999999.99`
- `currency`: three-letter final currency code
- `price_unit_id`: an ID from this template's `pricing.price_units`

`pricing_type=quote_required` allows `amount` and `currency` to be omitted or null. `price_unit_id` is still required. If amount or currency is supplied, it is still validated.

`profile_pricing_scope` is a real field. Read the state from:

```text
formats[format].profile_pricing_scope.by_pricing_type[pricing_type][price_unit_code]
```

If that entry is missing, use `profile_pricing_scope.default_state`.

| `state` | Frontend action |
|---|---|
| `required` | Show the control. Submit `per_request` or `per_profile`. Do not invent a default. |
| `optional` | Show the control. Submit one allowed value or omit the field. |
| `prohibited` | Hide the control and omit the field. |

A stored `null` means the effective scope is entire booking (`per_request`). Sending `null` does not satisfy a required state. `0` and `false` on other capability fields are real saved values. Omitting a required amount is not the same as sending `0`.

Currency source:

- Individual: provider default `customer_addresses.country_id` -> active currency for that country.
- Business: selected `provider_businesses.country_id` -> active currency for that country.
- Timezone is not used.

USD override:

- If default currency is USD, submit `USD` and hide Charge in USD.
- If default currency is not USD and `online_remote` is not selected, submit local currency.
- If default currency is not USD and `online_remote` is selected, frontend may offer Charge in USD. Toggle off submits local code; toggle on submits `USD`.
- `charge_in_usd` is frontend-only and is not stored. The final `currency` code is the source of truth.

## 10. Dynamic Answer Rules

Dynamic non-file values are sent in one object:

```json
{
  "field_key_from_template": "value"
}
```

Because the request is multipart, send this object as a JSON string named `answers_json`.

Backend rules:

- Unknown keys are rejected.
- Do not send `booking_policy`, `schedule_family`, or `profile_mode` inside `answers_json` or at the top level.
- Capability controls returned on the template, including business format selectors and duration, bound, and supported-option fields, go in `answers_json` under their `field_key`.
- A key that is hidden for the current format, pricing type, unit, or fulfillment must be omitted. Do not send it as `null`.
- `0` and `false` are stored values. Send them when the provider chose them.
- Required dynamic fields must be present and non-empty, except a boolean `false` and a numeric `0`, which count as present.
- `text`/`textarea` must be strings and obey length bounds.
- `number` must be numeric and obey min/max bounds.
- `multi_select` must be an array containing only returned option values.
- `yes_no` must be a real boolean after multipart normalization.
- If `other` is selected, its configured `custom_value_key` is required.
- A custom Other value is rejected when `other` is not selected.
- Dynamic file URLs are not supplied by the client during create; upload files through the paired dynamic arrays.

### Dynamic file pairing

For two CORI files:

```text
dynamic_file_keys[0] = cori_background_check
dynamic_files[0]     = <first file>
dynamic_file_keys[1] = cori_background_check
dynamic_files[1]     = <second file>
```

The arrays must have identical lengths and matching indexes. Allowed dynamic file extensions are PDF, PNG, JPG, JPEG; the generic request validator also permits WEBP, but the resolved dynamic field configuration is authoritative and currently rejects WEBP for compliance fields. Maximum file size is 5 MB each.

After save, uploaded dynamic file URLs are inserted into stored/returned `answers_json` under their field key.

A missing CORI file does not by itself make `publishability.is_publishable` false. Follow `is_required` and `minimum_files` on the returned field for the form. On a candidate save, an existing CORI file stays until its field key is sent in `clear_dynamic_file_keys`. Clearing a file is applied only after the whole candidate request succeeds.

---

# Part B: Complete Dynamic Template Catalog

## 11. Caregiving

Applies identically to: Babysitting, Daycare, Tutoring, Disability, Seniors, and Medical.

Required fields:

- `years_of_experience`: number, `0-100`
- `client_types_served`: array, 1-6 values
- `specialized_care_experience`: array, 1-9 values
- `cori_background_check`: at least one dynamic file

Optional fields: `trained_for_emergencies`, `provide_transportation`.

Allowed `client_types_served` values:

```text
infants, toddlers, children, teenagers,
adults_with_disabilities, seniors_elderly
```

Allowed `specialized_care_experience` values:

```text
autism_support, adhd_support, mobility_assistance,
dementia_alzheimers_care, medication_reminders,
post_surgery_assistance, behavioral_support,
feeding_assistance, other
```

When `other` is selected, include `specialized_care_experience_other` as a string.

### Babysitting `answers_json`

```json
{
  "years_of_experience": 4,
  "client_types_served": ["infants", "toddlers", "children"],
  "specialized_care_experience": ["feeding_assistance", "behavioral_support"],
  "trained_for_emergencies": true,
  "provide_transportation": false
}
```

### Daycare `answers_json`

```json
{
  "years_of_experience": 6,
  "client_types_served": ["infants", "toddlers", "children"],
  "specialized_care_experience": ["autism_support", "adhd_support"],
  "trained_for_emergencies": true,
  "provide_transportation": true
}
```

### Tutoring `answers_json`

```json
{
  "years_of_experience": 3,
  "client_types_served": ["children", "teenagers"],
  "specialized_care_experience": ["adhd_support", "behavioral_support"],
  "trained_for_emergencies": false,
  "provide_transportation": false
}
```

### Disability `answers_json`

```json
{
  "years_of_experience": 8,
  "client_types_served": ["adults_with_disabilities"],
  "specialized_care_experience": ["mobility_assistance", "feeding_assistance", "other"],
  "specialized_care_experience_other": "Communication assistance",
  "trained_for_emergencies": true,
  "provide_transportation": true
}
```

### Seniors `answers_json`

```json
{
  "years_of_experience": 10,
  "client_types_served": ["seniors_elderly"],
  "specialized_care_experience": ["dementia_alzheimers_care", "medication_reminders", "mobility_assistance"],
  "trained_for_emergencies": true,
  "provide_transportation": true
}
```

### Medical `answers_json`

```json
{
  "years_of_experience": 7,
  "client_types_served": ["adults_with_disabilities", "seniors_elderly"],
  "specialized_care_experience": ["post_surgery_assistance", "medication_reminders"],
  "trained_for_emergencies": true,
  "provide_transportation": false
}
```

For every Caregiving example also send at least one `cori_background_check` through `dynamic_file_keys[]`/`dynamic_files[]`.

## 12. Education

All Education templates allow `online_remote` and inherit optional `cori_background_check`, except where the subcategory makes it required. All except Consulting inherit required `qualifications`.

### Tutoring

`student_types_served` is optional. Allowed values:

```text
elementary_school, middle_school, high_school,
college_university, adults_professionals
```

`subjects_taught` is optional. Allowed values:

```text
math, science, english, history, computer_science, other
```

```json
{
  "qualifications": "B.Ed. in Mathematics\nFive years of tutoring experience.",
  "student_types_served": ["high_school", "college_university"],
  "subjects_taught": ["math", "computer_science", "other"],
  "subjects_taught_other": "Physics"
}
```

CORI upload is optional.

### Language

`languages_offered` is a required string, maximum 2000 characters. Use line breaks for multiple languages. `teaching_level` requires 1-3 of `beginner`, `intermediate`, `advanced`.

```json
{
  "qualifications": "Certified language instructor with seven years of experience.",
  "languages_offered": "English\nFrench\nSpanish",
  "teaching_level": ["beginner", "intermediate", "advanced"]
}
```

CORI upload is optional.

### Test Prep

`exams_covered` requires 1-8 values from:

```text
sat, act, gre, gmat, ielts, toefl, mcat, other
```

`test_prep_format` requires 1-3 values from:

```text
practice_tests, strategy_coaching, full_course
```

```json
{
  "qualifications": "Certified test-preparation instructor.",
  "exams_covered": ["sat", "ielts", "other"],
  "exams_covered_other": "LSAT",
  "test_prep_format": ["practice_tests", "strategy_coaching"]
}
```

At least one `cori_background_check` file is required.

### Consulting

Consulting explicitly removes `consulting_type` and inherited `qualifications`. There are no required non-file dynamic answers:

```json
{}
```

The inherited CORI file is optional.

### Skill-Based

`skills_taught` and `software_tools_used` are required strings, maximum 3000 characters each. Line breaks may represent multiple entries.

```json
{
  "qualifications": "Certified technical instructor.",
  "skills_taught": "Web development\nUI prototyping\nVersion control",
  "software_tools_used": "Visual Studio Code\nFigma\nGit"
}
```

At least one `cori_background_check` file is required.

### Careers

`career_services_offered` is optional and accepts:

```text
resume_review, interview_prep, job_search_strategy
```

```json
{
  "qualifications": "Certified career coach with recruitment experience.",
  "career_services_offered": ["resume_review", "interview_prep", "job_search_strategy"]
}
```

At least one `cori_background_check` file is required.

## 13. Fitness

All Fitness subcategories require:

- `client_types_served`: 1-6 values
- `special_training_experience`: options depend on subcategory
- At least one `cori_background_check` dynamic file

Allowed `client_types_served` values:

```text
beginners, intermediate, advanced_athletes,
children_teens, adults, seniors
```

### Trainers `answers_json`

```json
{
  "client_types_served": ["beginners", "intermediate", "adults"],
  "special_training_experience": ["injury_aware_training", "prenatal_postnatal_fitness", "senior_fitness"]
}
```

### Yoga/Pilates `answers_json`

```json
{
  "client_types_served": ["beginners", "adults", "seniors"],
  "special_training_experience": ["prenatal_postnatal_fitness", "senior_fitness", "adaptive_fitness_disability_support"]
}
```

### Dance `answers_json`

```json
{
  "client_types_served": ["beginners", "children_teens", "adults"],
  "special_training_experience": ["injury_aware_training", "youth_coaching"]
}
```

Trainers, Yoga/Pilates, and Dance use the full training option set:

```text
injury_aware_training, prenatal_postnatal_fitness,
senior_fitness, youth_coaching,
adaptive_fitness_disability_support
```

### Boxing `answers_json`

```json
{
  "client_types_served": ["intermediate", "advanced_athletes", "adults"],
  "special_training_experience": ["injury_aware_training", "youth_coaching"]
}
```

### CrossFit `answers_json`

```json
{
  "client_types_served": ["intermediate", "advanced_athletes", "adults"],
  "special_training_experience": ["injury_aware_training", "adaptive_fitness_disability_support"]
}
```

Boxing and CrossFit accept only:

```text
injury_aware_training, youth_coaching,
adaptive_fitness_disability_support
```

### Coaching `answers_json`

```json
{
  "client_types_served": ["beginners", "children_teens", "seniors"],
  "special_training_experience": ["senior_fitness", "youth_coaching", "adaptive_fitness_disability_support"]
}
```

Coaching accepts:

```text
injury_aware_training, senior_fitness, youth_coaching,
adaptive_fitness_disability_support
```

## 14. Personal

Applies identically to: Holistic, Massage, Dietitian, Rehab, Counseling, and Meditation.

- `program_details`: optional string, maximum 5000 characters.
- `conditions_worked_with`: required; 1-5 values.
- `cori_background_check`: at least one dynamic file.
- `business_verification`: hidden for individual; required dynamic file for business.

Allowed conditions:

```text
injuries, chronic_conditions, mental_health_cases,
post_surgery_recovery, na
```

The template returns `selection_rules.exclusive_values=["na"]`; frontend must treat `na` as exclusive. The current generic dynamic validator validates allowed values and count but does not separately enforce this exclusivity metadata, so frontend enforcement is important.

### Holistic `answers_json`

```json
{
  "program_details": "Eight-week holistic wellness program.",
  "conditions_worked_with": ["chronic_conditions", "mental_health_cases"]
}
```

### Massage `answers_json`

```json
{
  "program_details": "Personalized therapeutic massage sessions.",
  "conditions_worked_with": ["injuries", "chronic_conditions"]
}
```

### Dietitian `answers_json`

```json
{
  "program_details": "Twelve-week nutrition and meal-planning program.",
  "conditions_worked_with": ["chronic_conditions"]
}
```

### Rehab `answers_json`

```json
{
  "program_details": "Progressive mobility and recovery plan.",
  "conditions_worked_with": ["injuries", "post_surgery_recovery"]
}
```

### Counseling `answers_json`

```json
{
  "program_details": "Structured one-to-one counseling sessions.",
  "conditions_worked_with": ["mental_health_cases"]
}
```

### Meditation `answers_json`

```json
{
  "program_details": "Guided mindfulness and meditation program.",
  "conditions_worked_with": ["na"]
}
```

For an individual Personal service, upload `cori_background_check`. For a business Personal service, upload both `cori_background_check` and `business_verification`, repeating one `dynamic_file_keys[]` entry for every uploaded file.

## 15. Generic-Only Categories

Automotive, Beauty, Culinary, Delivery, Events, IT, Maintenance, Media, Music, Misc, Pet Care, and Sanitation currently add no dynamic non-file answers. Their create request uses:

```json
{}
```

as the request `answers_json`. Always trust the returned template: a later database template change can add dynamic fields without changing the endpoint.

---

# Part C: POST Create Service

## 16. Endpoint

```http
POST /api/v1/service-provider/services
Content-Type: multipart/form-data
```

Successful creation is transactional and returns HTTP `201`. A new service is saved with status `3` (`pending_review`). Status `2` is reserved for deleted services. Status `1` is active and status `0` is inactive. A provider cannot manually move a pending-review service to active.

Individual creation additionally requires the authenticated provider profile's `background_verification` to be Verified.

Create also checks commercial publishability. A normal validation failure returns `422` with `data: null` and one `message`. A publishability failure returns `422` with the summary message `The service listing is not commercially publishable.` and this `data` shape:

```json
{
  "type": "commercial_publishability",
  "errors": {
    "session_duration_minutes": [
      {
        "field": "session_duration_minutes",
        "code": "provider_duration_required",
        "message": "Session Duration Minutes is required for scheduling and availability."
      }
    ]
  }
}
```

Show every `errors` message next to its field. `allowed`, `minimum`, and `maximum` are present when the failure is a compatibility or range failure. The service is not created.

## 17. Create Request Fields

| Field | Required | Rules/source |
|---|---:|---|
| `category_id` | Yes | Active category. |
| `subcategory_id` | Yes | Active subcategory belonging to category. |
| `provider_type` | Yes | `individual` or `business`. |
| `business_id` | Business only | Owned active business assigned to subcategory; omit for individual. |
| `title` | Yes | String, 3-150. |
| `fulfillment_type_ids[]` | When fulfillment applies | One or more distinct IDs returned by the template and allowed by the selected format. Omit when that format's fulfillment list is empty. |
| `description` | Yes | String, 20-5000. |
| `additional_information` | No | String, max 3000. |
| `tagline` | No | String, max 150. |
| `address_id` | Never | Prohibited. Backend resolves default address. |
| `service_radius` | Conditional | Required for customer location/pickup; numeric bounds apply. |
| `service_radius_unit` | Conditional | Required with radius; `mile` or `km`. |
| `pricing_type` | Yes | `fixed_price` or `quote_required`. |
| `amount` | Fixed only | Numeric bounds apply. Optional for quote. |
| `currency` | Fixed only | Final three-letter allowed code. Optional for quote. |
| `price_unit_id` | Yes | Required for both `fixed_price` and `quote_required`. Must be a template price unit whose code is allowed for the selected format and pricing type. |
| `profile_pricing_scope` | Conditional | `per_request` or `per_profile` when the capability state is required or optional. Omit when prohibited. |
| `charge_in_usd` | Do not send | Accepted and ignored for compatibility but never stored. Send the final `currency`. |
| `booking_policy` | Never | Prohibited. The server derives it. |
| `answers_json` | Dynamic-dependent | JSON object encoded as multipart string. |
| `portfolio_images[]` | Conditional | Required on create only for subcategories whose capability requires proof. Otherwise optional. Maximum 10 images, 5 MB each. |
| `certificate_description` | With certificates | One description shared by all certificate files. |
| `certificate_files[]` | With description | Up to 10 files. |
| `dynamic_file_keys[]` | With dynamic files | Exact dynamic `field_key`, repeated per file. |
| `dynamic_files[]` | With dynamic files | Same count and order as keys. |
| `information_accuracy_acknowledgement` | Yes | Boolean and must be true. |

Multipart normalizer accepts arrays, JSON-array strings, comma-separated list strings, and a single scalar for supported list inputs. Frontend should still send proper repeated array fields to avoid transport ambiguity.

## 18. Generic Create Example

```text
category_id: 1
subcategory_id: 5
provider_type: individual
title: Premium mobile detailing
fulfillment_type_ids[]: 1
fulfillment_type_ids[]: 2
description: Complete interior and exterior vehicle detailing service.
additional_information: Please remove personal belongings before arrival.
tagline: A showroom finish at your location
service_radius: 25
service_radius_unit: mile
pricing_type: fixed_price
amount: 125.00
currency: CAD
price_unit_id: 1
answers_json: {}
information_accuracy_acknowledgement: true
portfolio_images[]: <front.jpg>
portfolio_images[]: <interior.jpg>
certificate_description: Certified automotive detailing professional
certificate_files[]: <certificate.pdf>
```

## 19. Dynamic Create Example: Education Tutoring

```text
category_id: 6
subcategory_id: 41
provider_type: individual
title: Online algebra tutoring
fulfillment_type_ids[]: 4
description: One-to-one algebra tutoring with guided practice and lesson plans.
pricing_type: fixed_price
amount: 50
currency: CAD
price_unit_id: 2
answers_json: {"qualifications":"B.Ed. in Mathematics","student_types_served":["high_school"],"subjects_taught":["math"]}
information_accuracy_acknowledgement: true
portfolio_images[]: <lesson-sample.png>
```

## 20. Dynamic Create Example: Personal Business

```text
category_id: 14
subcategory_id: 90
provider_type: business
business_id: 12
title: Guided wellness program
fulfillment_type_ids[]: 4
description: A structured remote wellness program with guided weekly sessions.
pricing_type: fixed_price
amount: 75
currency: USD
price_unit_id: 3
answers_json: {"program_details":"Eight weekly sessions","conditions_worked_with":["chronic_conditions"]}
dynamic_file_keys[]: cori_background_check
dynamic_files[]: <cori.pdf>
dynamic_file_keys[]: business_verification
dynamic_files[]: <business-license.pdf>
information_accuracy_acknowledgement: true
portfolio_images[]: <program.png>
```

## 21. Create Storage Map

| Input | Storage |
|---|---|
| Context/status | `services` |
| Title, descriptions, tagline, frozen address, radius | `service_info` |
| Fulfillment IDs | `service_fulfillment_types` |
| Portfolio files | `service_portfolios` + public storage |
| Shared certificate description | `service_certificates_info` |
| Certificate files | `service_certificates` + public storage |
| Pricing | `service_prices` |
| Dynamic values, dynamic file URLs, accuracy acknowledgement | `service_template_answers.answers_json` |

`description`, `additional_information`, `certificate_description`, and `answers_json` textarea strings preserve whitespace and line breaks.

## 22. Create Success Response

```json
{
  "status": "Success",
  "message": "Service submitted for review successfully.",
  "data": {
    "service_id": 91,
    "status": 3,
    "status_label": "pending_review",
    "provider_type": "individual",
    "category": {"id": 6, "name": "Education"},
    "subcategory": {"id": 41, "name": "Tutoring"},
    "business": null,
    "service_info": {
      "title": "Online algebra tutoring",
      "description": "One-to-one algebra tutoring with guided practice and lesson plans.",
      "additional_information": null,
      "tagline": null,
      "address_id": null,
      "address": null,
      "service_radius": null,
      "service_radius_unit": null
    },
    "location_context": null,
    "fulfillment_types": [
      {"id": 4, "label": "Online / Remote", "code": "online_remote"}
    ],
    "portfolio_images": [
      {"id": 301, "url": "/storage/service_portfolios/91/lesson-sample.png", "sort_order": 1}
    ],
    "certificate": null,
    "pricing": {
      "pricing_type": "fixed_price",
      "amount": "50.00",
      "currency": "CAD",
      "price_unit": {"id": 2, "label": "Per hour", "code": "per_hour"}
    },
    "dynamic_answers": [
      {
        "field_key": "qualifications",
        "label": "Qualifications",
        "field_type": "textarea",
        "value": "B.Ed. in Mathematics",
        "display_value": "B.Ed. in Mathematics"
      },
      {
        "field_key": "subjects_taught",
        "label": "Subjects Taught",
        "field_type": "multi_select",
        "value": ["math"],
        "display_value": "Math",
        "labeled_values": [{"label": "Math", "value": "math"}]
      },
      {
        "field_key": "information_accuracy_acknowledgement",
        "label": "I confirm that the information provided is accurate. I acknowledge that providing false or misleading information may result in removal from the platform.",
        "field_type": "yes_no",
        "value": true,
        "display_value": "Yes"
      }
    ],
    "answers_json": {
      "qualifications": "B.Ed. in Mathematics",
      "student_types_served": ["high_school"],
      "subjects_taught": ["math"],
      "information_accuracy_acknowledgement": true
    },
    "created_at": "2026-08-05T10:00:00.000000Z",
    "updated_at": "2026-08-05T10:00:00.000000Z"
  },
  "meta": []
}
```

---

# Part D: POST Update Service Information

## 23. Endpoint

```http
POST /api/v1/service-provider/services/{id}/information
Content-Type: multipart/form-data
```

`{id}` must be an existing non-deleted service owned by the authenticated provider.

Before opening this edit screen, call:

```http
GET /api/v1/service-provider/services/{id}/information
```

That GET response contains:

- `template`: the resolved template with the pricing field removed and without `currency_context`. Use this only for an information-only screen.
- `candidate_template`: the full template, including pricing, `currency_context`, `sections`, and `provider_listing_capability`. Use this for the complete edit screen.
- `provider_listing_capability` and `publishability` at the top of `data` as well.
- `current_values` for generic fields.
- Raw `answers_json` and the same object again as `business_fields` for dynamic prefill.
- Existing portfolio IDs/URLs.
- One certificate description with certificate file IDs/URLs.

`publishability.is_publishable` false does not mean the GET failed. `publishability.issues` is a map of field key to issues. Show those issues on the edit screen. Admin approval is a separate gate from commercial publishability.

## 24. Update Request

The information update accepts the same information and dynamic fields as create, except:

- No category/subcategory/provider/business context.
- No pricing fields.
- Portfolio uploads are optional, but at least one stored portfolio must remain.
- Certificate uploads append under the service's one shared description.
- Existing dynamic files are preserved and new dynamic files append.
- `delete_portfolio_ids[]` and `delete_certificate_ids[]` may remove selected generic files during this update.

These fields are explicitly prohibited:

```text
category_id, subcategory_id, provider_type, business_id, address_id,
pricing_type, amount, currency, price_unit_id, profile_pricing_scope,
charge_in_usd, information_accuracy_acknowledgement, booking_policy
```

`information_accuracy_acknowledgement` is required on create only. Do not send it on `POST /services/{id}/information`. The value stored at create is preserved.

### Update example

```text
title: Updated online algebra tutoring
fulfillment_type_ids[]: 4
description: Updated one-to-one algebra tutoring with guided practice and lesson plans.
additional_information: Students should have a notebook and calculator.
tagline: Algebra made clear
answers_json: {"qualifications":"B.Ed. in Mathematics\nSeven years experience","student_types_served":["high_school","college_university"],"subjects_taught":["math"]}
portfolio_images[]: <new-sample.png>
delete_portfolio_ids[]: 301
certificate_description: Updated shared certificate description
certificate_files[]: <new-certificate.pdf>
delete_certificate_ids[]: 99
```

For dynamic files, do not put newly selected browser files into `answers_json`. Use the paired dynamic arrays. Existing file URLs are merged by the backend during update.

To remove one dynamic file, use the separate `DELETE /services/{id}/files` endpoint with `file_type=dynamic`, its `field_key`, and the exact returned `file_path`; it is not removed through `answers_json`.

## 25. Update Success Response

```json
{
  "status": "Success",
  "message": "Service information updated successfully.",
  "data": {
    "service_id": 91,
    "template": {
      "category": {"id": 6, "name": "Education"},
      "subcategory": {"id": 41, "category_id": 6, "name": "Tutoring"},
      "resolved_template": {"id": 9, "template_chain": [1, 5, 9]},
      "fields": [
        {
          "field_key": "title",
          "label": "Service Title",
          "field_type": "text",
          "field_scope": "generic",
          "is_required": true,
          "submit_as": {"type": "top_level", "key": "title"}
        },
        {
          "field_key": "subjects_taught",
          "label": "Subjects Taught",
          "field_type": "multi_select",
          "field_scope": "dynamic",
          "is_required": false,
          "submit_as": {"type": "answers_json", "key": "subjects_taught"}
        }
      ]
    },
    "current_values": {
      "title": "Updated online algebra tutoring",
      "fulfillment_type_ids": [4],
      "description": "Updated one-to-one algebra tutoring with guided practice and lesson plans.",
      "additional_information": "Students should have a notebook and calculator.",
      "tagline": "Algebra made clear",
      "address_id": null,
      "address": null,
      "service_radius": null,
      "service_radius_unit": null,
      "information_accuracy_acknowledgement": true,
      "answers_json": {
        "qualifications": "B.Ed. in Mathematics\nSeven years experience",
        "student_types_served": ["high_school", "college_university"],
        "subjects_taught": ["math"],
        "information_accuracy_acknowledgement": true
      },
      "portfolio_images": [
        {"id": 302, "url": "/storage/service_portfolios/91/new-sample.png", "sort_order": 2}
      ],
      "certificate": {
        "id": 20,
        "description": "Updated shared certificate description",
        "files": [
          {"id": 100, "url": "/storage/service_certificates/91/new-certificate.pdf"}
        ]
      }
    }
  },
  "meta": []
}
```

The real `template.fields` contains the complete information template except `pricing`; the shortened list above only keeps the response example readable.

---

# Part D2: POST Complete Candidate

## 25A. Endpoint

```http
POST /api/v1/service-provider/services/{id}/candidate
Content-Type: multipart/form-data
```

Use this when the edit screen was built from `candidate_template`. It validates information, pricing, dynamic answers, and files in one transaction. `{id}` must be an existing non-deleted service owned by the authenticated provider.

If any check fails, nothing from that request is saved. Existing files stay. The previous listing stays. Show `message`, and when `data.type` is `commercial_publishability`, also show `data.errors`.

Success is HTTP `200` and the message `Service changes saved successfully.` The `data` object is the service detail, the same shape as `GET /services/{id}`: `service_info`, `fulfillment_types`, `portfolio_images`, `certificate`, `pricing` including `profile_pricing_scope`, `answers_json`, `dynamic_answers`, `provider_listing_capability`, and `publishability`. A successful save can still have `publishability.is_publishable` false. Show those issues. The status does not automatically become active.

## 25B. Candidate Request

Send the same information and pricing fields as create, plus the file-change fields below. Do not send create-only identity fields.

| Field | Required | Rules |
|---|---:|---|
| `title` | Yes | 3-150. |
| `description` | Yes | 20-5000. Line breaks are stored. |
| `additional_information` | No | Max 3000. |
| `tagline` | No | Max 150. |
| `fulfillment_type_ids[]` | When fulfillment applies | Same capability rules as create. |
| `service_radius`, `service_radius_unit` | Conditional | Same address and radius table as create. |
| `pricing_type` | Yes | `fixed_price` or `quote_required`. |
| `amount`, `currency` | Fixed price | Optional for quote. |
| `price_unit_id` | Yes | Allowed unit for the selected format and pricing type. |
| `profile_pricing_scope` | Conditional | Required, optional, or prohibited from the capability state table. |
| `answers_json` | Yes for visible dynamic fields | JSON string. Include every visible dynamic scalar. |
| `answers_mode` | Yes | Exact value `replace`. |
| `portfolio_images[]` | No | New images. If this service requires a portfolio, at least one image must remain after deletes. |
| `delete_portfolio_ids[]` | No | Stored portfolio ids to remove. |
| `certificate_description`, `certificate_files[]` | Together | New certificate files append under the one description. |
| `delete_certificate_ids[]` | No | Stored certificate file ids to remove. |
| `dynamic_file_keys[]`, `dynamic_files[]` | Together | New files only. Repeat the key once per file. |
| `clear_dynamic_file_keys[]` | No | Dynamic file field keys whose stored files should be removed after success. |

These fields are prohibited:

```text
category_id, subcategory_id, provider_type, business_id, address_id,
information_accuracy_acknowledgement, booking_policy, charge_in_usd
```

`answers_mode=replace` replaces the previous dynamic scalars. File URLs already stored for a field are kept unless that field key is in `clear_dynamic_file_keys` or the field is no longer visible. Do not put stored paths or new browser files inside `answers_json`.

### Candidate example

```text
title: Updated online algebra tutoring
fulfillment_type_ids[]: 4
description: One-to-one algebra tutoring with guided practice and lesson notes.
pricing_type: fixed_price
amount: 50
currency: CAD
price_unit_id: 2
profile_pricing_scope: per_request
answers_mode: replace
answers_json: {"learner_delivery":"individual","session_duration_minutes":60,"supported_subjects":["math"]}
clear_dynamic_file_keys[]: cori_background_check
delete_portfolio_ids[]: 301
portfolio_images[]: <new-sample.png>
```

Omit `profile_pricing_scope` when its state is `prohibited`. Omit a dynamic key that is hidden for the selected format.

Do not call information save and then pricing save to prepare a candidate request. The candidate endpoint checks the full listing itself. The information and pricing endpoints remain available for a screen that edits only that section.

---

# Part E: Errors and Frontend Checklist

## 26. Important Errors

### Template request

| HTTP | Example message |
|---:|---|
| 422 | `The category id field is required.` |
| 422 | `The subcategory id field is required.` |
| 422 | `The provider type field is required.` |
| 422 | `The business id field is required when provider type is business.` |
| 422 | `The business id must be omitted when provider type is individual.` |
| 422 | `The selected subcategory does not belong to the selected category.` |
| 422 | `The selected subcategory is not assigned to the selected business.` |
| 422 | `The selected business does not belong to the authenticated provider.` |
| 422 | `Please add a default address with a valid country before creating an individual service.` |
| 422 | `Currency is not configured for the selected country.` |
| 404 | `Service category not found.` |
| 404 | `Service subcategory not found.` |

### Create/update information

| HTTP | Example message |
|---:|---|
| 422 | `The fulfillment type ids field must be an array.` |
| 422 | `Please select at least one fulfillment type.` |
| 422 | `One or more selected fulfillment types are not allowed for this service.` |
| 422 | `The service radius field is required for the selected fulfillment types.` |
| 422 | `The service radius unit field is required for the selected fulfillment types.` |
| 422 | `Please add a default provider address before saving a service with the selected fulfillment types.` |
| 422 | `The address id field must not be submitted. The backend uses the provider default address automatically.` |
| 422 | `Your provider profile must be verified before creating an individual service.` |
| 422 | `The selected price unit is not allowed for the selected subcategory.` |
| 422 | `The selected currency is not allowed for this service context.` |
| 422 | `Unknown dynamic answer field: <key>.` |
| 422 | `The <label> field is required.` |
| 422 | `The <label> contains an invalid selection.` |
| 422 | `The <Other label> field is required when Other is selected.` |
| 422 | `The dynamic file field <key> is not available in the resolved template.` |
| 422 | `Each dynamic file requires a matching dynamic field key.` |
| 422 | `At least one portfolio image is required.` |
| 422 | `Portfolio images cannot exceed 10...` |
| 422 | `Certificate files cannot exceed 10...` |
| 422 | `Booking policy is server-derived. Submit the business-facing service fields instead.` |
| 422 | `The service listing is not commercially publishable.` with `data.type=commercial_publishability` |
| 422 | `Pending review services cannot be paused or resumed.` |
| 404 | `Service not found.` |

Form Request validation returns only the first error message in the standard error envelope. Frontend should display `message` and keep the form state intact.

## 27. Frontend Implementation Checklist

- Fetch the template after category/subcategory/context selection.
- Use runtime IDs; never hard-code example IDs.
- Render fields in returned order.
- Use `label`, `placeholder`, `help_text`, options, and validation from the response.
- Route values strictly through `submit_as`.
- Evaluate conditions with fulfillment `code`, not option ID or label.
- Send `fulfillment_type_ids[]` as an actual multipart array.
- Send `answers_json` as one valid JSON object string.
- Keep generic fields out of request `answers_json`.
- Keep newly uploaded dynamic files out of request `answers_json`.
- Pair every `dynamic_file_keys[n]` with `dynamic_files[n]`.
- Repeat a dynamic field key when uploading multiple files for that field.
- Use one `certificate_description` for all `certificate_files[]`.
- Never submit `address_id`; ensure a default provider address exists when required.
- Submit radius number and unit separately.
- Use only price units returned by the selected template.
- Submit the final currency code; do not persist/send the Charge in USD toggle as business data.
- Submit the accuracy acknowledgement as top-level `true` on create only. Do not send it on information update or candidate save.
- On a full edit, render `candidate_template` and save with `POST /services/{id}/candidate` and `answers_mode=replace`.
- Send `profile_pricing_scope` only when the capability state is required or optional.
- Send `price_unit_id` for quote-required services too.
- When `data.type` is `commercial_publishability`, show `data.errors` on the matching fields.
- Do not send category, subcategory, provider/business, or pricing fields to the information update endpoint.
- Preserve existing file IDs/URLs for edit display; use supported deletion endpoints rather than rewriting stored paths.
- Re-fetch or use the template returned by the information response instead of maintaining a duplicate frontend schema.

## 28. Maintenance Rule

The database template and resolved API response are the runtime source of truth. When fields/options change, update the template seeder, validation/service behavior, Swagger, focused tests, and this guide together. Do not add category-specific request conditionals directly to controllers or frontend code when the same behavior belongs in template configuration.

---

# Part F: Service Provider Home

## 29. Endpoint

```http
GET /api/v1/service-provider/home
```

No query parameters. One call fills the home screen. `404` means the authenticated user has no non-deleted provider profile.

```json
{
  "status": "Success",
  "message": "Provider home retrieved successfully.",
  "data": {
    "my_services": {"total": 0, "items": []},
    "provider_promotions": {"items": []},
    "new_requests": {"total": 0, "items": []}
  },
  "meta": []
}
```

Empty arrays are a successful empty state. Do not treat them as an error.

## 30. Home Blocks

| Block | Logic |
|---|---|
| `my_services.total` | Count of the provider's non-deleted listings. |
| `my_services.items` | Preview only. At most 8, newest by id. If `total` is greater than `items.length`, the row is a preview and the full list is `GET /services`. |
| `provider_promotions.items` | Banners for the provider default address. At most 10. |
| `new_requests.total` | Count of pending request cards. |
| `new_requests.items` | Preview only. At most 8, newest by `invited_at`. If `total` is greater than `items.length`, open `GET /requests`. |

Each service preview item has `service_id`, `title`, `portfolio`, `rating`, `price`, `service_unit`, and `service_ownership`. Open it with `GET /services/{service_id}`. `portfolio` null means there is no cover image.

Promotions are empty when the provider has no default address, the default address has no country, or no active banner matches that country and the current date window. State and city narrow the match when the address has them. Do not call a second API to explain an empty banner list. A promotion item has `promotion_id`, `title`, `banner_url`, `is_forever`, `start_date`, and `end_date`.

## 31. Request Card

Home `new_requests.items` and `GET /requests` `data[]` are the same card. Use `invitation_id` for every next screen. Do not put `request_id` in those paths.

| Field | UI |
|---|---|
| `invitation_status_label`, `request_status_label` | Badges. Use the label fields. Do not invent a label from the raw status. |
| `customer.client_type` | `new` or `repeat`. The server already decided this. |
| `customer.profile_image_url` | Photo. Null means show initials. |
| `customer.address` | One line. Hide it when null. |
| `service_ownership.type` | `business` shows `business_name`. `individual` does not. |
| `schedule` | Hide the schedule block when null. `end_time` may also be null on a single-window service. |
| `submitted_at`, `invited_at`, `expires_at` | ISO timestamps. `expires_at` is the request expiry. The list already excludes closed requests, so do not hide a card only because this date is near. |

Card navigation from `invitation_id`:

```text
GET /requests/{invitation_id}/chat-context
GET /requests/{invitation_id}/summary
GET /requests/{invitation_id}/details
GET /chats/{invitation_id}
```

---

# Part G: Service Provider Requests

## 32. List

```http
GET /api/v1/service-provider/requests?page=1&per_page=10
```

This is the full Requests screen. It is not every invitation the provider has ever received.

A row is included only when the invitation status is pending and the parent request is not confirmed, cancelled, or expired. Sort is `invited_at` descending, then id descending.

| Query | Default | Rules |
|---|---|---|
| `page` | 1 | Integer, 1 or greater. Invalid values return `422`. |
| `per_page` | 10 | Integer 1-50. |

`meta.total` equals home `new_requests.total` for the same provider at the same moment. `data` is the card array from section 31. `data: []` with `meta.total` 0 is the empty state.

## 33. Summary

```http
GET /api/v1/service-provider/requests/{invitation_id}/summary
```

No query parameters. `404` means this provider does not own that invitation.

Stable keys: `invitation_id`, `request_id`, `request_number`, `invitation_status`, `invitation_status_label`, `request_status`, `request_status_label`, `header`, `schedule`, `request_info`, `pricing`, `service_ownership`.

`header.subtitle` is ready to show. `schedule.drop_off` and `schedule.pick_up` are expanded labels. `pick_up` is null for a single-window service.

`request_info` has three shapes. Branch on the row. Do not branch on the category name.

| Case | `title` | `items[]` | Next screen |
|---|---|---|---|
| Profile-based | `Request info (N)` | N rows. Each has `profile_id`, `name`, `summary_line`. | `GET /requests/{invitation_id}/details?profile_id={profile_id}` |
| Booking-only | `Request details` | One row. No `profile_id`. `name` is `Request details`. | `GET /requests/{invitation_id}/details` |
| Empty | `Request info` | `[]`, `count` 0, `has_detail` false. | Do not open details. |

Pricing is display only. Show `subtotal_label`, `service_fee_label`, tip fields when present, and `expected_earning`. Do not recalculate the platform fee.

## 34. Details

```http
GET /api/v1/service-provider/requests/{invitation_id}/details
GET /api/v1/service-provider/requests/{invitation_id}/details?profile_id=9
```

| Query | Effect |
|---|---|
| omitted `profile_id` | `profiles[]` contains every profile on the request. |
| `profile_id` | `profiles[]` contains only that profile. `404` if that profile is not on this request. |

`sections[]` is booking-level detail. It does not shrink when `profile_id` is set.

| Case | `title` | `profiles[]` | `sections[]` |
|---|---|---|---|
| Profile request, no filter | `Request info (N)` | N profile blocks | Booking groups, which may be empty |
| Profile request, filtered | `Request info (1)` | One profile | Same booking groups |
| Booking-only | `Request details` | Empty array | Booking groups from the template answers |

Each profile block has `profile_id`, `name`, `profile_type`, and `sections`. Pet, dog, and cat profiles can contain About, Socialization, and Care. Empty sections are omitted. Other profile types use a Details section. Render `about`, `fields` as label/value rows, and `lines`. Do not expect consent groups, acknowledgement checkboxes, or the generic seeker note. Those are not returned to the provider.

## 35. Chat Header Context

```http
GET /api/v1/service-provider/requests/{invitation_id}/chat-context
```

This is the short customer and service header for the chat screen. It is not the message list. The message list is Part H, using the same `invitation_id`.

The payload includes `invitation_id`, `request_id`, `request_number`, `customer`, and `service` with `service_id`, `title`, and `portfolio`.

---

# Part H: Service Provider Chats

## 36. Inbox

```http
GET /api/v1/service-provider/chats?page=1&per_page=20
GET /api/v1/service-provider/chats?q=jane
GET /api/v1/service-provider/chats/unread-count
```

The inbox lists invitations for this provider, including invitations with zero chat messages. It does not filter by request status or invitation status. A pending request and an older request can both appear here. Requests that are cancelled or expired can still be opened. Sending is controlled separately by `can_send`.

| Query | Default | Rules |
|---|---|---|
| `page` | 1 | Integer, 1 or greater. |
| `per_page` | 20 | Integer 1-50. |
| `q` | omitted | Search customer name or service title. Omit it for the full inbox. |

Each row:

| Field | Logic |
|---|---|
| `invitation_id` | Open `GET /chats/{invitation_id}`. |
| `name`, `profile_image_url` | The customer. |
| `service_title` | Listing title. Null when the service has no stored title. |
| `last_message` | Latest message body. If that body is empty, the original request text. If both are empty, null. Show "No messages yet" when null. |
| `last_message_time` | Already formatted in the provider timezone. Today is a time such as `9:41 AM`. An older message is `September 15 at 9:41 AM`. Null when there is no stored message. |
| `unread_count` | Unread messages on this one invitation. |

`GET /chats/unread-count` returns only `unread_total`. That number is how many invitations have at least one unread customer message. Five unread messages on one invitation count as 1. Use it for the tab badge. Do not add `unread_count` across one inbox page and call that the badge. One page is not the full inbox.

## 37. Thread

```http
GET /api/v1/service-provider/chats/{invitation_id}?page=1&per_page=10
```

`per_page` default is 10. Maximum is 100.

Page 1 is the newest messages. `meta.last_page` is the oldest page. Open the thread on page 1. Scroll up by requesting the next page and placing those messages above the ones already shown. Inside one page the messages are oldest to newest.

The original service request is not a stored chat row and it is not included in `meta.total`. The API adds it only when `current_page` equals `meta.last_page`. That added message has `kind` `request`, `sender_role` `customer`, the request text, the images the customer uploaded on the request as attachments, and a `summary` with date, start time, end time, price, and total. If the whole thread fits on page 1, that opening message is first when the screen opens. Do not also invent it on newer pages.

Opening the thread marks inbound customer messages read. Refresh inbox unread state after a successful thread load.

`data.can_send` controls the composer.

| `can_send` | UI |
|---|---|
| true | Show the composer. Sending does not change request status or invitation status. |
| false | Hide the composer. The parent request is cancelled or expired. |

`404` means the invitation is not owned by this provider.

## 38. Send A Message

```http
POST /api/v1/service-provider/chats/{invitation_id}/messages
```

Success is HTTP `201`.

Text only can be JSON. Any attachment must be `multipart/form-data`.

| Case | Request |
|---|---|
| Text only | `body` required, maximum 4000 characters. Do not send `source`. |
| Camera | `source=camera` and one image. |
| Gallery | `source=gallery`, up to 3 images and 1 video. |
| File | `source=file`, up to 2 documents. |

One message uses one `source`. Images are jpeg, png, webp, or gif, maximum 10 MB. Videos are mp4, mov, or webm, maximum 100 MB. Documents are pdf, txt, doc, docx, or zip, maximum 25 MB. Attachment `url` in the response is a relative `/storage` path.

`422` leaves the composer open. The same error envelope covers a closed conversation, an empty message, an unsupported file, a file that is too large, and too many attachments. Show `message`.

---

# Part I: Service Provider Services List, Status, and Delete

Create, information, pricing, and candidate saves stay in Parts A through D2. This part is the list and the actions around a saved service.

## 39. Category Pickers

```http
GET /api/v1/service-provider/services/categories
GET /api/v1/service-provider/services/categories/{categoryId}/subcategories
```

Use these before `GET /service-form-template`. For a business provider, the subcategory list is limited to subcategories assigned to the selected business. After create, category and subcategory are read-only:

```http
GET /api/v1/service-provider/services/{id}/category
```

`is_editable` is false. `capability.is_alias` true means the form owner differs from the selected subcategory. Still show the selected names. There is no category update endpoint. Another category means a new service.

## 40. My Services List

```http
GET /api/v1/service-provider/services?tab=all&page=1&per_page=15
```

| Query | Values |
|---|---|
| `tab` | `all`, `independent`, or `affiliated`. Default `all`. |
| `status` | Omit for every visible status. Or `active`, `inactive`, `pending_review`. |
| `search` | Title search, maximum 100 characters. |
| `page` | 1 or greater. |
| `per_page` | Default 15, maximum 100. |

`independent` is `provider_type=individual`. `affiliated` is `provider_type=business`.

The row is a card: `service_id`, `category_id`, `category_name`, `subcategory_id`, `subcategory_name`, `title`, `provider_type`, `business_id`, `business_name`, `status`, `status_label`, `capability`, and the first `portfolio`. It does not include description, fulfillment, pricing, certificates, or dynamic answers. Open `GET /services/{id}` for the details screen.

| `status` | `status_label` | UI |
|---|---|---|
| 1 | `active` | Listed and searchable. |
| 0 | `inactive` | Saved, not searchable. |
| 3 | `pending_review` | Waiting for review. |
| 2 | `deleted` | Not returned by this list. |

`capability` on the card is the short form: `version`, `source_key`, `canonical_owner_key`, `is_alias`. The full capability object is on the details response.

## 41. Details and Edit Overview

```http
GET /api/v1/service-provider/services/{id}
GET /api/v1/service-provider/services/{id}/edit
```

Details are read-only and include `provider_listing_capability` and `publishability`. Do not look for `booking_policy` in this payload.

The edit overview is the first Edit Service screen, not the form.

| Field | Logic |
|---|---|
| `search_setting.is_active` | True only when status is 1. |
| `search_setting.can_update` | True only for active and inactive services. Pending review cannot be toggled. |
| `sections[].key` | `category` is not editable. `information` and `pricing` are editable. |
| `service_type` | `individual` is labeled Freelance on this screen. Business includes `business_name`. |

Information editing loads `GET /services/{id}/information` and, for a complete save, uses Part D2. A pricing-only screen uses `GET` and `POST /services/{id}/pricing`.

## 42. Active Toggle

```http
POST /api/v1/service-provider/services/{id}/status
```

No request body. The server reads the stored status and flips it.

| Stored status | Result |
|---|---|
| 1 active | Becomes 0 inactive. |
| 0 inactive | Becomes 1 active, after publishability passes. |
| 3 pending_review | `422`, message `Pending review services cannot be paused or resumed.` Leave the toggle disabled. |

Activating an inactive listing runs the same commercial publishability check as create. Failure is `422` with `data.type=commercial_publishability` and `data.errors`. The service stays inactive. Show each field message.

Success:

```json
{
  "status": "Success",
  "message": "Service status updated successfully.",
  "data": {"service_id": 91, "status": 1, "status_label": "active"},
  "meta": []
}
```

Replace the card status from `data`. A suspended provider receives `403` with `Your provider account is suspended.`

## 43. Delete

```http
GET /api/v1/service-provider/services/delete-reasons
DELETE /api/v1/service-provider/services/{id}
```

Load reasons first. Each reason has `id`, `reason`, and `is_other`.

```json
{
  "reason_ids": [1, 4],
  "other_reason": "Closing this offering for the season."
}
```

`reason_ids` needs at least one id. `other_reason` is required only when a selected reason has `is_other` true. It must be 3-500 characters. Delete sets status 2, stores the reasons, and removes the service from the list. The service row and files remain for history. This is not a hard delete.

---

# Part J: Service Provider Availability

Weekly availability is separate from a single-date override. Saving the weekly schedule replaces the previous weekly days and slots. It does not delete date overrides.

## 44. Load The Screen

```http
GET /api/v1/service-provider/availability/days
GET /api/v1/service-provider/availability/timezones
GET /api/v1/service-provider/availability
```

Days return `id`, `day_name`, and `short_name`. Timezones return `id` and `name`. Submit those ids later. Do not send a timezone name or a weekday name as the id.

`GET /availability` returns `timezone`, `is_available`, `apply_to_all`, top-level `slots`, and `days`.

| Saved shape | How to read it |
|---|---|
| `apply_to_all` true | Shared hours are the top-level `slots`. Selected days identify which weekdays use that shared list. |
| `apply_to_all` false | Top-level `slots` is empty. Read `days[].slots`. |
| No schedule yet | `timezone.id` is null. Start from an empty form. |

## 45. On/Off Switch

```http
POST /api/v1/service-provider/availability/toggle-status
```

No body. The server flips `is_available` and returns the new boolean. Use this for the switch. Use section 46 when the provider changes days or hours. A suspended provider receives `403`.

## 46. Save Weekly Hours

```http
POST /api/v1/service-provider/availability/save
Content-Type: application/json
```

There are two payload shapes. Do not mix them.

`timezone_id` is required and must exist in `ca_timezones`. `is_available` and `apply_to_all` are required booleans. `days` is required and needs at least one day. `day_id` values must exist and must be distinct.

Times are `HH:MM` or `HH:MM:SS`. End time must be later than start time. Two slots on the same day must not overlap. The error message is `Slot timing overlaps with another slot.`

### Same hours for every selected day

`apply_to_all` true. Each day object contains only `day_id`. `slots` is top-level and needs at least one slot. Do not put `slots` inside each day.

```json
{
  "timezone_id": 4,
  "is_available": true,
  "apply_to_all": true,
  "days": [{"day_id": 1}, {"day_id": 2}],
  "slots": [{"start_time": "09:00", "end_time": "17:00"}]
}
```

### Different hours per day

`apply_to_all` false. Do not send top-level `slots`. Every day needs its own `slots` array with at least one slot.

```json
{
  "timezone_id": 4,
  "is_available": true,
  "apply_to_all": false,
  "days": [
    {
      "day_id": 1,
      "slots": [
        {"start_time": "09:00", "end_time": "17:00"},
        {"start_time": "18:00", "end_time": "20:00"}
      ]
    },
    {
      "day_id": 2,
      "slots": [{"start_time": "10:00", "end_time": "15:00"}]
    }
  ]
}
```

`is_available` false stores the provider as not available, but the request still has to contain the days and slots above. The toggle endpoint is the body-less flip. Save is the replacement of the weekly schedule.

Success message: `Availability saved successfully.`

---

# Part K: Service Provider Date Availability

A date override changes one calendar date. It does not rewrite the weekly schedule from Part J.

## 47. Read One Date

```http
GET /api/v1/service-provider/date-availability?date=2026-02-17
```

`date` is required and uses `YYYY-MM-DD`.

| `is_override` | Meaning |
|---|---|
| false | Nothing is saved for this date. Follow the weekly schedule. `is_available` is null and `slots` is empty. |
| true | This date has its own rule. Use `is_available` and `slots`. |

Returned slot times are display strings such as `5:00 PM`. The save request still sends `HH:MM`. `timezone` is the timezone stored on the override. `bookings` is the list to show for that date. An empty `bookings` array means there is nothing else to render.

## 48. Save One Date

```http
POST /api/v1/service-provider/date-availability
Content-Type: application/json
```

| Field | Required | Rules |
|---|---:|---|
| `available_date` | Yes | `YYYY-MM-DD`, today or a future date. |
| `is_available` | Yes | Boolean. |
| `timezone_id` | Yes | Id from `GET /availability/timezones`. |
| `slots` | When available | Required when `is_available` is true. Omit or send `[]` when `is_available` is false. |

When `is_available` is true, at least one slot is required. End time must be later than start time. Slots on that date must not overlap. When `is_available` is false, the date is marked unavailable and slots are cleared.

```json
{
  "available_date": "2026-02-17",
  "is_available": true,
  "timezone_id": 2,
  "slots": [{"start_time": "17:00", "end_time": "18:30"}]
}
```

Saving the same date again replaces that date's override. Other dates and the weekly schedule stay as they were. Success message: `Date availability saved successfully.` A suspended provider receives `403`.

## 49. How The Two Schedules Work Together

1. Load weekly availability for the repeating hours screen.
2. Load one date when the provider opens a calendar day.
3. If that date returns `is_override` false, show the weekly hours for that weekday and label the day as using the weekly schedule.
4. If `is_override` is true and `is_available` is true, show that date's slots instead of the weekly slots.
5. If `is_override` is true and `is_available` is false, show the date as unavailable even when the weekly schedule has hours that weekday.
6. Saving weekly hours does not remove date overrides. Saving a date does not change other weekdays.
