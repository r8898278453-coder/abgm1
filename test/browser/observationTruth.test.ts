import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'vite';

// Frontend-only fixture: no application server, SQL bindings or provider calls.
const fixture='/__observation_fixture.tsx';
const vite=await createServer({plugins:[{name:'observation-fixture',resolveId(id){if(id===fixture)return id;},load(id){if(id!==fixture)return;return `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {LocalSeoView} from '/src/components/LocalSeoView.tsx';
const keywords=[
 {id:'unknown',keyword:'Unknown fixture',rank:null,diff:null,previousRank:8,dataClassification:'PARTIAL',gridRankings:{node_0:1},observations:[{gridIndex:4,latitude:18,longitude:73,position:null,status:'FAILED'}]},
 {id:'steady',keyword:'Steady fixture',rank:3,diff:0,dataClassification:'LIVE'},
 {id:'up',keyword:'Improved fixture',rank:3,diff:5,dataClassification:'LIVE'}
];
createRoot(document.getElementById('root')).render(<LocalSeoView city="Unknown city" keywords={keywords}/>);
`;}}],server:{host:'127.0.0.1',port:0},logLevel:'error'});
await vite.listen();let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 const address=vite.httpServer!.address() as any,origin=`http://127.0.0.1:${address.port}`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==origin){await route.abort();return;}if(url.pathname==='/'){await route.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/',`<div id="root"></div><script type="module" src="${fixture}"></script>`)});return;}await route.continue();});
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>console.error(error.message));await page.goto(origin);
 await page.getByText('No comparable baseline',{exact:true}).waitFor();
 const rows=page.locator('tbody tr');assert.match(await rows.nth(0).innerText(),/No comparable baseline/);assert.doesNotMatch(await rows.nth(0).innerText(),/Steady/);
 assert.match(await rows.nth(1).innerText(),/Steady/);assert.match(await rows.nth(2).innerText(),/\+5 spots/);
 assert.equal(await page.getByText('Coordinates unavailable',{exact:true}).count(),8);
 assert.equal(await page.getByText('Unranked',{exact:true}).count(),0);
 assert.equal(await page.getByText('#1',{exact:true}).count(),0);
 console.log('Observation browser: unknown baseline stays unknown, explicit zero is steady, real delta displayed; failed centre and missing nodes show unavailable without city/legacy-coordinate fabrication. External traffic blocked.');
}finally{await browser?.close();await vite.close();}
