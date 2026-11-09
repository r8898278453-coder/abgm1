import assert from 'node:assert/strict';
import {verifyMetaPublication} from '../server/metaPublicationVerification';
import {metaPublishingText} from '../server/metaPublishingText';
const start=Date.parse('2026-11-03T02:30:00Z'),now=start+300000;
const post={company_id:'owned',caption:'Saved text',headline:'Headline',hashtags:['#fixture'],status:'unknown'} as any;
const connection={company_id:'owned',provider:'meta_social',status:'connected',credentials:{pageId:'101',instagramId:'202',accessToken:'private-token-fixture'}};
async function check(platform:'facebook'|'instagram',mode='match',photo=false){
 const calls:any[]=[];
 const source={...post,...(photo?{image_url:'https://example.invalid/media.png'}:{})};
 const result=await verifyMetaPublication({company:'owned',platform,providerId:platform==='instagram'?'707':photo?'303':'101_202',startedAtMs:start,post:source,connection},async(url,init)=>{
  calls.push({url:String(url),init});assert.equal(init?.method,'GET');assert.equal(init?.redirect,'error');assert.ok(init?.signal);
  assert.equal((init?.headers as any).Authorization,'Bearer private-token-fixture');assert.ok(!String(url).includes('private-token-fixture'));
  if(mode==='network')throw new Error('private-token-fixture');
  if(mode==='404')return new Response(JSON.stringify({error:{message:'private-token-fixture'}}),{status:404});
  if(mode==='badjson')return new Response('broken');
  const id=new URL(String(url)).pathname.split('/').at(-1);
  let body:any=platform==='instagram'?{id,owner:{id:'202'},caption:metaPublishingText(source),media_type:'IMAGE',permalink:'https://www.instagram.com/p/fixture/',timestamp:'2026-11-03T02:31:00Z'}
   :id==='303'?{id,from:{id:'101'},page_story_id:'101_202'}:{id,from:{id:'101'},message:metaPublishingText(source),is_published:true,created_time:'2026-11-03T02:31:00Z'};
  if(mode==='wrong-owner'){if(platform==='instagram')body.owner.id='999';else body.from.id='999';}
  if(mode==='missing-owner'){delete body.owner;delete body.from;}
  if(mode==='wrong-text'){body.message='Different';body.caption='Different';}
  if(mode==='old'){body.created_time='2026-11-01T00:00:00Z';body.timestamp=body.created_time;}
  if(mode==='unpublished')body.is_published=false;
  if(mode==='no-published-state')delete body.is_published;
  if(mode==='wrong-id')body.id='999';
  if(mode==='bad-link')body.permalink='https://example.invalid/p/fixture/';
  if(mode==='no-story')delete body.page_story_id;
  return new Response(JSON.stringify(body));
 },now);
 assert.ok(!JSON.stringify(result).includes('private-token-fixture'));
 assert.equal(result.mediaCompared,false);assert.equal(result.dispatchAttributionVerified,false);
 return {result,calls};
}
assert.equal((await check('facebook')).result.status,'MATCHED');
const photo=await check('facebook','match',true);assert.equal(photo.result.status,'MATCHED');assert.equal(photo.calls.length,2);assert.equal(photo.calls[0].init.signal,photo.calls[1].init.signal);
assert.equal((await check('instagram')).result.status,'MATCHED');
for(const platform of ['facebook','instagram'] as const){
 for(const mode of ['wrong-owner','wrong-text','old','wrong-id'])assert.equal((await check(platform,mode)).result.status,'MISMATCH');
 for(const mode of ['missing-owner','network','404','badjson'])assert.equal((await check(platform,mode)).result.status,'UNAVAILABLE');
}
assert.equal((await check('facebook','unpublished')).result.status,'MISMATCH');
assert.equal((await check('facebook','no-published-state')).result.status,'UNAVAILABLE');
assert.equal((await check('facebook','no-story',true)).calls.length,1);
assert.equal((await check('instagram','bad-link')).result.status,'UNAVAILABLE');
let fetched=0;
const unavailable=await verifyMetaPublication({company:'owned',platform:'facebook',providerId:'101_202',startedAtMs:start,post,connection:{...connection,company_id:'foreign'}},async()=>{fetched++;throw new Error();},now);
assert.equal(unavailable.status,'UNAVAILABLE');assert.equal(fetched,0);
console.log('Meta read verification: scoped account/object/text/time matching, photo-story linkage, published state, missing/negative evidence and credential redaction passed with GET-only mocks.');
