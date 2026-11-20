import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'vite';
const fixture='/__integration_fixture.tsx';
const vite=await createServer({plugins:[{name:'integration-fixture',resolveId(id){if(id===fixture)return id;},load(id){if(id!==fixture)return;return `
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{IntegrationsView}from'/src/components/IntegrationsView.tsx';
function App(){const[company,setCompany]=useState('A');window.changeClient=()=>setCompany('B');return <IntegrationsView key={company} companyId={company} business={{}}/>;}createRoot(document.getElementById('root')).render(<App/>);
`;}}],server:{host:'127.0.0.1',port:0},logLevel:'error'});
await vite.listen();let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined,release:(()=>void)|undefined;
try{
 const address=vite.httpServer!.address() as any,origin=`http://127.0.0.1:${address.port}`;let calendarConnected=false;const oauthState='a'.repeat(43);let mode='test',signal:(()=>void)|undefined;const writes:any[]=[];
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin==='https://accounts.google.com'&&url.pathname==='/o/oauth2/v2/auth'){
   assert.equal(url.searchParams.get('state'),oauthState);
   await route.fulfill({contentType:'text/html',body:'<script>location.replace('+JSON.stringify(origin+'/api/oauth/google-calendar/callback?state='+oauthState+'&code=fixture-browser-code')+')</script>'});
   return;
  }
  if(url.origin!==origin){await route.abort();return;}if(url.pathname==='/'){await route.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/',`<div id="root"></div><script type="module" src="${fixture}"></script>`)});return;}
  if(!url.pathname.startsWith('/api/')){await route.continue();return;}
  let body:any,status=200;
  if(url.pathname==='/api/oauth/google-calendar/callback'){
   await route.fulfill({contentType:'text/html',body:'<p id="calendar-oauth-status"></p><script src="/calendar-oauth-callback.js" defer></script>'});
   return;
  }
  if(url.pathname.startsWith('/api/companies/A/calendar-oauth')){
   if(url.pathname.endsWith('/begin')){
    assert.deepEqual(route.request().postDataJSON(),{calendarId:'fixture@group.calendar.google.com'});
    const authorization=new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorization.searchParams.set('state',oauthState);
    authorization.searchParams.set('redirect_uri',origin+'/api/oauth/google-calendar/callback');
    body={success:true,companyId:'A',oauth:{url:authorization.href,state:oauthState}};
   }else if(url.pathname.endsWith('/finish')){
    assert.deepEqual(route.request().postDataJSON(),{state:oauthState,code:'fixture-browser-code'});
    calendarConnected=true;
    body={success:true,companyId:'A',oauth:{state:'CONNECTED'}};
   }else{
    body={success:true,companyId:'A',oauth:{available:true,calendarId:calendarConnected?'fixture@group.calendar.google.com':null,
     mode:calendarConnected?'OAUTH':'NOT_CONNECTED',expiresAtMs:calendarConnected?Date.now()+3600000:null}};
   }
  }else if(url.pathname==='/api/integrations'){
   const company=url.searchParams.get('companyId');if(mode==='unavailable'){status=503;body={success:false};}
   else body={success:true,companyId:company,integrations:['one','two'].map(id=>({id,name:company+' provider '+id,description:'Saved client fixture',category:'Platform',icon:'X',requiredFields:[{key:'apiKey',label:'API Key',placeholder:'fixture-key',secret:true,required:true}],connected:id==='one',status:'saved',statusText:'Credentials saved; permissions unverified',maskedCredentials:{apiKey:'••••••••'}}))};
  }else{const input=route.request().postDataJSON();writes.push(input);assert.equal(input.companyId,'A');signal?.();await new Promise<void>(resolve=>{release=resolve;});body={success:true,companyId:'A',message:'Late A result'};}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);await page.goto(origin);await page.getByText('A provider one',{exact:true}).waitFor();await page.getByText('Saved provider configuration',{exact:true}).waitFor();assert.equal(await page.getByText('Production Gateway Ready',{exact:true}).count(),0);const decisions=page.getByRole('region',{name:'Optional extension decisions'});assert.equal(await decisions.locator('summary').count(),5);assert.equal(await decisions.getByRole('button').count(),0);await decisions.getByText('External CRM connector · Deferred / off',{exact:true}).click();await decisions.getByText(/The internal client CRM remains canonical/).waitFor();
 const calendar=page.getByRole('region',{name:'Google Calendar OAuth'});
 await calendar.getByRole('button',{name:'Load Calendar connection'}).click();
 await calendar.getByLabel('Calendar ID').fill('fixture@group.calendar.google.com');
 await calendar.getByRole('button',{name:'Connect with Google'}).click();
 await calendar.getByText('Google Calendar connection verified.',{exact:true}).waitFor();
 await calendar.getByText(/^Google OAuth.*IST$/).waitFor();
 assert.equal(calendarConnected,true);
 await page.getByRole('button',{name:'Manage Keys',exact:true}).first().click();const started=new Promise<void>(resolve=>{signal=resolve;});await page.getByRole('button',{name:'Test Live Connection',exact:true}).click();await started;assert.equal(writes[0].credentials.apiKey,'••••••••');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Manage Keys',exact:true}).nth(1).click();const reply=page.waitForResponse(r=>r.url().endsWith('/api/integrations/test'));release?.();release=undefined;await reply;await page.waitForTimeout(50);assert.equal(await page.getByText('Late A result',{exact:true}).count(),0);await page.getByRole('button',{name:'Save Credentials',exact:true}).waitFor();
 const saveStarted=new Promise<void>(resolve=>{signal=resolve;});await page.getByRole('button',{name:'Save Credentials',exact:true}).click();await saveStarted;await page.evaluate(()=>(window as any).changeClient());await page.getByText('B provider one',{exact:true}).waitFor();release?.();release=undefined;await page.waitForTimeout(100);assert.equal(await page.getByText('A provider one',{exact:true}).count(),0);assert.equal(await page.getByText('Late A result',{exact:true}).count(),0);
 mode='unavailable';await page.reload();await page.getByText('Integration metadata unavailable. Reload to retry.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Manage Keys',exact:true}).count(),0);
 console.log('Integration browser: explicit company on masked-key test/save, old-modal check ignored, old-client save cannot reload/close current client, unavailable metadata excludes stale cards; external requests blocked.');
}finally{release?.();await browser?.close();await vite.close();}
