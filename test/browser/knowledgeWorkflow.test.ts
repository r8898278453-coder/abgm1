import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'vite';
const fixture='/__knowledge_fixture.tsx';
const vite=await createServer({plugins:[{name:'knowledge-fixture',resolveId(id){if(id===fixture)return id;},load(id){if(id!==fixture)return;return `
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{KnowledgeBaseView}from'/src/components/KnowledgeBaseView.tsx';
function App(){const[company,setCompany]=useState('A');window.changeClient=()=>setCompany('B');return <KnowledgeBaseView key={company} companyId={company} business={{name:company+' Client',services:[]}} documents={[]} faqs={[]}/>;}createRoot(document.getElementById('root')).render(<App/>);
`;}}],server:{host:'127.0.0.1',port:0},logLevel:'error'});
await vite.listen();let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined,release:(()=>void)|undefined;
try{
 const address=vite.httpServer!.address() as any,origin=`http://127.0.0.1:${address.port}`;let version=2,approved=false,failQuery=false,holdPreview=false,signal:(()=>void)|undefined;const queries:any[]=[],writes:any[]=[];
 const source=()=>({id:'s',companyId:'A',filename:'pricing.pdf',mediaType:'application/pdf',byteSize:100,contentSha:'a'.repeat(64),state:'EXTRACTED',code:'TEXT_EXTRACTED',version:String(version),approved,createdAtMs:0});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!==origin){await route.abort();return;}if(url.pathname==='/'){await route.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/',`<div id="root"></div><script type="module" src="${fixture}"></script>`)});return;}if(!url.pathname.startsWith('/api/')){await route.continue();return;}
  let status=200,body:any={success:true};
  if(url.pathname==='/api/ai/knowledge/query'){
   const input=route.request().postDataJSON();queries.push(input);assert.deepEqual(Object.keys(input).sort(),['companyId','query']);
   if(failQuery){status=503;body={success:false};}else body={success:true,companyId:input.companyId,status:approved?'MATCHES':'NO_MATCH',mode:'EXTRACTIVE_SAVED_SOURCES',answer:approved?'[S1] Delivery in 14 days.':'No matching saved source was found.',isGrounded:approved,citations:approved?[{label:'S1',title:'pricing.pdf',sourceId:'s',sourceVersion:'3',page:1,contentSha:'a'.repeat(64),excerpt:'Delivery in 14 days.'}]:[],sourceWindowTruncated:false};
  }else if(url.pathname.endsWith('/preview')){signal?.();if(holdPreview)await new Promise<void>(resolve=>{release=resolve;});body={success:true,companyId:'A',source:source(),chunks:[{page:1,index:0,start:0,end:20,text:'Delivery in 14 days.'}]};}
  else if(url.pathname.endsWith('/retry')){assert.equal(route.request().postDataJSON().expectedVersion,String(version));version+=2;approved=false;body={success:true,companyId:'A',sources:[source()]};}
  else if(url.pathname.endsWith('/approve')){const input=route.request().postDataJSON();writes.push(input);assert.equal(input.expectedVersion,String(version));approved=true;version++;body={success:true,companyId:'A',sources:[source()]};}
  else if(url.pathname.endsWith('/withdraw-approval')){assert.equal(route.request().postDataJSON().expectedVersion,String(version));approved=false;version++;body={success:true,companyId:'A',sources:[source()]};}
  else if(url.pathname.endsWith('/knowledge/sources')){const company=url.pathname.split('/')[3];body={success:true,companyId:company,sources:company==='A'?[source()]:[]};}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);await page.goto(origin);await page.getByText('pricing.pdf',{exact:true}).waitFor();
 await page.getByPlaceholder(/^Ask anything/).fill('delivery');await page.getByRole('button',{name:'Search Saved Sources',exact:true}).click();await page.getByText('No matching saved source was found.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Review extracted text',exact:true}).click();await page.getByText('Extraction preview: pricing.pdf',{exact:true}).waitFor();await page.getByRole('button',{name:'Approve this extraction version',exact:true}).click();await page.getByText(/Approved for search/).waitFor();assert.equal(writes.length,1);
 await page.getByRole('button',{name:'Search Saved Sources',exact:true}).click();await page.getByText('[S1] Delivery in 14 days.',{exact:true}).waitFor();await page.getByText(/version 3 · page 1/).waitFor();assert.equal(queries[0].companyId,'A');
 await page.getByRole('button',{name:'Review extracted text',exact:true}).click();await page.getByRole('button',{name:'Stop using this source',exact:true}).click();await page.getByRole('button',{name:'Search Saved Sources',exact:true}).click();await page.getByText('No matching saved source was found.',{exact:true}).waitFor();
 failQuery=true;await page.getByRole('button',{name:'Search Saved Sources',exact:true}).click();await page.getByText('Saved-source search unavailable. No facts were verified.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Retry extraction',exact:true}).click();await page.getByText('Review extracted text',{exact:true}).waitFor();
 holdPreview=true;const started=new Promise<void>(resolve=>{signal=resolve;});await page.getByRole('button',{name:'Review extracted text',exact:true}).click();await started;await page.evaluate(()=>(window as any).changeClient());await page.getByRole('heading',{name:'B Client Knowledge Base & Fact Memory'}).waitFor();release?.();release=undefined;await page.waitForTimeout(100);assert.equal(await page.getByText('Extraction preview: pricing.pdf',{exact:true}).count(),0);assert.equal(await page.getByText('[S1] Delivery in 14 days.',{exact:true}).count(),0);
 console.log('Knowledge browser: real source states and revision approval flow, saved-only query payload, citation page/version, failed query never verifies, late preview cannot enter another client; external traffic blocked.');
}finally{release?.();await browser?.close();await vite.close();}
