import type {PoolConnection} from 'mysql2/promise';
import type {ReadOnlySql} from './readOnlySqlDeadline';
export async function readPublicationQuota(sql:ReadOnlySql,company:string,limit:number|null){
 const [rows]:any=await sql.query(`SELECT DATE_FORMAT(UTC_TIMESTAMP() + INTERVAL 330 MINUTE,'%Y-%m-%d') AS quota_date,
  (SELECT COUNT(*) FROM publication_admission_reservations WHERE company_id = ? AND quota_day = DATE(UTC_TIMESTAMP() + INTERVAL 330 MINUTE)) AS reserved`,[company]);
 const reservedPosts=Number(rows[0].reserved);if(!Number.isSafeInteger(reservedPosts)||reservedPosts<0)throw new Error('INVALID_QUOTA_COUNT');
 return {date:rows[0].quota_date as string,reservedPosts,remaining:limit===null?null:Math.max(0,limit-reservedPosts)};
}
/** Caller retains the company mutex and publishing claim transaction. Never release ambiguous reservations. */
export async function reservePublicationQuota(sql:PoolConnection,company:string,post:string,token:string,limit:number|null){
 const quota=await readPublicationQuota(sql,company,limit);
 const [existing]:any=await sql.query('SELECT post_id FROM publication_admission_reservations WHERE company_id = ? AND quota_day = ? AND post_id = ?',[company,quota.date,post]);
 if(existing.length)return true;
 if(limit!==null&&quota.reservedPosts>=limit)return false;
 await sql.query('INSERT INTO publication_admission_reservations (company_id,quota_day,post_id,claim_token) VALUES (?,?,?,?)',[company,quota.date,post,token]);
 return true;
}
