import {reservePublicationQuota} from './publicationQuota';
import {readScopedPublicationControlsFromSql,scopedPublicationBlock} from './publicationScopedControls';
import {loadPublicationPolicy,publicationNeedsApproval} from './publicationPolicy';
import {publishingSourceVersion} from './publishingSource';
import type { Pool } from 'mysql2/promise';
export interface PublishingClaim { postId: string; companyId: string; token: string }
export interface PublishingClaimResult { acquired: boolean; status: string }
export async function claimSqlPublishing(pool: Pool, claim: PublishingClaim, expectedVersion?:string): Promise<PublishingClaimResult> {
  if (![claim.postId,claim.companyId,claim.token].every(value => typeof value === 'string' && value.length > 0 && value.length <= 64)) throw new Error('INVALID_PUBLISHING_CLAIM');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [company]:any=await connection.query('SELECT id FROM companies WHERE id = ? FOR UPDATE',[claim.companyId]);
    if(!company.length)throw new Error('PUBLISHING_COMPANY_SCOPE_MISMATCH');
    const [source]:any=await connection.query('SELECT * FROM content_posts WHERE id = ? FOR UPDATE',[claim.postId]);
    if(source[0]?.company_id!==claim.companyId) throw new Error('PUBLISHING_POST_SCOPE_MISMATCH');
    if(expectedVersion && publishingSourceVersion(source[0])!==expectedVersion){await connection.commit();return {acquired:false,status:'SOURCE_CHANGED'};}
    await connection.query(`INSERT INTO publishing_dispatch_claims (post_id,company_id) VALUES (?,?) ON DUPLICATE KEY UPDATE post_id = VALUES(post_id)`,[claim.postId,claim.companyId]);
    const [rows]: any = await connection.query(`SELECT company_id,status,(started_at < DATE_SUB(NOW(),INTERVAL 5 MINUTE)) AS stale FROM publishing_dispatch_claims WHERE post_id = ? FOR UPDATE`,[claim.postId]);
    const row=rows[0];
    if(row.company_id !== claim.companyId) throw new Error('PUBLISHING_CLAIM_SCOPE_MISMATCH');
    if(row.status==='IN_PROGRESS' && row.stale) {
      await connection.query("UPDATE publishing_dispatch_claims SET status = 'UNKNOWN' WHERE post_id = ?",[claim.postId]); row.status='UNKNOWN';
    }
    if(!['READY','FAILED'].includes(row.status)) {await connection.commit();return {acquired:false,status:row.status};}
    const policy=await loadPublicationPolicy(connection,claim.companyId);
    if(publicationNeedsApproval(source[0],policy)){
      const [approvals]:any=await connection.query('SELECT resulting_version,policy_version FROM publication_workflow_audit WHERE company_id = ? AND post_id = ? ORDER BY audit_sequence DESC LIMIT 1',[claim.companyId,claim.postId]);
      if(source[0].status!=='scheduled' || approvals[0]?.resulting_version!==publishingSourceVersion(source[0]) || approvals[0]?.policy_version!==policy.version){
        await connection.commit();return {acquired:false,status:'APPROVAL_REQUIRED'};
      }
    }
    await connection.query("INSERT INTO publication_execution_controls (company_id,paused_channels) VALUES (?,'[]') ON DUPLICATE KEY UPDATE company_id = VALUES(company_id)",[claim.companyId]);
    const controls=await readScopedPublicationControlsFromSql(connection,claim.companyId);
    let targets=source[0].platforms;try{if(typeof targets==='string')targets=JSON.parse(targets);}catch{throw new Error('INVALID_PUBLISHING_TARGETS');}
    const scoped=scopedPublicationBlock(controls,Array.isArray(targets)&&targets.length?targets:[source[0].channel || 'google']);
    if(scoped){await connection.commit();return {acquired:false,status:scoped};}
    if(!await reservePublicationQuota(connection,claim.companyId,claim.postId,claim.token,controls.dailyPostLimit)){
      await connection.commit();return {acquired:false,status:'QUOTA_EXHAUSTED'};
    }
    await connection.query("UPDATE publishing_dispatch_claims SET status = 'IN_PROGRESS',claim_token = ?,started_at = NOW() WHERE post_id = ?",[claim.token,claim.postId]);
    await connection.commit();return {acquired:true,status:'IN_PROGRESS'};
  } catch(error){await connection.rollback();throw error;} finally{connection.release();}
}
export async function ownsSqlPublishing(pool: Pool, claim: PublishingClaim): Promise<boolean> {
  const [rows]: any = await pool.query("SELECT post_id FROM publishing_dispatch_claims WHERE post_id = ? AND company_id = ? AND claim_token = ? AND status = 'IN_PROGRESS'",[claim.postId,claim.companyId,claim.token]);
  return rows.length===1;
}
export async function settleSqlPublishing(pool: Pool, claim: PublishingClaim, status: 'PUBLISHED'|'FAILED'|'UNKNOWN'): Promise<boolean> {
  if(!['PUBLISHED','FAILED','UNKNOWN'].includes(status)) throw new Error('INVALID_PUBLISHING_SETTLEMENT');
  const connection=await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [post]:any=await connection.query('SELECT company_id FROM content_posts WHERE id = ? FOR UPDATE',[claim.postId]);
    if(post[0]?.company_id!==claim.companyId) throw new Error('PUBLISHING_POST_SCOPE_MISMATCH');
    const [result]:any=await connection.query("UPDATE publishing_dispatch_claims SET status = ? WHERE post_id = ? AND company_id = ? AND claim_token = ? AND status = 'IN_PROGRESS'",[status,claim.postId,claim.companyId,claim.token]);
    if(result.affectedRows!==1){await connection.commit();return false;}
    await connection.query('UPDATE content_posts SET status = ? WHERE id = ? AND company_id = ?',[status.toLowerCase(),claim.postId,claim.companyId]);
    await connection.commit();return true;
  } catch(error){await connection.rollback();throw error;} finally{connection.release();}
}
