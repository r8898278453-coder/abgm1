import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {analyzeSourceOutcomes,validateSourceOutcomeReport,sourceOutcomeCsv,type SourceOutcomeInput} from '../shared/sourceOutcomeReport';
import {APPOINTMENT_SOURCE_CAPACITY,appointmentSourceCsv,projectAppointmentSources,validateAppointmentSources} from '../shared/appointmentSourceReport';
const id=(s:string)=>crypto.createHash('sha256').update(s).digest('hex'),input:SourceOutcomeInput={companyId:'A',checkedAtMs:10000,historyComplete:true,leads:[{id:'won',source:'Google WhatsApp',stage:'won',opportunityVersion:'2',manualValueMinor:10000,currency:'INR'},{id:'open',source:'Manual',stage:'contacted',opportunityVersion:'0',manualValueMinor:null,currency:null},{id:'lost',source:'Website',stage:'lost',opportunityVersion:'3',manualValueMinor:1000,currency:'USD'},{id:'unknown',source:'Unknown',stage:'legacy_unknown',opportunityVersion:'0',manualValueMinor:null,currency:null}],touches:[{id:id('web'),leadId:'won',source:'Website',atMs:1000,kind:'WEBSITE_INQUIRY'},{id:id('reply'),leadId:'won',source:'WhatsApp',atMs:2000,kind:'INBOUND_RECORD'},{id:id('orphan'),leadId:'absent',source:'Email',atMs:1000,kind:'INBOUND_RECORD'},{id:id('unlinked'),leadId:null,source:'Email',atMs:1000,kind:'INBOUND_RECORD'},{id:id('untimed'),leadId:'open',source:'Email',atMs:null,kind:'INBOUND_RECORD'}],costs:[{currency:'INR',amountMinor:100},{currency:'INR',amountMinor:200},{currency:'USD',amountMinor:500}]};
const r=analyzeSourceOutcomes(input);assert.equal(validateSourceOutcomeReport(r,'A'),r);assert.deepEqual({...r.manualWonMinor},{INR:'10000'});assert.deepEqual({...r.declaredCostMinor},{INR:'300',USD:'500'});assert.equal(r.rows[0].firstKnown.source,'Website');assert.equal(r.rows[0].lastKnown.source,'WhatsApp');assert.equal(r.rows[0].currentDeclaredSource,'Unknown');assert.equal(r.rows[1].attributionState,'UNTIMED_HISTORY');assert.equal(r.rows[3].stage,'UNKNOWN');assert.equal(r.totals.withKnownRecordedTouch,1);assert.equal(r.totals.orphanInteractions,1);assert.equal(r.totals.unlinkedInteractions,1);assert.equal(r.totals.untimedInteractions,1);assert.equal(r.roi,null);assert.equal(r.verifiedCustomerRevenue,null);assert.equal(r.verifiedMarketingSpend,null);assert.equal(r.costAllocation,'UNALLOCATED');assert.equal(r.firstKnownSources.find(v=>v.source==='Website')!.won,1);assert.equal(r.lastKnownSources.find(v=>v.source==='WhatsApp')!.won,1);
const tie=analyzeSourceOutcomes({...input,touches:[...input.touches,{id:id('tie'),leadId:'won',source:'Email',atMs:1000,kind:'INBOUND_RECORD'}]});assert.equal(tie.rows[0].firstKnown.ambiguous,true);assert.equal(tie.rows[0].firstKnown.source,'Unknown');assert.equal(tie.rows[0].lastKnown.source,'WhatsApp');validateSourceOutcomeReport(tie,'A');const bounded=analyzeSourceOutcomes({...input,historyComplete:false});assert.equal(bounded.rows.every(v=>v.attributionState==='INCOMPLETE_HISTORY'&&v.firstKnown.atMs===null&&v.lastKnown.atMs===null),true);validateSourceOutcomeReport(bounded,'A');
const sums=analyzeSourceOutcomes({...input,leads:Array.from({length:3},(_,i)=>({id:'lead'+i,source:'Manual',stage:'won',opportunityVersion:'18446744073709551615',manualValueMinor:Number.MAX_SAFE_INTEGER,currency:'INR'})),touches:[],costs:[]});assert.equal(sums.manualWonMinor.INR,(3n*BigInt(Number.MAX_SAFE_INTEGER)).toString());validateSourceOutcomeReport(sums,'A');
for(const changed of [{...input,leads:[...input.leads,input.leads[0]]},{...input,touches:[...input.touches,input.touches[0]]},{...input,touches:[{...input.touches[0],atMs:10001}]},{...input,leads:[{...input.leads[0],manualValueMinor:NaN}]},{...input,costs:[{currency:'INR',amountMinor:-1}]}])assert.throws(()=>analyzeSourceOutcomes(changed));
for(const changed of [{...r,companyId:'B'},{...r,roi:500},{...r,privateNotes:'SECRET'},{...r,totals:{...r.totals,won:20}},{...r,firstKnownSources:r.lastKnownSources},{...r,manualWonMinor:{INR:'10001'}},{...r,rows:r.rows.map((row,i)=>i?row:{...row,firstKnown:{...row.firstKnown,source:'Google'}})},{...r,rows:r.rows.map((row,i)=>i?row:{...row,phone:'PRIVATE_PHONE'})}])assert.throws(()=>validateSourceOutcomeReport(changed,'A'));const csv=sourceOutcomeCsv(r,'A');assert.match(csv,/first_recorded_source/);assert.match(csv,/Asia\/Kolkata/);assert.match(csv,/RECORDED_ONLY/);assert.equal(csv.includes('provider_ref'),false);assert.equal(csv.includes('body'),false);assert.throws(()=>sourceOutcomeCsv(r,'B'));
console.log('Source outcomes: actual timed first/last records, ambiguous ties/no inferred acquisition, empty/unknown/untimed/unlinked/orphan evidence, full-history limits, exact multi-currency BigInt amounts, corrupt response reconciliation and private scope-bound CSV passed.');

const mixed:SourceOutcomeInput={companyId:'A',checkedAtMs:100,historyComplete:true,leads:[{id:'mixed',source:'Manual',stage:'new',opportunityVersion:'0',manualValueMinor:null,currency:null}],touches:[{id:id('timed'),leadId:'mixed',source:'Website',atMs:1,kind:'WEBSITE_INQUIRY'},{id:id('untimed'),leadId:'mixed',source:'WhatsApp',atMs:null,kind:'INBOUND_RECORD'}],costs:[]};
const incomplete=analyzeSourceOutcomes(mixed);assert.equal(incomplete.rows[0].attributionState,'UNTIMED_HISTORY');assert.equal(incomplete.rows[0].firstKnown.atMs,null);validateSourceOutcomeReport(incomplete,'A');
const timed=analyzeSourceOutcomes({...mixed,touches:mixed.touches.slice(0,1)});const replaced=analyzeSourceOutcomes({...mixed,touches:[{...mixed.touches[0],id:id('replacement')} ]});assert.notEqual(timed.rows[0].boundaryVersion,replaced.rows[0].boundaryVersion);assert.deepEqual(timed.rows[0].firstKnown.evidenceIds,[id('timed')]);
assert.throws(()=>validateSourceOutcomeReport({...timed,rows:[{...timed.rows[0],boundaryVersion:incomplete.rows[0].boundaryVersion}]},'A'));assert.throws(()=>analyzeSourceOutcomes({...mixed,leads:[{...mixed.leads[0],opportunityVersion:'00'}]}));assert.throws(()=>analyzeSourceOutcomes(null as any));

assert.throws(()=>analyzeSourceOutcomes({...mixed,leads:[{...mixed.leads[0],opportunityVersion:0 as any}]}));
assert.equal(analyzeSourceOutcomes({...mixed,touches:[...mixed.touches].reverse()}).rows[0].boundaryVersion,incomplete.rows[0].boundaryVersion);

const sameSecond={leadId:'won',firstConfirmedAtMs:2500,status:'held' as const};
const appointments=projectAppointmentSources(r,input.touches,[
 sameSecond,{leadId:'open',firstConfirmedAtMs:3000,status:'noShow'},
 {leadId:'lost',firstConfirmedAtMs:3000,status:'undetermined'},
]);
assert.equal(appointments.status,'READY');
if(appointments.status!=='READY')throw new Error('Missing appointment cohort');
assert.equal(appointments.lastBeforeBooking.find(row=>row.source==='Website')?.counts.held,1);
assert.equal(appointments.lastBeforeBooking.find(row=>row.source==='WhatsApp')?.counts.held,0);
assert.equal(appointments.firstBeforeBooking.find(row=>row.source==='Unknown')?.counts.noShow,1);
assert.equal(appointments.firstBeforeBooking.find(row=>row.source==='Unknown')?.counts.undetermined,1);
assert.throws(()=>validateAppointmentSources(appointments,false));
assert.throws(()=>validateAppointmentSources({...appointments,totals:{...appointments.totals,held:0,unrecorded:1}},true));
const appointmentCsv=appointmentSourceCsv(appointments,r);
assert.match(appointmentCsv,/Asia\/Kolkata,lastBeforeBooking,Website,1,0,0,1,0,0,0/);
assert.equal(appointmentCsv.includes('lead_id'),false);
assert.equal(projectAppointmentSources(r,input.touches,Array(APPOINTMENT_SOURCE_CAPACITY).fill(sameSecond)).status,'READY');
assert.deepEqual(projectAppointmentSources(r,input.touches,Array(APPOINTMENT_SOURCE_CAPACITY+1).fill(sameSecond)),{status:'CAPACITY_EXCEEDED'});
assert.throws(()=>appointmentSourceCsv({status:'CAPACITY_EXCEEDED'},r));
assert.throws(()=>projectAppointmentSources(r,input.touches,[{...sameSecond,leadId:'foreign'}]));
console.log('Appointment attribution: confirmation-second exclusion, untimed and missing evidence, strict partition reconciliation, cohort capacity and aggregate CSV passed.');
