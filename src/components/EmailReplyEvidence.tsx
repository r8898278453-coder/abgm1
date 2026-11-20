import React from 'react';
import {formatPlatformDateTime} from '../../shared/platformTime';

export function EmailReplyEvidence({metadata}:{metadata:unknown}){
 if(!metadata||typeof metadata!=='object')return null;
 const evidence=metadata as Record<string,unknown>;
 const at=evidence.emailOccurredAtMs;
 if(evidence.verifiedEmailReply!==true||typeof at!=='number'||!Number.isSafeInteger(at)||at<=0||at>8640000000000000||
    typeof evidence.replyToMessageId!=='string'||!/^[a-f0-9]{64}$/.test(evidence.replyToMessageId))return null;
 return <p>Linked Resend reply · {formatPlatformDateTime(at)}
  {evidence.emailOptOut===true?' · Email opt-out recorded':''}
  {evidence.truncated===true?' · Text shortened':''}</p>;
}
