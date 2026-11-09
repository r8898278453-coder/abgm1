import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'vite';
const vite=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/uploads/**','**/dist/**','**/docs/**']}},logLevel:'error'});await vite.listen();
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 const origin=`http://127.0.0.1:${(vite.httpServer!.address() as any).port}`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({serviceWorkers:'block',timezoneId:'America/Los_Angeles'});
 const user={id:'fixture-admin',email:'fixture@example.invalid',full_name:'Fixture',role:'agency',is_platform_admin:true};
 const company={id:'A',user_id:user.id,name:'Admin Fixture',category:'Service',city:'Pune'};
 await context.addInitScript(user=>{localStorage.setItem('abga_auth_token','fixture-token');localStorage.setItem('abga_user_profile',JSON.stringify(user));localStorage.setItem('abga_active_company_id','A');},user);
 let denied=false,empty=false,posts=0;const cursors:Array<string|null>=[];
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!==origin){await route.abort();return;}if(!url.pathname.startsWith('/api/')){await route.continue();return;}
  if(route.request().method()==='POST')posts++;
  let body:any={success:true,companyId:url.searchParams.get('companyId'),reviews:[],posts:[],leads:[],campaigns:[],actions:[],logs:[],recommendations:[]};
  if(url.pathname==='/api/auth/me')body={success:true,user};
  else if(url.pathname==='/api/companies')body={success:true,companies:[company]};
  else if(url.pathname==='/api/companies/A/data')body={success:true,companyId:'A',company,data:{business:company},version:'0'};
  else if(url.pathname==='/api/scheduler/history'){
   cursors.push(url.searchParams.get('before'));
   if(denied){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({success:false})});return;}
   const older=!!url.searchParams.get('before');body={success:true,history:empty?[]:[{slot:older?'100':'200',status:older?'PARTIAL':'UNKNOWN',stages:older?{queue:'OBSERVED',digest:'DEFERRED'}:{queue:'STARTED'},startedAtMs:Date.parse('2026-11-05T00:00:00Z'),finishedAtMs:null}],nextBefore:empty||older?null:'200'};
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 const page=await context.newPage();await page.goto(origin);await page.getByRole('button',{name:/^AI Control & Guardrails/}).click();
 const panel=page.getByRole('region',{name:'Scheduler run history'});await panel.getByText('Run 200 · UNKNOWN',{exact:true}).waitFor();await panel.getByText(/IST/).waitFor();
 await panel.getByRole('button',{name:'Load older scheduler runs',exact:true}).click();await panel.getByText('Run 100 · PARTIAL',{exact:true}).waitFor();assert.equal(cursors.at(-1),'200');assert.ok(cursors.slice(0,-1).every(cursor=>cursor===null));assert.equal(posts,0);
 denied=true;await panel.getByRole('button',{name:'Refresh scheduler history',exact:true}).click();await panel.getByRole('alert').waitFor();assert.equal(await panel.getByText('Run 200 · UNKNOWN',{exact:true}).count(),0);
 denied=false;empty=true;await panel.getByRole('button',{name:'Refresh scheduler history',exact:true}).click();await panel.getByText('No scheduler runs recorded.',{exact:true}).waitFor();assert.equal(posts,0);
 console.log('Dispatcher browser: admin history, strict keyset pagination, IST display, UNKNOWN/PARTIAL evidence, permission-loss clearing, real empty state and zero tick/send writes passed.');
}finally{await browser?.close();await vite.close();}
