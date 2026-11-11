import assert from 'node:assert/strict';
import {publicWebsiteAddress,websiteImportUrl} from '../server/websiteImportPolicy';
import {fetchWebsitePage} from '../server/websiteImportFetch';
for(const address of['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','100.64.0.1','0.0.0.0','224.0.0.1','::1','::ffff:8.8.8.8','fc00::1','2001:db8::1','2002:0808:0808::1'])assert.equal(publicWebsiteAddress(address),false,address);
for(const address of['8.8.8.8','1.1.1.1','2606:4700:4700::1111'])assert.equal(publicWebsiteAddress(address),true,address);
for(const value of['http://example.com','https://user:pass@example.com','https://example.com:3306','https://127.0.0.1','https://example.com/?token=secret','https://example.com/#fragment','https://localhost','https://example.com.'])assert.throws(()=>websiteImportUrl(value));
assert.equal(websiteImportUrl('https://example.com/about').origin,'https://example.com');assert.throws(()=>websiteImportUrl('https://other.example/about','https://example.com'));
let requested=false;await assert.rejects(fetchWebsitePage('https://example.com',{resolve:async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}],request:(()=>{requested=true;throw new Error('must not dial');}) as any}),/WEBSITE_ADDRESS_REFUSED/);assert.equal(requested,false);
console.log('Website import policy: HTTPS/origin/credential/query restrictions, private/mapped/special address refusal and mixed DNS rejection before socket creation passed.');

const {EventEmitter}=await import('node:events');const {Readable}=await import('node:stream');
function transport(responses:Array<{status?:number;headers?:any;body?:Buffer}>){let count=0;const request=((url:any,options:any,callback:any)=>{count++;assert.equal(url.origin,'https://example.com');assert.equal(options.rejectUnauthorized,true);assert.equal(options.autoSelectFamily,false);assert.equal(options.headers.Authorization,undefined);options.lookup('ignored',{},(error:any,address:string)=>{assert.equal(error,null);assert.equal(address,'8.8.8.8');});const req=new EventEmitter() as any;req.destroy=()=>req.emit('close');req.end=()=>{const next=responses.shift();assert.ok(next);const response=Readable.from([next.body||Buffer.alloc(0)]) as any;response.statusCode=next.status||200;response.headers=next.headers||{'content-type':'text/html'};response.once('end',()=>req.emit('close'));queueMicrotask(()=>callback(response));};return req;}) as any;return{request,count:()=>count};}
const resolve=async()=>[{address:'8.8.8.8',family:4}];
const success=transport([{status:302,headers:{location:'/about'}},{body:Buffer.from('<h1>Actual page</h1>')}]);const page=await fetchWebsitePage('https://example.com',{resolve,request:success.request});assert.equal(page.url,'https://example.com/about');assert.equal(page.bytes.toString(),'<h1>Actual page</h1>');assert.equal(success.count(),2);
for(const headers of[{'content-type':'application/pdf'},{'content-type':'text/html','content-encoding':'gzip'},{'content-type':'text/html','content-length':'999999'}]){const fake=transport([{headers}]);await assert.rejects(fetchWebsitePage('https://example.com',{resolve,request:fake.request}));}
const oversized=transport([{body:Buffer.alloc(256*1024+1)}]);await assert.rejects(fetchWebsitePage('https://example.com',{resolve,request:oversized.request}),/WEBSITE_BYTE_LIMIT/);
const redirect=transport([{status:302,headers:{location:'https://other.example/'}}]);await assert.rejects(fetchWebsitePage('https://example.com',{resolve,request:redirect.request}),/WEBSITE_ORIGIN_CHANGED/);assert.equal(redirect.count(),1);
console.log('Website snapshot transport: checked DNS pinned to socket, exact bounded bytes, same-origin redirect, cross-origin refusal, unsupported/compressed/oversize response rejection and no credential forwarding passed.');

await assert.rejects(fetchWebsitePage('https://example.com',{resolve:async()=>{throw new Error('private-host-provider-detail');}}),error=>error instanceof Error&&error.message==='WEBSITE_FETCH_FAILED');

for(const address of ['192.0.2.1','198.51.100.1','203.0.113.1','2001:0000:0000:0000:0000:0000:0000:0001','2001:0db8:0000:0000:0000:0000:0000:0001','2001:0020::1','3fff::1','2606:4700::1%lo'])assert.equal(publicWebsiteAddress(address),false,address);
for(const address of ['192.2.1.1','198.51.99.1','203.0.114.1','2001:4860:4860::8888'])assert.equal(publicWebsiteAddress(address),true,address);
console.log('Website address policy: precise special-purpose subnets reject expanded IPv6/private/documentation forms without denying unrelated public IPv4 or normal2001 global addresses.');
