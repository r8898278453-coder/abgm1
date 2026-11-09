import assert from 'node:assert/strict';
import express from 'express';
import {createRequire} from 'node:module';
import jsQR from 'jsqr';
import {reviewCollectionUrl} from '../shared/reviewCollection';
import {createReviewQr} from '../src/services/reviewQr';
import {registerReviewReplyRoutes} from '../server/reviewReplyRoutes';
import {createReviewSchema,replyReviewSchema,validateBody} from '../server/validation';
const createInput={author:'Fixture',content:'Review fixture',companyId:'B',source:'manual',is_operational_issue:true};
assert.equal(createReviewSchema.parse(createInput).companyId,'B');assert.equal(createReviewSchema.parse(createInput).is_operational_issue,true);assert.equal(createReviewSchema.safeParse({...createInput,company_id:'A'}).success,false);
const url=reviewCollectionUrl({googlePlaceId:'ChIJ-fixture_123'})!;
assert.equal(url,'https://search.google.com/local/writereview?placeid=ChIJ-fixture_123');
for(const invalid of ['javascript:alert(1)','https://evil.example/review','https://g.page.evil.example/r/test/review','http://g.page/r/a/review','https://user:pass@g.page/r/a/review','https://g.page:444/r/a/review'])assert.equal(reviewCollectionUrl({google_review_url:invalid}),null);
assert.equal(reviewCollectionUrl({googlePlaceId:'bad & place'}),null);assert.equal(reviewCollectionUrl({}),null);
assert.equal(reviewCollectionUrl({google_review_url:'https://g.page/r/fixture/review'}),'https://g.page/r/fixture/review');
const qr=await createReviewQr(url);assert.match(qr.svg,/<svg/);
const {PNG}=createRequire(import.meta.url)('pngjs');const png=PNG.sync.read(Buffer.from(qr.image.split(',')[1],'base64'));
assert.equal(jsQR(new Uint8ClampedArray(png.data),png.width,png.height)?.data,url);
const app=express();app.use(express.json());let writes=0,fail=false,allow=true;
registerReviewReplyRoutes(app,{validate:validateBody(replyReviewSchema),auth:async req=>req.headers.authorization?{id:'owner'} as any:null,companyForReview:async id=>id==='missing'?null:'A',access:async()=>({authorized:allow,status:403}),remove:async()=>{writes++;if(fail)throw new Error('private-db-secret');return true;},save:async()=>{writes++;if(fail)throw new Error('private-db-secret');return true;}});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const port=(server.address() as any).port;
 async function post(path:string,body:any,status:number,auth=true){const res=await fetch(`http://127.0.0.1:${port}/api/reviews/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},body:JSON.stringify(body)});assert.equal(res.status,status);return res.json();}
 await post('review/reply',{replyText:'Hello'},401,false);await post('missing/reply',{replyText:'Hello'},404);
 await post('review/reply',{replyText:'Hello',companyId:'B'},403);allow=false;await post('review/reply',{replyText:'Hello',companyId:'A'},403);allow=true;
 await post('review/reply',{replyText:' '},400);assert.equal(writes,0);
 const saved=await post('review/reply',{replyText:'Hello',companyId:'A'},200);assert.equal(saved.providerPublication,'NOT_VERIFIED');
 await post('review/replyText',{replyText:'Legacy compatible'},200);assert.equal(writes,2);
 const deleted=await fetch(`http://127.0.0.1:${port}/api/reviews/review?companyId=B`,{method:'DELETE',headers:{Authorization:'fixture'}});assert.equal(deleted.status,403);assert.equal(writes,2);
 for(const query of ['?companyId=A&companyId=B','?companyId=A&actor=x'])assert.equal((await fetch(`http://127.0.0.1:${port}/api/reviews/review${query}`,{method:'DELETE',headers:{Authorization:'fixture'}})).status,400);
 const removed=await fetch(`http://127.0.0.1:${port}/api/reviews/review?companyId=A`,{method:'DELETE',headers:{Authorization:'fixture'}});assert.equal(removed.status,200);assert.equal((await removed.json()).providerDeletion,'NOT_PERFORMED');assert.equal(writes,3);
 fail=true;assert.ok(!JSON.stringify(await post('review/reply',{replyText:'Hello'},503)).includes('private-db-secret'));
 console.log('Review collection: independent QR decode, safe destinations, reply tenant/auth validation, legacy alias, database-only acknowledgement and redacted failures passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
