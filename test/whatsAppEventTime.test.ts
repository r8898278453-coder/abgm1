import assert from 'node:assert/strict';
import {inboundDisposition,parseWhatsAppTimestamp,verifiedWhatsAppEvent,isWhatsAppOptOut} from '../shared/whatsAppEvents';
const now=1763000000000;
assert.equal(parseWhatsAppTimestamp('1763000000',now),now);
for(const v of [undefined,null,1763000000,'1e9','-1','x','1763000600'])assert.throws(()=>parseWhatsAppTimestamp(v,now));
assert.equal(inboundDisposition(now-1000,now-2000,now,false),'CURRENT');assert.equal(inboundDisposition(now-1000,now-1000,now,false),'CURRENT');assert.equal(inboundDisposition(now-2000,now-1000,now,false),'STALE');assert.equal(inboundDisposition(now-86400000,null,now,false),'EXPIRED');assert.equal(inboundDisposition(now-172800000,now-1000,now,true),'OPT_OUT');
for(const body of ['STOP',' band karo ','unsubscribe','Opt Out'])assert.equal(isWhatsAppOptOut(body),true);assert.equal(isWhatsAppOptOut('Please do not stop processing this inquiry'),false);
assert.equal(verifiedWhatsAppEvent.safeParse({phoneNumberId:'123',wabaId:'456',occurredAtMs:now}).success,true);assert.equal(verifiedWhatsAppEvent.safeParse({phoneNumberId:'123',wabaId:'wrong',occurredAtMs:now}).success,false);assert.equal(verifiedWhatsAppEvent.safeParse({phoneNumberId:'123',wabaId:'456',occurredAtMs:now,approved:true}).success,false);
console.log('WhatsApp event time contracts: strict seconds/future bounds, source identity, exact24h boundary, stale/equal provider ordering and delayed STOP precedence passed.');
