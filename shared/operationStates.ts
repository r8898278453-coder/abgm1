/** Distinct persisted state domains. Queue success never asserts a delivery or sale. */
export const OPERATION_STATES={
 job:{QUEUED:'Waiting for a worker',RUNNING:'Current worker attempt active',SUCCEEDED:'Job handler settled successfully',RETRY_WAIT:'Waiting for a bounded retry',FAILED:'Attempts ended or permanent failure',CANCELLED:'Further job execution cancelled'},
 message:{IN_PROGRESS:'Dispatch claim active; do not resend blindly',API_ACCEPTED:'Provider accepted the request; delivery unconfirmed',REJECTED:'Definite rejection; explicit eligible retry only',PAUSED:'Execution eligibility paused',UNKNOWN:'Outcome ambiguous; reconciliation required'},
 publication:{PUBLISHED:'Provider publication acknowledged',FAILED:'Definite publication failure',UNKNOWN:'Publication outcome ambiguous',NOT_CONFIGURED:'Required provider configuration unavailable'},
 ingestion:{STORED:'Original bytes saved privately',QUEUED:'Extraction admitted to the existing queue',PROCESSING:'Extraction attempt active',EXTRACTED:'Text extracted; source approval still separate',NEEDS_OCR:'No usable text; OCR not supplied',UNSUPPORTED:'This parser/format is unavailable',FAILED:'Extraction failed'},
} as const;
export type OperationDomain=keyof typeof OPERATION_STATES;
export function operationMeaning(domain:OperationDomain,state:unknown):string|null{const states:Record<string,string>=OPERATION_STATES[domain];return typeof state==='string'&&Object.hasOwn(states,state)?states[state]:null;}
