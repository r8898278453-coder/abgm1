# Scoped developer API and signed CRM webhooks — 20 November 2026 IST

This group adds read-only interoperability for each client and durable metadata-only CRM webhooks. It reuses canonical CRM contacts, sales reporting, agency authorization and scheduler services. No parallel CRM, email sender, MCP business engine or external connector is introduced. Outbound webhooks are disabled unless the operator explicitly configures `DEVELOPER_WEBHOOKS_ENABLED=true`; this implementation does not change that setting.

## Keys and canonical API

Owners/admins with current client management permission create up to five unexpired active keys, with exact client scope, one or more of `contacts:read`, `sales:read`, `events:read`, and expiry between1 and90 days. A random256-bit secret is returned once. Only SHA256 of the complete token is stored. Tokens are not browser sessions and cannot authorize existing application write/send/admin routes. Rotation increments the version and immediately invalidates the old token; revocation replaces the stored hash and disables the key. Expiry is not extended by rotation.

Creation uses a stable request key and exact input digest. Lost acknowledgement can be retried without issuing another key. The secret is not recoverable on replay: reload, rotate or revoke. A lost rotation acknowledgement requires reload and a new versioned rotation, never reuse of an unknown secret. Current issuer identity, current assigned read permission, active client and token revision are checked. A final permit before returning the response rejects a key revoked/rotated while its canonical read was running. As with any request, changes after final admission cannot recall already returned data.

Each valid, scoped key has a durable SQL-clock limit of60 requests/minute across processes. Eight contenders at59 remaining admit one request. Rotation does not reset the window. Invalid scopes/tokens are rejected; an expired/revoked/foreign key never falls back to platform credentials. A request admitted before an application read fails still consumes its reservation. Rate-limited responses include Retry-After:60.

The three v1 facade routes accept only an explicit Bearer developer token:

| Route | Scope | Result |
| --- | --- | --- |
| GET /api/developer/v1/companies/:companyId/contacts?before=ID | contacts:read | Canonical contact directory,100 rows/page, selected contact fields and current alias mapping |
| GET /api/developer/v1/companies/:companyId/sales-report?date=YYYY-MM-DD | sales:read | Existing canonical IST sales report and its original manual-value/unknown ROI definitions |
| GET /api/developer/v1/companies/:companyId/events?before=ID | events:read | CRM event metadata,20 rows/page |

No contact permission, model/send/publication/booking authority, write scopes or attachment bytes are exposed. Additional commands require an explicit future contract rather than inferred access. MCP and the deferred external CRM connector remain separate roadmap decisions. Read APIs and all control responses use no-store; private service-worker offline fallback/cache is refused.

## Atomic events and subscriptions

The canonical `agencyAudit` transaction also records selected CRM events and fans out one delivery per current active subscription. Audit/event/delivery either all commit or all roll back. A CRM command receipt replay does not emit a duplicate event. Event types are fixed to identity link/unlink/review and private attachment stored/provider-stored; unrelated business audit events are not exported. This is not yet an all-module activity stream.

Subscriptions are current-manager controlled, bound to one client and fixed topic `crm.activity`, capped at five active subscriptions. URL accepts HTTPS on port443 only, without credentials, query, fragment or literal IP. Creation has stable request/input receipts and returns a random signing secret once. The secret is encrypted with existing rotation-capable credential encryption and bound inside ciphertext to client/subscription. Read DTOs never expose token hashes, signing ciphertext, claim tokens, private audit details or original file/message content. A subscription's endpoint is immutable: revoke and create a new reviewed subscription to change it.

Secret rotation increments the revision and cancels outstanding deliveries from the prior revision. Revocation cancels pending/retrying/in-flight delivery records. Already admitted HTTPS requests cannot be recalled. Later settlement cannot overwrite a cancellation or newer worker claim. Explicit replay to a current subscription accepts a saved same-client event ID; exact event/subscription/revision replay reuses its existing delivery. A terminal dead-letter is retained rather than silently reset. A deliberately reviewed new subscription revision can replay the same event, and receivers must still deduplicate by event ID.

## Signing, retries and the receiver contract

Payload version1 has exactly: version, topic, companyId, and event {id,type,occurredAtMs}. It has no business details/actor/PII. An HTTP2xx acknowledgement means the receiver acknowledged the request; it does not establish downstream business completion.

Headers: X-ABGM-Timestamp (epoch milliseconds), X-ABGM-Delivery, X-ABGM-Event and X-ABGM-Signature (hex HMAC-SHA256). Signature input is the exact UTF8 concatenation `timestamp + '.' + deliveryId + '.' + rawBody`. Never parse/re-serialize JSON before verifying. `verifyDeveloperWebhook` performs strict header parsing, constant-time signature comparison, a five-minute timestamp window and a16KiB body limit.

**Receiver replay protection is mandatory:** after verifying the exact raw body/signature/time and expected client/topic/schema, atomically insert `(companyId,event.id)` into a durable unique receipt table in the same transaction as the downstream effect. A duplicate event returns2xx without repeating the effect. Timestamp/signature verification alone is not replay prevention. Event ID stays the same on retries, while timestamp/signature can change. The application does not run or certify a consumer's private database.

Deliveries use a120-second fenced lease, current subscription revision and current creator management authority, with a fresh final permit before network I/O. Crash/expired claim recovery creates a new owner; late old settlement cannot overwrite it. Network timeout or missing acknowledgement is retryable with the same event ID, so delivery is **at least once**, never claimed exactly once. Backoff is1/2/4/8 minutes, at most five attempts; seven-day-old queued deliveries dead-letter. Response bodies and raw network errors are not retained or exposed.

DNS resolution is limited to3seconds, validates every resolved address and pins the selected public address to a TLS-verifying socket. Private/special/mixed addresses, redirects, alternate ports, credentials and query URLs are refused. HTTPS request deadline is10seconds after DNS. Payload is capped at16KiB; response body is discarded. No user-provided headers, auth token, arbitrary signing target or redirect forwarding is allowed.

## Automation, controls and recovery

The existing budgeted scheduler outbox stage processes canonical internal actions first, then at most one due webhook per client and five clients per tick. It respects the global emergency stop, client archive, delivery feature flag, current permissions and cooperative work gate before starting another attempt. An admitted bounded network request may finish after the cooperative budget. Metadata-only counters join the existing redacted dispatcher summary. No global fairness/capacity benchmark is inferred from this per-tick bound.

Manager-only Sales Workspace controls provide on-demand settings, scope/expiry selection, one-time credentials, versioned rotate/revoke, delivery history and explicit attempts when enabled. Frozen lost-ACK retries keep the original body/key. Secrets stay in component memory only and can be hidden; client changes, unmount and detected session changes clear private state. History replaces bounded20-row pages. No offline mutation replay is added.

The ten application control routes are under `/api/companies/:companyId/developer`: GET settings; POST keys; POST keys/:keyId/rotate or revoke; POST subscriptions; POST subscriptions/:subscriptionId/rotate, revoke or replay; GET deliveries?before=ID; POST deliveries/:deliveryId/attempt with `{}`. API facade tokens cannot administer these controls.

## Migration and remaining gates

Forward055 adds developer_api_keys, developer_subscriptions, developer_events and developer_deliveries:101 canonical tables, next056. Exact type/nullability/unsigned/index guards reject incompatible existing definitions before DDL. Historical001–054 and frozen report V4 remain unchanged. Existing CRM mutations require this schema before a new binary can run. There is no implicit historical event backfill; explicit replay uses events recorded after this code is installed.

A new reviewed staging/canary package, actual Hostinger cron/storage/backup evidence, key recovery, retention and separately authorized activation remain required. Additive migration does not prove rollback compatibility: an older binary can reject a newer migration ledger. Event/receipt pruning is not implemented; future retention must preserve source receipts and consumer replay guarantees. No production migration, deployment, real webhook delivery, customer send or model spend occurred. Email, booking, universal audit coverage and other original tasks are not accepted by this group.
