import type {Connection,Pool} from 'mysql2/promise';
import type {DbLead} from './db';
/** One parameterized row writer. The caller owns validation, tenant authorization and transaction boundaries. */
export async function insertLeadRow(db:Connection|Pool,lead:Omit<DbLead,'stage'>&{stage:string}){
 await db.query(`INSERT INTO leads (id, company_id, name, company, phone, email, service, budget, stage, intent_score, source, notes, ai_suggested_reply)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,[lead.id,lead.company_id??null,lead.name,lead.company??null,lead.phone,lead.email??'',lead.service,lead.budget??null,lead.stage,lead.intent_score??null,lead.source,lead.notes??'',lead.ai_suggested_reply??'']);
}
