# Current project status and operations

19 November2026 IST. The previous contents of this document are historical and superseded. They do not establish production readiness, live provider access, completed tasks or deployment authorization.

- [Current capability evidence](docs/implementation/CAPABILITIES.md): implemented scope, reviewed/off/unverified activation and remaining prerequisites.
- [Original 93-task tracker](docs/implementation/STATUS.md) and [source tracker](docs/implementation/TASKS.csv).
- [Current execution evidence](docs/implementation/EXECUTION.md).
- [Review-only canary and rollback runbook](docs/implementation/CANARY_RUNBOOK.md).
- [Preserved historical text](docs/history/MIGRATIONS.md).

Current source schema is 063_sales_email_receipts with 107 canonical tables. Fixed IST (Asia/Kolkata). Billing excluded; rendering and exact external sales sending require their existing default-off gates. No current production acceptance is claimed. Shared-hosting branding is not proof of Node/worker/cron/render support.

Useful local commands: `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run docs:status`, `npm run docs:check`, `npm run docs:capabilities`, `npm run docs:capabilities:check`, `npm run frontend:check`. `db:status`, `db:verify` and `deploy:validate` inspect the configured database; run only against the intended authorized environment. They do not authorize `db:migrate`, a restore, provider sends or deployment.
