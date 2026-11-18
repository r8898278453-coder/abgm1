import type {Pool} from 'mysql2/promise';
import type {LeadStage} from '../shared/leadStages';
// Tracked opportunities use saveOpportunity, including close/reopen reasons and revision fencing.
export async function updateLeadStageSql(db:Pool,id:string,stage:LeadStage,company?:string,expected?:LeadStage):Promise<boolean>{
 if(!company||['won','lost'].includes(stage)||expected&&['won','lost'].includes(expected))return false;
 const c=await db.getConnection();try{await c.beginTransaction();await c.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);
 const [result]:any=await c.query(`UPDATE leads SET stage = ? WHERE id = ? AND company_id = ?${expected?' AND stage = ?':''} AND stage NOT IN ('won','lost') AND NOT EXISTS (SELECT 1 FROM sales_opportunities o WHERE o.company_id=leads.company_id AND o.lead_id=leads.id)`,[stage,id,company,...(expected?[expected]:[])]);
 await c.commit();return result.affectedRows>0;
 }catch(error){await c.rollback();throw error;}finally{c.release();}
}
