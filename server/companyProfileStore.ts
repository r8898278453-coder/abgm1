import type {Pool} from 'mysql2/promise';
import {validWorkspaceRevision,WorkspaceConflict} from '../shared/workspaceRevision';
export async function readCompanyProfile(pool:Pick<Pool,'query'>,company:string){
 const [rows]:any=await pool.query('SELECT data_payload,CAST(revision AS CHAR) AS revision FROM company_profiles_data WHERE company_id=? LIMIT 1',[company]);
 if(!rows.length)return {data:null,version:'0'};
 const row=rows[0],data=typeof row.data_payload==='string'?JSON.parse(row.data_payload):row.data_payload;
 if(!data||typeof data!=='object'||Array.isArray(data)||!validWorkspaceRevision(row.revision))throw new Error('Invalid workspace snapshot');
 return {data,version:row.revision as string};
}
export async function writeCompanyProfile(pool:Pool,company:string,data:any,expected:string){
 if(!validWorkspaceRevision(expected)||!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid workspace save');
 const json=JSON.stringify(data),connection=await pool.getConnection();
 try{
  await connection.beginTransaction();
  const [owner]:any=await connection.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);if(owner.length!==1)throw new Error('Workspace unavailable');
  const [rows]:any=await connection.query('SELECT CAST(revision AS CHAR) AS revision FROM company_profiles_data WHERE company_id=? FOR UPDATE',[company]);
  const actual=rows.length?rows[0].revision:'0';if(actual!==expected)throw new WorkspaceConflict();
  if(BigInt(actual)>=18446744073709551615n)throw new Error('Workspace revision exhausted');
  const version=String(BigInt(actual)+1n);
  if(rows.length)await connection.query('UPDATE company_profiles_data SET data_payload=?,revision=? WHERE company_id=?',[json,version,company]);
  else await connection.query('INSERT INTO company_profiles_data(company_id,data_payload,revision) VALUES (?,?,?)',[company,json,version]);
  await connection.commit();return version;
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
