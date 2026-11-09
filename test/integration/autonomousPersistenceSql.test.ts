import assert from 'node:assert/strict';
import crypto from 'node:crypto';
if(process.env.ABGM1_LOCAL_SQL_TESTS!=='1'||process.env.DB_HOST!=='127.0.0.1'||!process.env.DB_NAME?.startsWith('abgm1_test_')||!process.env.LOCAL_SQL_CONTAINER_ID)throw new Error('Disposable local SQL identity required');
const db=await import('../../server/db');const pool=await db.getDbPool();assert.ok(pool);
const company='persistence_'+crypto.randomBytes(10).toString('hex');
let stage='reads';
try{
 const [identity]:any=await pool.query('SELECT @@hostname hostname');assert.equal(identity[0].hostname,process.env.LOCAL_SQL_CONTAINER_ID);
 await pool.query("SET time_zone='-08:00'");
 assert.deepEqual(await db.getAutonomousRecommendationsByCompany(company),[]);assert.deepEqual(await db.getAutonomousActionsByCompany(company),[]);assert.deepEqual(await db.getAutonomousAuditLogsByCompany(company),[]);
 stage='recommendation-create';const recommendation=await db.createAutonomousRecommendation({company_id:company,observation:'synthetic local fixture',source:'fixture',recommended_action:'fixture',action_type:'fixture',affected_metric:'fixture'} as any);
 assert.equal(recommendation.company_id,company);const recommendations=await db.getAutonomousRecommendationsByCompany(company);assert.equal(recommendations.length,1);assert.ok(Math.abs(Date.parse(recommendations[0].created_at)-Date.now())<10000);
 assert.equal(await db.updateAutonomousRecommendationStatus(recommendation.id,'dismissed'),true);assert.equal(await db.updateAutonomousRecommendationStatus(company,'dismissed'),false);
 stage='action-create';const action=await db.createAutonomousAction({company_id:company,action_type:'fixture',payload:{synthetic:true}} as any);assert.equal(action.company_id,company);
 assert.equal((await db.getAutonomousActionById(action.id))?.approval_status,'pending_approval');const actions=await db.getAutonomousActionsByCompany(company);assert.equal(actions.length,1);assert.ok(Math.abs(Date.parse(actions[0].created_at)-Date.now())<10000);
 assert.equal((await db.updateAutonomousAction(action.id,{execution_state:'blocked',error:'synthetic fixture'}))?.execution_state,'blocked');assert.equal(await db.updateAutonomousAction(company,{execution_state:'blocked'}),null);
 stage='audit-create';const audit=await db.recordAutonomousAuditLog({company_id:company,action_id:action.id,actor:'fixture',event_type:'fixture',details:{synthetic:true}});assert.equal(audit.company_id,company);const logs=await db.getAutonomousAuditLogsByCompany(company);assert.equal(logs.length,1);assert.ok(Math.abs(Date.parse(logs[0].timestamp)-Date.now())<10000);
 assert.deepEqual(await db.getAutonomousActionsByCompany(company+'_other'),[]);assert.equal(await db.getAutonomousActionById(company),null);
 const [session]:any=await pool.query('SELECT @@session.time_zone zone');assert.equal(session[0].zone,'-08:00');
 console.log('Restricted production-mode SQL autonomous repository: actual recommendation/action/audit creates, reads, updates, absent/empty results and tenant-filtered lists passed without schema privileges; UTC epoch timestamps preserved in -08:00 SQL session.');
}catch(error:any){console.log(JSON.stringify({fixture:'autonomous-persistence',stage,code:error?.code||'ASSERTION'}));process.exitCode=1;
}finally{
 for(const table of ['autonomous_audit_logs','autonomous_actions','autonomous_recommendations'])await pool.query(`DELETE FROM ${table} WHERE company_id=?`,[company]);
 await pool.end();
}
