export interface IndexRow {
  TABLE_NAME: string; INDEX_NAME: string; COLUMN_NAME?: string;
  SEQ_IN_INDEX?: number; NON_UNIQUE?: number; SUB_PART?: number | null;
}

/** An equivalent unique key must cover exactly the required columns, without prefixes. */
export function hasEquivalentIndex(rows: IndexRow[], table: string, columns: string[], unique = false): boolean {
  const groups = new Map<string, IndexRow[]>();
  for (const row of rows.filter(r => r.TABLE_NAME === table)) {
    groups.set(row.INDEX_NAME, [...(groups.get(row.INDEX_NAME) || []), row]);
  }
  return [...groups.values()].some(group => {
    const ordered = [...group].sort((a, b) => Number(a.SEQ_IN_INDEX) - Number(b.SEQ_IN_INDEX));
    return (!unique || (ordered.length === columns.length && ordered.every(r => Number(r.NON_UNIQUE) === 0))) &&
      columns.every((column, i) => ordered[i]?.COLUMN_NAME === column && ordered[i]?.SUB_PART == null);
  });
}

export const INDEX_REQUIREMENTS: Record<string, string[]> = {
  'public_lead_intakes.idx_public_intake_created':['company_id','created_at'],
  'public_lead_intakes.idx_public_intake_notification':['company_id','notification_state','updated_at'],
  'users.idx_user_email':['email'],'users.idx_user_role':['role'],
  'companies.idx_company_user':['user_id'],'companies.idx_company_city':['city'],
  'autonomous_actions.idx_aa_company':['company_id'],'autonomous_actions.idx_aa_approval':['approval_status'],'autonomous_actions.idx_aa_execution':['execution_state'],
  'dispatcher_ticks.idx_dispatcher_status':['status','started_at'],
  'message_delivery_receipts.idx_receipt_message':['company_id','provider_id','phone_number_id','status'],
  'message_delivery_receipts.idx_receipt_day':['company_id','received_at'],
  'message_dispatch_intents.idx_message_intent_created':['company_id','created_at'],
  'message_dispatch_intents.idx_message_intent_state':['company_id','status','updated_at'],
  'publication_admission_reservations.idx_admission_post':['post_id'],
  'publication_workflow_audit.idx_workflow_day':['company_id','recorded_at'],
  'job_queue.idx_job_company_status':['company_id','status'],
  'content_posts.idx_post_company_status':['company_id','status'],
  'publishing_dispatch_claims.idx_claim_company_status':['company_id','status'],
  'publication_workflow_audit.idx_workflow_sequence':['company_id','post_id','audit_sequence'],
  'leads.idx_leads_company': ['company_id'], 'leads.idx_leads_stage': ['stage'],
  'reviews.idx_rev_company': ['company_id'], 'reviews.idx_rev_rating': ['rating'],
  'reviews.idx_rev_source': ['source'], 'content_posts.idx_cp_company': ['company_id'],
  'content_posts.idx_cp_status': ['status'], 'custom_domains.idx_custom_domains_domain': ['domain'],
  'custom_domains.idx_custom_domains_company': ['company_id'],
};
export const UNIQUE_REQUIREMENTS: Record<string, string[]> = {
  'public_lead_intakes.PRIMARY':['company_id','request_key'],'public_lead_intakes.uq_public_intake_lead':['lead_id'],
  'website_configs.company_id':['company_id'],
  'dispatcher_state.PRIMARY':['cursor_key'],
  'dispatcher_ticks.PRIMARY':['slot_key'],
  'company_profiles_data.PRIMARY':['company_id'],
  'message_delivery_receipts.PRIMARY':['company_id','event_key'],
  'message_dispatch_intents.PRIMARY':['company_id','request_key'],
  'publication_admission_reservations.PRIMARY':['company_id','quota_day','post_id'],
  'publication_control_audit.uq_publication_control_revision':['company_id','revision'],
  'publication_workflow_audit.uq_workflow_sequence':['audit_sequence'],
  'job_queue.uq_jq_company_idempotency': ['company_id', 'idempotency_key'],
  'companies.public_form_token': ['public_form_token'], 'custom_domains.domain': ['domain'],
};
