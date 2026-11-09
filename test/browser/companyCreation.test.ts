import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'vite';
const vite=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/uploads/**','**/dist/**','**/docs/**']}},logLevel:'error'});await vite.listen();
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 const address=vite.httpServer!.address() as any,origin=`http://127.0.0.1:${address.port}`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({serviceWorkers:'block',timezoneId:'America/Los_Angeles'});
 const user={id:'fixture-owner',email:'fixture@example.invalid',full_name:'Fixture',role:'agency',is_platform_admin:false};
 const companies:any[]=[{id:'A',user_id:user.id,name:'Existing Fixture',category:'Service',city:'Pune'}];
 await context.addInitScript(user=>{localStorage.setItem('abga_auth_token','fixture-token');localStorage.setItem('abga_user_profile',JSON.stringify(user));localStorage.setItem('abga_active_company_id','A');},user);
 let creates=0,saves=0,malformed=false,failSetup=true;const versions:Record<string,string>={A:'0'};
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!==origin){await route.abort();return;}if(!url.pathname.startsWith('/api/')){await route.continue();return;}
  const companyId=url.searchParams.get('companyId')||url.searchParams.get('company_id');let body:any={success:true,companyId,reviews:[],posts:[],leads:[],campaigns:[],actions:[],logs:[],recommendations:[]};
  if(url.pathname==='/api/auth/me')body={success:true,user};
  else if(url.pathname==='/api/companies'&&route.request().method()==='GET')body={success:true,companies};
  else if(url.pathname==='/api/companies'){
   creates++;const input=route.request().postDataJSON(),company={...input,id:`C${creates}`,user_id:user.id};companies.push(company);versions[company.id]='0';body=malformed?{success:true}:{success:true,company};
  }else if(/^\/api\/companies\/[^/]+\/data$/.test(url.pathname)){
   const id=url.pathname.split('/')[3],company=companies.find(company=>company.id===id);
   if(route.request().method()==='PUT'){
    saves++;const input=route.request().postDataJSON();assert.equal(input.expectedVersion,versions[id]);
    if(failSetup){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'Fixture setup failure'})});return;}
    versions[id]=String(BigInt(versions[id])+1n);body={success:true,companyId:id,version:versions[id]};
   }else body={success:true,companyId:id,company,version:versions[id],data:{business:company}};
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 const page=await context.newPage();await page.goto(origin);await page.locator('header select').first().waitFor();
 await page.locator('header select').first().selectOption('__add_new__');
 await page.getByPlaceholder('e.g. Aaditech Tech Labs / Apex Dental Care').fill('New Fixture');await page.getByPlaceholder('e.g. Thane, Mumbai, Pune').fill('Delhi');
 await page.getByRole('button',{name:'Add Business Profile',exact:true}).click();await page.getByText('Company created; setup save unconfirmed. Retry will use the same company.',{exact:true}).waitFor();assert.equal(creates,1);assert.equal(saves,1);
 failSetup=false;await page.getByRole('button',{name:'Add Business Profile',exact:true}).click();await page.waitForFunction(()=>document.querySelector<HTMLSelectElement>('header select')?.value==='C1');assert.equal(creates,1);assert.equal(saves,2);
 await page.locator('header select').first().selectOption('__add_new__');malformed=true;
 await page.getByPlaceholder('e.g. Aaditech Tech Labs / Apex Dental Care').fill('Unconfirmed Fixture');await page.getByPlaceholder('e.g. Thane, Mumbai, Pune').fill('Delhi');
 await page.getByRole('button',{name:'Add Business Profile',exact:true}).click();await page.getByRole('button',{name:'Reload company list before retrying',exact:true}).waitFor();assert.equal(creates,2);assert.ok(await page.getByRole('button',{name:'Add Business Profile',exact:true}).isDisabled());
 await page.getByRole('button',{name:'Reload company list before retrying',exact:true}).click();await page.locator('header select').first().waitFor();await page.locator('header select option[value="C2"]').waitFor({state:'attached'});assert.equal(creates,2);
 console.log('Company creation browser: known company reused after failed setup; revision-bound save, successful next-company reset, malformed creation acknowledgement pauses retry and reload discovers stored company. External traffic blocked.');
}finally{await browser?.close();await vite.close();}
