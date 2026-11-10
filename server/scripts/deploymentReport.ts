import type {Pool} from 'mysql2/promise';
import type {VerificationResult} from '../migrator';
import {readOnlyDatabaseReport} from './readOnlyDatabaseReport';
/** Read-only release prerequisite evidence, never proof that hosting or providers work. */
export async function deploymentReport(input:{nodeVersion:string;exists:(file:string)=>boolean;getPool:()=>Promise<Pool|null>;verify:(pool:Pool)=>Promise<VerificationResult>;connectionDiagnostic?:()=>string|undefined}){
 const match=/^v?(\d+)\.\d+\.\d+(?:[-+].*)?$/.exec(input.nodeVersion);
 const node=!!match&&Number(match[1])>=20;
 const required=['dist/client/index.html','dist/server.cjs'];
 const missingArtifacts=required.filter(file=>{try{return!input.exists(file);}catch{return true;}});
 const database=await readOnlyDatabaseReport(input.getPool,input.verify,input.connectionDiagnostic);
 const passed=node&&!missingArtifacts.length&&database.exitCode===0;
 return {exitCode:passed?0:1,report:{status:passed?'PREREQUISITES_PASS':'PREREQUISITES_FAIL',node:node?'PASS':'FAIL',minimumNodeMajor:20,build:missingArtifacts.length?'FAIL':'PASS',missingArtifacts,database:database.report,note:'Local artifact/runtime and configured schema checks only. Actual hosting, deployed revision, cron, backups, provider acceptance and release approval remain separate.'}};
}
