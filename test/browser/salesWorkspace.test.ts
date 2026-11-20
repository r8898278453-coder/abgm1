import {assessDeclaredProspect,DEFAULT_PROSPECTING_PROFILE} from '../../shared/prospectingProfile';
import {DEFAULT_SALES_POLICY} from '../../shared/salesWorkspace';
import {EXCEPTION_KEYS,exceptionProjection} from '../../shared/agencyExceptions';
import assert from 'node:assert/strict';import {chromium} from 'playwright-core';import {createServer} from 'vite';
const fixture='/__sales_fixture.tsx';const vite=await createServer({plugins:[{name:'sales-fixture',resolveId(id){if(id===fixture)return id;},load(id){if(id!==fixture)return;return `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{SalesWorkspacePanel,AgencySalesExceptions}from'/src/components/SalesWorkspacePanel.tsx';function App(){const[company,setCompany]=useState('A');window.changeClient=()=>setCompany('B');return <><SalesWorkspacePanel key={company} companyId={company}/><AgencySalesExceptions agencyId="agency"/></>;}createRoot(document.getElementById('root')).render(<App/>);`;}}],server:{host:'127.0.0.1',port:0},logLevel:'error'});await vite.listen();let browser:any;
try{const origin=`http://127.0.0.1:${(vite.httpServer!.address() as any).port}`;browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const context=await browser.newContext({serviceWorkers:'block'});let channelState="NOT_CONFIGURED";let policyVersion=0,permissionVersion=0,opVersion=0,qualVersion=0,conflict=false;let stage='new',permissionState='UNKNOWN',booking:any=null;let calendarEnabled=false, calendarPending=false, calendarCreates=0;const calendarChanges:any[]=[];const bookingWrites:any[]=[];const writes:any[]=[],keys:string[]=[];let policy={paused:false,quietStart:21,quietEnd:8,dailyMessageCap:20,industries:[],excludedDomains:[],questions:['Need?','Timeline?','Handoff?']};
await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==origin){await route.abort();return;}if(url.pathname==='/'){await route.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/',`<div id="root"></div><script type="module" src="${fixture}"></script>`)});return;}if(!url.pathname.startsWith('/api/')){await route.continue();return;}const company=url.pathname.split('/')[3];let body:any={success:true,companyId:company},status=200;const method=route.request().method();
 if(url.pathname.includes('/agencies/'))body={success:true,overview:{agencyId:'agency',modelVersion:4,scope:'CURRENT_AUTHORIZED_CLIENTS',timeZone:'Asia/Kolkata',checkedAtMs:Date.now(),definition:'Current operational backlog priority',clients:[{companyId:'A',operationStatus:'ACTIVE',...exceptionProjection(Object.fromEntries(EXCEPTION_KEYS.map(k=>[k,k==='newLeads'?1:0])))}]}};
 else if(url.pathname.endsWith('/calendar-check')){
  assert.equal(company,'A');
  const command=route.request().postDataJSON();
  if(command.kind==='EVENT'){
   assert.equal(command.eventId,'CalendarFixture');
   body={...body,calendar:{kind:'EVENT',status:'CONFIRMED',source:'GOOGLE_CALENDAR',observedAtMs:Date.now(),startAtMs:Date.parse('2027-01-01T10:00:00+05:30'),endAtMs:Date.parse('2027-01-01T10:30:00+05:30')}};
  }else{
   assert.equal(command.startAt,calendarCreates ? '2027-01-01T12:00:00+05:30' : '2027-01-01T10:00:00+05:30');
   body={...body,calendar:{kind:'AVAILABILITY',status:'FREE',source:'GOOGLE_CALENDAR',observedAtMs:Date.now()}};
  }
 }
 else if(url.pathname.endsWith('/calendar-create')){
  assert.equal(company,'A');
  const command=route.request().postDataJSON();
  assert.equal(command.startAt,'2027-01-01T10:00:00+05:30');
  assert.equal(command.endAt,'2027-01-01T10:30:00+05:30');
  assert.equal(command.expectedVersion,'0');
  assert.equal(command.reminderMinutes,15);
  assert.match(command.requestKey,/^[a-f0-9]{64}$/);
  calendarCreates++;
  calendarPending=true;
  await route.abort();
  return;
 }
 else if(url.pathname.endsWith('/calendar-refresh')){
  assert.equal(company,'A');
  assert.deepEqual(route.request().postDataJSON(),{expectedVersion:'1'});
  booking={...booking,version:'2',startAtMs:Date.parse('2027-01-01T10:15:00+05:30'),
   endAtMs:Date.parse('2027-01-01T10:45:00+05:30')};
  body={...body,calendarRefresh:{state:'RESCHEDULED',version:'2'}};
 }
 else if(url.pathname.endsWith('/calendar-change')){
  assert.equal(company,'A');
  const command=route.request().postDataJSON();
  calendarChanges.push(command);
  if(command.operation==='RESCHEDULE'){
   assert.equal(command.expectedVersion,'2');
   assert.equal(command.startAt,'2027-01-01T12:00:00+05:30');
   assert.equal(command.reminderMinutes,0);
   booking={...booking,version:'3',startAtMs:Date.parse(command.startAt),endAtMs:Date.parse(command.endAt)};
  }else{
   assert.equal(command.operation,'CANCEL');
   assert.equal(command.expectedVersion,'3');
   assert.equal(command.startAt,undefined);
   booking={...booking,version:'4',state:'CANCELLED'};
  }
  body={...body,calendarIntent:{requestId:'d'.repeat(64),state:'CONFIRMED'}};
 }
 else if(url.pathname.endsWith('/calendar-intents/'+ 'c'.repeat(64) +'/reconcile')){
  assert.equal(company,'A');
  calendarPending=false;
  booking={version:'1',state:'CONFIRMED',externalEventId:'VerifiedFixture',startAtMs:Date.parse('2027-01-01T10:00:00+05:30'),endAtMs:Date.parse('2027-01-01T10:30:00+05:30'),source:'GOOGLE_CALENDAR_VERIFIED'};
  body={...body,calendarIntent:{requestId:'c'.repeat(64),state:'CONFIRMED'}};
 }
 else if(url.pathname.endsWith('/booking-evidence')){
  assert.equal(company,'A');
  if(method==='POST'){
   const command=route.request().postDataJSON();
   bookingWrites.push(command);
   if(!booking){
    booking={version:'1',state:'CONFIRMED',externalEventId:command.externalEventId,startAtMs:Date.parse(command.startAt),endAtMs:Date.parse(command.endAt),source:'OPERATOR_RECORDED'};
    await route.abort();
    return;
   }
   assert.deepEqual(command,bookingWrites[0]);
  }
  body={...body,booking,calendarCreateEnabled:calendarEnabled,pendingCalendarRequestId:calendarPending?'c'.repeat(64):null};
 }
 else if(url.pathname.endsWith('/calendar-push')){
  assert.equal(company,'A');
  if(method==='POST'){
   const {action}=route.request().postDataJSON();
   assert.ok(['REGISTER','DISABLE'].includes(action));
   channelState=action==='REGISTER'?'ACTIVE':'DISABLED';
  }
  body={...body,channel:{state:channelState,enabled:true,originReady:true,
   expiresAtMs:Date.now()+86400000,canRegister:channelState==='NOT_CONFIGURED',automaticRenewal:true,stopState:channelState==='DISABLED'?'READY':null}};
 }
 else if(method!=='GET'){const input=route.request().postDataJSON();writes.push({path:url.pathname,input});if(conflict){status=409;body={success:false,error:'SALES_POLICY_CHANGED'};}else if(url.pathname.endsWith('/policy')){assert.equal(input.expectedVersion,String(policyVersion));policyVersion++;policy=input.policy;body={...body,version:String(policyVersion)};}else if(url.pathname.endsWith('/prospects/assess')){body={...body,assessment:assessDeclaredProspect((policy as any).prospecting||DEFAULT_PROSPECTING_PROFILE,policy.industries,input,company,String(policyVersion),Date.now())};}else if(url.pathname.endsWith('/permissions')){permissionVersion++;permissionState=input.state;body={...body,version:String(permissionVersion)};}else if(url.pathname.endsWith('/opportunity')){opVersion++;stage=input.stage;body={...body,version:String(opVersion)};}else if(url.pathname.endsWith('/qualification')){qualVersion++;body={...body,version:String(qualVersion)};}else if(url.pathname.endsWith('/prospects/preview')){body={...body,readOnly:true,consentGranted:false,policyVersion:String(policyVersion),checkedAtMs:Date.now(),results:[{row:1,status:'WOULD_IMPORT'}]};}else if(url.pathname.endsWith('/prospects/import')){keys.push(input.requestKey);body={...body,results:[{row:1,status:'IMPORTED'}],consentGranted:false,reused:false};}}
 else if(url.pathname.endsWith('/inbox'))body={...body,messages:company==='A'?[{id:'a'.repeat(64),lead_id:'leadA',version:'0',direction:'INBOUND',body:'Actual saved inquiry',createdAtMs:1},{id:'b'.repeat(64),lead_id:'leadA',version:'0',direction:'OUTBOUND',body:'Reviewed reply',metadata:{receiptReconciled:true},createdAtMs:2}]:[],nextBefore:null};
 else if(url.pathname.endsWith('/report'))body={...body,report:{date:url.searchParams.get('date'),activity:{AGENCY_SALES_INBOUND_SAVED:1,AGENCY_SALES_CALENDAR_BOOKING_VERIFIED:1,AGENCY_SALES_CALENDAR_EXTERNAL_RESCHEDULE:1,AGENCY_SALES_CALENDAR_SYNC_RESCHEDULE:2,AGENCY_SALES_APPOINTMENT_REMINDER_API_ACCEPTED:1},backlog:{newLeads:1,pendingCalendarCreations:1,pendingCalendarChanges:0,pendingAppointmentReminders:2,appointmentRemindersAwaitingCalendar:1,calendarReconciliationUnavailable:2},attribution:{currencies:{INR:100},roi:null,definition:'Manual value, not verified revenue'}}};
 else body={...body,canManage:true,canWrite:true,workspace:{version:company==='A'?String(policyVersion):'0',policy:company==='A'?policy:DEFAULT_SALES_POLICY,leads:company==='A'?[{id:'leadA',name:'Alice',phone:'+919999999999',email:'a@example.com',stage,opportunityVersion:String(opVersion),qualificationVersion:String(qualVersion),permissions:{WHATSAPP:{version:String(permissionVersion),state:permissionState}}}]:[]}};
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});});
 const page=await context.newPage();page.on('pageerror',error=>console.error('Sales fixture page error',error.message));await page.goto(origin);await page.getByRole('option',{name:'Alice (new)'}).waitFor({state:'attached'});await page.getByText(/API acceptance reconciled from an exact signed provider receipt/).waitFor();assert.equal(writes.length,0);await page.getByLabel('Use prospecting profile').check();await page.getByLabel('Target services',{exact:true}).fill('Consulting');await page.getByLabel('Buyer roles',{exact:true}).fill('Owner');await page.getByLabel('Target regions',{exact:true}).fill('Pune');await page.getByLabel('Minimum employees',{exact:true}).fill('10');await page.getByLabel('Maximum employees',{exact:true}).fill('50');await page.getByLabel('Require prospect website').check();await page.getByLabel('Minimum appointment duration (minutes)').fill('20');await page.getByLabel('Maximum appointment duration (minutes)').fill('45');await page.getByLabel('Buffer before appointment (minutes)').fill('10');await page.getByLabel('Buffer after appointment (minutes)').fill('15');await page.getByRole('button',{name:'Save sales policy',exact:true}).click();await page.getByText(/Read-only comparison against saved profile version 1/).waitFor();assert.equal((policy as any).prospecting.employeesMin,10);assert.equal((policy as any).booking.bufferAfterMinutes,15);await page.getByLabel('Prospect service',{exact:true}).fill('Consulting');await page.getByLabel('Prospect buyer role',{exact:true}).fill('Owner');await page.getByLabel('Prospect region',{exact:true}).fill('Pune');await page.getByLabel('Prospect employees',{exact:true}).fill('20');await page.getByLabel('Prospect website',{exact:true}).selectOption('yes');await page.getByLabel('Prospect evidence source',{exact:true}).fill('Owner supplied evidence');await page.getByRole('button',{name:'Assess declared prospect',exact:true}).click();await page.getByRole('heading',{name:'Assessment: DECLARED_FIT',exact:true}).waitFor();const fitDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export declared fit CSV',exact:true}).click();assert.equal((await fitDownload).suggestedFilename(),'declared-prospect-fit.csv');await page.evaluate(()=>localStorage.setItem('abga_auth_token','changed-icp-session'));await page.getByRole('button',{name:'Export declared fit CSV',exact:true}).click();await page.getByText('Session changed. Run the assessment again.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Export declared fit CSV',exact:true}).count(),0);
 await page.getByLabel('Sales lead').selectOption('leadA');
 const appointment = page.getByRole('region',{name:'Appointment evidence'});
 await appointment.getByRole('button',{name:'Load appointment record'}).click();
 await appointment.getByText('No appointment recorded.',{exact:true}).waitFor();
 await appointment.getByLabel('External appointment reference').fill('CalendarFixture');
 await appointment.getByLabel('Appointment start (IST)').fill('2027-01-01T10:00');
 await appointment.getByLabel('Appointment end (IST)').fill('2027-01-01T10:10');
 await appointment.getByText('Appointment duration is outside the saved limits.',{exact:true}).waitFor();
 assert.equal(await appointment.getByRole('button',{name:'Check calendar availability'}).isDisabled(),true);
 await appointment.getByLabel('Appointment end (IST)').fill('2027-01-01T10:30');
 await appointment.getByRole('button',{name:'Check calendar availability'}).click();
 await appointment.getByText(/Calendar reported this window free/).waitFor();
 assert.equal(await appointment.getByRole('button',{name:'Create appointment on Google Calendar'}).count(),0);
 await appointment.getByLabel('Appointment end (IST)').fill('2027-01-01T10:45');
 assert.equal(await appointment.getByText(/Calendar reported this window free/).count(),0);
 await appointment.getByRole('button',{name:'Check calendar event',exact:true}).click();
 await appointment.getByText(/Calendar confirmed this event/).waitFor();
 await appointment.getByRole('button',{name:'Use calendar event times',exact:true}).click();
 assert.match(await appointment.getByLabel('Appointment end (IST)').inputValue(),/^2027-01-01T10:30/);
 await appointment.getByRole('button',{name:'Record confirmed appointment'}).click();
 await appointment.getByRole('alert').filter({hasText:'Save unconfirmed'}).waitFor();
 await appointment.getByRole('button',{name:'Retry exact appointment update'}).click();
 await appointment.getByText(/Confirmed externally.*CalendarFixture/).waitFor();
 assert.equal(bookingWrites[0].startAt,'2027-01-01T10:00:00+05:30');
 assert.match(bookingWrites[0].requestKey,/^[a-f0-9]{64}$/);
 booking=null;
 calendarEnabled=true;
 await appointment.getByRole('button',{name:'Load appointment record'}).click();
 await appointment.getByText('No appointment recorded.',{exact:true}).waitFor();
 await appointment.getByLabel('Appointment start (IST)').fill('2027-01-01T10:00');
 await appointment.getByLabel('Appointment end (IST)').fill('2027-01-01T10:30');
 await appointment.getByRole('button',{name:'Check calendar availability'}).click();
 await appointment.getByLabel('Google Calendar popup reminder').selectOption('15');
 await appointment.getByRole('button',{name:'Create appointment on Google Calendar'}).click();
 await appointment.getByRole('alert').filter({hasText:'Calendar result unavailable'}).waitFor();
 await appointment.getByRole('button',{name:'Load appointment record'}).click();
 await appointment.getByRole('button',{name:'Verify calendar request'}).click();
 await appointment.getByText(/Verified on Google Calendar.*VerifiedFixture/).waitFor();
 assert.equal(calendarCreates,1);
 await appointment.getByRole('button',{name:'Refresh from Google Calendar'}).click();
 await appointment.getByText('Updated the appointment from Google Calendar.',{exact:true}).waitFor();
 await appointment.getByText(/Verified on Google Calendar.*10:15/).waitFor();
 await appointment.getByLabel('Appointment start (IST)').fill('2027-01-01T12:00');
 await appointment.getByLabel('Appointment end (IST)').fill('2027-01-01T12:30');
 await appointment.getByLabel('Google Calendar popup reminder').selectOption('0');
 await appointment.getByRole('button',{name:'Check calendar availability'}).click();
 await appointment.getByRole('button',{name:'Reschedule on Google Calendar'}).click();
 await appointment.getByText(/Verified on Google Calendar.*12:00/).waitFor();
 await appointment.getByRole('button',{name:'Cancel on Google Calendar',exact:true}).click();
 await appointment.getByRole('button',{name:'Keep appointment',exact:true}).click();
 assert.equal(calendarChanges.length,1);
 await appointment.getByRole('button',{name:'Cancel on Google Calendar',exact:true}).click();
 await appointment.getByRole('button',{name:'Confirm Google Calendar cancellation'}).click();
 await appointment.getByText(/Cancelled.*VerifiedFixture/).waitFor();
 assert.deepEqual(calendarChanges.map(change=>change.operation),['RESCHEDULE','CANCEL']);
 const calendarPush=page.getByRole('region',{name:'Google Calendar push'});
 await calendarPush.getByRole('button',{name:'Load Calendar subscription'}).click();
 await calendarPush.getByText('No subscription',{exact:true}).waitFor();
 await calendarPush.getByRole('button',{name:'Register Calendar subscription'}).click();
 await calendarPush.getByText(/^Active.*IST$/).waitFor();
 await calendarPush.getByRole('button',{name:'Disable Calendar subscription locally'}).click();
 await calendarPush.getByText('Disabled locally',{exact:true}).waitFor();
 await calendarPush.getByText('Automatic renewal is enabled.',{exact:true}).waitFor();
 await calendarPush.getByText('Google-side stop queued.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Load sales report'}).click();
 await page.getByText(/Calendar appointments verified/).waitFor();
 await page.getByText(/External Google Calendar reschedules verified/).waitFor();
 await page.getByText('Calendar reschedules reconciled automatically: 2',{exact:true}).waitFor();
 await page.getByText('Appointments with unavailable Calendar checks: 2',{exact:true}).waitFor();
 await page.getByText(/Calendar creations awaiting verification/).waitFor();
 await page.getByText(/Calendar changes awaiting verification/).waitFor();
 await page.getByText('Open appointment reminders: 2',{exact:true}).waitFor();
 await page.getByText('Reminders waiting for Calendar verification: 1',{exact:true}).waitFor();
 await page.getByText('Appointment reminders accepted by provider API: 1',{exact:true}).waitFor();
 await page.getByLabel('Permission evidence').fill('Explicit consent form record');await page.getByLabel('Permission state').selectOption('ALLOWED');await page.getByRole('button',{name:'Save contact permission'}).click();await page.getByText(/Saved ALLOWED/).waitFor();
 await page.getByLabel('Opportunity stage').selectOption('won');await page.getByLabel('Outcome reason').fill('Manually confirmed contract');await page.getByRole('button',{name:'Save opportunity'}).click();await page.getByRole('option',{name:'Alice (won)'}).waitFor({state:'attached'});
 for(let i=1;i<=3;i++)await page.getByLabel('Qualification answer '+i).fill('Human supplied answer');await page.getByRole('button',{name:'Save qualification'}).click();await page.waitForFunction(()=>document.querySelector('select[aria-label="Sales lead"]')?.textContent?.includes('won'));
 await page.getByLabel('Prospect source').fill('Owner supplied list');await page.getByLabel('Prospect CSV').fill('name,phone,email,service\nNew,+919999999999,,Service');await page.getByRole('button',{name:'Preview prospects',exact:true}).click();await page.getByText('Row 1: Ready for import',{exact:true}).waitFor();await page.getByRole('button',{name:'Import prospects'}).click();await page.getByText('Imported 1; other outcomes 0. No consent granted.').waitFor();assert.match(keys[0],/^[a-f0-9]{64}$/);
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Save sales policy'&&!b.disabled));const priorWrites=writes.length;await page.getByLabel('Industry qualification pack').selectOption('education');assert.equal(writes.length,priorWrites);assert.match(await page.getByLabel('Qualification questions',{exact:true}).inputValue(),/approved course or training/);await page.getByRole('button',{name:'Save sales policy',exact:true}).click();await page.getByLabel('Qualification answer 6',{exact:true}).waitFor();assert.equal(policy.questions.length,6);
 conflict=true;await page.getByLabel('ICP industries').fill('Consulting');await page.getByRole('button',{name:'Save sales policy'}).click();await page.getByRole('alert').filter({hasText:'Change unconfirmed'}).waitFor();assert.equal(await page.getByLabel('ICP industries').inputValue(),'Consulting');assert.equal(await page.getByRole('button',{name:'Save sales policy'}).isDisabled(),true);
 await page.evaluate(()=>(window as any).changeClient());await page.getByText('No saved messages loaded.').waitFor();assert.equal(await page.getByRole('option',{name:/Alice/}).count(),0);assert.equal(await page.getByLabel('Use prospecting profile').isChecked(),false);assert.equal(await page.getByLabel('Target services',{exact:true}).inputValue(),'');assert.equal(await page.getByText('Actual saved inquiry',{exact:true}).count(),0);assert.equal(await page.getByText(/CalendarFixture/).count(),0);assert.ok(writes.some(w=>w.path.endsWith('/qualification')));console.log('Ten-area sales browser: consent CAS, canonical opportunity stage, qualification answers, stable import identity/no-consent, retained conflict draft, manual-only report, Calendar lost-response recovery and client isolation passed without provider traffic.');
}finally{if(browser)await browser.close();await vite.close();}
