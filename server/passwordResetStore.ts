import type {Pool} from 'mysql2/promise';
/** Serialize all reset links for one user. Password and all-link consumption commit together. */
export async function consumePasswordResetSql(pool:Pool,tokenHash:string,derive:()=>{hash:string;salt:string}):Promise<{userId:string}|null>{
 if(!/^[a-f0-9]{64}$/.test(tokenHash))throw new Error('RESET_INPUT_INVALID');
 const connection=await pool.getConnection();try{
  await connection.beginTransaction();
  const [lookup]:any=await connection.query('SELECT user_id FROM password_reset_tokens WHERE token_hash=?',[tokenHash]);
  if(lookup.length!==1){await connection.rollback();return null;}
  const userId=lookup[0].user_id;
  const [users]:any=await connection.query('SELECT id FROM users WHERE id=? FOR UPDATE',[userId]);
  if(users.length!==1){await connection.rollback();return null;}
  const [tokens]:any=await connection.query('SELECT id,user_id,used_at,expires_at>UTC_TIMESTAMP() valid FROM password_reset_tokens WHERE token_hash=? FOR UPDATE',[tokenHash]);
  if(tokens.length!==1||tokens[0].user_id!==userId||tokens[0].used_at!==null||Number(tokens[0].valid)!==1){await connection.rollback();return null;}
  const {hash,salt}=derive();if(!hash||!salt)throw new Error('RESET_CREDENTIALS_INVALID');
  const [updated]:any=await connection.query('UPDATE users SET password_hash=?,salt=? WHERE id=?',[hash,salt,userId]);if(updated.affectedRows!==1)throw new Error('RESET_USER_WRITE_UNCONFIRMED');
  await connection.query('UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND used_at IS NULL',[userId]);
  await connection.commit();return {userId};
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
