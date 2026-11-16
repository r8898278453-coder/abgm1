# Reporting, agency review and Telegram identity group

17 November2026 IST. This group addresses connected local gaps in P09-01/02/04. Schema remains047/84 tables; next048. No migration, production deployment, live provider check or customer send was performed. Parent counts remain21 validated /34 in progress /37 planned /1 blocked.

## Versioned frozen reports

New report captures explicitly persist coverage version2, including the eight capture-activity and four capture-backlog metrics. V2 has a frozen registry independent of the live report's evolving keys. Existing version1 payloads, hashes, stable retry keys, lineage and CSV remain readable with their original coverage. Retrying an old request or preserving an existing baseline returns its original version; it does not upgrade, regenerate or rewrite it. A later explicit amendment may use V2.

Stored payload hashing/canonicalization dispatches by the stored version. Unsupported versions and incomplete new metrics refuse detail/export. CSV records the actual coverage version. The UI renders the selected version's labels and limits comparisons to matching versions. Cross-version comparisons refuse instead of interpreting absent older counters as zero. Existing per-date/client limits, current authorization, append-only lineage and atomic queue/run/snapshot settlement remain canonical.

Owners: shared/reportSnapshotSchemaV2.ts, shared/reportSnapshotCoverage.ts, existing reportSnapshots service/contracts and ReportSnapshotPanel. Migration046's version column already supports this; historical migration sources are unchanged.

## Agency capture exceptions

The bounded, authorized agency overview is modelVersion3 with fourteen required metrics. Four new current categories are retained failed capture runs (weight2), pending queue-reconciliation cases (weight3), pending captures (weight0) and enabled schedules whose actor lacks current manage permission (weight3). Existing client/read authorization remains canonical; no per-client permission query loop or new store was added.

The projection binds queue identity to client/job/type, checks current user/admin/membership/assignment data and limits the agency response to existing authorized-client bounds. Archived clients and retained failures are explicit current metadata, not selected-day business failures. Categories overlap; the weighted score is a transparent review order, not unique incidents or permission to retry/send. UI/filter/CSV consume all fourteen keys and reject obsolete model2/incomplete coverage.

Owners: existing salesWorkspace readAgencySalesOverview, shared/agencyExceptions and AgencySalesExceptions.

## Telegram identity evidence

Managers can explicitly verify the saved connected Telegram bot via bounded getMe. This operation sends no message and does not prove destination reachability or recipient delivery. Normal configuration reads never call the provider. Provider responses require the expected numeric bot identity, is_bot=true, bounded JSON, no redirect and a five-second deadline; errors are redacted.

An audited admission enforces a sixty-second client cooldown before I/O. Verification rechecks current actor authority, current saved credentials/destination/config binding and the admitted check after provider I/O before storing proof. Successful evidence expires after ten minutes and is read only when bound to the current configuration and a currently authorized actor. A newer unsuccessful check supersedes older proof. This is a recent identity observation, not continuous online/health status or permission to send. No token, destination or provider raw response is returned in proof; username/bot ID and checked/expiry metadata are visible.

The scoped verification route accepts an empty object and requires manage access. The operations console exposes explicit verification/reload, uncertainty feedback, expiry labels and client/session fences. Existing manual messaging authorization/journal and stop controls remain separate.

Owners: server/telegramIdentity.ts, shared/telegramIdentity.ts, existing Telegram operations route/contracts/UI. Evidence uses the existing agency audit journal; no duplicate identity table or scheduler is introduced.

## Recovery consistency

Pending capture runs with missing, FAILED, CANCELLED or already-SUCCEEDED queue jobs are reconciled promptly. Recovery preserves completed job/result evidence, records a terminal failed run/audit, and does not recapture or readmit that date. Both initial candidate scan and company-locked recheck use the same terminal-state set. Audit failure rolls the change back; repeated recovery does not duplicate terminal evidence.

## Validation and remaining work

See evidence/operations-completion-group.json for actual completed checks. Native tests cover V2 storage, legacy V1 replay/amendment coexistence, same-version comparison, role/config drift, audit rollback, cooldown, expiry, agency scope and recovery consistency. Browser suites cover the versioned report UI, agency review and Telegram operations without real provider traffic.

All remaining work is not complete. Seventy-two of93 parent tasks are still unvalidated; generated STATUS.md lists each. The highest next packages are explicit scoped scheduled report delivery/content/destination binding and critical alerts (P09-03); complete workflow reconciliation; retention/export/deletion/key recovery; mobile/accessibility acceptance; and a reviewable canary/release package. Hostinger runtime/cron/backup verification and real configured-provider pilots require separate evidence. These prerequisites cannot be replaced with mocked tests. Billing remains excluded; rendering and automatic customer messaging are not activated.
