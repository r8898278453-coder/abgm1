import assert from 'node:assert/strict';
import crypto from 'node:crypto';
if(process.env.ABGM1_LOCAL_SQL_TESTS!=='1'||process.env.DB_HOST!=='127.0.0.1'||!process.env.DB_NAME?.startsWith('abgm1_test_')||!process.env.LOCAL_SQL_CONTAINER_ID)throw new Error('Disposable local SQL identity required');
const db=await import('../../server/db');const pool=await db.getDbPool();assert.ok(pool);
const prefix='website_'+crypto.randomBytes(8).toString('hex'),a=prefix+'_a',b=prefix+'_b',c=prefix+'_c';let stage='identity';
try{
 const [identity]:any=await pool.query('SELECT @@hostname hostname');assert.equal(identity[0].hostname,process.env.LOCAL_SQL_CONTAINER_ID);
 for(const id of [a,b,c])await pool.query("INSERT INTO companies (id,user_id,name,category,city) VALUES (?,'fixture-owner','Fixture','Fixture','Pune')",[id]);
 await pool.query("SET time_zone='-08:00'");stage='config';
 assert.equal(await db.getWebsiteConfigByCompany(a),null);
 const first=await db.upsertWebsiteConfig({company_id:a,hero_title:'Initial',enable_whatsapp_cta:false});assert.equal(first.hero_title,'Initial');assert.equal(first.enable_whatsapp_cta,false);assert.ok(first.id.length<=64);assert.ok(Math.abs(Date.parse(first.created_at!)-Date.now())<10000);
 await Promise.all([db.upsertWebsiteConfig({company_id:a,tagline:'Other field'}),db.upsertWebsiteConfig({company_id:a,hero_title:'New title'})]);
 const saved=await db.getWebsiteConfigByCompany(a);assert.equal(saved?.hero_title,'New title');assert.equal(saved?.tagline,'Other field');assert.equal(saved?.enable_whatsapp_cta,false);
 const poisoned='web_'+crypto.createHash('sha256').update(c).digest('hex').slice(0,48);
 await pool.query('INSERT INTO website_configs (id,company_id,subdomain,hero_title) VALUES (?,?,?,?)',[poisoned,b,b,'Foreign original']);
 await assert.rejects(db.upsertWebsiteConfig({company_id:c,hero_title:'Must not overwrite'}));assert.equal((await db.getWebsiteConfigByCompany(b))?.hero_title,'Foreign original');assert.equal(await db.getWebsiteConfigByCompany(c),null);
 stage='domain-concurrency';const domain=prefix.replaceAll('_','-')+'.example.invalid';
 const contenders=await Promise.all(Array.from({length:8},()=>db.createCustomDomain({company_id:a,domain})));assert.equal(new Set(contenders.map(row=>row.id)).size,1);assert.equal(new Set(contenders.map(row=>row.dns_txt_record)).size,1);
 stage='domain-checks';const row=contenders[0];assert.equal(row.ssl_status,'unverified');assert.equal(row.status,'pending_verification');
 assert.equal(await db.updateCustomDomainStatus(b,row.id,row,true),null);assert.equal(await db.updateCustomDomainStatus(a,row.id,{...row,dns_txt_record:'wrong-token'},true),null);
 stage='domain-save-dns';assert.equal(await db.updateCustomDomainStatus(a,row.id,{...row,cname_target:'changed.example.invalid'},true),null);const checked=await db.updateCustomDomainStatus(a,row.id,row,true);assert.equal(checked?.status,'dns_verified');assert.equal(checked?.ssl_status,'unverified');assert.ok(Math.abs(Date.parse(checked!.verified_at!)-Date.now())<10000);
 stage='domain-foreign-readd';await assert.rejects(db.createCustomDomain({company_id:b,domain}),/conflicts/);const repeated=await db.createCustomDomain({company_id:a,domain});assert.equal(repeated.id,row.id);assert.equal(repeated.status,'dns_verified');assert.equal(repeated.dns_txt_record,row.dns_txt_record);
 stage='domain-delete';assert.equal(await db.deleteCustomDomain(b,row.id),false);assert.equal((await db.getCustomDomainsByCompany(a)).length,1);assert.deepEqual(await db.getCustomDomainsByCompany(b),[]);assert.equal(await db.deleteCustomDomain(a,row.id),true);assert.equal(await db.deleteCustomDomain(a,row.id),false);assert.equal(await db.getCustomDomainById(row.id),null);
 console.log('Website restricted SQL: authoritative settings/empty reads, serialized disjoint patches, foreign-ID collision rejection,8 same-owner domain claims one stable record/token, other-tenant duplicate/verify/delete fences and UTC instants in -08:00 session passed.');
}catch(error:any){console.log(JSON.stringify({fixture:'website-persistence',stage,code:error?.code||'ASSERTION',kind:error?.name,line:error?.stack?.match(/websitePersistenceSql.test.ts:(\d+)/)?.[1]}));process.exitCode=1;
}finally{
 for(const id of [a,b,c]){await pool.query('DELETE FROM custom_domains WHERE company_id=?',[id]);await pool.query('DELETE FROM website_configs WHERE company_id=?',[id]);await pool.query('DELETE FROM companies WHERE id=?',[id]);}await pool.end();
}
