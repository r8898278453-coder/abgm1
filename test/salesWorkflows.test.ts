import {salesWorkflowRecoveryReason,recoverSalesWorkflows} from '../server/salesWorkflows';
import assert from 'node:assert/strict';
import {workflowDefinition,saveWorkflowInput,workflowDecisionInput,enrollWorkflowInput,completeWorkflowTaskInput,workflowTriggerEligible,WORKFLOW_PRESETS} from '../shared/salesWorkflows';
for(const preset of Object.values(WORKFLOW_PRESETS))assert.equal(workflowDefinition.safeParse(preset).success,true);
assert.equal(workflowDefinition.safeParse({...WORKFLOW_PRESETS.inquiry,steps:[{kind:'SEND_MESSAGE',delayMinutes:0,instructions:'Must not execute a provider call'}]}).success,false);
assert.equal(workflowDefinition.safeParse({...WORKFLOW_PRESETS.inquiry,automatic:true}).success,false);
assert.equal(workflowDefinition.safeParse({...WORKFLOW_PRESETS.inquiry,steps:Array(6).fill(WORKFLOW_PRESETS.inquiry.steps[0])}).success,false);
assert.equal(workflowDefinition.safeParse({...WORKFLOW_PRESETS.inquiry,steps:[{...WORKFLOW_PRESETS.inquiry.steps[0],delayMinutes:43200},{...WORKFLOW_PRESETS.inquiry.steps[0],delayMinutes:1}]}).success,false);
assert.equal(workflowDefinition.safeParse({...WORKFLOW_PRESETS.inquiry,steps:[{...WORKFLOW_PRESETS.inquiry.steps[0],delayMinutes:-1}]}).success,false);
assert.equal(saveWorkflowInput.safeParse({expectedVersion:'0',definition:WORKFLOW_PRESETS.inquiry,approved:true}).success,false);
assert.equal(workflowDecisionInput.safeParse({expectedVersion:'1',decision:'APPROVE',note:'Reviewed exact definition'}).success,true);
assert.equal(workflowDecisionInput.safeParse({expectedVersion:'1',decision:'APPROVE',note:''}).success,false);
assert.equal(enrollWorkflowInput.safeParse({workflowId:'swf_'+'a'.repeat(32),workflowVersion:'2',leadId:'leadA',requestKey:'b'.repeat(64),evidence:'Customer inquiry and recorded permission'}).success,true);
assert.equal(completeWorkflowTaskInput.safeParse({expectedVersion:'0',enrollmentVersion:'1',decision:'SEND_NOW',note:'Must not send'}).success,false);
assert.equal(workflowTriggerEligible('AFTERCARE','new'),false);assert.equal(workflowTriggerEligible('REVIEW_REQUEST','won'),true);assert.equal(workflowTriggerEligible('INQUIRY','lost'),false);
console.log('Sales workflow contracts: bounded steps/delays, strict versions/notes/enrollments, explicit review-only kinds, trigger eligibility and no send/auto injection passed.');

for(const state of ['ACTIVE','WAITING_REVIEW','WAITING_SEND'])for(const status of [null,'QUEUED','RETRY_WAIT','RUNNING','FAILED','CANCELLED','SUCCEEDED','invalid','queued']){
 assert.equal(salesWorkflowRecoveryReason({state,job_status:status,expired:1}),'WORKFLOW_EXPIRED');
 assert.equal(salesWorkflowRecoveryReason({state,job_status:status,expired:0}),state==='ACTIVE'&&!['QUEUED','RETRY_WAIT','RUNNING'].includes(status as string)?'REVIEW_JOB_UNAVAILABLE':null);
}
for(const state of ['COMPLETED','EXITED','active','invalid'])assert.equal(salesWorkflowRecoveryReason({state,job_status:null,expired:1}),null);
assert.deepEqual(await recoverSalesWorkflows({query:async()=>{throw new Error('Must not scan after budget');}} as any,()=>false),{exited:0,scanned:0});
console.log('Workflow recovery: exact active/waiting/terminal state matrix, runnable job boundaries, expiry priority and zero-SQL budget refusal passed.');
