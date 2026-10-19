# Template fixtures

Synthetic templates used by `../__checks__/phase1.check.ts` for features the UAT provider cannot produce:

- `pet-sitting-template.json`: copied verbatim from the `ServiceFormTemplateResponse` example in `api-doc.json`.
- `education-tutoring-template.json`: hand-built from guide sections 8 and 12 (CAD currency with `can_charge_in_usd`, `learner_delivery` business format, Other option with a custom text key, optional CORI).
- `personal-holistic-business-template.json`: hand-built from guide section 14 (exclusive `na`, required CORI and business verification files, USD).

These are not UAT responses and have drifted from them: real Tutoring uses `individual` / `shared_group` (not `group`), `supported_subjects` (not `subjects_taught`), has no Other option and prices in USD. Keep them only for the CAD / Other / business-file paths.

Real UAT responses (full `{ status, message, data }` envelopes) live in `docs/subcategory-form-templates-oct-19/` (Catering, Chef, Laundry, Pet transport) and are imported by the checks directly. Pull more with `scripts/sweep-templates.ts --save-dir <dir>`.
