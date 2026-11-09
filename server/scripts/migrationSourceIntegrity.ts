import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
import {LEGACY_MIGRATION_IDENTITIES,MANIFEST_V1_SOURCE_HASH} from '../migrations/identities';
/** Build/CLI preflight only. Never connects to a database or loads customer data. */
export async function verifyMigrationSourceIntegrity(root=process.cwd()){
 const source=ts.createSourceFile('migrator.ts',await fs.readFile(path.join(root,'server/migrator.ts'),'utf8'),ts.ScriptTarget.Latest,true);
 const handlers=new Map<string,string>();
 function visit(node:ts.Node){
  if(ts.isObjectLiteralExpression(node)){
   const props=node.properties.filter(ts.isPropertyAssignment),name=props.find(p=>p.name.getText(source)==='name')?.initializer,up=props.find(p=>p.name.getText(source)==='up')?.initializer;
   if(name&&ts.isStringLiteral(name)&&/^00[1-6]_/.test(name.text)&&up){if(handlers.has(name.text))throw new Error('MIGRATION_SOURCE_DUPLICATE');handlers.set(name.text,up.getText(source));}
  }ts.forEachChild(node,visit);
 }visit(source);
 const hash=(value:string|Buffer)=>crypto.createHash('sha256').update(value).digest('hex');
 for(const [name,record] of Object.entries(LEGACY_MIGRATION_IDENTITIES)){
  const bytes=record.selector==='inline-up'?handlers.get(name):await fs.readFile(path.join(root,record.file));
  if(!bytes||hash(bytes)!==record.sourceHash)throw new Error('MIGRATION_SOURCE_MODIFIED: '+name);
 }
 if(hash(await fs.readFile(path.join(root,'server/migrations/manifestV1.ts')))!==MANIFEST_V1_SOURCE_HASH)throw new Error('MIGRATION_EXECUTOR_MODIFIED: Use a new versioned executor');
 return {legacyIdentities:Object.keys(LEGACY_MIGRATION_IDENTITIES).length,executor:'abgm-sql-manifest-v1'};
}
