import assert from 'node:assert/strict';
import {normalizeRanks,normalizeCompetitor,observationTime,observationLimit} from '../server/observationStore';
import {DataForSeoLocalProvider,SerpApiLocalProvider,generate3x3GridCoordinates,resolveCenterCoordinates} from '../server/localSeoProvider';
const input={id:'rank',companyId:'A',keyword:'Dentist',latitude:18.123456789,longitude:73,gridIndex:4,timestamp:'2026-11-06T08:00:00.123+05:30',provider:'fixture',status:'LIVE',position:3};
const normalized=normalizeRanks([input],'A','Dentist');assert.equal(normalized[0].timestamp,'2026-11-06T02:30:00.000Z');assert.equal(normalized[0].latitude,18.1234568);assert.equal(input.latitude,18.123456789);
for(const bad of [{...input,companyId:'B'},{...input,company_id:'B'},{...input,keyword:'Different'},{...input,latitude:undefined},{...input,longitude:NaN},{...input,gridIndex:9},{...input,position:0},{...input,timestamp:'2026-02-30T00:00:00Z'},{...input,timestamp:'2026-11-06 08:00:00'},{...input,status:'UNKNOWN'}])assert.throws(()=>normalizeRanks([bad],'A','Dentist'));
assert.throws(()=>normalizeRanks([input,input],'A','Dentist'));assert.throws(()=>normalizeRanks([input,{...input,id:'other',companyId:'B'}]));
const unavailable=normalizeRanks([{...input,status:undefined,provider:undefined}],'A','Dentist')[0];assert.equal(unavailable.status,'UNAVAILABLE');assert.equal(unavailable.position,null);assert.equal(unavailable.provider,'unknown');
assert.throws(()=>observationTime('2026-11-06T24:00:00Z'));for(const limit of [0,-1,501,1.5])assert.throws(()=>observationLimit(limit));
const comp={id:'c',company_id:'A',competitor_id:'other',name:'Other',rating:null,reviews_count:null,photos_count:null,posts_per_week:null,rank_position:null,provider:'manual',status:'USER_ENTERED',timestamp:'2026-11-06T00:00:00Z'} as any;
assert.equal(normalizeCompetitor(comp).rating,null);assert.throws(()=>normalizeCompetitor({...comp,rating:5.1}));assert.throws(()=>normalizeCompetitor({...comp,reviews_count:-1}));
for(const args of [[Infinity,73],[91,73],[18,181],[18,undefined]])assert.equal(resolveCenterCoordinates('Pune',...args as [number,number]),null);assert.equal(resolveCenterCoordinates('Pune',0,0)?.lat,0);assert.throws(()=>generate3x3GridCoordinates(90,0));assert.throws(()=>generate3x3GridCoordinates(18,73,-1));assert.ok(generate3x3GridCoordinates(0,180).every(point=>point.lng>=-180&&point.lng<=180));
const original=globalThis.fetch;let mode='empty',calls=0;
assert.equal(resolveCenterCoordinates('Navi Mumbai, Maharashtra')?.lng,73.0297);assert.equal(resolveCenterCoordinates('notmumbai'),null);const city=resolveCenterCoordinates('Pune')!;city.lat=0;assert.equal(resolveCenterCoordinates('Pune')?.lat,18.5204);
try{
 const coordinates=generate3x3GridCoordinates(18,73),context={companyId:'A',businessName:'Fixture Company',keyword:'Dentist',city:'Pune',centerLat:18,centerLng:73,coordinates,radiusKm:3.5};
 for(const [provider,credentials] of [[new DataForSeoLocalProvider(),{login:'fixture',password:'fixture'}],[new SerpApiLocalProvider(),{apiKey:'fixture-api-key'}]] as const){
  globalThis.fetch=async()=>{throw new Error('must not call provider with invalid coordinates');};await assert.rejects(provider.scanRankGrid({...context,coordinates:[{lat:Infinity,lng:0,label:'invalid',gridIndex:4}]},credentials),/INVALID_SCAN_GEOMETRY/);
  for(const next of ['empty','failed','ranked','network']){
   mode=next;calls=0;globalThis.fetch=async()=>{const center=calls++===4;if(mode==='network')throw new Error('private-api-key-in-url');if(center&&mode==='failed')return new Response('{}',{status:500});const items=center&&mode==='empty'?[]:center&&mode==='ranked'?[{title:'Other A'},{title:'Other B'},{title:'Fixture Company'}]:[{title:'Fixture Company'}];return new Response(JSON.stringify({tasks:[{result:[{items}]}],local_results:items}),{status:200});};
   const result=await provider.scanRankGrid(context,credentials);assert.equal(calls,9);assert.equal(result.overallRank,mode==='ranked'?3:null);assert.ok(!JSON.stringify(result).includes('private-api-key'));
  }
 }
}finally{globalThis.fetch=original;}
console.log('Observations: bound tenant/keyword, coordinates/metrics/time validation, explicit unknown status, center-only rank with no corner/mean substitution and provider-error redaction passed.');
