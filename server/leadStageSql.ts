import type {Pool} from 'mysql2/promise';
import type {LeadStage} from '../shared/leadStages';
export async function updateLeadStageSql(db:Pool,id:string,stage:LeadStage,company?:string,expected?:LeadStage):Promise<boolean>{
 const [result]:any=await db.query(`UPDATE leads SET stage = ? WHERE id = ?${company?' AND company_id = ?':''}${expected?' AND stage = ?':''}`,[stage,id,...(company?[company]:[]),...(expected?[expected]:[])]);
 return result.affectedRows>0;
}
