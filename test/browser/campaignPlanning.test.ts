import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'vite';
const fixture='/__campaign_fixture.tsx';
const vite=await createServer({plugins:[{name:'campaign-fixture',resolveId(id){if(id===fixture)return id;},load(id){if(id!==fixture)return;return `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{CampaignsView}from'/src/components/CampaignsView.tsx';function App(){const[c,setC]=useState('A');window.changeClient=()=>setC('B');return <CampaignsView key={c} companyId={c}/>;}createRoot(document.getElementById('root')).render(<App/>);`;}}],server:{host:'127.0.0.1',port:0},logLevel:'error'});
await vite.listen();let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined,release:(()=>void)|undefined;
try{
 const origin=`http://127.0.0.1:${(vite.httpServer!.address() as any).port}`;let failRead=true,failSave=true,hold=false,signal:(()=>void)|undefined;const writes:any[]=[];
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!==origin){await route.abort();return;}if(url.pathname==='/'){await route.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/',`<div id="root"></div><script type="module" src="${fixture}"></script>`)});return;}if(!url.pathname.startsWith('/api/')){await route.continue();return;}
  let status=200,body:any={success:true};
  if(url.pathname==='/api/campaigns/internal'&&route.request().method()==='POST'){
   const input=route.request().postDataJSON();writes.push(input);assert.equal(input.company_id,'A');if(hold){signal?.();await new Promise<void>(resolve=>{release=resolve;});}
   if(failSave){status=503;body={success:false};}else body={success:true,companyId:'A',campaign:{...input,id:'saved-A',created_at:'2026-11-10T00:00:00Z'}};
  }else if(url.pathname.startsWith('/api/campaigns/')){const company=url.searchParams.get('company_id');if(failRead&&url.pathname.endsWith('/internal')){status=503;body={success:false};}else body={success:true,companyId:company,campaigns:[]};}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);await page.goto(origin);await page.getByRole('alert').waitFor();assert.equal(await page.getByText('No internal marketing initiatives created yet.',{exact:true}).count(),0);
 failRead=false;await page.getByRole('button',{name:'Reload campaign records',exact:true}).click();await page.getByText('No internal marketing initiatives created yet.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Plan New Initiative',exact:true}).click();await page.getByLabel('Initiative Title',{exact:true}).fill('Alpha plan');await page.getByLabel('Strategic Objective',{exact:true}).fill('More inquiries');await page.getByRole('button',{name:'Save Initiative',exact:true}).click();await page.getByText('Campaign change unconfirmed. Reload stored records before retrying.',{exact:true}).waitFor();assert.equal(await page.getByLabel('Initiative Title').inputValue(),'Alpha plan');
 await page.getByRole('button',{name:'Save Initiative',exact:true}).click();await page.waitForTimeout(100);assert.equal(writes.length,1);
 await page.getByRole('button',{name:'Reload campaign records',exact:true}).evaluate((element:HTMLButtonElement)=>element.click());await page.getByText('No internal marketing initiatives created yet.',{exact:true}).waitFor();
 failSave=false;await page.getByRole('button',{name:'Save Initiative',exact:true}).click();await page.getByText('Internal planning record saved. This does not launch ads or spend budget.',{exact:true}).waitFor();await page.getByText('Alpha plan',{exact:true}).waitFor();await page.getByRole('button',{name:'Plan New Initiative',exact:true}).click();hold=true;const started=new Promise<void>(resolve=>{signal=resolve;});await page.getByRole('button',{name:'Save Initiative',exact:true}).click();await started;await page.evaluate(()=>(window as any).changeClient());await page.getByText('No internal marketing initiatives created yet.',{exact:true}).waitFor();release?.();release=undefined;await page.waitForTimeout(100);assert.equal(await page.getByText('Alpha plan',{exact:true}).count(),0);assert.equal(await page.getByText(/Internal planning record saved/).count(),0);
 console.log('Campaign browser: read failure differs from empty, successful stored-only planning acknowledgement, failed draft retained, uncertain duplicate submission fenced until reload, exact client payload and late save excluded from next client; external traffic blocked.');
}finally{release?.();await browser?.close();await vite.close();}
