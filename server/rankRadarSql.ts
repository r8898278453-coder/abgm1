import {decryptCredentialsObject} from './db';
import crypto from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {agencyClientAccess} from './agencyPolicy';
import {agencyAudit} from './agencyRoutes';
import {normalizeRanks,saveRanksInTransaction,ObservationError} from './observationStore';
import {validWorkspaceRevision} from '../shared/workspaceRevision';
import {canonicalJson} from '../shared/canonicalJson';
export const rankSource=(company:any)=>crypto.createHash('sha256').update(canonicalJson({name:company.name,place:company.rankPlaceId||company.google_place_id||null,city:company.city??null,latitude:company.latitude==null?null:Number(company.latitude),longitude:company.longitude==null?null:Number(company.longitude)})).digest('hex');
/** Use the same explicitly selected Places identity as the public-listing integration, without implying OAuth. */
export async function readRankCompany(sql:Pick<Pool,'query'>,company:string,lockedCompany?:any){const rows=lockedCompany?[lockedCompany]:(await sql.query('SELECT * FROM companies WHERE id=?',[company]))[0] as any[];if(rows.length!==1)return null;const[integrations]:any=await sql.query("SELECT credentials FROM company_integrations WHERE company_id=? AND provider='google_business'",[company]);if(integrations.length>1)throw new ObservationError('RANK_IDENTITY_AMBIGUOUS',409);const creds=integrations.length?decryptCredentialsObject(typeof integrations[0].credentials==='string'?JSON.parse(integrations[0].credentials):integrations[0].credentials):{};const place=rows[0].google_place_id||creds.placeId||null;if(place!==null&&(typeof place!=='string'||!place.trim()||place.length>128))throw new ObservationError('RANK_IDENTITY_INVALID',422);return{...rows[0],rankPlaceId:place};}
/** Capture before network activity; commit observations and the exact profile CAS together. */
export async function commitRankRadar(pool:Pool,user:any,company:string,expectedVersion:string,source:string,scan:any){
 if(!validWorkspaceRevision(expectedVersion)||BigInt(expectedVersion)>=18446744073709551615n)throw new ObservationError('RANK_VERSION_INVALID',409);
 const records=normalizeRanks(scan.observations,company,scan.keyword);
 if(records.length!==9||new Set(records.map(r=>r.grid_index)).size!==9||records.some(r=>r.provider!==scan.provider)||new Set(records.map(r=>r.timestamp)).size!==1)throw new ObservationError('RANK_GRID_INVALID');
 const c=await pool.getConnection();try{await c.beginTransaction();const[owners]:any=await c.query('SELECT * FROM companies WHERE id=? FOR UPDATE',[company]);if(owners.length!==1||rankSource(await readRankCompany(c,company,owners[0]))!==source)throw new ObservationError('RANK_SOURCE_CHANGED',409);
 const access=await agencyClientAccess(c,user,company,'write');if(!access.authorized)throw new ObservationError('RANK_ACCESS_CHANGED',access.status);
 const[profiles]:any=await c.query('SELECT data_payload,CAST(revision AS CHAR) version FROM company_profiles_data WHERE company_id=? FOR UPDATE',[company]);if((profiles[0]?.version||'0')!==expectedVersion)throw new ObservationError('RANK_WORKSPACE_CHANGED',409);
 const data=profiles.length?(typeof profiles[0].data_payload==='string'?JSON.parse(profiles[0].data_payload):profiles[0].data_payload):{};
 if(!data||Array.isArray(data)||typeof data!=='object'||data.keywords!==undefined&&!Array.isArray(data.keywords))throw new ObservationError('RANK_WORKSPACE_INVALID',503);
 const keywords=data.keywords||[],index=keywords.findIndex((r:any)=>typeof r.keyword==='string'&&r.keyword.trim().toLowerCase()===scan.keyword.toLowerCase());if(index<0&&keywords.length>=25)throw new ObservationError('RANK_KEYWORD_LIMIT',409);
 const center=records.find(r=>r.grid_index===4)!;const[previous]:any=await c.query('SELECT *,UNIX_TIMESTAMP(timestamp)*1000 stamp_ms FROM rank_observations WHERE company_id=? AND keyword=? AND grid_index=4 ORDER BY timestamp DESC,id DESC LIMIT 1',[company,scan.keyword]);const old=previous[0];const marker='rank-v2|'+source+'|';
 const comparable=old&&['LIVE','VERIFIED'].includes(old.status)&&['LIVE','VERIFIED'].includes(center.status)&&old.provider===center.provider&&Number(old.latitude)===center.latitude&&Number(old.longitude)===center.longitude&&old.source_evidence?.startsWith(marker)&&Number(old.stamp_ms)<Date.parse(center.timestamp)&&Date.parse(center.timestamp)-Number(old.stamp_ms)<=7*86400000;
 const previousRank=comparable&&old.position!==null?Number(old.position):null;const rank=center.position;
 const entry={...scan,id:index<0?'kw_'+crypto.randomUUID().replaceAll('-',''):keywords[index].id,rank,previousRank,diff:previousRank!==null&&rank!==null?previousRank-rank:null,lastScannedAt:center.timestamp,sourceFingerprint:source};delete entry.recommendation;
 for(const row of records)row.source_evidence=marker+(row.source_evidence||'').slice(0,3950);
 await saveRanksInTransaction(c,records);if(index<0)keywords.unshift(entry);else keywords[index]=entry;data.keywords=keywords;
 const version=String(BigInt(expectedVersion)+1n);if(profiles.length)await c.query('UPDATE company_profiles_data SET data_payload=?,revision=? WHERE company_id=?',[JSON.stringify(data),version,company]);else await c.query('INSERT INTO company_profiles_data(company_id,data_payload,revision) VALUES (?,?,?)',[company,JSON.stringify(data),version]);
 await agencyAudit(c,company,user.id,'RANK_SCAN_RECORDED',{provider:scan.provider,classification:scan.dataClassification,observations:9,previousVersion:expectedVersion,version});await c.commit();return{companyId:company,previousVersion:expectedVersion,version,keyword:entry,keywords};
 }catch(error){await c.rollback();throw error;}finally{c.release();}
}
