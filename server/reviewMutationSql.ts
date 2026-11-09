import type {Pool} from 'mysql2/promise';
export async function saveReviewReplySql(db:Pool,id:string,text:string,date:string,status:string,company?:string):Promise<boolean>{
 const [result]:any=await db.query(`UPDATE reviews SET replied = 1, reply_text = ?, reply_date = ?, reply_status = ? WHERE id = ?${company?' AND company_id = ?':''}`,[text,date,status,id,...(company?[company]:[])]);
 return result.affectedRows>0;
}
export async function deleteReviewSql(db:Pool,id:string,company?:string):Promise<boolean>{
 const [result]:any=await db.query(`DELETE FROM reviews WHERE id = ?${company?' AND company_id = ?':''}`,[id,...(company?[company]:[])]);
 return result.affectedRows>0;
}
