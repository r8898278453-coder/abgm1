import {createHash} from 'node:crypto';
import {LEGACY_MIGRATION_IDENTITIES} from './migrations/identities';
import {sqlMigrationChecksum} from './migrations/manifestV1';
export type MigrationIdentity={readonly name:string;readonly up:Function};
export function migrationIdentity(m:MigrationIdentity,registry:readonly MigrationIdentity[],embedded?:Readonly<Record<string,string>>){
 const manifest=sqlMigrationChecksum(m);
 if(manifest){if(embedded?.[m.name]!==undefined&&embedded[m.name]!==manifest)throw new Error('MIGRATION_MANIFEST_BUILD_MISMATCH');return manifest;}
 if(embedded&&!embedded[m.name])throw new Error('MIGRATION_SOURCE_CHECKSUM_MISSING: '+m.name);
 const legacy=LEGACY_MIGRATION_IDENTITIES[m.name];
 if(!legacy)throw new Error('MIGRATION_MANIFEST_REQUIRED: Use an immutable SQL manifest for030+');
 if(registry.find(entry=>entry.name===m.name)?.up!==m.up)throw new Error('MIGRATION_LEGACY_MODIFIED: '+m.name);
 const actual=embedded?embedded[m.name]:createHash('sha256').update(m.name+Function.prototype.toString.call(m.up)).digest('hex');
 if(actual!==legacy.checksum)throw new Error('MIGRATION_LEGACY_MODIFIED: '+m.name);
 return actual;
}
export function validateMigrationRegistry(registry:readonly MigrationIdentity[],checksum:(m:MigrationIdentity)=>string){
 if(!Array.isArray(registry)||registry.length<29)throw new Error('MIGRATION_REGISTRY_INVALID');
 const names=new Set<string>();for(let index=0;index<registry.length;index++){const migration=registry[index];
  if(!migration||!/^\d{3}_[a-z][a-z0-9_]*$/.test(migration.name)||Number(migration.name.slice(0,3))!==index+1||names.has(migration.name)||typeof migration.up!=='function')throw new Error('MIGRATION_REGISTRY_INVALID');
  names.add(migration.name);checksum(migration);
 }
}
export class MigrationLedgerError extends Error{constructor(public readonly code:string){super(code);this.name='MigrationLedgerError';}}
/** Ledger evidence is never silently ignored, including future records and failed/blank/duplicate identities. */
export function inspectMigrationLedger(rows:unknown,registry:readonly MigrationIdentity[]):Map<string,string>{
 if(!Array.isArray(rows))throw new MigrationLedgerError('MIGRATION_LEDGER_INVALID');const known=new Set(registry.map(m=>m.name)),applied=new Map<string,string>();
 for(const row of rows){
  if(!row||typeof row.migration_name!=='string'||typeof row.checksum!=='string'||!/^[a-f0-9]{64}$/.test(row.checksum)||applied.has(row.migration_name))throw new MigrationLedgerError('MIGRATION_LEDGER_INVALID');
  if(Number(row.success)!==1)throw new MigrationLedgerError('MIGRATION_LEDGER_FAILED_RECORD');
  if(!known.has(row.migration_name))throw new MigrationLedgerError('MIGRATION_LEDGER_AHEAD');applied.set(row.migration_name,row.checksum);
 }
 for(let index=0;index<applied.size;index++)if(!applied.has(registry[index].name))throw new MigrationLedgerError('MIGRATION_LEDGER_GAP');
 return applied;
}
