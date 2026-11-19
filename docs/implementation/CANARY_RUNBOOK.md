# Review-only canary release runbook

20 November2026 IST: Developer rollout requires a new reviewed055/101 staging/canary package, backup/key-recovery proof and explicit DEVELOPER_WEBHOOKS_ENABLED configuration if delivery is desired. This flag remains unchanged/off. Verify receiver raw-body HMAC, clock tolerance and durable (company,event) dedupe before activation. Old binaries may reject055 ledger; additive schema is not a rollback guarantee. No production rollout executed.

19 November2026 IST: CRM rollout requires a fresh reviewed forward054/97-table staging/canary package and backup/restore/key evidence. Older binaries may reject the newer migration ledger; additive DDL alone does not establish rollback compatibility. Production rollout has not occurred.

19 November 2026 IST. This document prepares a reviewable package. It does not approve or execute deployment, database migration, provider sends, DNS/SSL changes or rollback.

## Build and prepare

1. Review current CAPABILITIES.md, STATUS.md, TASKS.csv and EXECUTION.md. Original tasks, local acceptance and production activation are separate. Billing remains excluded; reel rendering and exact sales sends retain their default-off controls.
2. Commit reviewed source and documents on the existing review branch. A clean tree is required; never copy environment files, uploads, SQL exports, customer assets or node_modules into a source review package.
3. Run `npm ci`, `npm run lint`, `npm run docs:check`, `npm run docs:capabilities:check`, `npm run routes:check`, `npm test`, appropriate disposable SQL/browser checks, `npm run build` and `npm run frontend:check` using isolated test configuration. Build creates dist/build-provenance.json; a dirty build cannot be packaged as an exact clean revision.
4. Prepare outside the repository: `npm run release:prepare -- --base origin/main --out /tmp/abgm1-canary-review`. The base must exist locally. Choose the actual reviewed comparison reference; origin/main is only a source comparison and does not establish what Hostinger runs.
5. Review manifest.json, source-review.patch, artifact SHA-256/size list, build provenance and this runbook. Changed artifacts, source changes after build, stale capability documentation, symlinked artifacts or an existing output directory refuse preparation. The allowlist includes package.json/package-lock.json, compiled client/server/workers and server source map; it excludes private runtime data. Keep this operator package private.

## Required evidence before execution

Record the actual hosted revision, Node/npm/database versions, application start method, cron/process limits, worker availability, storage/private asset placement, backup/restore process and staging access. Shared hosting plan branding is not proof of Node/process/render support. P00-02 remains an actual evidence gate until inspected.

Read the deployed schema ledger with `npm run db:status` and `npm run db:verify` against the correct authorized environment; these are not migration commands. Back up the current database and private assets and rehearse restore in isolated staging. Never import a user export or run `db:migrate` against production merely to prepare this package.

Compare every pending forward migration and API/client/worker contract. Current source targets 053_calendar_plans/93 canonical tables. Existing historical checksums are immutable. Obtain a tested previous artifact/runtime package and demonstrate compatibility with the resulting schema; do not assume an old binary works with a newer database. Keep credentials in the host's private environment, outside the package, and verify configured key recovery without printing secrets.

Verify supported Google/Meta/WhatsApp/email/calendar capabilities individually with authorized test identities. Places configuration, DNS resolution, stored credentials, model tests and provider API acceptance do not establish OAuth access, SSL provisioning, delivery or completed sales. Unsupported optional channels stay disabled. Do not turn on all flags to make the platform appear complete.

## Separately authorized canary and observation

Only after concrete approval and prerequisites, deploy matching client/server/workers for one isolated client using the host's verified release mechanism. Preserve private assets/suppression and the previous immutable artifacts. Run only reviewed forward migrations with a recoverable backup. Start through the recorded supported runtime, never by inventing shared-host daemon/cron commands.

Check authentication/current-role isolation, an empty client, database readiness, queue recovery, current approvals, one authorized provider flow if enabled, truthful UNKNOWN/no-resend behavior, audit/report reconciliation, errors, latency and resource limits. Observe the actual provider and customer outcomes; an HTTP 200 is not a successful campaign or sale. Expansion is a separate decision.

## Rollback decision and operations

Stop new affected admissions using the existing authorized scoped/global controls. Preserve UNKNOWN claims and do not retry unconfirmed provider effects. Restore the tested previous client/server/worker artifact set only if its compatibility with the current database was proven. Recheck current schema/session/suppression and queue state before reopening admissions.

A database restore is a distinct, potentially destructive recovery operation: require approval, verify the backup, preserve/reconcile later suppression, opt-outs, provider receipts and dispatch intents, and follow the rehearsed host-specific restore commands. Do not execute a guessed mysql import or reverse migration. Record rollback reason, exact artifact/database revisions and observed results. Missing previous artifacts, host commands or restore compatibility keeps execution blocked; preparation never fills those facts with assumptions.

Configuration names (values stay private): `PUBLIC_APP_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `AUTH_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`; optional bounded JSON `CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS`. Keep `ENABLE_REEL_RENDERING=false` and `ENABLE_APPROVED_SALES_SEND=false` for preparation. `REEL_BROWSER_EXECUTABLE` and a supported worker are required before separately enabling rendering. Cookie mode additionally requires `AUTH_COOKIE_ENABLED=true`, `VITE_AUTH_SESSION_MODE=cookie` and verified canonical HTTPS/proxy behavior; it is not enabled by building a package.

Artifact/provenance hashes detect accidental drift; this is not a signed CI attestation and cannot protect against an operator rewriting artifacts and proof together. Review the trusted build/source process as well as hashes.

Build/inspection commands run from the matching reviewed source checkout, not from the compiled payload directory. The package includes dependency manifests for the runtime installation (`npm ci --omit=dev`) and `npm start` (`node dist/server.cjs`); never run build or source-only db scripts in a payload missing their source tools. Read-only database inspection and any separately approved migration use the matching reviewed source tooling. Host-specific process/start/rollback commands still require actual hosting evidence.
