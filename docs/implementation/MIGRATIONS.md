# Immutable migration authoring — 10 November 2026 IST

Current security/policy checkpoint (12 November2026 IST): [SECURITY_POLICY_GROUP.md](SECURITY_POLICY_GROUP.md) records035/63 (next036), opt-in cookie/epoch security, canonical aliases, PKCE/refresh groundwork and client goals/shared admissions. P02-05/P02-06/P04-05 are locally accepted; seven other targets remain partial. Historical001–034 unchanged; no phase, provider activation or deployment accepted. Older schema/status notes below describe earlier checkpoints; STATUS.md is current.

Current grouped-delivery checkpoint:034_agency_security_foundation /60 tables, next035;001–033 unchanged. Eleven linked work packages are in progress with exact scope/compatibility/limits in BATCH_10_AGENCY_SECURITY.md; STATUS.md gives current counts. Earlier schema totals below are historical. No production action.


## Current forward extension:033 structured knowledge facts

Schema target033_structured_knowledge_facts /52 canonical tables; next product034. Existing001–032 source/ledger identities unchanged. New fact table supports immutable candidates/current review revisions, minimal audit and source references without a source-delete FK that would silently erase review evidence. Manifest preflight/readiness refuse incompatible existing fact shapes. See KNOWLEDGE_FACTS.md and current STATUS.md. Older checkpoint numbers below retain their dated scope.


P00-05 is locally validated. Current source target is032/51 canonical tables; deployed live schema is unverified.030_private_knowledge_sources is the first real v1 SQL manifest. No production migration has been applied in this continuation. Disposable extension fixtures derive the next registry ID;033 is the next free product ID. See KNOWLEDGE_SOURCES.md for storage/parser and rollout requirements.

## Historical identities001–029

`server/migrations/identities.ts` freezes the existing name/checksum pairs and source selectors. The first five identities also match the supplied SQL export independently. Existing ledger rows are never converted, renamed or rehashed. Definitions001–006 remain in migrator.ts; their exact up-expression source is guarded, while unrelated registry/readiness edits remain possible. Entire007–029 modules are guarded, including imports/helper changes and comments. LF checkout rules avoid accidental platform line-ending conversion. Runtime identity maps and handlers/registry are frozen.

Source execution retains the pinned Node24.19.0/tsx toolchain for historical Function serialization. This is an intentional compatibility bridge, not a claim that legacy serialization became compiler-independent. Production bundles embed the validated legacy identity map before compiler transforms. A changed historical handler, source artifact or identity is rejected rather than silently adopted on a fresh or upgraded database.

Run this metadata-only check from the repository root:

```sh
npm run db:check:sources
```

It reads source/identity metadata and validates the registry; it does not acquire a DB connection, migrate, seed or use customer data. `npm run build` runs it before frontend compilation, and direct buildServer invocation checks again. The standard source db:migrate/db:setup commands check sources and registry before obtaining the DB pool. Their normal database actions still require the separately authorized deployment procedure. Install the pinned development/build dependencies for these source tools; the production server bundle does not require TypeScript/source-parser packages for runtime readiness.

Do not fix a mismatch by updating the frozen checksum/source hash, editing old code to make a desired schema or setting success flags in the ledger. Review the original release/source/backup and repair forward. Keep automated formatters and helper refactors away from historical artifacts.

## Forward030+ data manifests

Define actual future changes with `defineSqlMigration` in manifestV1.ts. There is no callback/checksum escape for a new030+ migration. Example syntax only; choose the real next ID and schema when its implementation task starts:

```ts
import {defineSqlMigration} from './manifestV1';
export const migration = defineSqlMigration({
  name: '033_real_change',
  preflight: [],
  statements: [
    `CREATE TABLE IF NOT EXISTS example_records (
       company_id VARCHAR(64) NOT NULL,
       id VARCHAR(64) NOT NULL,
       PRIMARY KEY(company_id,id),
       CONSTRAINT fk_example_company FOREIGN KEY(company_id) REFERENCES companies(id)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
});
```

Register the returned definition in the existing ordered MIGRATIONS array and add the real readiness contracts/tests in the same batch. Reuse existing canonical owners; this mechanism is not permission to add duplicate business tables.

The checksum hashes a canonical ordered tuple: format/version, immutable executor source digest, name, ordered preflight SQL/error-code pairs and ordered SQL strings. Object property order, Function.toString, minification, closure names and compiler wrappers do not determine forward identities. Whitespace *inside SQL strings* is preserved and significant. Factory snapshots are copied/frozen; modifying the original plan cannot change execution or its checksum. Cloning a definition or supplying a checksum field does not create an accepted manifest. A conflicting embedded build identity fails closed.

All preflights run on one pinned session before the statements list. Each SELECT preflight must return zero rows or throw its declared MIGRATION_* code; raw returned rows are not printed. A pool-owned connection is released on success/failure; a runner-owned connection is retained for the runner. The canonical runner continues to hold the migration lock and write the ledger. SQL is trusted, reviewed repository code: this is not an uploaded-SQL interpreter or a general SQL security sandbox. Review SELECT side effects, engine compatibility, permissions, data scope and DDL behavior explicitly. Do not substitute runtime secrets/tenant input into manifests.

V1 supports ordered SQL and SELECT-row preflights, not arbitrary TypeScript backfills/callbacks. If the required behavior cannot be expressed safely, introduce a separately reviewed versioned executor and its identity/tests. Keep v1 source/hash unchanged once released; never modify it in place to change old semantics. Do not bypass the manifest requirement with a new callback or edit001–029.

## Registry, ledger and operational failure rules

Registry names must be unique, ordered and contiguous. Registry/identity validation occurs before acquiring a migration DB connection. Applied ledger rows must have a valid lowercase SHA256, explicit successful status, no duplicate name, no unknown/future migration and no gap in the applied prefix. Empty/malformed/failed/gapped/ahead evidence blocks migration/readiness; it is never silently skipped. A connected DB with invalid/ahead ledger reports DATABASE_SCHEMA_OUTDATED and preserves connection PASS, rather than falsely implying the DB could not be reached.

Older binaries cannot claim READY against a newer successful ledger. This guards startup/readiness, not already-running old processes; pause workers/traffic and deploy a coherent version through the existing release procedure. Explicit migration infrastructure/lock bookkeeping still occurs on replay; applied0 is not a promise of zero SQL commands. Normal runtime startup remains read-only and never repairs the schema.

MySQL DDL may persist even when a later statement or ledger insertion fails. Authors must make each write statement safely repeatable after partial progress and cover preflight, mid-plan failure, same-plan retry, changed-plan refusal, source/minified execution and schema verification. Do not rely on a transaction rolling back ALTER/CREATE. Backup/maintenance and current copied-data rehearsal remain required before production changes. No down migration, automatic ledger adoption/reset or destructive rollback is supplied.

Evidence: [migration-manifest-and-ledger.json](evidence/migration-manifest-and-ledger.json). Real SQL tests show preflight stops before fixture DDL; a later write failure leaves DDL but no ledger entry; the minified artifact resumes the same plan; replay applies0; changed plans, blank/failed/future ledgers and an old registry refuse acceptance. The unchanged user export still restores/upgrades through029 with original business rows and5 ledger identities preserved.

## Read-only operational status

`npm run db:status` and `npm run db:verify` share the canonical verifier/report owner. They print bounded schema metadata and missing-contract identifiers, exit0 only for consistent READY and close their command-owned pool. Unknown/future/failed/malformed ledger evidence cannot pass merely because tables exist. They provide no100-percent-safe, loss-free-upgrade or production-readiness guarantee. Connection diagnostics omit configured binding values and raw error text; production connection failures remain blocked rather than claim a memory fallback. These are real DB readers when invoked by an operator; only db:check:sources is metadata-only with no connection.

Previous product checkpoint031_website_source_provenance (51 tables), extended by032 below. Adds nullable original URL/fetch-ms to existing knowledge_sources with compatibility preflight and readiness shape checks. Historical001–030 unchanged. Manifest fixtures derive next free ID. Fresh/upgrade/replay and uploaded export restore were verified locally; no production DDL.

Current target032_knowledge_ingestion_queue adds nullable source job/attempt references; table count51 unchanged and next product033. Short/non-null job references and incorrect attempt shapes refuse preflight/readiness; missing partial columns recover idempotently. Historical001–031 are unchanged. Actual queued processing needs coordinated worker/server deployment; no production DDL here.

034 adds eight new InnoDB tables for agencies/members/client mappings/assignments, operating settings/locations, current-token revocations and persistent security windows. It backfills owner mappings and default operating rows using existing company owner IDs without rewriting old business rows. Compatibility preflight/readiness reject missing/short role/ID/revision fields and wrong required index shapes. New company creation extends the same ownership transaction. This does not accept preexisting corrupt ownership mappings: runtime rejects agency-owner/company-owner mismatch. Historical001–033 are unchanged; the next product ID is035 and disposable fixtures derive it dynamically. Uploaded export through034/60 preserves all original rows/five identities and source/bundle replay0. See BATCH_10_AGENCY_SECURITY.md.
