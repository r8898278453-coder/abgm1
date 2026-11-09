import type {Pool,Connection} from 'mysql2/promise';
export async function addCompanyProfileRevision(db:Pool|Connection){
 const [rows]:any=await db.query("SHOW COLUMNS FROM company_profiles_data LIKE 'revision'");
 if(!rows.length)await db.query('ALTER TABLE company_profiles_data ADD COLUMN revision BIGINT UNSIGNED NOT NULL DEFAULT 0');
}
