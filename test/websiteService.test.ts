import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {verifyDomainDns,generateStorefrontHtml,generateStaticExportZip} from '../server/websiteService';
import {normalizeWebsiteDomain} from '../shared/website';
assert.equal(normalizeWebsiteDomain('EXAMPLE.INVALID.'),'example.invalid');assert.equal(normalizeWebsiteDomain('bücher.example'),'xn--bcher-kva.example');
for(const bad of ['localhost','127.0.0.1','https://a.invalid','a.invalid:443','user@a.invalid','a.invalid/path','a..invalid','a.invalid?x','-a.invalid'])assert.throws(()=>normalizeWebsiteDomain(bad));
let cname=['edge.example.invalid.'],a=['192.0.2.9'],txt=[['bga-site-','verification=exact']];let failure=false,cancelled=0;
const resolver={resolveCname:async()=>cname,resolve4:async()=>a,resolveTxt:async()=>{if(failure)throw Object.assign(new Error('private-lookup-detail'),{code:'ETIMEOUT'});return txt;},cancel:()=>cancelled++};
const check=()=>verifyDomainDns('example.invalid','edge.example.invalid','192.0.2.9','bga-site-verification=exact',resolver);
assert.equal((await check()).verified,true);assert.equal((await check()).sslState,'UNVERIFIED');
for(const wrong of [['bga-site-verification=other'],['prefix bga-site-verification=exact suffix']]){txt=[wrong];assert.equal((await check()).verified,false);}
txt=[['bga-site-verification=exact']];cname=['edge.example.invalid.attacker.invalid'];a=['77.37.54.108'];assert.equal((await check()).verified,false);cname=['anything.aaditechs.in.attacker.invalid'];assert.equal((await check()).verified,false);
failure=true;assert.equal((await check()).unavailable,true);assert.ok(!JSON.stringify(await check()).includes('private-'));assert.ok(cancelled>0);
const company={id:'A',name:'Fixture </script>',category:'Service',city:'Pune',phone:'+919999999999',public_form_token:"x'</script><script>bad</script>"} as any;
const disabled=generateStorefrontHtml(company,{enable_whatsapp_cta:false,enable_direct_call_cta:false,enable_inquiry_form:false,primary_color:"';alert(1);//"} as any);assert.ok(!disabled.includes('id="leadForm"'));assert.ok(!disabled.includes('https://wa.me/'));assert.ok(!disabled.includes('href="tel:'));assert.ok(!disabled.includes('alert(1)'));
const enabled=generateStorefrontHtml(company);assert.ok(enabled.includes('id="leadForm"'));assert.ok(enabled.includes('data.success===true'));assert.ok(!enabled.includes('inquiry has been recorded'));assert.ok(enabled.includes('Submission was not confirmed'));assert.ok(!enabled.includes("publicFormToken: '"));
const zip=await JSZip.loadAsync(await generateStaticExportZip(company,null,'example.invalid'));const html=await zip.file('index.html')!.async('string');assert.ok(html.includes('https://bga.aaditechs.in/api/public/leads'));assert.ok((await zip.file('README.md')!.async('string')).includes('TLS'));
await assert.rejects(generateStaticExportZip(company,null,'bad.invalid/<xml>'));
console.log('Website generation/DNS: exact TXT plus routing, chunk joining, suffix/spoof rejection, lookup uncertainty, TLS unverified, CTA controls, safe JS literals, truthful form and static export API endpoint passed.');
