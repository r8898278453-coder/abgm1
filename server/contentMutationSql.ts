import type {Pool} from 'mysql2/promise';
export async function deleteContentPostSql(pool:Pool,id:string,company?:string):Promise<boolean>{
 const [result]:any=await pool.query(`DELETE FROM content_posts WHERE id = ?${company?' AND company_id = ?':''} AND status IN ('draft','pending_approval','scheduled','failed') AND NOT EXISTS (SELECT 1 FROM publishing_dispatch_claims WHERE post_id = content_posts.id)`,[id,...(company?[company]:[])]);
 return result.affectedRows>0;
}
