# ABGM1 agency marketing and sales platform

Current source and local acceptance are documented in [CAPABILITIES.md](docs/implementation/CAPABILITIES.md) and the [93-task tracker](docs/implementation/STATUS.md). This is a modular client-workspace platform with reviewed marketing, business memory, CRM/sales workflows and accountability features. It is not yet accepted as a fully autonomous production platform.

- [Implementation plan](docs/implementation/MASTER_PLAN.md), [execution evidence](docs/implementation/EXECUTION.md), [remaining work](docs/implementation/DELIVERY_AND_PENDING.md).
- [Review-only release and rollback runbook](docs/implementation/CANARY_RUNBOOK.md).
- [Current public competitor evidence](docs/implementation/COMPETITOR_EVIDENCE_CURRENT.md).

Fixed display/scheduling timezone: Asia/Kolkata (IST). Billing is excluded. Rendering and exact external sales sending retain default-off gates. Stored credentials, Place IDs, DNS observations and local/mock tests do not establish live provider, hosting, TLS, delivery or business-result acceptance.

Local workflow: `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run frontend:check`. Update/check generated status with `npm run docs:status`, `npm run docs:check`, `npm run docs:capabilities`, `npm run docs:capabilities:check`. Never use a production database for disposable tests. Configuration names and protected production steps are in the runbook and .env.example; actual values remain private.

Old root acceptance reports have been superseded and preserved under docs/history. They cannot authorize deployment or turn unfinished tasks into completed work.
