# Copied SQL restore rehearsal — 11 November 2026 IST

Current security/policy checkpoint (12 November2026 IST): [SECURITY_POLICY_GROUP.md](SECURITY_POLICY_GROUP.md) records035/63 (next036), opt-in cookie/epoch security, canonical aliases, PKCE/refresh groundwork and client goals/shared admissions. P02-05/P02-06/P04-05 are locally accepted; seven other targets remain partial. Historical001–034 unchanged; no phase, provider activation or deployment accepted. Older schema/status notes below describe earlier checkpoints; STATUS.md is current.

Current local acceptance (12 November2026 IST): [ACCEPTANCE_TEN.md](ACCEPTANCE_TEN.md) accepts the original criteria for P02-01, P03-01/04/06 and P04-01/02/03/04/07/08 after the complete13-step matrix. These decisions supersede older in-progress notes for those tasks only. Schema034/60 unchanged. Full phase/hosting/provider/production gates and explicitly separate extension limits remain open; generated STATUS.md is current.

Current grouped-delivery checkpoint:034_agency_security_foundation /60 tables, next035;001–033 unchanged. Eleven linked work packages are in progress with exact scope/compatibility/limits in BATCH_10_AGENCY_SECURITY.md; STATUS.md gives current counts. Earlier schema totals below are historical. No production action.


This is a local compatibility rehearsal, not a production rollback or disaster-recovery acceptance. The uploaded export stays outside the repository. Never commit SQL dumps, row hashes, credentials or customer records to evidence.

Latest continuation verifies033_structured_knowledge_facts (52 canonical tables). The unchanged uploaded export reaches READY, preserves all original business rows/five ledger identities and source/bundled replay applies0. Evidence: [structured-knowledge-facts.json](evidence/structured-knowledge-facts.json). This is a disposable-copy rehearsal, not live disaster-recovery acceptance. Earlier029/028 notes retain their historical scope.

Previous continuation additionally verified029_public_lead_intakes (50 canonical tables). The same unchanged export reaches READY, preserves all original business rows and5 ledger identities, and source/bundled replay applies0. See [public-inquiry-recovery.json](evidence/public-inquiry-recovery.json). Earlier028 observations below retain their original evidence scope; this remains a disposable-copy rehearsal rather than a live restore.

## Run the copied-export check

Use the pinned Node environment and installed dependencies. Docker must be available on the local UNIX socket. Supply a local UTF-8 phpMyAdmin SQL export explicitly:

```sh
npm run test:sql:restore -- '/absolute/path/export.sql'
```

The shared runner creates a unique disposable MariaDB10.11 container, publishes only a random loopback port, verifies its hostname and removes the container in finally. Docker remote selectors are cleared. Child processes exclude inherited production database/provider/admin/encryption credentials. No .env file, app server, scheduler, provider transport or live database is used. Import runs under a unique user granted privileges only on its disposable database; it has no global, FILE, account-management, routine, event or trigger privileges.

The narrow reader supports the observed SET/START TRANSACTION/CREATE TABLE/INSERT VALUES/ALTER TABLE/COMMIT export. It preserves quoted data and rejects cross-database names, client commands, privilege/file/query/routine statements, malformed input and exports over32MiB. Comments are discarded; versioned comments are accepted only as discarded SETs. Unsupported exports require a separately reviewed local import path; do not relax the guard to make production SQL execute. This reader is not a general SQL security boundary; loopback container isolation and database-scoped grants remain essential.

Checks import the original schema, capture multiset digests of every original business-table row using its original columns, preserve original ledger name/checksum pairs, apply pending canonical migrations, repeat with zero applied migrations and require READY. A separate fresh database supplies canonical column coverage. An independently bundled migrator then replays the copied ledger with zero applied migrations and READY (migration-lock/infrastructure bookkeeping still occurs). Synthetic canonical action/review writes are rolled back, and original business-row digests are rechecked. Only metadata and booleans are reported; raw DB errors, SQL bodies and row values are excluded. Technical migration ledger/lock bookkeeping is excluded from business-row comparisons.

## Observed export and repair

Evidence: [copied-export-restore.json](evidence/copied-export-restore.json). Export SHA256: `7d494bda5f71b539bfd3ae6c6c02bce14503398d23aac1a96949edb99d04758a`;40,265 bytes;31 imported tables;5 recorded migrations. Source identities001–005 match without ledger edits. The initial upgrade through027 still required schema repair.

Forward028 adds9 missing autonomous action fields and4 review provenance/reply fields. Old actions default to pending approval, idle and unverified; no old display status is translated into execution permission or provider proof. Existing review text/reply flags are preserved; missing provenance defaults to USER_ENTERED, never verified. Legacy type/title/description become optional after exact-type preflight, preserving existing values while allowing canonical action inserts. Unsupported required legacy types stop before DDL. Missing leading indexes are added while equivalent operator indexes are reused; conflicting index names stop for manual review. No old table or column is dropped, no existing action/review is replayed, and migrations001–027 are unchanged.

The copied export reaches READY through028, keeps all original business rows and5 ledger identities, and reruns source/bundled migration with0 applied. Canonical coverage is49 tables. Extra historical tables/columns and compatible legacy nullability/types are deliberately retained: this does not establish byte-identical schema parity with a fresh database. Separate synthetic fresh and005-upgrade schemas do have exact column/default/type/index/constraint parity through028.

## Migration identity and failure handling

Keep historical identities unchanged. Existing production builds embed the source-computed identity map before bundling, and unknown bundled identities fail closed. Historical forward modules001–029 are frozen; new030+ definitions must use the immutable SQL manifest factory and versioned executor. See MIGRATIONS.md for the exact contract. Build and source/bundle compatibility checks remain mandatory. This preserves compiled compatibility; source execution still uses function serialization and the pinned toolchain. That historical design gate is now locally closed by the030+ immutable SQL manifest strategy in MIGRATIONS.md. Historical source tooling remains intentionally pinned; runtime source-function independence is not retrofitted onto001–029. New ledger validation rejects future/failed/blank/duplicate/gapped evidence, and builds/write CLIs check frozen artifacts. This still does not close live hosting/restore acceptance.

MySQL DDL can commit independently of the migration ledger. On a failed local rehearsal, retain only redacted metadata, fix the forward definition before release, remove the disposable copy and repeat from the unchanged export. Do not reset ledger checksums, automatically retry customer effects or claim transaction rollback reverses ALTER TABLE.

For production, first verify the actual deployed revision/engine, a current restorable backup of DB and private assets, account grants, disk/time limits and maintenance/worker-pause procedure. Rehearse against that current copy; this historical export cannot establish present-day recoverability. A production restore must be tested on an isolated target with row/ownership/file checks before an approved cutover. Its recovery path restores the complete known backup into an isolated target and verifies the matching application version; destructive down migrations are not supplied. Production migration, data replacement, DNS/deploy and resumed customer work remain separate decisions. No production change was performed here.

Latest website provenance rehearsal: uploaded export restores READY through031 with51 canonical tables, original business rows/five historical ledger identities preserved and source/bundle repeat applied0. New provenance columns and restricted application lifecycle pass. No production restore or DDL performed.

Queued-ingestion rehearsal: uploaded export reaches READY through032 with51 tables, original business rows/five historical ledger identities preserved and source/bundled replay applied0. No production data/DDL touched.

Structured-fact rehearsal: unchanged uploaded export reaches033 READY/52 canonical tables, preserves all original business rows and five historical ledger identities, and source/bundled replay applies0. Canonical probe writes roll back. No production DB or provider access.

Grouped agency/security rehearsal through034 reaches READY/60 canonical tables and backfills owner data in new tables while preserving every original business-table row and five ledger identities. Source/bundled replay0; canonical probe writes roll back. No live database restore or DDL occurred.
