import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {mutateCompetitorSql} from '../../server/competitorCommands';
import {competitorVersion} from '../../shared/competitors';
if(process.env.ABGM1_LOCAL_SQL_TESTS!=='1'||process.env.DB_HOST!=='127.0.0.1'||!process.env.DB_NAME?.startsWith('abgm1_test_')||!process.env.LOCAL_SQL_CONTAINER_ID)throw new Error('Disposable SQL identity required');
const db=await import('../../server/db'),pool=await db.getDbPool();assert.ok(pool);
const prefix='comp_'+crypto.randomBytes(8).toString('hex'),a=prefix+'_a',b=prefix+'_b';let stage='identity';
try{
 const [identity]:any=await pool.query('SELECT @@hostname hostname');assert.equal(identity[0].hostname,process.env.LOCAL_SQL_CONTAINER_ID);
 for(const id of [a,b])await pool.query("INSERT INTO companies(id,user_id,name,category,city) VALUES (?,'fixture','Fixture','Fixture','Pune')",[id]);
 stage='add';const first=await mutateCompetitorSql(pool,a,{kind:'add',id:'c',input:{name:'Other',rating:0,reviewsCount:0}});assert.equal(first.version,'1');assert.equal(first.competitor!.localVisibilityRank,null);assert.equal(first.competitor!.rating,0);assert.equal(first.competitor!.provider,'manual');
 const original=first.competitor!;
 stage='concurrent-edit';const edits=await Promise.allSettled(Array.from({length:8},(_,i)=>mutateCompetitorSql(pool,a,{kind:'edit',id:'c',expectedVersion:competitorVersion(original),input:{rating:1+i/10}})));assert.equal(edits.filter(result=>result.status==='fulfilled').length,1);
 let current=(edits.find(result=>result.status==='fulfilled') as PromiseFulfilledResult<any>).value.competitor;
 await assert.rejects(mutateCompetitorSql(pool,b,{kind:'delete',id:'c',expectedVersion:competitorVersion(current)}));
 await assert.rejects(mutateCompetitorSql(pool,a,{kind:'delete',id:'c',expectedVersion:competitorVersion(original)}));
 stage='atomic-failure';const [before]:any=await pool.query('SELECT COUNT(*) n FROM competitor_observations WHERE company_id=?',[a]);
 const faultPool={getConnection:async()=>{const conn=await pool.getConnection();return new Proxy(conn,{get(target,key){if(key==='query')return async(sql:string,args:any)=>{if(sql.startsWith('UPDATE company_profiles_data'))throw new Error('fixture-failure');return target.query(sql,args);};const value=(target as any)[key];return typeof value==='function'?value.bind(target):value;}});}} as any;
 await assert.rejects(mutateCompetitorSql(faultPool,a,{kind:'edit',id:'c',expectedVersion:competitorVersion(current),input:{name:'Rolled back'}}));
 const [after]:any=await pool.query('SELECT COUNT(*) n FROM competitor_observations WHERE company_id=?',[a]);assert.equal(after[0].n,before[0].n);const snapshot=await db.getCompanyDataPayload(a);assert.equal(snapshot?.competitors[0].name,'Other');
 const rounded=await mutateCompetitorSql(pool,a,{kind:'edit',id:'c',expectedVersion:competitorVersion(current),input:{rating:4.567}});assert.equal(rounded.competitor!.rating,4.57);current=rounded.competitor;const [roundedObservation]:any=await pool.query('SELECT COUNT(*) n FROM competitor_observations WHERE company_id=? AND rating=4.57',[a]);assert.equal(roundedObservation[0].n,1);
 stage='refresh';const observation={companyId:a,competitorId:'c',name:'Provider alias',placeId:'place',address:'Address',rating:4,reviewsCount:10,photosCount:null,postsPerWeek:null,rankPosition:null,provider:'fixture',timestamp:'2026-11-09T02:00:00Z',dataClassification:'LIVE',candidate:false};
 let result=await mutateCompetitorSql(pool,a,{kind:'refresh',id:'c',expectedVersion:competitorVersion(current),observation});assert.equal(result.competitor!.name,'Other');assert.equal(result.competitor!.reviewChangeSincePreviousObservation,null);current=result.competitor;
 result=await mutateCompetitorSql(pool,a,{kind:'refresh',id:'c',expectedVersion:competitorVersion(current),observation:{...observation,reviewsCount:13,timestamp:'2026-11-09T03:00:00Z'}});assert.equal(result.competitor!.reviewChangeSincePreviousObservation,3);assert.equal(result.competitor!.reviewGrowthThisMonth,null);current=result.competitor;
 await assert.rejects(mutateCompetitorSql(pool,a,{kind:'refresh',id:'c',expectedVersion:competitorVersion(current),observation:{...observation,candidate:true}}));
 stage='delete';result=await mutateCompetitorSql(pool,a,{kind:'delete',id:'c',expectedVersion:competitorVersion(current)});assert.deepEqual(result.competitors,[]);const [retained]:any=await pool.query('SELECT COUNT(*) n FROM competitor_observations WHERE company_id=?',[a]);assert.ok(retained[0].n>=4);
 console.log('Competitor command SQL: atomic profile/observation/revision, eight-way edit one winner, foreign/stale delete rejection, injected profile failure rolls back observation, explicit manual provenance, comparable-place change and retained delete history passed.');
}catch(error:any){console.log(JSON.stringify({fixture:'competitor-command',stage,code:error?.code||'ASSERTION',line:error?.stack?.match(/competitorCommandsSql.test.ts:(\d+)/)?.[1]}));process.exitCode=1;}
finally{for(const id of [a,b]){await pool.query('DELETE FROM competitor_observations WHERE company_id=?',[id]);await pool.query('DELETE FROM company_profiles_data WHERE company_id=?',[id]);await pool.query('DELETE FROM companies WHERE id=?',[id]);}await pool.end();}
