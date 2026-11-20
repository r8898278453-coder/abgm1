# Current platform capability evidence

Source/local acceptance and production activation are separate. Activation labels describe source defaults/review policy, not an inspection of runtime configuration. Credentials, Place IDs, passing mocks and local validation never prove hosted/provider acceptance.

Original tasks: 93; validated 62, in progress 16, planned 14, blocked 1. Billing excluded. No production acceptance.

| Area | Local acceptance | Activation scope | Remaining prerequisite |
| --- | --- | --- | --- |
| Reliability, architecture and tenant control | partial_or_pending | not_applicable; production unverified | Actual hosting inventory, complete role/stop coverage and phase gates |
| Website/PDF onboarding and approved business memory | partial_or_pending | reviewed; production unverified | OCR capability, approved source facts and remaining consumer coverage |
| Google profile, local SEO and reviews | partial_or_pending | unverified; production unverified | Tenant GBP OAuth scopes/account/location and separately authorized provider acceptance; Places is not OAuth |
| Facebook/Instagram publishing | partial_or_pending | unverified; production unverified | Tenant account permissions, stable public media and verified external outcomes |
| Creative and approved asset library | partial_or_pending | reviewed; production unverified | Current approved assets, source/license and brand/locale strategy |
| Client calendar and approved plans | validated_local | reviewed; production unverified | Approved facts/media and separate publication permission |
| Durable reel rendering | validated_local | off; production unverified | ENABLE_REEL_RENDERING remains opt-in; measured worker/hosting capacity required |
| Campaigns, ads telemetry and portable storefront | validated_local | reviewed; production unverified | External API origin/CORS/form token; DNS evidence does not provision TLS |
| CRM identity, opportunities, inbox and permission | partial_or_pending | reviewed; production unverified | Remaining identity merge, full channel delivery/threading and CRM/channel gate |
| Tenant email sender and reply/bounce channel | partial_or_pending | off; production unverified | Dedicated tenant sender/verification/threading/receipt implementation; platform account mail is separate |
| Grounded qualification and assigned human handoff | validated_local | reviewed; production unverified | Current approved facts/policy and authorized assignee; no invented commitments |
| Versioned workflows and controlled execution | validated_local | reviewed; production unverified | Current approvals/consent/window/stops; exact external sending default off |
| External calendar availability and bookings | partial_or_pending | off; production unverified | Supported calendar adapter, external event IDs, authorized availability and real pilot |
| Fulfillment-gated aftercare and repeat business | validated_local | reviewed; production unverified | Manual genuine fulfillment, consent, interval/cooldown and explicit reviewed enrollment |
| Discovery, enrichment, sequences and optimization | partial_or_pending | off; production unverified | Declared research is not live discovery/enrichment; external adapters/permissions and scoped API gates remain |
| Daily reports, agency overview and client reporting | partial_or_pending | reviewed; production unverified | Current reporting subset; all-module reconciliation and operational/mobile gate remain |
| Security review, measured capacity and release readiness | partial_or_pending | off; production unverified | Production baseline, release/rollback evidence and separate execution authorization |

## Original work packages

| Task | State | Work package |
| --- | --- | --- |
| P00-01 | validated | Inventory source routes schemas callers and live/source drift |
| P00-02 | blocked | Inspect actual hosting and configured capability prerequisites |
| P00-03 | validated | Rebaseline tests and isolate reproducible defect fixtures |
| P00-04 | validated | Pin compatible tools and establish reproducible dependency installation |
| P00-05 | validated | Freeze historical migrations and choose source-independent extension strategy |
| P00-06 | in_progress | Baseline and contract-decision gate |
| P01-01 | validated | Repair health routing and redact sensitive logs |
| P01-02 | validated | Repair workspace-switch stale state and pending writes |
| P01-03 | validated | Validate queue payloads and bind every resource to job tenant |
| P01-04 | validated | Implement real SQL claim leases fencing and bounded retries |
| P01-05 | in_progress | Make provider and persistence outcomes truthful |
| P01-06 | in_progress | Introduce transactional action ledger outbox and replayable event intake |
| P01-07 | validated | Unify cron dispatcher and overdue-work catch-up |
| P01-08 | in_progress | Persist scoped stops usage reservations and execution policy |
| P01-09 | validated | Remove confirmed simulated success and unsupported capability badges |
| P01-10 | planned | Reliability and isolation gate |
| P02-01 | validated | Freeze shared contracts and route compatibility map |
| P02-02 | in_progress | Extract route modules and database seams mechanically |
| P02-03 | in_progress | Extract workspace state request transport and typed feature clients |
| P02-04 | validated | Make forward migrations the sole schema authority |
| P02-05 | validated | Implement session revocation CSRF and persistent limit policy |
| P02-06 | validated | Create canonical integration registry and legacy alias mapping |
| P02-07 | in_progress | Implement reusable OAuth lifecycle and safe network primitives |
| P02-08 | planned | Canonical architecture compatibility gate |
| P03-01 | validated | Add agency memberships and backfill existing owners |
| P03-02 | in_progress | Apply canonical RBAC to every tenant operation |
| P03-03 | validated | Persist locations geography locale and client lifecycle under fixed IST policy |
| P03-04 | validated | Replace local agency branch UI and establish scoped app shell |
| P03-05 | validated | Define capability packs goals and operational limits |
| P03-06 | validated | Secure PWA and client browser storage boundaries |
| P03-07 | validated | Agency and client isolation gate |
| P04-01 | validated | Implement private source storage and truthful ingestion runs |
| P04-02 | validated | Implement bounded website importer and extracted fact provenance |
| P04-03 | validated | Implement PDF TXT Markdown DOCX extraction and OCR gate |
| P04-04 | validated | Build approved facts FAQs revisions and conflict review |
| P04-05 | validated | Implement tenant-scoped retrieval and AI grounding contracts |
| P04-06 | in_progress | Connect review content chat and sales draft consumers to shared knowledge |
| P04-07 | validated | Replace onboarding and knowledge picker with resumable real workflow |
| P04-08 | validated | Migrate legacy knowledge JSON and preserve user-entered content |
| P04-09 | validated | Business memory and onboarding gate |
| P05-01 | in_progress | Complete authorized Google account and location connection |
| P05-02 | validated | Make local profile audit and growth scoring evidence-based |
| P05-03 | validated | Harden keyword research rank grids and competitor refresh |
| P05-04 | in_progress | Unify Google review save publish verify and reminders |
| P05-05 | planned | Complete canonical GBP post and media dispatch |
| P05-06 | planned | Consolidate Meta publishing and per-platform idempotency |
| P05-07 | in_progress | Build client-specific creative and approved asset library |
| P05-08 | validated | Replace fixed calendar with current client plan and approval lifecycle |
| P05-09 | validated | Move reel state into durable jobs with resource limits |
| P05-10 | validated | Harden campaign linking ads telemetry and portable storefront capture |
| P05-11 | validated | Marketing parity and publication gate |
| P06-01 | validated | Extend canonical lead identity channels opportunities and touchpoints |
| P06-02 | validated | Implement durable batched webhook intake and event replay |
| P06-03 | validated | Implement message dispatch and real delivery states |
| P06-04 | in_progress | Add tenant email sender and reply/bounce integration |
| P06-05 | validated | Implement contact permission suppression and sending eligibility |
| P06-06 | validated | Replace per-message lead creation and build unified client inbox |
| P06-07 | validated | Add opportunity stage outcome and next-action management |
| P06-08 | validated | CRM and channel truth gate |
| P07-01 | validated | Implement grounded qualification and sales handoff |
| P07-02 | validated | Build versioned bounded sales workflow definitions and enrollments |
| P07-03 | validated | Execute workflow steps through existing queue and policy |
| P07-04 | validated | Handle reply opt-out booking and outcome exit races |
| P07-05 | in_progress | Integrate actual calendar availability booking and reminders |
| P07-06 | validated | Add retention aftercare review-request and repeat-business templates |
| P07-07 | validated | Expose review and bounded autopilot controls |
| P07-08 | planned | Marketing-to-appointment pilot gate |
| P08-01 | validated | Build client ICP exclusions prospect imports and source contracts |
| P08-02 | planned | Add selected authorized buying-signal and discovery adapter |
| P08-03 | planned | Implement bounded enrichment verification and optional lookalikes |
| P08-04 | planned | Connect outbound sequences to approved channel capabilities |
| P08-05 | in_progress | Implement source-to-outcome attribution cost and ROI definitions |
| P08-06 | validated | Implement bounded experiments and transparent recommendations |
| P08-07 | validated | Expose scoped developer API and signed event webhooks |
| P08-08 | validated | Implement first required external CRM connector or record defer decision |
| P08-09 | validated | Record gates for visitor identity MCP and advanced outbound extensions |
| P08-10 | planned | Outbound outcomes and optimization gate |
| P09-01 | in_progress | Build reconciled daily client report read model |
| P09-02 | validated | Build agency overview and exception prioritization |
| P09-03 | validated | Implement scoped scheduled digest delivery and critical alerts |
| P09-04 | validated | Replace Telegram simulator with evidence-backed operations |
| P09-05 | validated | Deliver optional client report and approval portal |
| P09-06 | validated | Persist agency settings and decide white-label domain scope |
| P09-07 | validated | Finish responsive mobile accessibility and operational UX |
| P09-08 | validated | Agency accountability acceptance gate |
| P10-01 | planned | Complete security privacy retention and key-recovery review |
| P10-02 | planned | Benchmark hosting fairness rendering storage and client capacity |
| P10-03 | validated | Optimize measured frontend and request bottlenecks |
| P10-04 | planned | Run full acceptance restore rollback and provider verification matrix |
| P10-05 | validated | Reconcile feature documentation runbooks and competitor evidence |
| P10-06 | validated | Prepare feature-flagged canary release package |
| P10-07 | planned | Execute separately authorized canary and observe real outcomes |
| P10-08 | planned | Final release and handover gate |

Authoritative sources: TASKS.csv, STATUS.md, MASTER_PLAN.md, EXECUTION.md and the linked evidence. Historical root acceptance documents are superseded; they cannot authorize release.
