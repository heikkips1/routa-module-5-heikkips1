# Project brain

## What this is

Routa's IT configures its identity platform by asking Claude, through this MCP server. The brief is in `client/brief.md`.

## What we found out

- The admin API applies a PATCH at once and has no preview, so the server keeps its own.
- The API doesn't enforce scope: any valid token can PATCH. `whoami` says what a token is, and the server must refuse.
- `session-length-hours` takes a number, `guest-access` a string, and the `mfa.*` policies true or false.

## Rules that cost us if we break them

- A read-only token never changes a setting.
- Every change is shown before it is applied, and what is applied is what was shown.

## Baseline differences (found in the running test environment)

- `GET /admin/v1/settings` answers a read-only token, so the tool needs a valid token, not an admin one.
- The baseline file lists, per group, the applications it may reach, and the policy values. The platform has the same 14 groups; the baseline's `owner` and `agreed` keys are not settings.
- `tools/baseline-check.ts` already compares the two, but needs the admin token and is not an MCP tool. The tool reads the same file (`client/security-baseline.json`) and changes nothing.
