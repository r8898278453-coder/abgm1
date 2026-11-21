import {sourceOutcomeCostsCsv} from '../../shared/sourceOutcomeFinance';
import assert from 'node:assert/strict';import crypto from 'node:crypto';import express from 'express';
import {readSourceOutcomeEvidence} from '../../server/sourceOutcomeReport';import {readAttributionLeads,calculateRevenueAttribution} from '../../server/revenueAttribution';import {saveOpportunity} from '../../server/salesWorkspace';import {createGrowthRecord,transitionGrowthRecord} from '../../server/growthOperations';import {registerSalesRoutes} from '../../server/salesRoutes';
if(process.env.ABGM1_LOCAL_SQL_TESTS!=='1'||process.env.DB_HOST!=='127.0.0.1'||!process.env.DB_NAME?.startsWith('abgm1_test_')||!process.env.LOCAL_SQL_CONTAINER_ID)throw new Error('Disposable SQL required');const db=await import('../../server/db'),pool=await db.getDbPool();assert.ok(pool);const prefix='so_'+crypto.randomBytes(5).toString('hex'),company=prefix+'_a',other=prefix+'_b',users:any={},key=()=>crypto.randomBytes(32).toString('hex'),rows=async(sql:string,args:any[]=[])=>{const[r]:any=await pool.query(sql,args);return r;};let stage='setup';
const readSourceOutcomeReport=async(...args:Parameters<typeof readSourceOutcomeEvidence>)=>(await readSourceOutcomeEvidence(...args)).report;
try{assert.equal((await rows('SELECT @@hostname hostname'))[0].hostname,process.env.LOCAL_SQL_CONTAINER_ID);for(const role of ['owner','viewer','foreign']){const id=prefix+'_'+role;await pool.query("INSERT INTO users(id,email,password_hash,salt,full_name) VALUES (?,?,'fixture','fixture','Fixture')",[id,id+'@example.invalid']);users[role]=await db.findUserById(id);}await db.createCompany({id:company,user_id:users.owner.id,name:'Private company',category:'Service',city:'Pune'});await db.createCompany({id:other,user_id:users.foreign.id,name:'Other',category:'Service',city:'Pune'});const agency=(await rows('SELECT agency_id FROM agency_clients WHERE company_id=?',[company]))[0].agency_id;await pool.query("INSERT INTO agency_memberships(agency_id,user_id,role) VALUES (?,?,'VIEWER')",[agency,users.viewer.id]);await pool.query("INSERT INTO client_assignments(company_id,agency_id,user_id,role) VALUES (?,?,?,'VIEWER')",[company,agency,users.viewer.id]);const lead=company+'_won',open=company+'_new',foreign=other+'_won';for(const [id,c,source]of [[lead,company,'Google WhatsApp'],[open,company,'Referral'],[foreign,other,'Website']])await pool.query("INSERT INTO leads(id,company_id,name,phone,email,service,stage,source) VALUES (?,?,'PRIVATE_CONTACT','+919000000001','private@example.invalid','Private service','new',?)",[id,c,source]);await saveOpportunity(pool,users.owner,company,lead,{expectedVersion:'0',expectedStage:'new',stage:'won',reason:'Declared customer outcome',manualValueMinor:10000,currency:'INR',nextAction:'',dueAt:null});
 const now=Number((await rows('SELECT UNIX_TIMESTAMP()*1000 nowMs'))[0].nowMs),early=now-7200000,later=now-3600000;
 const message=async(id:string,leadId:string|null,channel:string,at:number,direction='INBOUND')=>pool.query('INSERT INTO sales_inbox_messages(id,company_id,lead_id,channel,direction,contact_hash,provider_ref,body,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,FROM_UNIXTIME(?))',[id,company,leadId,channel,direction,key(),'PRIVATE_PROVIDER_REF','PRIVATE_MESSAGE_BODY','{"private":"PRIVATE_METADATA"}',at/1000]);
 await pool.query('INSERT INTO public_lead_intakes(company_id,request_key,input_hash,lead_id,created_at) VALUES (?,?,?,?,FROM_UNIXTIME(?))',[company,key(),key(),lead,early/1000]);await message(key(),lead,'WHATSAPP',later);await message(key(),null,'EMAIL',later);await message(key(),foreign,'EMAIL',later);await message(key(),lead,'EMAIL',now+86400000);await message(key(),lead,'EMAIL',now-1000,'OUTBOUND');
 const cost=(currency:string,amountMinor:number)=>createGrowthRecord(pool,users.owner,company,{kind:'COST',requestKey:key(),input:{experimentId:null,amountMinor,currency,category:'OTHER',sourceReference:'PRIVATE_COST_REFERENCE',note:'PRIVATE_COST_NOTE'}});await cost('INR',123);await cost('USD',456);const voided=await cost('INR',789);await transitionGrowthRecord(pool,users.owner,company,voided.record.id,{action:'VOID',expectedVersion:'1',note:'Operator corrected cost'});
 stage='projection';let report=await readSourceOutcomeReport(pool,users.viewer,company);const won=report.rows.find(r=>r.leadId===lead)!;assert.equal(won.firstKnown.source,'Website');assert.equal(won.lastKnown.source,'WhatsApp');assert.equal(won.currentDeclaredSource,'Unknown');assert.equal(won.opportunityVersion,'1');assert.equal(won.manualWonMinor,'10000');assert.equal(report.totals.won,1);assert.equal(report.totals.leads,2);assert.equal(report.totals.unlinkedInteractions,1);assert.equal(report.totals.orphanInteractions,1);assert.deepEqual({...report.declaredCostMinor},{INR:'123',USD:'456'});assert.deepEqual({...report.manualWonMinor},{INR:'10000'});assert.equal(report.roi,null);for(const secret of ['PRIVATE_CONTACT','private@example.invalid','PRIVATE_PROVIDER_REF','PRIVATE_MESSAGE_BODY','PRIVATE_METADATA','PRIVATE_COST_REFERENCE','PRIVATE_COST_NOTE',foreign])assert.equal(JSON.stringify(report).includes(secret),false);assert.deepEqual(Object.keys((await readAttributionLeads(pool,company))[0]).sort(),['company_id','id','source','stage']);const legacy=calculateRevenueAttribution({companyId:company,leads:await readAttributionLeads(pool,company),invoices:[],totalCost:50000});assert.equal(legacy.totalRevenue,0);assert.equal(legacy.overallRoi,'UNAVAILABLE');
 stage='authority-and-source-tie';await assert.rejects(readSourceOutcomeReport(pool,users.foreign,company),{status:403});await pool.query('DELETE FROM client_assignments WHERE company_id=? AND user_id=?',[company,users.viewer.id]);await assert.rejects(readSourceOutcomeReport(pool,users.viewer,company),{status:403});await pool.query("INSERT INTO client_assignments(company_id,agency_id,user_id,role) VALUES (?,?,?,'VIEWER')",[company,agency,users.viewer.id]);await message(key(),lead,'EMAIL',early);report=await readSourceOutcomeReport(pool,users.owner,company);assert.equal(report.rows.find(r=>r.leadId===lead)!.firstKnown.ambiguous,true);assert.equal(report.rows.find(r=>r.leadId===lead)!.firstKnown.source,'Unknown');
 stage='appointments-by-recorded-source';
 const book=async(c:string,l:string,actor:string,revision:number,event:string,state:string,confirmed:number,end:number)=>{
  const id=key();
  await pool.query(`INSERT INTO sales_booking_evidence(id,company_id,lead_id,actor_id,request_key,input_hash,revision,state,external_event_id,start_at_ms,end_at_ms,confirmed_at_ms)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,[id,c,l,actor,key(),key(),revision,state,event,end-900000,end,confirmed]);
  return id;
 };
 const outcome=async(booking:string,revision:number,status:string)=>pool.query(`INSERT INTO sales_appointment_outcomes
   (id,company_id,lead_id,booking_id,actor_id,request_key,input_hash,revision,outcome,declared_source,evidence,recorded_at_ms)
   VALUES (?,?,?,?,?,?,?,?,?,'Google','PRIVATE_APPOINTMENT_NOTE',?)`,[key(),company,lead,booking,users.owner.id,key(),key(),revision,status,now-5]);
 const appointment=await book(company,lead,users.owner.id,1,'PRIVATE_EVENT', 'CONFIRMED',early+1000,now-10000);
 await outcome(appointment,1,'HELD');
 const rescheduled=await book(company,lead,users.owner.id,2,'PRIVATE_EVENT','CONFIRMED',later+1000,now-10000);
 await outcome(rescheduled,1,'NO_SHOW');
 await outcome(rescheduled,2,'HELD');
 await book(company,lead,users.owner.id,3,'private_event','CONFIRMED',later+1000,now-10000);
 await book(company,lead,users.owner.id,4,'PRIVATE_FUTURE','CONFIRMED',later+1000,now+86400000);
 await book(company,open,users.owner.id,1,'PRIVATE_CANCEL','CONFIRMED',later+1000,now+86400000);
 await book(company,open,users.owner.id,2,'PRIVATE_CANCEL','CANCELLED',later+2000,now+86400000);
 await book(other,foreign,users.foreign.id,1,'PRIVATE_EVENT','CONFIRMED',later+1000,now-10000);
 const evidence=await readSourceOutcomeEvidence(pool,users.viewer,company);
 assert.equal(evidence.appointments.status,'READY');
 if(evidence.appointments.status!=='READY')throw new Error('Missing appointment cohort');
 assert.deepEqual(evidence.appointments.totals,{booked:4,cancelled:1,scheduled:1,held:1,noShow:0,undetermined:0,unrecorded:1});
 assert.equal(evidence.appointments.lastBeforeBooking.find(b=>b.source==='WhatsApp')?.counts.booked,2);
 assert.equal(evidence.appointments.lastBeforeBooking.find(b=>b.source==='Unknown')?.counts.held,1);
 assert.equal(evidence.appointments.firstBeforeBooking.find(b=>b.source==='Unknown')?.counts.booked,4);
 assert.equal(evidence.appointments.currentDeclared.find(b=>b.source==='Referral')?.counts.cancelled,1);
 assert.equal(JSON.stringify(evidence).includes('PRIVATE_'),false);
 stage='corrupt-evidence';const saved=(await rows('SELECT details_json FROM sales_opportunities WHERE company_id=? AND lead_id=?',[company,lead]))[0].details_json;await pool.query("UPDATE sales_opportunities SET details_json='{}' WHERE company_id=? AND lead_id=?",[company,lead]);await assert.rejects(readSourceOutcomeReport(pool,users.owner,company));await pool.query('UPDATE sales_opportunities SET details_json=? WHERE company_id=? AND lead_id=?',[saved,company,lead]);
 stage='query-privacy-http';const app=express();registerSalesRoutes(app,{auth:async req=>users[String(req.headers.authorization)]||null,pool:async()=>pool});const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));try{const origin=`http://127.0.0.1:${(server.address()as any).port}`,base=`/api/companies/${company}/sales/source-outcomes`;for(const [path,actor,status]of [[base,'',401],[base,'foreign',403],[base,'viewer',200],[base+'?date=2026-11-18','owner',400],[base+'?companyId='+other,'owner',400]]as const){const r=await fetch(origin+path,{headers:{Authorization:actor}});assert.equal(r.status,status);assert.equal(r.headers.get('cache-control'),'no-store');const text=await r.text();assert.equal(text.includes('PRIVATE_'),false);if(status===200){const body=JSON.parse(text);assert.equal(body.report.model,2);assert.equal(body.appointments.totals.booked,4);}}}finally{await new Promise<void>(r=>server.close(()=>r()));}
 stage='provider-event-time-and-cost-evidence';
 const saveTimed=async(channel:string,meta:unknown)=>{
  const id=key();
  await pool.query(`INSERT INTO sales_inbox_messages(id,company_id,lead_id,channel,direction,contact_hash,provider_ref,body,metadata_json,created_at)
   VALUES (?,?,?,?,'INBOUND',?,'PRIVATE_PROVIDER','PRIVATE_BODY',?,FROM_UNIXTIME(?))`,[id,company,lead,channel,key(),JSON.stringify(meta),(now-5000)/1000]);
  return id;
 };
 const email=await saveTimed('EMAIL',{verifiedEmailReply:true,emailOccurredAtMs:early-500});
 const whatsapp=await saveTimed('WHATSAPP',{verifiedProviderTime:true,providerOccurredAtMs:early-1000});
 const timed=await readSourceOutcomeEvidence(pool,users.owner,company);
 const projected=timed.report.rows.find(row=>row.leadId===lead)!;
 assert.equal(projected.firstKnown.source,'WhatsApp');
 assert.equal(projected.firstKnown.atMs,early-1000);
 assert.equal(projected.lastKnown.atMs,later);
 assert.equal(timed.costEvidence.length,Object.keys(timed.report.declaredCostMinor).length);
 assert.ok(timed.costEvidence.every(cost=>cost.revision==='1'));
 assert.ok(!sourceOutcomeCostsCsv(timed.costEvidence,timed.report).includes('PRIVATE_'));
 const untimed=await saveTimed('EMAIL',{verifiedEmailReply:true,emailOccurredAtMs:String(early)});
 const withheld=(await readSourceOutcomeReport(pool,users.owner,company)).rows.find(row=>row.leadId===lead)!;
 assert.equal(withheld.attributionState,'UNTIMED_HISTORY');
 await pool.query('DELETE FROM sales_inbox_messages WHERE company_id=? AND id IN (?,?,?)',[company,email,whatsapp,untimed]);
 console.log('Source evidence SQL: verified event order, untimed withholding and declared-cost revision provenance passed.');

 stage='bounded-history';const values:string[]=[],args:any[]=[];for(let i=0;i<5001;i++){values.push('(?,?,?,?,?,?,?,?,?,FROM_UNIXTIME(?))');args.push(key(),company,lead,'WHATSAPP','INBOUND',key(),'PRIVATE','PRIVATE','{}',later/1000);}await pool.query('INSERT INTO sales_inbox_messages(id,company_id,lead_id,channel,direction,contact_hash,provider_ref,body,metadata_json,created_at) VALUES '+values.join(','),args);const bounded=await readSourceOutcomeEvidence(pool,users.owner,company);report=bounded.report;assert.equal(report.historyComplete,false);
 assert.equal(bounded.appointments.status,'READY');
 if(bounded.appointments.status==='READY')assert.equal(bounded.appointments.lastBeforeBooking.find(b=>b.source==='Unknown')?.counts.booked,4);assert.equal(report.rows.every(r=>r.firstKnown.atMs===null&&r.lastKnown.atMs===null&&r.attributionState==='INCOMPLETE_HISTORY'),true);assert.equal(report.manualWonMinor.INR,'10000');
 stage='bounded-appointments';
 const capacityValues:string[]=[],capacityArgs:any[]=[];
 for(let i=0;i<997;i++){
  capacityValues.push('(?,?,?,?,?,?,?,?,?,?,?,?)');
  capacityArgs.push(key(),company,open,users.owner.id,key(),key(),i+3,'CONFIRMED','CAPACITY_'+i,now+900000,now+1800000,later);
 }
 await pool.query('INSERT INTO sales_booking_evidence(id,company_id,lead_id,actor_id,request_key,input_hash,revision,state,external_event_id,start_at_ms,end_at_ms,confirmed_at_ms) VALUES '+capacityValues.join(','),capacityArgs);
 const limited=await readSourceOutcomeEvidence(pool,users.owner,company);
 assert.deepEqual(limited.appointments,{status:'CAPACITY_EXCEEDED'});
 assert.equal(limited.report.totals.leads,2);
 assert.equal((await rows('SELECT COUNT(*) n FROM message_dispatch_intents WHERE company_id=?',[company]))[0].n,0);console.log('Source outcome SQL: read-only private cross-client/role checks, recorded web/inbound first/last ties, current opportunity revisions, exact declared costs with void exclusion, future/outbound exclusion, missing/orphan identity, no private content/payment/budget claims, corrupt evidence refusal and5001-row history withholding passed. Appointment cohort: exact event revisions, cutoff, corrections, current declared source, cohort cap and tenant isolation passed.');
}catch(e:any){console.log(JSON.stringify({fixture:'source-outcomes',stage,code:e.code||'ASSERTION',...(e.code==='ERR_ASSERTION'?{actual:e.actual,expected:e.expected}:{}),line:e.stack?.match(/sourceOutcomeSql.test.ts:(\d+)/)?.[1]}));process.exitCode=1;}finally{for(const c of [company,other]){for(const t of ['sales_appointment_outcomes','sales_booking_evidence','growth_operation_records','sales_inbox_messages','public_lead_intakes','sales_opportunities','autonomous_audit_logs','leads','client_assignments','company_profiles_data','client_operations','agency_clients'])await pool.query(`DELETE FROM ${t} WHERE company_id=?`,[c]);await pool.query('DELETE FROM companies WHERE id=?',[c]);}for(const u of Object.values(users)as any[])await pool.query('DELETE FROM agency_memberships WHERE user_id=?',[u.id]);for(const u of Object.values(users)as any[]){await pool.query('DELETE FROM agencies WHERE owner_user_id=?',[u.id]);await pool.query('DELETE FROM users WHERE id=?',[u.id]);}await pool.end();}
