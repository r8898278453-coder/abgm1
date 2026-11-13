import assert from 'node:assert/strict';
import {inquiryRuleInput} from '../shared/salesInquiryRules';
const body={expectedVersion:'0',enabled:true,workflowId:'swf_'+'a'.repeat(32),workflowVersion:'2',note:'Reviewed this exact client inquiry workflow'};
assert.equal(inquiryRuleInput.safeParse(body).success,true);
assert.equal(inquiryRuleInput.safeParse({...body,enabled:false,workflowId:null,workflowVersion:null}).success,true);
for(const input of [{...body,automaticSend:true},{...body,enabled:'true'},{...body,workflowVersion:null},{...body,workflowId:null},{...body,workflowVersion:'02'},{...body,note:'ok'},{...body,expectedVersion:0},{...body,providerToken:'secret'}])assert.equal(inquiryRuleInput.safeParse(input).success,false);
console.log('Inquiry rule contracts: exact approved revision, explicit boolean opt-in, evidence, disable without provider and no auto-send/credential injection passed.');
