import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'vite';
import {generateStorefrontHtml} from '../../server/websiteService';
const vite=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/uploads/**','**/dist/**','**/docs/**']}},logLevel:'error'});await vite.listen();
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;let release:(()=>void)|undefined;
try{
 const origin=`http://127.0.0.1:${(vite.httpServer!.address() as any).port}`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({serviceWorkers:'block',timezoneId:'America/Los_Angeles'});
 const user={id:'fixture-owner',email:'fixture@example.invalid',full_name:'Fixture Owner',role:'agency',is_platform_admin:false};
 const companies=[{id:'A',user_id:user.id,name:'Alpha Clinic',category:'Clinic',city:'Pune',phone:'+919999999999'},{id:'B',user_id:user.id,name:'Beta Studio',category:'Studio',city:'Delhi',phone:''}];
 await context.addInitScript(({user})=>{localStorage.setItem('abga_auth_token','fixture-token');localStorage.setItem('abga_user_profile',JSON.stringify(user));localStorage.setItem('abga_active_company_id','A');},{user});
 let hold=false,failed=false,writes=0,holdExport=false;let exportSignal:(()=>void)|undefined;let signal:(()=>void)|undefined;
 const configs:Record<string,any>={A:{company_id:'A',hero_title:'Alpha saved',primary_color:'#112233',secondary_color:'#445566',enable_whatsapp_cta:true,enable_direct_call_cta:true,enable_inquiry_form:true},B:null};
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!==origin){await route.abort();return;}if(!url.pathname.startsWith('/api/')){await route.continue();return;}
  let body:any={success:true,companyId:url.searchParams.get('companyId'),reviews:[],posts:[],leads:[],campaigns:[],actions:[],logs:[],recommendations:[]};
  if(url.pathname==='/api/auth/me')body={success:true,user};
  else if(url.pathname==='/api/companies')body={success:true,companies};
  else if(/^\/api\/companies\/[AB]\/data$/.test(url.pathname)){const id=url.pathname.split('/')[3];const company=companies.find(row=>row.id===id);body={success:true,companyId:id,company,data:{business:company},version:'0'};}
  else if(/\/website\/export$/.test(url.pathname)){if(holdExport){exportSignal?.();await new Promise<void>(resolve=>{release=resolve;});}await route.fulfill({status:200,contentType:'application/zip',body:Buffer.from('fixture zip')});return;}
  else if(/\/website\/config$/.test(url.pathname)){
   const id=url.pathname.split('/')[3];
   if(route.request().method()==='PUT'){writes++;const data=route.request().postDataJSON();assert.equal(data.company_id,undefined);configs[id]={...(configs[id]||{}),...data,company_id:id};}
   if(id==='A'&&hold){signal?.();await new Promise<void>(resolve=>{release=resolve;});}
   if(id==='B'&&failed){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});return;}
   body={success:true,companyId:id,config:configs[id]};
  }else if(/\/domains$/.test(url.pathname)){const id=url.pathname.split('/')[3];body={success:true,companyId:id,domains:id==='A'?[{id:'domain',company_id:'A',domain:'alpha.example.invalid',status:'dns_verified',ssl_status:'unverified',dns_txt_record:'challenge',verified_at:'2026-11-05T00:00:00Z'}]:[]};}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 const page=await context.newPage();await page.goto(origin);await page.getByRole('button',{name:/Mini Website & Local SEO/}).click();
 await page.getByText('Loading saved website data…',{exact:true}).waitFor({state:'hidden'});assert.equal(await page.getByText('SSL Active',{exact:true}).count(),0);
 await page.getByRole('button',{name:/SEO.*Branding/}).click();
 await page.locator('input[value="Alpha saved"]').waitFor();
 hold=true;let pending=new Promise<void>(resolve=>{signal=resolve;});await page.getByRole('button',{name:'Save Configuration',exact:true}).click();await pending;
 await page.locator('input[value="Alpha saved"]').fill('Alpha newer');release?.();release=undefined;hold=false;await page.getByRole('button',{name:'Save Configuration',exact:true}).waitFor();assert.equal(await page.locator('input[value="Alpha newer"]').count(),1);assert.equal(await page.getByText(/Configuration saved successfully/).count(),0);
 hold=true;pending=new Promise<void>(resolve=>{signal=resolve;});await page.getByRole('button',{name:'Save Configuration',exact:true}).click();await pending;
 await page.locator('header select').first().selectOption('B');await page.getByText('Loading saved website data…',{exact:true}).waitFor({state:'hidden'});release?.();release=undefined;hold=false;
 await page.getByRole('button',{name:/SEO.*Branding/}).click();assert.equal(await page.locator('input[value="Alpha saved"]').count(),0);assert.equal(await page.getByText(/Configuration saved successfully/).count(),0);
 failed=true;await page.locator('header select').first().selectOption('A');await page.getByText('Loading saved website data…',{exact:true}).waitFor({state:'hidden'});await page.locator('header select').first().selectOption('B');await page.getByRole('alert').filter({hasText:'Website data unavailable'}).waitFor();await page.getByRole('button',{name:/SEO.*Branding/}).click();assert.equal(await page.getByRole('button',{name:'Save Configuration',exact:true}).isDisabled(),true);
 failed=false;await page.getByRole('button',{name:'Reload website data',exact:true}).click();await page.getByText('Loading saved website data…',{exact:true}).waitFor({state:'hidden'});assert.equal(await page.getByRole('button',{name:'Save Configuration',exact:true}).isEnabled(),true);assert.equal(writes,2);
 holdExport=true;const exportPending=new Promise<void>(resolve=>{exportSignal=resolve;});
 await page.evaluate(`(async()=>{const service=await import('/src/services/authService.ts');window.exportCurrent=true;window.downloads=0;HTMLAnchorElement.prototype.click=function(){window.downloads++;};window.exportResult=service.downloadStaticWebsiteZip('A','example.invalid',{isCurrent:()=>window.exportCurrent}).then(()=>true,()=>false);})()`);
 await exportPending;await page.evaluate(()=>{(window as any).exportCurrent=false;});release?.();release=undefined;holdExport=false;assert.equal(await page.evaluate(()=>(window as any).exportResult),false);assert.equal(await page.evaluate(()=>(window as any).downloads),0);
 await context.close();
 // Execute the generated inquiry script in Chromium. Every API and external resource is intercepted.
 const formContext=await browser.newContext({serviceWorkers:'block'});let mode='unknown',submissions=0,receiptReads=0,forceNotFound=false;const token="exact'</script><script>window.injected=true</script>";
 const ledger=new Map<string,{id:string;input:string}>();const ids:string[]=[];
 const html=generateStorefrontHtml({id:'fixture',name:'Fixture',category:'Service',phone:'+919999999999',public_form_token:token} as any);
 await formContext.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==origin){await route.abort();return;}if(url.pathname==='/form'){await route.fulfill({contentType:'text/html',body:url.searchParams.has('reset')?html.replace('<head>','<head><script>sessionStorage.clear()</script>'):html});return;}
  if(url.pathname==='/api/public/leads/receipt'){receiptReads++;const input=route.request().postDataJSON();assert.equal(input.publicFormToken,token);const saved=ledger.get(input.requestId);await route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,requestId:input.requestId,receipt:saved&&!forceNotFound?{status:'RECEIVED',leadId:saved.id}:{status:'NOT_FOUND'}})});return;}
  if(url.pathname==='/api/public/leads'){
   submissions++;const input=route.request().postDataJSON();assert.equal(input.publicFormToken,token);assert.match(input.requestId,/^[a-f0-9-]{36}$/);ids.push(input.requestId);
   if(mode==='network'){await route.abort();return;}
   const saved=ledger.get(input.requestId);const serialized=JSON.stringify({...input,requestId:undefined});
   if(saved&&saved.input!==serialized){await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({success:false})});return;}
   if(['success','lost'].includes(mode)&&!saved)ledger.set(input.requestId,{id:'lead-'+input.requestId,input:serialized});
   await route.fulfill({status:mode==='rejected'?400:['unknown','lost'].includes(mode)?503:200,contentType:'application/json',body:JSON.stringify(mode==='success'?{success:true,lead:{id:ledger.get(input.requestId)!.id},requestId:input.requestId,idempotent:true}:mode==='malformed'?{success:true}:{success:false})});return;
  }await route.abort();
 });
 const form=await formContext.newPage();
 async function fillAndSubmit(){await form.locator('#leadName').fill('Fixture customer');await form.locator('#leadPhone').fill('9999999999');await form.locator('#submitBtn').click();}
 for(const next of ['unknown','network','malformed','rejected','success']){
  mode=next;await form.goto(origin+'/form?reset=1');assert.equal(await form.evaluate(()=>(window as any).injected),undefined);
  await form.locator('#submitBtn').waitFor();await fillAndSubmit();
  await form.locator('#formFeedback').filter({hasText:next==='success'?'submitted successfully':next==='rejected'?'Inquiry was rejected':'Submission was not confirmed'}).waitFor();
  assert.equal(await form.locator('#leadName').inputValue(),next==='success'?'':'Fixture customer');assert.equal(await form.locator('#submitBtn').isDisabled(),next!=='rejected');
 }
 assert.equal(submissions,5);
 mode='lost';await form.goto(origin+'/form?reset=1');await fillAndSubmit();await form.getByText(/Submission was not confirmed/).waitFor();await form.evaluate(()=>history.replaceState({},'', '/form'));const lostId=ids.at(-1);const before=submissions;
 const storage=await form.evaluate(()=>JSON.stringify({...sessionStorage}));assert.ok(!storage.includes('Fixture customer')&&!storage.includes('9999999999')&&!storage.includes('publicFormToken')&&!storage.includes('script'));
 await form.reload();await form.getByText('Your previous inquiry was received. Start a new inquiry only if needed.',{exact:true}).waitFor();assert.equal(submissions,before);assert.ok(receiptReads>0);await form.reload();await form.getByRole('button',{name:'Start a new inquiry',exact:true}).waitFor();assert.equal(submissions,before);
 await form.getByRole('button',{name:'Start a new inquiry',exact:true}).click();mode='success';await fillAndSubmit();await form.getByText(/submitted successfully/).waitFor();assert.notEqual(ids.at(-1),lostId);
 mode='network';await form.goto(origin+'/form?reset=1');await fillAndSubmit();await form.getByText(/Submission was not confirmed/).waitFor();await form.evaluate(()=>history.replaceState({},'', '/form'));const pendingId=ids.at(-1);await form.reload();await form.getByText(/No saved receipt observed yet/).waitFor();mode='success';await fillAndSubmit();await form.getByText(/submitted successfully/).waitFor();assert.equal(ids.at(-1),pendingId);
 mode='lost';await form.getByRole('button',{name:'Start a new inquiry',exact:true}).click();await fillAndSubmit();await form.getByText(/Submission was not confirmed/).waitFor();forceNotFound=true;await form.getByRole('button',{name:'Check inquiry receipt',exact:true}).click();await form.getByText(/No saved receipt observed yet/).waitFor();forceNotFound=false;mode='success';await form.locator('#leadPhone').fill('8888888888');await form.locator('#submitBtn').click();await form.getByText(/reference belongs to different inquiry details/).waitFor();await form.getByRole('button',{name:'Check inquiry receipt',exact:true}).click();await form.getByText(/Your previous inquiry was received/).waitFor();assert.equal(await form.locator('#leadPhone').inputValue(),'8888888888');
 const beforeCorrupt=submissions;await form.evaluate(()=>{const key=Object.keys(sessionStorage)[0];sessionStorage.setItem(key,'{"v":9}');});await form.reload();await form.getByText(/Inquiry recovery unavailable/).waitFor();assert.equal(await form.locator('#submitBtn').isDisabled(),true);assert.equal(submissions,beforeCorrupt);
 await formContext.close();
 console.log('Website browser: late old-client save/download fenced, newer draft retained after older ACK, client defaults reset, unavailable read blocks edits until reload, no false TLS badge; generated form preserves exact token, receipt recovery survives lost ACK/reload, pending retry keeps request ID, explicit new inquiry changes ID, changed-body conflict and corrupt-state fail closed, no contact data in storage passed.');
}finally{release?.();await browser?.close();await vite.close();}
