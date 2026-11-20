import React from 'react';
import {formatPlatformDateTime} from '../../shared/platformTime';
import {EMAIL_RECEIPT_LABELS,emailReceiptEvidence} from '../../shared/salesEmailReceipts';

export function EmailDeliveryEvidence({evidence}:{evidence:unknown}) {
 const parsed=emailReceiptEvidence.safeParse(evidence);
 if(!parsed.success)return <p>Email delivery unconfirmed.</p>;
 const {state,occurredAtMs,suppressed}=parsed.data;
 return <p>Resend evidence · {EMAIL_RECEIPT_LABELS[state]} · {formatPlatformDateTime(occurredAtMs)}{suppressed?' · Future email blocked':''}</p>;
}
