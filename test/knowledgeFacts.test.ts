import assert from 'node:assert/strict';
import {createFactInput,factCommandInput,governedFactGroups,type KnowledgeFact} from '../shared/knowledgeFacts';
import {retrieveKnowledge} from '../server/knowledgeRetrieval';
const fact=(change:Partial<KnowledgeFact>={}):KnowledgeFact=>({id:'kf_'+'a'.repeat(32),companyId:'A',key:'pricing.annual',value:'INR 25000',origin:'SOURCE',status:'APPROVED',version:'1',sourceId:'ks_source',sourceVersion:'3',chunkIndex:0,page:1,excerptStart:12,excerptEnd:21,contentSha:'a'.repeat(64),eligible:true,createdAtMs:0,...change});
const query=(facts:KnowledgeFact[])=>retrieveKnowledge('A','annual pricing',{},'0',{rows:[{id:'legacy',filename:'brochure',chunks:[{text:'annual pricing INR 99999'}]}],truncated:false},facts);
assert.ok(createFactInput.safeParse({key:'pricing.annual',value:'INR 25000'}).success);for(const value of [{key:'Price',value:'x'},{key:'ok',value:'x',approved:true},{key:'ok',value:'x',source:{id:'x',version:'bad'}},{key:'ok',value:'x',actor:'forged'}])assert.equal(createFactInput.safeParse(value).success,false);
assert.equal(factCommandInput.safeParse({expectedVersion:'9007199254740993'}).success,true);assert.equal(factCommandInput.safeParse({expectedVersion:1}).success,false);
assert.equal(query([fact()]).answer,'[S1] INR 25000');assert.equal(query([fact()]).citations[0].excerptStart,12);
assert.equal(query([fact(),fact({id:'kf_'+'b'.repeat(32),status:'DRAFT',value:'INR 35000'})]).status,'CONFLICT_REVIEW_REQUIRED');
const manual=fact({origin:'MANUAL',value:'Manual price INR 27000',sourceId:null,sourceVersion:null});assert.equal(query([manual,fact({status:'DRAFT',value:'INR 35000'})]).answer,'[S1] Manual price INR 27000');
for(const change of [{eligible:false},{status:'WITHDRAWN' as const},{status:'REJECTED' as const},{status:'DRAFT' as const}]){const result=query([fact(change)]);assert.equal(result.status,'FACT_APPROVAL_REQUIRED');assert.equal(result.isGrounded,false);assert.equal(result.citations.length,0);assert.ok(!result.answer.includes('99999'));}
assert.equal(governedFactGroups([fact(),fact({value:'Another approved value'})])[0].conflict,true);
assert.equal(query([manual,fact({origin:'MANUAL',value:'Conflicting manual'})]).status,'CONFLICT_REVIEW_REQUIRED');
console.log('Structured facts: strict commands, unsigned revisions, approved-manual precedence, source conflicts, exact quote offsets and ineligible/withdrawn/no-approval abstention without raw-source fallback passed.');

assert.equal(retrieveKnowledge('A','annual price',{},'0',{rows:[],truncated:false},[fact()]).mode,'GOVERNED_FACTS');assert.throws(()=>query([fact({companyId:'B'})]),/SCOPE_MISMATCH/);
