import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {extractWebsitePage} from '../server/websiteImportExtract';
import {previewWebsiteImport} from '../server/websiteImportService';
const bytes=Buffer.from('<title>ACME &amp; Co</title><script>secret instruction</script><nav>Navigation</nav><main><h1>Premium services</h1><p>Price &amp; delivery: INR 25000 in 14 days.</p><p hidden>Hidden claim</p><a href="/contact">Contact us</a><a href="https://foreign.example/services">Foreign</a><a href="/pricing?key=secret">Unsafe query</a></main>');
const source={url:'https://example.com/',bytes,contentType:'text/html; charset=utf-8'},parsed=extractWebsitePage(source);
assert.equal(parsed.title,'ACME & Co');assert.match(parsed.text,/INR 25000 in 14 days/);assert.ok(!/secret instruction|Navigation|Hidden claim/.test(parsed.text));assert.deepEqual(parsed.links,['https://example.com/contact']);assert.equal(parsed.contentSha,crypto.createHash('sha256').update(bytes).digest('hex'));
assert.throws(()=>extractWebsitePage({...source,contentType:'text/html;charset=windows-1252'}));assert.throws(()=>extractWebsitePage({...source,bytes:Buffer.from([255])}));
const empty=extractWebsitePage({...source,bytes:Buffer.from('<script>document.write("fake facts")</script>')});assert.equal(empty.state,'EMPTY_OR_RENDERING_REQUIRED');assert.equal(empty.text,'');
const calls:string[]=[];const preview=await previewWebsiteImport(source.url,{fetchPage:async url=>{calls.push(url);if(url.endsWith('/contact'))throw new Error('private endpoint detail');return source;},now:()=>Date.parse('2026-11-11T00:00:00Z')});assert.equal(preview.status,'PARTIAL');assert.equal(preview.pages[0].originalBytes.equals(bytes),true);assert.equal(preview.approved,false);assert.equal(preview.failures[0].code,'WEBSITE_IMPORT_UNAVAILABLE');assert.ok(!JSON.stringify(preview).includes('private endpoint detail'));assert.deepEqual(calls,[source.url,'https://example.com/contact']);
const many=await previewWebsiteImport(source.url,{fetchPage:async url=>({...source,url,bytes:Buffer.from('<p>Saved static text</p>'+['about','contact','services','pricing','faq'].map(name=>`<a href="/${name}">${name}</a>`).join(''))})});assert.equal(many.pages.length,3);assert.equal(many.truncated,true);assert.equal(many.status,'PARTIAL');
console.log('Website extraction/import preview: static entity-decoded text, script/nav/hidden exclusion, exact original hash/bytes, bounded same-site discovery, encoding/empty states, partial failure and no approval/verification claims passed.');

const unavailable=await previewWebsiteImport(source.url,{fetchPage:async()=>{throw new Error('secret');}});assert.equal(unavailable.status,'UNAVAILABLE');assert.equal(unavailable.pages.length,0);
assert.throws(()=>extractWebsitePage({...source,bytes:Buffer.from('<div>'.repeat(300)+'deep text'+'</div>'.repeat(300))}),/WEBSITE_COMPLEXITY_LIMIT/);
assert.throws(()=>extractWebsitePage({...source,bytes:Buffer.from('<p>'+'x'.repeat(140000)+'</p>')}),/WEBSITE_TEXT_LIMIT/);
const plain=extractWebsitePage({...source,contentType:'text/plain',bytes:Buffer.from('Actual plain-text pricing INR 25000')});assert.equal(plain.text,'Actual plain-text pricing INR 25000');
