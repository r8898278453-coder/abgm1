import dotenv from 'dotenv';
dotenv.config({quiet:true});
import fs from 'node:fs';
import path from 'node:path';
import {getDbPool,databaseConnectionDiagnostic} from '../db';
import {verifySchema} from '../migrator';
import {deploymentReport} from './deploymentReport';
const result=await deploymentReport({nodeVersion:process.version,exists:file=>{try{return fs.statSync(path.join(process.cwd(),file)).isFile();}catch{return false;}},getPool:getDbPool,verify:verifySchema,connectionDiagnostic:databaseConnectionDiagnostic});
console.log(JSON.stringify(result.report,null,2));process.exitCode=result.exitCode;
