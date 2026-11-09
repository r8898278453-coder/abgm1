import type {Pool} from 'mysql2/promise';
import crypto from 'node:crypto';
import type {DomainDnsSnapshot} from '../shared/website';
import {WebsiteError,websiteConfigPatch,normalizeWebsiteDomain} from '../shared/website';
const domainSelect='SELECT *,UNIX_TIMESTAMP(created_at)*1000 created_ms,UNIX_TIMESTAMP(updated_at)*1000 updated_ms,UNIX_TIMESTAMP(verified_at)*1000 verified_ms FROM custom_domains';
export const websiteDomainRow=(row:any)=>({...row,created_at:iso(row.created_ms),updated_at:iso(row.updated_ms),verified_at:iso(row.verified_ms)});
export async function readDomainsSql(pool:Pool,company:string){const [rows]:any=await pool.query(domainSelect+' WHERE company_id=? ORDER BY created_at DESC',[company]);return rows.map(websiteDomainRow);}
export async function readDomainSql(pool:Pool,id:string){const [rows]:any=await pool.query(domainSelect+' WHERE id=? LIMIT 1',[id]);return rows.length?websiteDomainRow(rows[0]):null;}
const iso=(value:any)=>value==null?null:new Date(Number(value)).toISOString();
export function websiteConfigRow(row:any){return {...row,enable_whatsapp_cta:!!row.enable_whatsapp_cta,enable_direct_call_cta:!!row.enable_direct_call_cta,enable_inquiry_form:!!row.enable_inquiry_form,created_at:iso(row.created_ms),updated_at:iso(row.updated_ms)};}
export async function readWebsiteConfigSql(pool:Pool,company:string){
 const [rows]:any=await pool.query('SELECT *,UNIX_TIMESTAMP(created_at)*1000 created_ms,UNIX_TIMESTAMP(updated_at)*1000 updated_ms FROM website_configs WHERE company_id=? LIMIT 1',[company]);
 return rows.length?websiteConfigRow(rows[0]):null;
}
export async function saveWebsiteConfigSql(pool:Pool,company:string,input:unknown){
 const patch=websiteConfigPatch.parse(input);const fields=Object.keys(patch);const values=fields.map(key=>typeof patch[key]==='boolean'?Number(patch[key]):patch[key]);
 const conn=await pool.getConnection();try{
  await conn.beginTransaction();const [owner]:any=await conn.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);if(owner.length!==1)throw new WebsiteError(404,'WORKSPACE_NOT_FOUND','Workspace not found');
  const [existing]:any=await conn.query('SELECT id FROM website_configs WHERE company_id=? FOR UPDATE',[company]);
  if(existing.length)await conn.query(`UPDATE website_configs SET ${fields.map(field=>'`'+field+'`=?').join(',')} WHERE company_id=?`,[...values,company]);
  else await conn.query(`INSERT INTO website_configs (id,company_id,subdomain,${fields.map(field=>'`'+field+'`').join(',')}) VALUES (${Array(fields.length+3).fill('?').join(',')})`,['web_'+crypto.createHash('sha256').update(company).digest('hex').slice(0,48),company,company,...values]);
  const [rows]:any=await conn.query('SELECT *,UNIX_TIMESTAMP(created_at)*1000 created_ms,UNIX_TIMESTAMP(updated_at)*1000 updated_ms FROM website_configs WHERE company_id=?',[company]);
  if(rows.length!==1)throw new Error('CONFIG_ACK_UNAVAILABLE');const saved=websiteConfigRow(rows[0]);await conn.commit();return saved;
 }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}
export async function createDomainSql(pool:Pool,record:any){
 const domain=normalizeWebsiteDomain(record.domain);const conn=await pool.getConnection();try{
  await conn.beginTransaction();const [owner]:any=await conn.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[record.company_id]);if(owner.length!==1)throw new WebsiteError(404,'WORKSPACE_NOT_FOUND','Workspace not found');
  const [existing]:any=await conn.query(domainSelect+' WHERE company_id=? AND domain=?',[record.company_id,domain]);
  if(existing.length){await conn.commit();return websiteDomainRow(existing[0]);}
  try{await conn.query('INSERT INTO custom_domains (id,company_id,domain,status,ssl_status,cname_target,a_record_target,dns_txt_record) VALUES (?,?,?,?,?,?,?,?)',[record.id,record.company_id,domain,'pending_verification','unverified',record.cname_target,record.a_record_target,record.dns_txt_record]);}
  catch(error:any){if(error.code==='ER_DUP_ENTRY')throw new WebsiteError(409,'DOMAIN_CONFLICT','Domain registration conflicts with an existing record');throw error;}
  const [rows]:any=await conn.query(domainSelect+' WHERE id=? AND company_id=?',[record.id,record.company_id]);if(rows.length!==1)throw new Error('DOMAIN_ACK_UNAVAILABLE');await conn.commit();return websiteDomainRow(rows[0]);
 }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}
export async function saveDomainDnsSql(pool:Pool,company:string,id:string,proof:DomainDnsSnapshot,verified:boolean){
 const conn=await pool.getConnection();try{
  await conn.beginTransaction();const [rows]:any=await conn.query(domainSelect+' WHERE company_id=? AND id=? AND domain=? AND cname_target=? AND a_record_target=? AND BINARY dns_txt_record=BINARY ? FOR UPDATE',[company,id,proof.domain,proof.cname_target,proof.a_record_target,proof.dns_txt_record]);
  if(rows.length!==1){await conn.rollback();return null;}
  await conn.query("UPDATE custom_domains SET status=?,ssl_status='unverified',verified_at=IF(?,FROM_UNIXTIME(?),NULL) WHERE company_id=? AND id=? AND BINARY dns_txt_record=BINARY ?",[verified?'dns_verified':'pending_verification',verified?1:0,Date.now()/1000,company,id,proof.dns_txt_record]);
  const [saved]:any=await conn.query(domainSelect+' WHERE company_id=? AND id=?',[company,id]);await conn.commit();return websiteDomainRow(saved[0]);
 }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}
export async function deleteDomainSql(pool:Pool,company:string,id:string){const [result]:any=await pool.query('DELETE FROM custom_domains WHERE company_id=? AND id=?',[company,id]);return result.affectedRows>0;}
