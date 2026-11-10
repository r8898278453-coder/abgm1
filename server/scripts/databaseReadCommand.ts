import dotenv from 'dotenv';
dotenv.config({quiet:true});
import {getDbPool,databaseConnectionDiagnostic} from '../db';
import {verifySchema} from '../migrator';
import {readOnlyDatabaseReport} from './readOnlyDatabaseReport';
/** CLI-owned pool only: never import this command into the running server. */
export async function databaseReadCommand(){
 const result=await readOnlyDatabaseReport(getDbPool,verifySchema,databaseConnectionDiagnostic);
 console.log(JSON.stringify(result.report,null,2));process.exitCode=result.exitCode;
}
