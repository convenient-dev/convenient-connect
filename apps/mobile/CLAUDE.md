# Project instructions

## Backend Integration

1. Use apps/mobile/api-doc.json as the single source of truth for all Laravel backend API specifications.
2. Never modify apps/mobile/api-doc.json.
3. Read apps/mobile/api-doc.json everytime before creating/editing any API related code.
4. Ensure the frontend implementation matches the API contract exactly. Do not assume or invent request or response fields that are not defined in apps/mobile/api-doc.json.
5. If the implementation and the API specification do not match, report the discrepancy.
6. Use apps/mobile/components/ConfirmModal.tsx for all alert. Do not user native alert.

## General approach

1. Read the existing code before making changes.
2. Keep changes small and focused.
3. Do not change unrelated files.
4. Explain any important assumptions.
5. Ask before adding a new dependency.
6. Do not remove existing features unless requested.

## Code style

1. Follow the style already used in the project.
2. Use clear names for variables and functions.
3. Prefer simple code over clever code.
4. Avoid duplicated logic, refactor code when needed.
5. Add comments only when the reason is not clear from the code.

## Safety

1. Never edit environment files containing secrets.
2. Never print API keys, passwords, or tokens.
3. Ask before running destructive commands.
4. Do not run database migrations without approval.
5. Do not use commands such as `rm -rf`, `git reset --hard`, or force push.

## Git

1. Do not commit or push unless explicitly requested.
2. Do not rewrite Git history.
3. Keep generated files out of commits unless required.
