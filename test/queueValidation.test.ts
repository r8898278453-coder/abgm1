import assert from 'node:assert/strict';
import { parseQueueRequest, queueResourceBelongsToCompany } from '../server/queueValidation';

const publishing = parseQueueRequest({ jobType: 'publishing', payload: { postId: 'post' }, idempotencyKey: 'once' });
assert.equal(publishing.job_type, 'publishing');
assert.equal(publishing.idempotency_key, 'once');
for (const input of [
  { job_type: 'report' },
  { job_type: 'publishing', payload: { postId: '' } },
  { job_type: 'publishing', payload: { postId: 'post', company_id: 'foreign' } },
  { job_type: 'seo_scan', payload: { keyword: 'dentist', centerLat: 0 } },
  { job_type: 'seo_scan', payload: { keyword: 'dentist', centerLat: 91, centerLng: 0 } },
  { job_type: 'ai_summary', payload: { arbitraryCommand: 'execute' } },
  { job_type: 'ai_summary', jobType: 'publishing' },
  { job_type: 'ai_summary', scheduled_for: 'tomorrow' },
  { job_type: 'lead_nurture', payload: {} },
  { job_type: 'ai_summary', company_id: 'foreign' },
]) assert.throws(() => parseQueueRequest(input));
assert.equal(parseQueueRequest({ job_type: 'seo_scan', payload: { keyword: 'dentist', centerLat: 0, centerLng: 0 } }).job_type, 'seo_scan');
const repo = {
  getPostById: async () => ({ company_id: 'owner' }),
  getAllLeads: async (company: string) => company === 'owner' ? [{ id: 'lead' }] : [],
};
assert.equal(await queueResourceBelongsToCompany(publishing, 'owner', repo), true);
assert.equal(await queueResourceBelongsToCompany(publishing, 'foreign', repo), false);
const nurture = parseQueueRequest({ job_type: 'lead_nurture', payload: { leadId: 'lead' } });
assert.equal(await queueResourceBelongsToCompany(nurture, 'owner', repo), true);
assert.equal(await queueResourceBelongsToCompany(nurture, 'foreign', repo), false);
console.log('Queue admission: aliases, payload/schedule/type restrictions and resource ownership checks passed.');

assert.throws(()=>parseQueueRequest({job_type:'knowledge_extract',payload:{sourceId:'foreign-source',sourceVersion:'1'}})); // Internal admission owns source/lease binding; public arbitrary jobs cannot bypass it.

assert.throws(()=>parseQueueRequest({job_type:'website_import',payload:{websiteUrl:'https://arbitrary.example/'}}));
