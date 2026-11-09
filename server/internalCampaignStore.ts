import type {Pool} from 'mysql2/promise';
import {platformDayBounds} from '../shared/dailyWorkReport';
const editable=['name','objective','status','start_date','end_date','planned_budget','channels','external_campaign_id'];
/** Patch only this client's planning record; validate dates against the locked current row. */
export async function updateInternalCampaignSql(pool:Pool,id:string,updates:any,company:string){
 const connection=await pool.getConnection();try{
  await connection.beginTransaction();const [rows]:any=await connection.query('SELECT id,start_date,end_date FROM internal_campaigns WHERE id=? AND company_id=? FOR UPDATE',[id,company]);if(rows.length!==1){await connection.rollback();return false;}
  const start=updates.start_date??rows[0].start_date,end=updates.end_date??rows[0].end_date;platformDayBounds(start);platformDayBounds(end);if(end<start)throw new Error('CAMPAIGN_PERIOD_INVALID');
  const selected=editable.filter(key=>updates[key]!==undefined);if(!selected.length){await connection.rollback();return false;}
  const assignments=selected.map(key=>key+'=?'),values=selected.map(key=>key==='channels'?JSON.stringify(updates[key]):updates[key]);
  await connection.query('UPDATE internal_campaigns SET '+assignments.join(',')+',updated_at=NOW() WHERE id=? AND company_id=?',[...values,id,company]);await connection.commit();return true;
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
