import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
process.env.NODE_ENV='production';process.env.AUTH_SECRET='synthetic-runtime-authority-secret-not-for-production';
Object.assign(process.env,{DB_HOST:'fixture.invalid',DB_NAME:'fixture',DB_USER:'fixture',DB_PASSWORD:'fixture'});
let fail=false;let count=0;let action:any=null;let recommendationExists=false;
const original=mysql.createPool;
const pool={getConnection:async()=>({release(){}}),query:async(sql:string,params:any[]=[])=>{
 count++;if(fail)throw Object.assign(new Error('synthetic connection failure'),{code:'ECONNRESET'});
 if(sql.includes('INSERT INTO autonomous_actions')){action={id:params[0],company_id:params[1],action_type:params[3],approval_status:params[6],execution_state:params[7],verification_state:params[9],created_at:params[12]};return [{affectedRows:1}];}
 if(sql.includes('UPDATE autonomous_actions')){if(action&&params.at(-1)===action.id)action.execution_state=params[0];return [{affectedRows:action?1:0}];}
 if(sql.includes('FROM autonomous_actions WHERE id'))return [[action&&action.id===params[0]?action:null].filter(Boolean)];
 if(sql.includes('INSERT INTO autonomous_recommendations')){recommendationExists=true;return [{affectedRows:1}];}
 if(sql.includes('UPDATE autonomous_recommendations'))return [{affectedRows:recommendationExists&&params[1]==='recommendation'?1:0}];
 if(sql.includes('INSERT INTO autonomous_audit_logs'))return [{affectedRows:1}];
 if(sql.startsWith('SELECT'))return [[]];throw new Error('Unexpected fixture statement');
}};
(mysql as any).createPool=()=>pool;
try{
 const db=await import('../server/db');
 const created=await db.createAutonomousAction({id:'action',company_id:'A',action_type:'fixture'} as any);assert.equal(created.id,'action');
 assert.equal((await db.getAutonomousActionById('action'))?.company_id,'A');
 assert.equal((await db.updateAutonomousAction('action',{execution_state:'blocked'}))?.execution_state,'blocked');
 assert.equal(await db.getAutonomousActionById('missing'),null);assert.equal(await db.updateAutonomousAction('missing',{execution_state:'blocked'}),null);
 const recommendation=await db.createAutonomousRecommendation({id:'recommendation',company_id:'A',observation:'fixture',source:'fixture',recommended_action:'fixture',action_type:'fixture',affected_metric:'fixture'} as any);assert.equal(recommendation.id,'recommendation');
 assert.equal(await db.updateAutonomousRecommendationStatus('recommendation','dismissed'),true);assert.equal(await db.updateAutonomousRecommendationStatus('missing','dismissed'),false);
 assert.equal((await db.recordAutonomousAuditLog({id:'audit',company_id:'A',actor:'fixture',event_type:'fixture'} as any)).id,'audit');
 // A confirmed empty SQL result is authoritative even after successful writes in this process.
 assert.deepEqual(await db.getAutonomousRecommendationsByCompany('A'),[]);assert.deepEqual(await db.getAutonomousActionsByCompany('B'),[]);assert.deepEqual(await db.getAutonomousAuditLogsByCompany('A'),[]);
 fail=true;const before=count;await assert.rejects(db.createAutonomousAction({id:'failed',company_id:'A',action_type:'fixture'} as any));assert.equal(count,before+1);
 await assert.rejects(db.getAutonomousActionsByCompany('A'));await assert.rejects(db.recordAutonomousAuditLog({company_id:'A',actor:'fixture',event_type:'fixture'} as any));
 console.log('Production autonomous persistence: confirmed writes return SQL results, empty/missing reads are authoritative, absent updates false/null, and database failures cannot return memory success.');
}finally{(mysql as any).createPool=original;}
