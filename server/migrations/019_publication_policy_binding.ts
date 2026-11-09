import type {Connection,Pool} from 'mysql2/promise';
export async function addPublicationPolicyBinding(db:Connection|Pool):Promise<void>{
 const [columns]:any=await db.query("SHOW COLUMNS FROM publication_workflow_audit LIKE 'policy_version'");
 if(!columns.length)await db.query('ALTER TABLE publication_workflow_audit ADD COLUMN policy_version CHAR(64) DEFAULT NULL');
}
