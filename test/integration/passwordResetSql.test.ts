import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {consumePasswordResetSql} from '../../server/passwordResetStore';
if(process.env.ABGM1_LOCAL_SQL_TESTS!=='1'||process.env.DB_HOST!=='127.0.0.1'||!process.env.DB_NAME?.startsWith('abgm1_test_')||!process.env.LOCAL_SQL_CONTAINER_ID)throw new Error('Disposable SQL identity required');
const db=await import('../../server/db'),auth=await import('../../server/auth'),pool=await db.getDbPool();assert.ok(pool);
const prefix='reset_'+crypto.randomBytes(8).toString('hex'),ids:string[]=[];let stage='identity';
const link=()=>crypto.randomBytes(32).toString('hex');
try{
 const [identity]:any=await pool.query('SELECT @@hostname hostname');assert.equal(identity[0].hostname,process.env.LOCAL_SQL_CONTAINER_ID);
 const a=await db.createUser({email:prefix+'a@example.invalid',password:'Old-password-fixture',full_name:'Fixture'}),b=await db.createUser({email:prefix+'b@example.invalid',password:'Other-password-fixture',full_name:'Fixture'});ids.push(a.id,b.id);
 const request=(token:string)=>({headers:{authorization:'Bearer '+token}} as any),old=auth.generateAuthToken(a);assert.equal((await auth.getAuthUserFromRequest(request(old)))?.id,a.id);
 stage='epoch';await pool.query("SET time_zone='-08:00'");const token=link(),sibling=link(),other=link();const expiry=new Date(Math.floor(Date.now()/1000)*1000+60000);const tokenId=await db.createPasswordResetToken(a.id,token,expiry);await db.createPasswordResetToken(a.id,sibling,expiry);const otherId=await db.createPasswordResetToken(b.id,other,expiry);
 assert.equal((await db.findPasswordResetToken(token))?.expires_at,expiry.toISOString());await db.markPasswordResetTokenUsed(otherId,a.id);assert.equal((await db.findPasswordResetToken(other))?.used_at,null);
 // The legacy invalidation helper invalidates A's own links; issue fresh racing links.
 const racing=link(),racingSibling=link();await db.createPasswordResetToken(a.id,racing,expiry);await db.createPasswordResetToken(a.id,racingSibling,expiry);
 stage='race';const results=await Promise.all(Array.from({length:8},()=>db.consumePasswordReset(racing,'New-password-fixture')));assert.equal(results.filter(Boolean).length,1);assert.equal(await db.consumePasswordReset(racingSibling,'Retry-password-fixture'),null);assert.equal((await db.findPasswordResetToken(other))?.used_at,null);assert.equal(await auth.getAuthUserFromRequest(request(old)),null);
 const current=await db.findUserById(a.id);assert.ok(current);assert.equal(db.verifyPassword('New-password-fixture',current.password_hash,current.salt),true);assert.equal((await auth.getAuthUserFromRequest(request(auth.generateAuthToken(current))))?.id,a.id);
 stage='rollback';const fresh=link();await db.createPasswordResetToken(a.id,fresh,expiry);const replacement=db.hashPassword('Rollback-password-fixture');
 const faultPool={getConnection:async()=>{const conn=await pool.getConnection();return new Proxy(conn,{get(target,key){if(key==='query')return async(sql:string,args:any)=>{if(sql.startsWith('UPDATE password_reset_tokens'))throw new Error('fixture-failure');return target.query(sql,args);};const value=(target as any)[key];return typeof value==='function'?value.bind(target):value;}});}} as any;
 await assert.rejects(consumePasswordResetSql(faultPool,fresh,()=>replacement));assert.equal((await db.findUserById(a.id))?.password_hash,current.password_hash);assert.equal((await db.findPasswordResetToken(fresh))?.used_at,null);
 stage='expired';const expired=link();await db.createPasswordResetToken(a.id,expired,new Date(Date.now()-10000));assert.equal(await db.consumePasswordReset(expired,'Expiry-password-fixture'),null);
 let derivations=0;assert.equal(await consumePasswordResetSql(pool,expired,()=>{derivations++;return replacement;}),null);assert.equal(derivations,0);
 stage='ambiguous';const duplicate=link();await db.createPasswordResetToken(a.id,duplicate,expiry);await db.createPasswordResetToken(b.id,duplicate,expiry);assert.equal(await db.consumePasswordReset(duplicate,'Ambiguous-password-fixture'),null);
 stage='rehash';const legacySalt=crypto.randomBytes(16).toString('hex'),legacyHash=crypto.pbkdf2Sync('Legacy-password-fixture',legacySalt,1000,64,'sha512').toString('hex');await pool.query('UPDATE users SET password_hash=?,salt=? WHERE id=?',[legacyHash,legacySalt,b.id]);
 await db.upgradeUserPassword(b.id,'Wrong-password-fixture');assert.equal((await db.findUserById(b.id))?.password_hash,legacyHash);
 await db.upgradeUserPassword(b.id,'Legacy-password-fixture');const upgraded=await db.findUserById(b.id);assert.ok(upgraded);assert.notEqual(upgraded.password_hash,legacyHash);assert.ok(db.verifyPassword('Legacy-password-fixture',upgraded.password_hash,upgraded.salt));assert.equal(await db.updateUserPassword('missing-user','New-password-fixture'),false);
 stage='rehash-reset-race';await pool.query('UPDATE users SET password_hash=?,salt=? WHERE id=?',[legacyHash,legacySalt,b.id]);
 const query=pool.query.bind(pool);let resetInjected=false;
 (pool as any).query=async(sql:string,args:any)=>{if(sql.startsWith('UPDATE users SET password_hash=?,salt=? WHERE id=? AND password_hash=')&&!resetInjected){resetInjected=true;await db.updateUserPassword(b.id,'Concurrent-reset-fixture');}return query(sql,args);};
 try{await db.upgradeUserPassword(b.id,'Legacy-password-fixture');}finally{(pool as any).query=query;}
 assert.equal(resetInjected,true);const afterRace=await db.findUserById(b.id);assert.ok(afterRace);assert.ok(db.verifyPassword('Concurrent-reset-fixture',afterRace.password_hash,afterRace.salt));assert.equal(db.verifyPassword('Legacy-password-fixture',afterRace.password_hash,afterRace.salt),false);
 console.log('Password reset SQL: one of eight contenders consumes once, sibling invalidation/user isolation, atomic rollback, UTC DATETIME in -08 session, ambiguous/expired rejection, password-bound bearer invalidation and checked legacy rehash passed.');
}catch(error:any){console.log(JSON.stringify({fixture:'password-reset',stage,code:error?.code||'ASSERTION',line:error?.stack?.match(/passwordResetSql.test.ts:(\d+)/)?.[1]}));process.exitCode=1;}
finally{for(const id of ids){await pool.query('DELETE FROM password_reset_tokens WHERE user_id=?',[id]);await pool.query('DELETE FROM users WHERE id=?',[id]);}await pool.end();}
