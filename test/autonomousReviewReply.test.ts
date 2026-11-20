import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DbReview } from '../server/db';
import { checkGoogleBusinessAccess } from '../server/googleBusinessAccess';

const original = process.cwd();
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'autonomous-review-'));
process.chdir(directory);
try {
  const { dispatchAutonomousReviewReply, reviewNeedsHumanReview } = await import('../server/autonomousReviewReply');
  const { setGlobalEmergencyStop } = await import('../server/executionStop');
  setGlobalEmergencyStop(false);

  const review: DbReview = {
    id: 'fixture', company_id: 'A', external_review_id: 'canonical-review',
    source: 'google_verified', provenance_status: 'GOOGLE_VERIFIED', rating: 5,
    author: 'Fixture', date: null, content: 'Synthetic feedback', replied: false,
  };
  const credentials = { oauthToken: 'private-token', accountId: 'accounts/123', locationId: 'locations/456' };
  const integration = { company_id: 'A', provider: 'google_gmb_oauth', status: 'connected' as const, credentials };
  const name = 'accounts/123/locations/456/reviews/canonical-review';
  const url = 'https://mybusiness.googleapis.com/v4/' + name;
  const reply = 'Fixture reply';
  const calls: Array<{url: string; method: string}> = [];

  let mode = 'verified';
  let wrote = false;
  const transport: typeof fetch = async (target, options) => {
    calls.push({url:String(target),method:options?.method||'GET'});
    assert.equal(options?.redirect,'error');
    if (options?.method === 'PUT') {
      wrote = true;
      assert.deepEqual(JSON.parse(String(options.body)), {comment:reply});
      if (mode === 'network') throw new Error('private transport error');
      if (mode === 'paused-after-put') setGlobalEmergencyStop(true);
      return new Response('{}',{status:mode==='server-error'?500:mode==='timeout'?408:mode==='rejected'?403:200});
    }
    if (wrote && mode==='read-timeout') throw new Error('private read failure');
    const comment = mode==='previously-verified' || (wrote && mode!=='mismatch') ? reply : 'Prior reply';
    return Response.json({
      name: mode==='wrong-source' || (wrote && mode==='wrong-readback') ? name.replace('456','999') : name,
      reviewReply: {comment},
    });
  };
  async function run(next: string, canWrite?: () => Promise<boolean>) {
    calls.length=0;
    wrote=false;
    mode=next;
    return dispatchAutonomousReviewReply('A',review,reply,integration,transport,canWrite);
  }
  await assert.rejects(dispatchAutonomousReviewReply('B',review,reply,integration,transport),/workspace mismatch/);
  for (const badReview of [
    {...review,rating:null},{...review,rating:2},{...review,is_operational_issue:true},
    {...review,source:'manual',provenance_status:'USER_ENTERED' as const},
    {...review,external_review_id:'locations/other'},
  ]) assert.equal((await dispatchAutonomousReviewReply('A',badReview,reply,integration,transport)).publication,'LOCAL_ONLY');
  assert.equal(reviewNeedsHumanReview({...review,rating:null}),true);
  for (const badIntegration of [
    {...integration,company_id:'B'},
    {...integration,provider:'google_business'},
    {...integration,status:'saved' as const},
    {...integration,credentials:{...credentials,expiresAt:'2000-01-01T00:00:00Z'}},
  ]) assert.equal((await dispatchAutonomousReviewReply('A',review,reply,badIntegration,transport)).publication,'LOCAL_ONLY');
  assert.equal(calls.length,0);

  setGlobalEmergencyStop(true);
  await assert.rejects(run('verified'),/execution stop/);
  assert.equal(calls.length,0);
  setGlobalEmergencyStop(false);

  assert.equal((await run('verified')).publication,'VERIFIED');
  assert.deepEqual(calls,[{url,method:'GET'},{url:url+'/reply',method:'PUT'},{url,method:'GET'}]);
  assert.equal((await run('previously-verified')).publication,'VERIFIED');
  assert.deepEqual(calls,[{url,method:'GET'}]);
  assert.equal((await run('wrong-source')).publication,'REJECTED');
  assert.equal(calls.length,1);
  assert.equal((await run('verified',async()=>false)).publication,'LOCAL_ONLY');
  assert.equal(calls.length,1);
  for (const [state, expected] of [
    ['mismatch','API_ACCEPTED'],['read-timeout','API_ACCEPTED'],['wrong-readback','API_ACCEPTED'],
    ['network','UNKNOWN'],['server-error','UNKNOWN'],['timeout','UNKNOWN'],['rejected','REJECTED'],
    ['paused-after-put','VERIFIED'],
  ]) {
    assert.equal((await run(state)).publication,expected);
    assert.equal(calls.filter(call=>call.method==='PUT').length,1);
  }

  let checks = 0;
  const accountAccess: typeof fetch = async (target, options) => {
    checks++;
    assert.equal(options?.redirect,'error');
    assert.ok(options?.signal);
    const address = new URL(String(target));
    assert.equal(address.pathname.startsWith('/v1/accounts/123'),true);
    if (checks===1) return Response.json({name:'accounts/123', accountName:'private account name'});
    if (checks===2) return Response.json({locations:[{name:'locations/999'}],nextPageToken:'next+page'});
    assert.equal(address.searchParams.get('pageToken'),'next+page');
    return Response.json({locations:[{name:'locations/456'}]});
  };
  assert.equal((await checkGoogleBusinessAccess(credentials,accountAccess)).success,true);
  assert.equal(checks,3);
  assert.equal((await checkGoogleBusinessAccess({...credentials,locationId:'bad/id'},accountAccess)).success,false);
  assert.equal(checks,3);
  assert.equal((await checkGoogleBusinessAccess(credentials,async()=>Response.json({name:'accounts/999'}))).success,false);
  assert.equal((await checkGoogleBusinessAccess(credentials,async(target)=>
    String(target).includes('accountmanagement')?Response.json({name:'accounts/123'}):
    Response.json({locations:[{name:'locations/999'}]}))).success,false);
  console.log('GBP: exact account/location reads, prior reply reconciliation, complaint and expired/revoked credential refusal, exact read-back and unknown PUT outcomes passed with intercepted transport.');
} finally {
  process.chdir(original);
  fs.rmSync(directory,{recursive:true,force:true});
}
