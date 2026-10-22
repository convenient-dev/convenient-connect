# Template fixtures

Real UAT responses to `GET /service-provider/service-form-template`, stored as the full `{ status, message, data }` envelope. All are for an **individual** provider except where the table says otherwise. Used by `../__checks__/phase1.check.ts`, which unwraps `data`.

| File | Template | Why it is here |
| --- | --- | --- |
| `template-catering.json` | Culinary / Catering | `catering_execution_mode` selector that changes fulfillment but not pricing; guest and item bounds |
| `template-laundry.json` | Sanitation / Laundry | no selector: the fulfillment selection picks the format, and the formats allow different price units |
| `education-tutoring-template.json` | Education / Tutoring | `learner_delivery` selector with a required profile pricing scope for `shared_group`; free-entry subjects; optional CORI dynamic file |
| `personal-holistic-template.json` | Personal / Holistic | min/max participant relation; CORI and business verification dynamic files |
| `personal-dietitian-business-template.json` | Personal / Dietitian, fetched as a **business** provider (`provider_type=business&business_id=10`) | identical fields to the individual response; only `currency_context.provider_type` / `business_id` differ. `business_verification` is gated by `field_key: "provider_type"`, which is never an answer: the engine reads it from form state (wizard identity) and falls back to this currency_context |
| `pet-sitting-template.json` | Pet care / Pet sitting | single `default` format with `fulfillment_by_price_unit`; pricing-driven surcharge |
| `caregiving-seniors-template.json` | Caregiving / Seniors | Other option with a custom text key; yes/no answers |
| `editing-template.json` | Media / Editing | `supported_source_media_types`: a required free-entry multi_select (descriptor `set.mode: open`, `entry: free_entry`, no options) rendered as a typed chip input; one of 14 such fields across the catalogue |
| `misc-interpreters-template.json` | Misc / Interpreters | `supported_language_pairs`: free-entry multi_select whose descriptor set is `relation: directed_pair`, `pair_encoding: source->target`; rendered as a From / To control that encodes `source->target` |
| `misc-movers-template.json` | Misc / Movers (alias of Delivery / Movers) | no `fulfillment_types` field: address and radius rules never hold, no fulfillment step, `fulfillment_type_ids` omitted; one of eight such templates (courier, errands, grocery, movers, mobility, rentals, pet transport) |

Refresh them with `node -r sucrase/register/ts scripts/sweep-templates.ts --save-dir <dir>` (the sweep writes the unwrapped `data`; wrap it to match).

Not covered by any UAT template yet, so the checks tweak a copy in place and say so in the label: a non-USD currency with `can_charge_in_usd`, a required dynamic file, the `on_or_after` relation, and the optional profile pricing scope state.
