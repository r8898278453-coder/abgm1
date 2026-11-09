import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'vite';
const fixture='/__competitor_fixture.tsx';
const vite=await createServer({plugins:[{name:'competitor-fixture',resolveId(id){if(id===fixture)return id;},load(id){if(id!==fixture)return;return `
import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{CompetitorsView}from'/src/components/CompetitorsView.tsx';
const initial=[{id:'c',name:'Alpha competitor',rating:4,reviewsCount:10,dataClassification:'USER_ENTERED',provider:'manual'},{id:'d',name:'Second competitor',rating:null,reviewsCount:null}];
window.acks=[];function App(){const[company,setCompany]=useState('A'),[items,setItems]=useState(initial);window.changeClient=()=>{setCompany('B');setItems([{id:'b',name:'Beta competitor'}]);};return <CompetitorsView key={company} companyId={company} competitors={items} onNavigate={()=>{}} onUpdateCompetitors={(rows,ack)=>{window.acks.push(ack);setItems(rows);}}/>;}createRoot(document.getElementById('root')).render(<App/>);
`;}}],server:{host:'127.0.0.1',port:0},logLevel:'error'});
await vite.listen();let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined,release:(()=>void)|undefined;
try{
 const address=vite.httpServer!.address() as any,origin=`http://127.0.0.1:${address.port}`;let mode='delete-failure',firstHistory=false;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!==origin){await route.abort();return;}if(url.pathname==='/'){await route.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/',`<div id="root"></div><script type="module" src="${fixture}"></script>`)});return;}
  if(!url.pathname.startsWith('/api/')){await route.continue();return;}
  let status=503,body:any={success:false,error:'Unavailable'};
  if(mode==='late-delete'){await new Promise<void>(resolve=>{release=resolve;});status=200;body={success:true,companyId:'A',competitors:[],version:'1',previousVersion:'0'};}
  if(mode==='history'){
   const id=url.pathname.split('/')[5];if(id==='c'){firstHistory=true;await new Promise<void>(resolve=>{release=resolve;});}
   status=200;body={success:true,companyId:'A',competitorId:id,history:[]};
  }
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);await page.goto(origin);await page.getByText('Alpha competitor',{exact:true}).waitFor();
 await page.getByTitle('Remove competitor',{exact:true}).first().click();await page.getByText('Delete unconfirmed. Record retained; reload workspace before retrying.',{exact:true}).waitFor();assert.equal(await page.getByText('Alpha competitor',{exact:true}).count(),1);assert.equal(await page.evaluate(()=>(window as any).acks.length),0);
 mode='save-failure';await page.reload();await page.getByTitle('Edit competitor',{exact:true}).first().click();await page.getByPlaceholder('e.g. Star Tech Solutions').fill('Retained edit');await page.getByRole('button',{name:'Update Competitor',exact:true}).click();await page.getByText('Save unconfirmed. Your form is retained. Reload workspace before retrying.',{exact:true}).waitFor();assert.equal(await page.getByPlaceholder('e.g. Star Tech Solutions').inputValue(),'Retained edit');assert.equal(await page.evaluate(()=>(window as any).acks.length),0);
 mode='history';await page.reload();await page.getByTitle('View snapshot history in MySQL',{exact:true}).first().click();await page.waitForFunction(()=>document.body.innerText.includes('Observation History: Alpha competitor'));assert.equal(firstHistory,true);
 // Switching client discards the modal and ignores the old history completion.
 await page.evaluate(()=>(window as any).changeClient());release?.();release=undefined;await page.getByText('Beta competitor',{exact:true}).waitFor();assert.equal(await page.getByText('Observation History: Alpha competitor',{exact:true}).count(),0);
 mode='late-delete';await page.reload();await page.getByTitle('Remove competitor',{exact:true}).first().click();await page.waitForTimeout(50);assert.ok(release);await page.evaluate(()=>(window as any).changeClient());release?.();release=undefined;await page.getByText('Beta competitor',{exact:true}).waitFor();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>(window as any).acks.length),0);
 console.log('Competitor browser: failed delete retains record, failed edit retains form, old-client history and late mutation cannot update new client; external requests blocked.');
}finally{release?.();await browser?.close();await vite.close();}
