import {verifyManifestMigrationSql} from './manifestMigrationSql';
import {claimDispatcherTick,checkpointDispatcherStage,settleDispatcherTick,readDispatcherHistory} from '../../server/dispatcherStore';
import {DISPATCHER_STAGES} from '../../shared/dispatcher';
import {readCompanyProfile,writeCompanyProfile} from '../../server/companyProfileStore';
import {WorkspaceConflict} from '../../shared/workspaceRevision';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {isolatedTestEnvironment} from '../../server/scripts/testEnvironment';
import {dispatchAutonomousMessage,autonomousMessageKey} from '../../server/autonomousMessageDispatch';
import {recordWhatsAppInboundLead} from '../../server/whatsAppInbound';
import {recordMessageReceipt} from '../../server/messageDeliveryReceipts';
import {dispatchMessageIntent} from '../../server/messageDispatchIntents';
import {readMessageDispatchStatus} from '../../server/messageDispatchStatus';
import {updateLeadStageSql} from '../../server/leadStageSql';
import {deleteContentPostSql} from '../../server/contentMutationSql';
import {saveReviewReplySql,deleteReviewSql} from '../../server/reviewMutationSql';
import {readPublicationControlHistory} from '../../server/publicationControlHistory';
import {readScopedPublicationControls,updateScopedPublicationControls,checkScopedPublicationControls} from '../../server/publicationScopedControls';
import {readDailyWorkReport} from '../../server/dailyWorkReport';
import {platformDayBounds} from '../../shared/dailyWorkReport';
import {deferSqlJob} from '../../server/queueSql';
import {readAutomaticPublishingControls,readPublicationExecutionBlock} from '../../server/publishingExecutionControls';
import {readPublicationWorkflowHistory} from '../../server/publicationWorkflowHistory';
import {transitionPublication} from '../../server/publicationWorkflow';
import {preparePublicationDraft} from '../../server/publicationDraftIntents';
import {publishingSourceVersion} from '../../server/publishingSource';
import {prepareMetaVerification,recordMetaVerification} from '../../server/metaVerificationStore';
import { readPublishingReview,appendPublishingReview } from '../../server/publishingReview';
import { claimSqlPublishing, ownsSqlPublishing, settleSqlPublishing } from '../../server/publishingClaims';
import { findUnconfirmedPublishingEvidence } from '../../server/publishingEvidence';
import { withReadOnlySqlDeadline } from '../../server/readOnlySqlDeadline';
import { readDigestSummary, readReviewReminderSummary } from '../../server/notificationSummaries';
import { selectScheduledPostBatch } from '../../server/scheduledPostBatch';
import { selectNotificationCompanyBatch } from '../../server/notificationBatch';
import { readNotificationStatus, parseNotificationCursor } from '../../server/notificationStatus';
import { runNotificationOccurrence } from '../../server/notificationOccurrences';
import { admitScheduledPosts, scheduledPostKey } from '../../server/scheduledPublishing';
import { processActionOutbox, readActionFeed } from '../../server/actionOutbox';
import { enqueueSqlJob } from '../../server/queueEnqueue';
import type { DbJobQueue } from '../../server/db';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import { MIGRATIONS, computeMigrationChecksum, ensureMigrationInfrastructure, runMigrations, verifySchema } from '../../server/migrator';
import { claimSqlJob, completeSqlJob, failSqlJob, renewSqlJobLease, cancelSqlJob } from '../../server/queueSql';

if (process.env.ABGM1_LOCAL_SQL_TESTS !== '1' || !process.env.LOCAL_SQL_CONTAINER_ID) {
  throw new Error('Explicit disposable SQL container identity and opt-in are required');
}
const port = Number(process.env.LOCAL_SQL_PORT);
assert.ok(Number.isInteger(port) && port > 1024 && port < 65536);
// Never use DB_HOST/DB_USER/DB_PASSWORD or production dump contents.
const admin = mysql.createPool({ host: '127.0.0.1', port, user: 'root', password: '', connectionLimit: 2 });
const database = `abgm1_test_${crypto.randomUUID().replaceAll('-', '')}`;
let pool: mysql.Pool | undefined;
let created = false;
const freshDatabase=database+'_fresh';let freshCreated=false;
const runtimeUser='runtime_'+crypto.randomBytes(8).toString('hex');
const runtimePassword=crypto.randomBytes(24).toString('hex');
let runtimeUserCreated=false;
async function checkRestrictedRuntime(empty:boolean){
 const [before]:any=await admin.query("SHOW GLOBAL STATUS WHERE Variable_name IN ('Com_create_table','Com_alter_table','Com_insert','Com_update')");
 const env={...isolatedTestEnvironment(process.env),NODE_ENV:'production',AUTH_SECRET:'synthetic-runtime-authority-secret-not-for-production',DB_HOST:'127.0.0.1',DB_PORT:String(port),DB_NAME:database,DB_USER:runtimeUser,DB_PASSWORD:runtimePassword,ABGM1_LOCAL_SQL_TESTS:'1',LOCAL_SQL_CONTAINER_ID:process.env.LOCAL_SQL_CONTAINER_ID,RUNTIME_EXPECT_EMPTY:empty?'1':'0',INITIAL_ADMIN_EMAIL:'no-implicit-admin@example.invalid',INITIAL_ADMIN_PASSWORD:'synthetic-test-password-only'};
 const result=await promisify(execFile)(process.execPath,['--import','tsx','test/integration/runtimeSchemaAuthority.test.ts'],{env,timeout:30000});
 const [after]:any=await admin.query("SHOW GLOBAL STATUS WHERE Variable_name IN ('Com_create_table','Com_alter_table','Com_insert','Com_update')");
 assert.deepEqual(after,before,'runtime connection must issue zero DDL/admin DML');process.stdout.write(result.stdout);
}
try {
  const [identity]: any = await admin.query('SELECT @@hostname AS hostname, VERSION() AS version');
  assert.equal(identity[0].hostname, process.env.LOCAL_SQL_CONTAINER_ID);
  await admin.query(`CREATE DATABASE ${database}`);
  created = true;
  pool = mysql.createPool({ host: '127.0.0.1', port, user: 'root', password: '', database, connectionLimit: 8 });
  await admin.query("CREATE USER ?@'%' IDENTIFIED BY ?",[runtimeUser,runtimePassword]);runtimeUserCreated=true;
  await admin.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ${database}.* TO ?@'%'`,[runtimeUser]);
  await checkRestrictedRuntime(true);
  await ensureMigrationInfrastructure(pool);
  for (const migration of MIGRATIONS.slice(0, 5)) {
    await migration.up(pool);
    await pool.query('INSERT INTO schema_migrations (migration_name, checksum, execution_time_ms, success) VALUES (?, ?, 0, 1)', [migration.name, computeMigrationChecksum(migration)]);
  }
  const [before]: any = await pool.query("SHOW TABLES LIKE 'job_queue'");
  assert.equal(before.length, 0);
  const upgrade = await runMigrations(pool);
  assert.deepEqual(upgrade.appliedNames, MIGRATIONS.slice(5).map(m => m.name));
  const [columns]: any = await pool.query("SHOW COLUMNS FROM content_posts LIKE 'campaign_id'");
  assert.equal(columns.length, 1);
  assert.equal((await runMigrations(pool)).appliedCount, 0);
  const schemaReport = await verifySchema(pool);
  assert.equal(schemaReport.status, 'READY', JSON.stringify(schemaReport));
  await pool.query('ALTER TABLE knowledge_sources DROP INDEX uq_knowledge_company_sha, ADD UNIQUE INDEX uq_knowledge_company_sha(company_id,filename)');
  assert.ok((await verifySchema(pool)).missingConstraints?.includes('knowledge_sources.uq_knowledge_company_sha'));
  await pool.query('ALTER TABLE knowledge_sources DROP INDEX uq_knowledge_company_sha, ADD UNIQUE INDEX uq_knowledge_company_sha(company_id,content_sha)');
  await pool.query('ALTER TABLE knowledge_sources DROP COLUMN extraction_code');
  assert.ok((await verifySchema(pool)).missingColumns?.includes('knowledge_sources.extraction_code'));
  await assert.rejects(MIGRATIONS[29].up(pool),/MIGRATION_KNOWLEDGE_TABLE_CONFLICT/);
  await pool.query('ALTER TABLE knowledge_sources ADD COLUMN extraction_code VARCHAR(64) DEFAULT NULL AFTER extraction_state');
  assert.equal((await verifySchema(pool)).status,'READY');
  await pool.query('ALTER TABLE knowledge_sources MODIFY COLUMN source_url VARCHAR(64) DEFAULT NULL');
  assert.ok((await verifySchema(pool)).missingConstraints?.includes('knowledge_sources.website_provenance_shape'));
  await assert.rejects(MIGRATIONS.find(m=>m.name==='031_website_source_provenance')!.up(pool),/MIGRATION_WEBSITE_PROVENANCE_CONFLICT/);
  await pool.query('ALTER TABLE knowledge_sources MODIFY COLUMN source_url VARCHAR(2048) DEFAULT NULL');
  assert.equal((await verifySchema(pool)).status,'READY');
  await pool.query('ALTER TABLE knowledge_sources MODIFY COLUMN extraction_job_id VARCHAR(8) DEFAULT NULL');assert.ok((await verifySchema(pool)).missingConstraints?.includes('knowledge_sources.ingestion_reference_shape'));await assert.rejects(MIGRATIONS.find(m=>m.name==='032_knowledge_ingestion_queue')!.up(pool),/MIGRATION_KNOWLEDGE_JOB_CONFLICT/);
  await pool.query("ALTER TABLE knowledge_sources MODIFY COLUMN extraction_job_id VARCHAR(64) NOT NULL DEFAULT ''");assert.ok((await verifySchema(pool)).missingConstraints?.includes('knowledge_sources.ingestion_reference_shape'));await assert.rejects(MIGRATIONS.find(m=>m.name==='032_knowledge_ingestion_queue')!.up(pool),/MIGRATION_KNOWLEDGE_JOB_CONFLICT/);
  await pool.query('ALTER TABLE knowledge_sources MODIFY COLUMN extraction_job_id VARCHAR(64) DEFAULT NULL');await pool.query('ALTER TABLE knowledge_sources DROP COLUMN extraction_attempt');assert.ok((await verifySchema(pool)).missingColumns?.includes('knowledge_sources.extraction_attempt'));await MIGRATIONS.find(m=>m.name==='032_knowledge_ingestion_queue')!.up(pool);assert.equal((await verifySchema(pool)).status,'READY');
  await pool.query('ALTER TABLE knowledge_facts MODIFY COLUMN fact_key VARCHAR(12) NOT NULL');assert.ok((await verifySchema(pool)).missingConstraints?.includes('knowledge_facts.shape'));await assert.rejects(MIGRATIONS.find(m=>m.name==='033_structured_knowledge_facts')!.up(pool),/MIGRATION_KNOWLEDGE_FACTS_CONFLICT/);await pool.query('ALTER TABLE knowledge_facts MODIFY COLUMN fact_key VARCHAR(120) NOT NULL');assert.equal((await verifySchema(pool)).status,'READY');
  await pool.query('ALTER TABLE knowledge_facts DROP INDEX idx_facts_company_key, ADD INDEX idx_facts_company_key(company_id)');assert.ok((await verifySchema(pool)).missingConstraints?.includes('knowledge_facts.shape'));await assert.rejects(MIGRATIONS.find(m=>m.name==='033_structured_knowledge_facts')!.up(pool),/MIGRATION_KNOWLEDGE_FACTS_CONFLICT/);await pool.query('ALTER TABLE knowledge_facts DROP INDEX idx_facts_company_key, ADD INDEX idx_facts_company_key(company_id,fact_key)');assert.equal((await verifySchema(pool)).status,'READY');
  await pool.query('ALTER TABLE agency_memberships MODIFY COLUMN role VARCHAR(8) NOT NULL');assert.ok((await verifySchema(pool)).missingConstraints?.includes('agency_security.shape'));await assert.rejects(MIGRATIONS.find(m=>m.name==='034_agency_security_foundation')!.up(pool),/MIGRATION_AGENCY_TABLE_CONFLICT/);await pool.query('ALTER TABLE agency_memberships MODIFY COLUMN role VARCHAR(16) NOT NULL');assert.equal((await verifySchema(pool)).status,'READY');
  await pool.query('ALTER TABLE oauth_states MODIFY state_hash CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL');assert.ok((await verifySchema(pool)).missingConstraints?.includes('security_policy.shape'));await assert.rejects(MIGRATIONS.find(m=>m.name==='035_security_policy')!.up(pool),/MIGRATION_POLICY_SHAPE_CONFLICT/);await pool.query('ALTER TABLE oauth_states MODIFY state_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL');assert.equal((await verifySchema(pool)).status,'READY');
  await checkRestrictedRuntime(false);
  await pool.query('ALTER TABLE company_profiles_data DROP COLUMN revision');assert.ok((await verifySchema(pool)).missingColumns?.includes('company_profiles_data.revision'));await MIGRATIONS.find(m=>m.name==='026_company_profile_revision')!.up(pool);assert.equal((await verifySchema(pool)).status,'READY');
  // A full empty-database migration must match the005-upgrade path, not a second schema definition.
  await admin.query(`CREATE DATABASE ${freshDatabase}`);freshCreated=true;
  const freshPool=mysql.createPool({host:'127.0.0.1',port,user:'root',password:'',database:freshDatabase});
  try{
    assert.equal((await runMigrations(freshPool)).appliedCount,MIGRATIONS.length);
    assert.equal((await runMigrations(freshPool)).appliedCount,0);
    assert.equal((await verifySchema(freshPool)).status,'READY');
    for(const metadata of [
      "SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,COLLATION_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME,ORDINAL_POSITION",
      "SELECT TABLE_NAME,INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX,NON_UNIQUE,SUB_PART FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX",
      "SELECT TABLE_NAME,CONSTRAINT_NAME,CONSTRAINT_TYPE FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME,CONSTRAINT_NAME"
    ]){const [upgraded]:any=await admin.query(metadata,[database]);const [fresh]:any=await admin.query(metadata,[freshDatabase]);assert.deepEqual(fresh,upgraded);}
    console.log('Full fresh001–029 and upgrade005–029 schema parity: columns/defaults/types, indexes and constraints identical; fresh rerun0 and READY.');
  }finally{await freshPool.end();}

  // Legacy export compatibility: fail before any DDL on unknown field shapes, then preserve original rows.
  const legacyRepair=MIGRATIONS.find(m=>m.name==='028_legacy_export_compatibility')!;
  await pool.query('ALTER TABLE autonomous_actions ADD COLUMN type INT NOT NULL DEFAULT 0');
  const [beforeShape]:any=await pool.query('SHOW COLUMNS FROM autonomous_actions');
  await assert.rejects(legacyRepair.up(pool),/LEGACY_ACTION_COLUMN_SHAPE/);
  const [afterShape]:any=await pool.query('SHOW COLUMNS FROM autonomous_actions');assert.deepEqual(afterShape,beforeShape);
  await pool.query('ALTER TABLE autonomous_actions DROP COLUMN type, ADD COLUMN type VARCHAR(64) NOT NULL, ADD COLUMN title VARCHAR(255) NOT NULL, ADD COLUMN description TEXT NOT NULL');
  await pool.query("INSERT INTO autonomous_actions (id,company_id,action_type,type,title,description) VALUES ('legacy-preserve','synthetic-client','legacy','display','old title','old description')");
  assert.ok((await verifySchema(pool)).missingConstraints?.includes('autonomous_actions.legacy_display_fields_optional'));
  await legacyRepair.up(pool);
  const [preserved]:any=await pool.query("SELECT type,title,description,approval_status,execution_state,verification_state FROM autonomous_actions WHERE id='legacy-preserve'");
  assert.deepEqual(preserved[0],{type:'display',title:'old title',description:'old description',approval_status:'pending_approval',execution_state:'idle',verification_state:'unverified'});
  await pool.query("INSERT INTO autonomous_actions (id,company_id,action_type) VALUES ('canonical-write-probe','synthetic-client','fixture')");
  await pool.query("DELETE FROM autonomous_actions WHERE id IN ('legacy-preserve','canonical-write-probe')");
  await pool.query('ALTER TABLE reviews DROP COLUMN external_review_id');
  assert.ok((await verifySchema(pool)).missingColumns?.includes('reviews.external_review_id'));
  await legacyRepair.up(pool);await legacyRepair.up(pool);assert.equal((await verifySchema(pool)).status,'READY');
  console.log('Legacy export SQL: unsupported obsolete field shape rejected before DDL, original row preserved, new canonical action writes work, provenance fields required, repeated repair safe.');
  await pool.query('ALTER TABLE website_configs DROP INDEX idx_company_webconfig');
  assert.ok((await verifySchema(pool)).missingConstraints?.includes('website_configs.company_id'));
  await pool.query('ALTER TABLE website_configs ADD UNIQUE INDEX operator_website_owner (company_id)');assert.equal((await verifySchema(pool)).status,'READY');
  const persistenceEnv={...isolatedTestEnvironment(process.env),NODE_ENV:'production',AUTH_SECRET:'synthetic-runtime-authority-secret-not-for-production',DB_HOST:'127.0.0.1',DB_PORT:String(port),DB_NAME:database,DB_USER:runtimeUser,DB_PASSWORD:runtimePassword,ABGM1_LOCAL_SQL_TESTS:'1',LOCAL_SQL_CONTAINER_ID:process.env.LOCAL_SQL_CONTAINER_ID};
  for(const fixture of ['test/integration/autonomousPersistenceSql.test.ts','test/integration/websitePersistenceSql.test.ts','test/integration/publicLeadSql.test.ts','test/integration/observationPersistenceSql.test.ts','test/integration/competitorCommandsSql.test.ts','test/integration/passwordResetSql.test.ts','test/integration/integrationPersistenceSql.test.ts','test/integration/knowledgeSourcesSql.test.ts','test/integration/internalCampaignPersistenceSql.test.ts','test/integration/knowledgeQueueSql.test.ts','test/integration/websiteImportJobsSql.test.ts','test/integration/knowledgeFactsSql.test.ts','test/integration/agencyFoundationSql.test.ts','test/integration/onboardingSql.test.ts','test/integration/securityPolicySql.test.ts','test/integration/reelJobsSql.test.ts','test/integration/salesWorkspaceSql.test.ts','test/integration/salesWorkflowsSql.test.ts']){
   let persistenceResult;try{persistenceResult=await promisify(execFile)(process.execPath,['--import','tsx',fixture],{env:persistenceEnv,timeout:30000});}catch(error:any){process.stdout.write(error.stdout||'');throw new Error('Restricted persistence fixture failed');}process.stdout.write(persistenceResult.stdout);
  }


  await pool.query('ALTER TABLE public_lead_intakes DROP INDEX idx_public_intake_notification');
  await pool.query('ALTER TABLE public_lead_intakes DROP COLUMN notification_state');assert.ok((await verifySchema(pool)).missingColumns?.includes('public_lead_intakes.notification_state'));
  await pool.query("ALTER TABLE public_lead_intakes ADD COLUMN notification_state VARCHAR(32) CHARACTER SET ascii NOT NULL DEFAULT 'NOT_ATTEMPTED'");
  await pool.query('ALTER TABLE public_lead_intakes ADD INDEX idx_public_intake_notification(company_id,notification_state,updated_at)');
  await pool.query('ALTER TABLE public_lead_intakes DROP PRIMARY KEY, ADD PRIMARY KEY(request_key,company_id)');assert.equal((await verifySchema(pool)).status,'MIGRATION_REQUIRED');await pool.query('ALTER TABLE public_lead_intakes DROP PRIMARY KEY, ADD PRIMARY KEY(company_id,request_key)');assert.equal((await verifySchema(pool)).status,'READY');

  await verifyManifestMigrationSql(pool);

  await pool.query('ALTER TABLE message_dispatch_intents DROP COLUMN sender_id');
  assert.ok((await verifySchema(pool)).missingColumns?.includes('message_dispatch_intents.sender_id'));
  await MIGRATIONS.find(m=>m.name==='025_message_delivery_receipts')!.up(pool);
  await pool.query('ALTER TABLE message_delivery_receipts DROP PRIMARY KEY, ADD PRIMARY KEY(company_id,event_key,phone_number_id)');
  assert.equal((await verifySchema(pool)).status,'MIGRATION_REQUIRED');
  await pool.query('ALTER TABLE message_delivery_receipts DROP PRIMARY KEY, ADD PRIMARY KEY(company_id,event_key)');
  assert.equal((await verifySchema(pool)).status,'READY');
  await pool.query('ALTER TABLE content_posts DROP COLUMN workflow_revision');
  assert.deepEqual((await verifySchema(pool)).missingColumns,['content_posts.workflow_revision']);
  assert.equal((await verifySchema(pool)).status,'MIGRATION_REQUIRED');
  await MIGRATIONS.find(m=>m.name==='017_publication_workflow_audit')!.up(pool);
  assert.equal((await verifySchema(pool)).status,'READY');
  await pool.query('ALTER TABLE job_queue DROP COLUMN deferrals');
  assert.ok((await verifySchema(pool)).missingColumns?.includes('job_queue.deferrals'));
  await pool.query("INSERT INTO job_queue (id,company_id,job_type,payload,status,attempts,max_attempts,scheduled_for) VALUES ('legacy-budget-fixture','legacy-company','ai_summary','{}','FAILED',2,3,NOW())");
  await MIGRATIONS.find(m=>m.name==='020_queue_pause_deferrals')!.up(pool);
  const [legacyBudget]:any=await pool.query("SELECT attempts,deferrals,status FROM job_queue WHERE id = 'legacy-budget-fixture'");
  assert.deepEqual({attempts:legacyBudget[0].attempts,deferrals:legacyBudget[0].deferrals,status:legacyBudget[0].status},{attempts:2,deferrals:0,status:'FAILED'});
  assert.equal((await verifySchema(pool)).status,'READY');
  await pool.query('ALTER TABLE job_queue RENAME INDEX idx_job_company_status TO custom_job_company_status');
  await MIGRATIONS.find(m=>m.name==='021_daily_work_report_indexes')!.up(pool);
  const [reusedReportIndex]:any=await pool.query("SHOW INDEX FROM job_queue WHERE Key_name = 'idx_job_company_status'");
  assert.equal(reusedReportIndex.length,0,'Equivalent operator index must not be duplicated');
  assert.equal((await verifySchema(pool)).status,'READY');
  await pool.query('ALTER TABLE publication_execution_controls DROP COLUMN paused');
  assert.ok((await verifySchema(pool)).missingColumns?.includes('publication_execution_controls.paused'));
  assert.equal((await verifySchema(pool)).status,'MIGRATION_REQUIRED');
  await pool.query('ALTER TABLE publication_execution_controls ADD COLUMN paused TINYINT(1) NOT NULL DEFAULT 0');
  assert.equal((await verifySchema(pool)).status,'READY');
  console.log(JSON.stringify({ schema_verification: schemaReport.status, missingIndexes: schemaReport.missingIndexes, missingConstraints: schemaReport.missingConstraints, missingTables: schemaReport.missingTables }));

  const [leadIndexes]: any = await pool.query('SHOW INDEX FROM leads');
  assert.ok(leadIndexes.some((r: any) => r.Key_name === 'idx_company_lead'));
  assert.ok(!leadIndexes.some((r: any) => r.Key_name === 'idx_leads_company'));
  const repair = MIGRATIONS.find(m => m.name === '007_schema_index_alignment')!;
  await repair.up(pool);
  await pool.query('ALTER TABLE custom_domains DROP INDEX idx_custom_domains_domain');
  await pool.query("INSERT INTO custom_domains (id, company_id, domain) VALUES ('domain-a', 'a', 'duplicate.example.invalid'), ('domain-b', 'b', 'duplicate.example.invalid')");
  await assert.rejects(repair.up(pool), /DOMAIN_OWNERSHIP_CONFLICT/);
  await pool.query("DELETE FROM custom_domains WHERE id = 'domain-b'");
  await repair.up(pool);
  await assert.rejects(pool.query("INSERT INTO custom_domains (id, company_id, domain) VALUES ('domain-c', 'c', 'duplicate.example.invalid')"));
  await pool.query('ALTER TABLE reviews DROP INDEX idx_rev_source, ADD INDEX idx_rev_source (rating)');
  assert.equal((await verifySchema(pool)).status, 'MIGRATION_REQUIRED');
  await pool.query('ALTER TABLE reviews DROP INDEX idx_rev_source');
  await repair.up(pool);
  assert.equal((await verifySchema(pool)).status, 'READY');

  const job = (id: string, company = 'ledger-company', key: string | null = null): DbJobQueue => ({
    id, company_id: company, job_type: 'ai_summary', payload: { privateFixture: 'do-not-copy-to-audit' },
    status: 'QUEUED', attempts: 0, max_attempts: 3, idempotency_key: key,
    scheduled_for: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), requested_by: 'fixture-user',
  });
  await enqueueSqlJob(pool, job('ledger-primary', 'ledger-company', 'once'));
  const [queuedEvents]: any = await pool.query("SELECT * FROM job_action_events WHERE job_id = 'ledger-primary'");
  assert.equal(queuedEvents.length, 1);
  assert.equal(queuedEvents[0].actor_id, 'fixture-user');
  assert.equal(queuedEvents[0].job_status, 'QUEUED');
  assert.ok(!JSON.stringify(queuedEvents).includes('do-not-copy-to-audit'));
  await enqueueSqlJob(pool, job('ledger-replayed-id', 'ledger-company', 'once'));
  const [replayedEvents]: any = await pool.query("SELECT COUNT(*) AS count FROM job_action_events WHERE job_id = 'ledger-primary'");
  assert.equal(Number(replayedEvents[0].count), 1);

  // Inject the final outbox write failure on a real transaction/connection.
  const failingPool = { getConnection: async () => {
    const connection = await pool!.getConnection();
    return new Proxy(connection, { get(target, property) {
      if (property === 'query') return async (sql: string, values: unknown[]) => {
        if (sql.includes('INSERT INTO job_action_outbox')) throw new Error('OUTBOX_FIXTURE_FAILURE');
        return target.query(sql, values);
      };
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
  } } as unknown as mysql.Pool;
  await assert.rejects(enqueueSqlJob(failingPool, job('rollback-enqueue')), /OUTBOX_FIXTURE_FAILURE/);
  for (const table of ['job_queue', 'job_action_runs', 'job_action_events']) {
    const field = table === 'job_queue' ? 'id' : 'job_id';
    const [count]: any = await pool.query(`SELECT COUNT(*) AS count FROM ${table} WHERE ${field} = ?`, ['rollback-enqueue']);
    assert.equal(Number(count[0].count), 0);
  }
  await assert.rejects(claimSqlJob(failingPool, 'faulting-claim', ['ai_summary']), /OUTBOX_FIXTURE_FAILURE/);
  const [claimRollback]: any = await pool.query("SELECT status, attempts FROM job_queue WHERE id = 'ledger-primary'");
  assert.equal(claimRollback[0].status, 'QUEUED');
  assert.equal(claimRollback[0].attempts, 0);
  const claimedAction = await claimSqlJob(pool, 'ledger-worker', ['ai_summary']);
  assert.equal(claimedAction?.id, 'ledger-primary');
  const actionLease = { workerId: 'ledger-worker', attempt: 1 };
  await assert.rejects(completeSqlJob(failingPool, 'ledger-primary', {}, actionLease), /OUTBOX_FIXTURE_FAILURE/);
  const [afterRollback]: any = await pool.query("SELECT status FROM job_queue WHERE id = 'ledger-primary'");
  assert.equal(afterRollback[0].status, 'RUNNING');
  await pool.query("UPDATE job_action_runs SET company_id = 'wrong-company' WHERE job_id = 'ledger-primary'");
  await assert.rejects(completeSqlJob(pool, 'ledger-primary', {}, actionLease), /ACTION_SCOPE_MISMATCH/);
  const [scopeRollback]: any = await pool.query("SELECT status FROM job_queue WHERE id = 'ledger-primary'");
  assert.equal(scopeRollback[0].status, 'RUNNING');
  await pool.query("UPDATE job_action_runs SET company_id = 'ledger-company' WHERE job_id = 'ledger-primary'");
  assert.equal((await completeSqlJob(pool, 'ledger-primary', {}, actionLease))?.status, 'SUCCEEDED');
  const [actionHistory]: any = await pool.query("SELECT event_type, job_status, sequence FROM job_action_events WHERE job_id = 'ledger-primary' ORDER BY sequence");
  assert.deepEqual(actionHistory.map((r: any) => r.event_type), ['JOB_QUEUED', 'JOB_CLAIMED', 'JOB_SUCCEEDED']);
  const [actionProjection]: any = await pool.query("SELECT current_status FROM job_action_runs WHERE job_id = 'ledger-primary'");
  assert.equal(actionProjection[0].current_status, 'SUCCEEDED');
  const [outbox]: any = await pool.query("SELECT COUNT(*) AS count FROM job_action_outbox o JOIN job_action_events e ON o.event_id = e.id WHERE e.job_id = 'ledger-primary'");
  assert.equal(Number(outbox[0].count), 3);

  await enqueueSqlJob(pool, job('cancel-ledger'));
  assert.equal(await cancelSqlJob(pool, 'cancel-ledger', 'foreign-company'), null);
  assert.equal((await cancelSqlJob(pool, 'cancel-ledger', 'ledger-company'))?.status, 'CANCELLED');
  const [cancelEvents]: any = await pool.query("SELECT event_type, job_status FROM job_action_events WHERE job_id = 'cancel-ledger' ORDER BY sequence");
  assert.deepEqual(cancelEvents.map((r: any) => r.event_type), ['JOB_QUEUED', 'JOB_CANCELLED']);
  assert.equal(cancelEvents[1].job_status, 'CANCELLED');

  const simultaneous = await Promise.all(Array.from({ length: 8 }, (_, i) => enqueueSqlJob(pool!, job(`race-enqueue-${i}`, 'ledger-company', 'race-key'))));
  assert.equal(new Set(simultaneous.map(r => r.id)).size, 1);
  const [raceEvents]: any = await pool.query('SELECT COUNT(*) AS count FROM job_action_events WHERE job_id = ?', [simultaneous[0].id]);
  assert.equal(Number(raceEvents[0].count), 1);
  const foreign = await enqueueSqlJob(pool, job('different-company-key', 'other-ledger-company', 'race-key'));
  assert.equal(foreign.id, 'different-company-key');

  async function insert(id: string, type = 'seo_scan', payload = '{}') {
    await pool!.query('INSERT INTO job_queue (id, company_id, job_type, payload) VALUES (?, ?, ?, ?)', [id, 'local-test-company', type, payload]);
  }
  await insert('concurrent');
  const claims = await Promise.all(Array.from({ length: 12 }, (_, i) => claimSqlJob(pool!, `worker-${i}`, ['seo_scan'])));
  assert.equal(claims.filter(Boolean).length, 1);
  assert.equal(claims.find(Boolean)?.attempts, 1);

  await insert('unsupported', 'publishing');
  await pool.query("UPDATE job_queue SET scheduled_for = DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE id = 'unsupported'");
  await insert('supported');
  assert.equal((await claimSqlJob(pool, 'filtered', ['seo_scan']))?.id, 'supported');
  await pool.query("UPDATE job_queue SET locked_at = DATE_SUB(NOW(), INTERVAL 6 MINUTE) WHERE id = 'supported'");
  const reclaimed = await claimSqlJob(pool, 'recovery', ['seo_scan']);
  assert.equal(reclaimed?.id, 'supported');
  assert.equal(reclaimed?.attempts, 2);
  assert.equal(reclaimed?.locked_by, 'recovery');

  const oldLease = { workerId: 'filtered', attempt: 1 };
  const currentLease = { workerId: 'recovery', attempt: 2 };
  assert.equal(await completeSqlJob(pool, 'supported', { stale: true }, oldLease), null);
  assert.equal(await failSqlJob(pool, 'supported', 'stale failure', false, oldLease), null);
  assert.equal(await completeSqlJob(pool, 'supported', {}), null);
  assert.equal(await failSqlJob(pool, 'supported', 'unfenced'), null);
  assert.equal(await renewSqlJobLease(pool, 'supported', oldLease), false);
  assert.equal(await renewSqlJobLease(pool, 'supported', currentLease), true);
  assert.equal((await completeSqlJob(pool, 'supported', { current: true }, currentLease))?.status, 'SUCCEEDED');
  assert.equal(await failSqlJob(pool, 'supported', 'late old failure', false, oldLease), null);

  await insert('reused-worker');
  const first = await claimSqlJob(pool, 'same-worker', ['seo_scan']);
  assert.equal(first?.id, 'reused-worker');
  await pool.query("UPDATE job_queue SET locked_at = DATE_SUB(NOW(), INTERVAL 6 MINUTE) WHERE id = 'reused-worker'");
  assert.equal(await renewSqlJobLease(pool, 'reused-worker', { workerId: 'same-worker', attempt: 1 }), false);
  assert.equal(await completeSqlJob(pool, 'reused-worker', {}, { workerId: 'same-worker', attempt: 1 }), null);
  const second = await claimSqlJob(pool, 'same-worker', ['seo_scan']);
  assert.equal(second?.attempts, 2);
  assert.equal(await completeSqlJob(pool, 'reused-worker', {}, { workerId: 'same-worker', attempt: 1 }), null);
  const outcomes = await Promise.all([
    completeSqlJob(pool, 'reused-worker', { winner: true }, { workerId: 'same-worker', attempt: 2 }),
    failSqlJob(pool, 'reused-worker', 'racing failure', false, { workerId: 'same-worker', attempt: 2 }),
  ]);
  assert.equal(outcomes.filter(Boolean).length, 1);

  await insert('retry-budget');
  await pool.query("UPDATE job_queue SET max_attempts = 2 WHERE id = 'retry-budget'");
  await claimSqlJob(pool, 'retry-worker', ['seo_scan']);
  const retry = await failSqlJob(pool, 'retry-budget', 'transient', true, { workerId: 'retry-worker', attempt: 1 });
  assert.equal(retry?.status, 'RETRY_WAIT');
  assert.ok(new Date(retry!.scheduled_for).getTime() > Date.now() + 20_000);
  assert.equal(await claimSqlJob(pool, 'too-early', ['seo_scan']), null);
  await pool.query("UPDATE job_queue SET scheduled_for = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE id = 'retry-budget'");
  await claimSqlJob(pool, 'retry-worker', ['seo_scan']);
  assert.equal((await failSqlJob(pool, 'retry-budget', 'exhausted transient', true, { workerId: 'retry-worker', attempt: 2 }))?.status, 'FAILED');

  await insert('cancelled-fixture');
  await claimSqlJob(pool, 'cancel-worker', ['seo_scan']);
  await pool.query("UPDATE job_queue SET status = 'CANCELLED', locked_at = NULL, locked_by = NULL WHERE id = 'cancelled-fixture'");
  const cancelledLease = { workerId: 'cancel-worker', attempt: 1 };
  assert.equal(await renewSqlJobLease(pool, 'cancelled-fixture', cancelledLease), false);
  assert.equal(await completeSqlJob(pool, 'cancelled-fixture', {}, cancelledLease), null);
  assert.equal(await failSqlJob(pool, 'cancelled-fixture', 'late', false, cancelledLease), null);

  await insert('exhausted');
  await pool.query("UPDATE job_queue SET status = 'RUNNING', attempts = max_attempts, locked_by = 'crashed', locked_at = DATE_SUB(NOW(), INTERVAL 6 MINUTE) WHERE id = 'exhausted'");
  assert.equal(await claimSqlJob(pool, 'no-infinite-recovery', ['seo_scan']), null);
  const [exhausted]: any = await pool.query("SELECT status, error_message FROM job_queue WHERE id = 'exhausted'");
  assert.equal(exhausted[0].status, 'FAILED');
  assert.equal(exhausted[0].error_message, 'ATTEMPTS_EXHAUSTED');

  const exhaustedBatch = Array.from({ length: 105 }, (_, i) => [`exhausted-batch-${i}`, 'local-test-company', 'seo_scan', '{}', 1, 1]);
  await pool.query('INSERT INTO job_queue (id, company_id, job_type, payload, attempts, max_attempts) VALUES ?', [exhaustedBatch]);
  assert.equal(await claimSqlJob(pool, 'bounded-cleanup', ['seo_scan']), null);
  assert.equal(await claimSqlJob(pool, 'bounded-cleanup', ['seo_scan']), null);
  const [batchState]: any = await pool.query("SELECT COUNT(*) AS count FROM job_queue WHERE id LIKE 'exhausted-batch-%' AND status = 'FAILED'");
  assert.equal(Number(batchState[0].count), 105);

  const [retryEvents]: any = await pool.query("SELECT job_status, reason_code FROM job_action_events WHERE job_id = 'retry-budget' ORDER BY sequence");
  assert.ok(retryEvents.some((e: any) => e.job_status === 'RETRY_WAIT' && e.reason_code === 'RETRY_SCHEDULED'));
  const repairLedger = MIGRATIONS.find(m => m.name === '008_queue_action_ledger')!;
  await pool.query('ALTER TABLE job_queue DROP INDEX uq_jq_company_idempotency');
  await pool.query("INSERT INTO job_queue (id, company_id, job_type, payload, idempotency_key) VALUES ('legacy-conflict-a', 'conflict-company', 'legacy_fixture', '{}', 'conflict'), ('legacy-conflict-b', 'conflict-company', 'legacy_fixture', '{}', 'conflict')");
  await assert.rejects(repairLedger.up(pool), /QUEUE_IDEMPOTENCY_CONFLICT/);
  await pool.query("DELETE FROM job_queue WHERE id = 'legacy-conflict-b'");
  await repairLedger.up(pool);
  assert.equal((await verifySchema(pool)).status, 'READY');

  await insert('rollback', 'seo_scan', 'invalid json');
  await assert.rejects(claimSqlJob(pool, 'bad-json', ['seo_scan']), SyntaxError);
  const [rolledBack]: any = await pool.query("SELECT status, attempts, locked_by FROM job_queue WHERE id = 'rollback'");
  assert.equal(rolledBack[0].status, 'QUEUED');
  assert.equal(rolledBack[0].attempts, 0);
  assert.equal(rolledBack[0].locked_by, null);
  const occurrenceTime = Date.parse('2026-11-03T02:30:00Z');
  let notificationCalls = 0;
  const deliver = async () => { notificationCalls++; return true; };
  const notificationResults = await Promise.all(Array.from({ length: 8 }, () => runNotificationOccurrence(pool!, 'notify-client', 'daily_digest', occurrenceTime, deliver)));
  assert.equal(notificationCalls, 1);
  assert.equal(notificationResults.filter(r => r === 'SENT').length, 1);
  assert.equal(await runNotificationOccurrence(pool, 'notify-client', 'daily_digest', occurrenceTime, deliver), 'EXISTING');
  assert.equal(notificationCalls, 1);
  assert.equal(await runNotificationOccurrence(pool, 'other-notify-client', 'daily_digest', occurrenceTime, deliver), 'SENT');
  assert.equal(await runNotificationOccurrence(pool, 'notify-client', 'review_reminder', occurrenceTime, deliver), 'SENT');
  assert.equal(await runNotificationOccurrence(pool, 'uncertain-client', 'daily_digest', occurrenceTime, async () => false), 'UNKNOWN');
  assert.equal(await runNotificationOccurrence(pool, 'uncertain-client', 'daily_digest', occurrenceTime, deliver), 'EXISTING');
  assert.equal(notificationCalls, 3);
  await pool.query("INSERT INTO notification_occurrences (company_id, notification_kind, due_at, claim_token, created_at) VALUES ('crashed-client', 'daily_digest', '2026-11-03 02:30:00', 'lost-process', DATE_SUB(NOW(), INTERVAL 6 MINUTE))");
  assert.equal(await runNotificationOccurrence(pool, 'crashed-client', 'daily_digest', occurrenceTime, deliver), 'EXISTING');
  const [unknownCrash]: any = await pool.query("SELECT status FROM notification_occurrences WHERE company_id = 'crashed-client'");
  assert.equal(unknownCrash[0].status, 'UNKNOWN');
  assert.equal(notificationCalls, 3);
  await pool.query("INSERT INTO notification_occurrences (company_id, notification_kind, due_at, claim_token, created_at) VALUES ('older-slot-client', 'daily_digest', '2026-11-02 02:30:00', 'lost-older-slot', DATE_SUB(NOW(), INTERVAL 6 MINUTE))");
  assert.equal(await runNotificationOccurrence(pool, 'older-slot-client', 'daily_digest', occurrenceTime, async () => true), 'SENT');
  const [olderSlot]: any = await pool.query("SELECT status FROM notification_occurrences WHERE company_id = 'older-slot-client' AND due_at = '2026-11-02 02:30:00'");
  assert.equal(olderSlot[0].status, 'UNKNOWN');
  const lostAckPool = { query: async (sql: string, values: unknown[]) => {
    if (sql.includes('SET status = ?')) throw new Error('ACK_WRITE_FIXTURE_FAILURE');
    return pool!.query(sql, values);
  } } as unknown as mysql.Pool;
  await assert.rejects(runNotificationOccurrence(lostAckPool, 'lost-ack-client', 'daily_digest', occurrenceTime, deliver), /ACK_WRITE_FIXTURE_FAILURE/);
  assert.equal(notificationCalls, 4);
  assert.equal(await runNotificationOccurrence(pool, 'lost-ack-client', 'daily_digest', occurrenceTime, deliver), 'EXISTING');
  assert.equal(notificationCalls, 4);
  console.log('Notification SQL: eight overlapping ticks/restart send once, tenant/kind isolation, uncertain/crashed/lost-ack occurrences never blindly resent.');

  const notificationPage = await readNotificationStatus(pool, 'notify-client', null, 1);
  assert.equal(notificationPage.occurrences.length, 1);
  assert.ok(notificationPage.nextCursor);
  const notificationNext = await readNotificationStatus(pool, 'notify-client', parseNotificationCursor(notificationPage.nextCursor), 1);
  assert.equal(notificationNext.occurrences.length, 1);
  assert.notEqual(notificationPage.occurrences[0].kind, notificationNext.occurrences[0].kind);
  assert.equal(notificationNext.nextCursor, null);
  assert.equal((await readNotificationStatus(pool, 'empty-notify-client')).occurrences.length, 0);
  const uncertainStatus = await readNotificationStatus(pool, 'uncertain-client');
  assert.equal(uncertainStatus.occurrences[0].needsReview, true);
  assert.ok(!JSON.stringify(notificationPage).includes('claim_token'));
  const staleStatus = await readNotificationStatus(pool, 'lost-ack-client');
  assert.equal(staleStatus.occurrences[0].status, 'RUNNING');
  await pool.query("UPDATE notification_occurrences SET created_at = DATE_SUB(NOW(), INTERVAL 6 MINUTE) WHERE company_id = 'lost-ack-client'");
  assert.equal((await readNotificationStatus(pool, 'lost-ack-client')).occurrences[0].needsReview, true);
  console.log('Notification SQL read model: stable time/kind pagination, scope isolation, private claim exclusion and stale/uncertain review flags passed.');

  const batchCompanies = Array.from({ length: 8 }, (_, i) => [`batch-${i+1}`, 'local-fixture-owner', `Batch fixture ${i+1}`, 'fixture', 'fixture']);
  await pool.query('INSERT INTO companies (id, user_id, name, category, city) VALUES ?', [batchCompanies]);
  const batchIntegrations = Array.from({ length: 7 }, (_, i) => [`batch-integration-${i+1}`, `batch-${i+1}`, 'telegram_bot', i < 6 ? 'connected' : 'disconnected']);
  await pool.query('INSERT INTO company_integrations (id, company_id, provider, status) VALUES ?', [batchIntegrations]);
  const concurrentBatches = await Promise.all(Array.from({ length: 3 }, () => selectNotificationCompanyBatch(pool!, 'daily_digest')));
  assert.ok(concurrentBatches.every(batch => batch.length === 2));
  assert.deepEqual([...new Set(concurrentBatches.flat().map(company => company.id))].sort(), ['batch-1','batch-2','batch-3','batch-4']);
  assert.equal(new Set(concurrentBatches.map(batch=>batch[0].id)).size,3);
  // A fresh selector invocation resumes stored rotation; independent kind starts at beginning.
  assert.deepEqual((await selectNotificationCompanyBatch(pool, 'daily_digest')).map(c => c.id), ['batch-4','batch-5']);
  assert.deepEqual((await selectNotificationCompanyBatch(pool, 'review_reminder')).map(c => c.id), ['batch-1','batch-2']);
  const wrappedBatch = await selectNotificationCompanyBatch(pool, 'daily_digest', 10);
  assert.equal(wrappedBatch.length,6); assert.equal(new Set(wrappedBatch.map(c => c.id)).size,6);
  const firstOnlyClients=new Set<string>();for(let i=0;i<6;i++){const batch=await selectNotificationCompanyBatch(pool,'review_reminder');firstOnlyClients.add(batch[0].id);}assert.equal(firstOnlyClients.size,6);
  let selectedDeliveries=0;const selectedDelivery=async()=>{selectedDeliveries++;return true;};
  await Promise.all(concurrentBatches.flat().map(company=>runNotificationOccurrence(pool!,company.id,'daily_digest',Date.parse('2026-11-05T02:30:00Z'),selectedDelivery)));assert.equal(selectedDeliveries,4);
  const [beforeCursor]: any = await pool.query("SELECT last_company_id FROM notification_dispatch_cursors WHERE notification_kind = 'daily_digest'");
  const failingBatchPool = { getConnection: async () => {
    const connection = await pool!.getConnection();
    return new Proxy(connection, { get(target, property) {
      if (property === 'query') return async (sql: string, values: unknown[]) => {
        if (sql.startsWith('UPDATE notification_dispatch_cursors')) throw new Error('CURSOR_FIXTURE_FAILURE');
        return target.query(sql,values);
      };
      const value = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value;
    } });
  } } as unknown as mysql.Pool;
  await assert.rejects(selectNotificationCompanyBatch(failingBatchPool, 'daily_digest'), /CURSOR_FIXTURE_FAILURE/);
  const [afterCursor]: any = await pool.query("SELECT last_company_id FROM notification_dispatch_cursors WHERE notification_kind = 'daily_digest'");
  assert.equal(afterCursor[0].last_company_id, beforeCursor[0].last_company_id);
  await assert.rejects(selectNotificationCompanyBatch(pool, 'daily_digest', 11), /INVALID_NOTIFICATION_BATCH/);
  await pool.query("INSERT INTO companies (id,user_id,name,category,city) VALUES ('batch-0','fixture','New client','fixture','fixture')");
  await pool.query("INSERT INTO company_integrations (id,company_id,provider,status) VALUES ('batch-integration-0','batch-0','telegram_bot','connected')");
  assert.ok((await selectNotificationCompanyBatch(pool, 'daily_digest', 10)).some(c => c.id === 'batch-0'));
  console.log('Notification rotation SQL: bounded concurrent batches, restart/wrap, independent kinds, disconnected/missing config exclusion, rollback and new-client discovery passed.');

  await pool.query("UPDATE companies SET autopilot_enabled = 1 WHERE id IN ('batch-1','batch-2','batch-3','batch-4','batch-5','batch-6','batch-7')");
  const scheduledRows = Array.from({ length: 6 }, (_, company) => Array.from({ length: company === 0 ? 8 : 2 }, (_, post) => [
    `post-batch-${company+1}-${post}`, `batch-${company+1}`, 'private-caption-not-needed', 'scheduled', company === 0 && post === 0 ? '2999-01-01T10:00:00Z' : '2020-01-01T10:00:00Z',
  ])).flat();
  scheduledRows.push(['post-batch-draft','batch-7','private','draft','2020-01-01T10:00:00Z']);
  scheduledRows.push(['post-batch-orphan','missing-company','private','scheduled','2020-01-01T10:00:00Z']);
  await pool.query('INSERT INTO content_posts (id,company_id,caption,status,scheduled_date) VALUES ?', [scheduledRows]);
  const overlappingPostBatches = await Promise.all(Array.from({ length: 3 }, () => selectScheduledPostBatch(pool!)));
  assert.ok(overlappingPostBatches.every(batch => batch.length <= 10 && new Set(batch.map(post => post.company_id)).size <= 2));
  const firstRotation = overlappingPostBatches.flat();
  assert.equal(new Set(firstRotation.map(post => post.company_id)).size, 4);
  assert.ok(overlappingPostBatches.every(batch=>new Set(batch.map(post=>post.id)).size===batch.length));
  assert.ok(firstRotation.every(post => !('caption' in post) && post.status === 'scheduled' && post.workflow_revision!==undefined));
  assert.ok(!firstRotation.some(post => post.company_id === 'missing-company' || post.company_id === 'batch-7'));
  const restartPostBatch = await selectScheduledPostBatch(pool);
  assert.ok(restartPostBatch.some(post => post.company_id === 'batch-4'));
  assert.equal(new Set(restartPostBatch.map(post => post.id)).size, restartPostBatch.length);
  const firstOnlyPosts=new Set<string>();for(let i=0;i<60;i++){const batch=await selectScheduledPostBatch(pool);assert.ok(batch.length<=10);if(batch[0])firstOnlyPosts.add(batch[0].id);}
  const expectedPriorityPosts=scheduledRows.filter(row=>row[3]==='scheduled'&&row[1]!=='missing-company').map(row=>row[0]);assert.deepEqual([...firstOnlyPosts].sort(),expectedPriorityPosts.sort());
  const [postCursorBefore]: any = await pool.query('SELECT cursor_key,last_id FROM scheduled_post_dispatch_cursors ORDER BY cursor_key');
  const brokenPostBatchPool = { getConnection: async () => {
    const connection = await pool!.getConnection();
    return new Proxy(connection, { get(target, property) {
      if (property === 'query') return async (sql: string, values: unknown[]) => {
        if (sql.startsWith('UPDATE scheduled_post_dispatch_cursors')) throw new Error('POST_CURSOR_FIXTURE_FAILURE');
        return target.query(sql,values);
      };
      const value = Reflect.get(target,property); return typeof value === 'function' ? value.bind(target) : value;
    } });
  } } as unknown as mysql.Pool;
  await assert.rejects(selectScheduledPostBatch(brokenPostBatchPool), /POST_CURSOR_FIXTURE_FAILURE/);
  const [postCursorAfter]: any = await pool.query('SELECT cursor_key,last_id FROM scheduled_post_dispatch_cursors ORDER BY cursor_key');
  assert.deepEqual(postCursorAfter,postCursorBefore);
  await assert.rejects(selectScheduledPostBatch(pool,6), /INVALID_POST_BATCH/);
  await assert.rejects(selectScheduledPostBatch(pool,2,21), /INVALID_POST_BATCH/);
  await pool.query("UPDATE companies SET autopilot_enabled = 0 WHERE id = 'batch-1'");
  assert.ok(!(await selectScheduledPostBatch(pool,5,20)).some(post => post.company_id === 'batch-1'));
  console.log('Scheduled post rotation SQL: bounded overlapping two-level windows, first-item-only processing covers every client/post without starving tails, restart/wrap, filtering, minimal metadata and rollback passed.');

  const reportCutoff = Date.parse('2026-11-03T02:30:00Z');
  const reportStart = reportCutoff - 86400000;
  const reportReviews: Array<[string, number | null, number | null, number, string | null]> = [
    ['old-unrated',null,reportStart-4000,0,' \t\n'], ['old-rated',2,reportStart-3000,0,null],
    ['old-flag',4,reportStart-2000,1,null], ['old-text',4,reportStart-1000,0,'answered'],
    ['start',5,reportStart,0,null], ['recent',1,reportCutoff-1000,0,null], ['invalid-rating',9,reportCutoff-2000,0,null],
    ['end',1,reportCutoff,0,null], ['future',1,reportCutoff+1000,0,null], ['missing',3,null,0,null],
  ];
  for (const [id,rating,time,replied,text] of reportReviews) await pool.query(
    'INSERT INTO reviews (id,company_id,author,rating,content,created_at,replied,reply_text,date) VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(?), ?, ?, ?)',
    [`summary-${id}`,'summary-client',id,rating,'x'.repeat(50000),time === null ? null : time/1000,replied,text,'2026-11-01T12:00:00Z']);
  await pool.query("INSERT INTO reviews (id,company_id,author,rating,content,created_at) VALUES ('summary-foreign','summary-foreign','foreign',1,'private',FROM_UNIXTIME(?))",[reportStart/1000]);
  for (const [id,time] of [['start',reportStart],['recent',reportCutoff-1000],['end',reportCutoff],['future',reportCutoff+1000],['missing',null]] as Array<[string,number|null]>) await pool.query(
    'INSERT INTO leads (id,company_id,name,phone,service,notes,created_at) VALUES (?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))',
    [`summary-lead-${id}`,'summary-client',id,'fixture','fixture','private-lead-notes'.repeat(1000),time === null ? null : time/1000]);
  const digestSummary = await readDigestSummary(pool,'summary-client',reportCutoff);
  assert.equal(digestSummary.recentLeads,2); assert.equal(digestSummary.recentReviews,3);
  assert.equal(digestSummary.missingLeadTime,1); assert.equal(digestSummary.missingReviewTime,1);
  assert.ok(Math.abs(digestSummary.averageRating! - 3.2) < 0.0001);
  assert.ok(Math.abs(digestSummary.olderAverageRating! - 10/3) < 0.0001);
  assert.equal(digestSummary.leadSample?.name,'recent'); assert.equal(digestSummary.reviewSample?.author,'recent');
  assert.ok(!JSON.stringify(digestSummary).includes('private-lead-notes'));
  const reminderSummary = await readReviewReminderSummary(pool,'summary-client',reportCutoff);
  assert.equal(reminderSummary.pendingReviews,2); assert.equal(reminderSummary.lowestRating,2);
  assert.equal(reminderSummary.missingReviewTime,1); assert.equal(reminderSummary.sample?.author,'old-unrated');
  assert.equal(reminderSummary.sample?.rating,null); assert.equal(reminderSummary.sample?.excerpt.length,110);
  assert.equal(Number(reminderSummary.sample?.truncated),1);
  const emptySummary = await readDigestSummary(pool,'empty-summary-client',reportCutoff);
  assert.equal(emptySummary.recentLeads,0); assert.equal(emptySummary.averageRating,null); assert.equal(emptySummary.reviewSample,undefined);
  // TIMESTAMP comparisons must produce identical cutoffs under a different DB session timezone.
  const istReportPool = mysql.createPool({host:'127.0.0.1',port,user:'root',password:'',database,connectionLimit:1});
  try {
    await istReportPool.query("SET time_zone = '+05:30'");
    assert.deepEqual(await readDigestSummary(istReportPool,'summary-client',reportCutoff),digestSummary);
    assert.deepEqual(await readReviewReminderSummary(istReportPool,'summary-client',reportCutoff),reminderSummary);
  } finally { await istReportPool.end(); }
  let insertedDuringSummary = false;
  const concurrentSummaryPool = { getConnection: async () => {
    const connection = await pool!.getConnection();
    return new Proxy(connection, { get(target,property) {
      if (property === 'query') return async (sql: string, values: unknown[]) => {
        const result = await target.query(sql,values);
        if (!insertedDuringSummary && sql.includes('AS missingTime FROM leads')) {
          insertedDuringSummary = true;
          await pool!.query("INSERT INTO leads (id,company_id,name,phone,service,created_at) VALUES ('summary-concurrent','summary-client','concurrent-newest','fixture','fixture',FROM_UNIXTIME(?))",[(reportCutoff-500)/1000]);
        }
        return result;
      };
      const value = Reflect.get(target,property); return typeof value === 'function' ? value.bind(target) : value;
    } });
  } } as unknown as mysql.Pool;
  const snapshotSummary = await readDigestSummary(concurrentSummaryPool,'summary-client',reportCutoff);
  assert.equal(insertedDuringSummary,true);
  assert.deepEqual(snapshotSummary,digestSummary);
  assert.equal((await readDigestSummary(pool,'summary-client',reportCutoff)).recentLeads,3);
  const deadlinePool = mysql.createPool({host:'127.0.0.1',port,user:'root',password:'',database,connectionLimit:1});
  try {
    const [beforeDeadline]: any = await deadlinePool.query('SELECT CONNECTION_ID() AS id');
    await assert.rejects(withReadOnlySqlDeadline(deadlinePool,sql=>sql.query('SELECT SLEEP(1)'),50),{code:'READ_ONLY_SQL_TIMEOUT'});
    const [afterDeadline]: any = await deadlinePool.query('SELECT CONNECTION_ID() AS id');
    assert.notEqual(afterDeadline[0].id,beforeDeadline[0].id,'Timed-out connection must not be reused');
    assert.equal((await readDigestSummary(deadlinePool,'summary-client',reportCutoff)).recentLeads,3);
    const slowSummaryPool = {getConnection:async()=>{
      const connection = await deadlinePool.getConnection();
      return new Proxy(connection,{get(target,property){
        if(property==='query') return async(sql:string,values:unknown[])=>sql.includes('AS missingTime FROM leads') ? target.query('SELECT SLEEP(1)') : target.query(sql,values);
        const value=Reflect.get(target,property); return typeof value==='function' ? value.bind(target) : value;
      }});
    }} as unknown as mysql.Pool;
    await assert.rejects(readDigestSummary(slowSummaryPool,'summary-client',reportCutoff,50),{code:'READ_ONLY_SQL_TIMEOUT'});
    assert.equal((await readReviewReminderSummary(deadlinePool,'summary-client',reportCutoff)).pendingReviews,2);
  } finally {await deadlinePool.end();}
  console.log('Read-only SQL deadlines: real slow query and partial-summary timeout discard socket; new connection completes healthy summary.');

  console.log('Notification summary SQL: exact half-open counts, time coverage, valid rating averages, reply/age filters, bounded excerpts, tenant isolation and DB timezone independence passed.');

  await pool.query("INSERT INTO publishing_records (id,post_id,company_id,platform,status,idempotency_key,created_at) VALUES ('uncertain-old','uncertainty-post','uncertainty-client','facebook','UNKNOWN','uncertain-old',DATE_SUB(NOW(),INTERVAL 1 DAY)), ('failed-new','uncertainty-post','uncertainty-client','facebook','FAILED','failed-new',NOW())");
  const unresolved = await findUnconfirmedPublishingEvidence(pool,'uncertainty-post','facebook');
  assert.equal(unresolved?.status,'UNKNOWN'); assert.equal(unresolved?.company_id,'uncertainty-client');
  assert.equal(await findUnconfirmedPublishingEvidence(pool,'uncertainty-post','instagram'),null);
  assert.equal(await findUnconfirmedPublishingEvidence(pool,'absent-post','facebook'),null);
  console.log('Publishing SQL evidence: older UNKNOWN cannot be hidden by newer FAILED; post/platform lookup scoped and bounded.');

  await pool.query("INSERT INTO companies (id,user_id,name,category,city,autopilot_enabled) VALUES ('atomic-client','fixture','Atomic','fixture','fixture',1)");
  await pool.query("INSERT INTO content_posts (id,company_id,caption,status) VALUES ('atomic-publishing-post','atomic-client','fixture','scheduled'), ('crashed-publish-post','atomic-client','fixture','scheduled')");
  await pool.query('INSERT INTO company_profiles_data (company_id,data_payload) VALUES (?,?)',['atomic-client',JSON.stringify({engine_settings:{approvalSettings:{googlePosts:'auto',socialPosts:'auto',promotionalOffers:'auto'}}})]);
  const publishingClaims = Array.from({length:8},(_,i)=>({postId:'atomic-publishing-post',companyId:'atomic-client',token:`worker-token-${i}`}));
  const claimResults = await Promise.all(publishingClaims.map(claim=>claimSqlPublishing(pool!,claim)));
  assert.equal(claimResults.filter(result=>result.acquired).length,1);
  const owner = publishingClaims[claimResults.findIndex(result=>result.acquired)];
  assert.equal(await ownsSqlPublishing(pool,owner),true);
  const rejected = publishingClaims.find(claim=>claim.token!==owner.token)!;
  assert.equal(await settleSqlPublishing(pool,rejected,'PUBLISHED'),false);
  await assert.rejects(claimSqlPublishing(pool,{...owner,companyId:'other-client'}),/SCOPE_MISMATCH/);
  assert.equal(await settleSqlPublishing(pool,owner,'FAILED'),true);
  const nextOwner = {...owner,token:'next-attempt'};
  assert.equal((await claimSqlPublishing(pool,nextOwner)).acquired,true);
  assert.equal(await settleSqlPublishing(pool,owner,'PUBLISHED'),false);
  assert.equal(await ownsSqlPublishing(pool,nextOwner),true);
  assert.equal(await settleSqlPublishing(pool,nextOwner,'PUBLISHED'),true);
  assert.equal((await claimSqlPublishing(pool,{...owner,token:'replay'})).status,'PUBLISHED');
  const [settledPost]:any=await pool.query('SELECT status FROM content_posts WHERE id = ?',[owner.postId]);
  assert.equal(settledPost[0].status,'published');
  const crashedClaim = {postId:'crashed-publish-post',companyId:'atomic-client',token:'crashed-owner'};
  assert.equal((await claimSqlPublishing(pool,crashedClaim)).acquired,true);
  await pool.query("UPDATE publishing_dispatch_claims SET started_at = DATE_SUB(NOW(),INTERVAL 6 MINUTE) WHERE post_id = ?",[crashedClaim.postId]);
  assert.deepEqual(await claimSqlPublishing(pool,{...crashedClaim,token:'successor'}),{acquired:false,status:'UNKNOWN'});
  assert.equal(await ownsSqlPublishing(pool,crashedClaim),false);
  assert.equal(await settleSqlPublishing(pool,crashedClaim,'PUBLISHED'),false);
  assert.equal((await claimSqlPublishing(pool,{...crashedClaim,token:'restart'})).acquired,false);
  await pool.query("INSERT INTO content_posts (id,company_id,caption,status) VALUES ('claim-rollback-post','atomic-client','fixture','scheduled')");
  const rollbackClaim={postId:'claim-rollback-post',companyId:'atomic-client',token:'rollback-owner'};
  assert.equal((await claimSqlPublishing(pool,rollbackClaim)).acquired,true);
  const brokenSettlementPool={getConnection:async()=>{
    const connection=await pool!.getConnection();
    return new Proxy(connection,{get(target,property){
      if(property==='query')return async(sql:string,values:unknown[])=>{
        if(sql.startsWith('UPDATE content_posts SET status'))throw new Error('CONTENT_SETTLEMENT_FIXTURE_FAILURE');
        return target.query(sql,values);
      };
      const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
    }});
  }} as unknown as mysql.Pool;
  await assert.rejects(settleSqlPublishing(brokenSettlementPool,rollbackClaim,'PUBLISHED'),/CONTENT_SETTLEMENT_FIXTURE_FAILURE/);
  assert.equal(await ownsSqlPublishing(pool,rollbackClaim),true);
  const [rollbackPost]:any=await pool.query('SELECT status FROM content_posts WHERE id = ?',[rollbackClaim.postId]);
  assert.equal(rollbackPost[0].status,'scheduled');
  assert.equal(await settleSqlPublishing(pool,rollbackClaim,'UNKNOWN'),true);
  await assert.rejects(claimSqlPublishing(pool,{postId:'missing-source-post',companyId:'atomic-client',token:'no-source'}),/SCOPE_MISMATCH/);
  console.log('Atomic publishing SQL: eight contenders have one owner, wrong/stale tokens fenced, known failed retry safe, completed replay blocked and crash stays UNKNOWN without takeover.');

  const [sourceRows]:any=await pool.query("SELECT * FROM content_posts WHERE id = 'atomic-publishing-post'");
  const sourceVersion=publishingSourceVersion(sourceRows[0]);
  await pool.query("UPDATE content_posts SET caption = 'concurrent source edit' WHERE id = 'atomic-publishing-post'");
  assert.deepEqual(await claimSqlPublishing(pool,{postId:'atomic-publishing-post',companyId:'atomic-client',token:'stale-source-owner'},sourceVersion),{acquired:false,status:'SOURCE_CHANGED'});
  const reviewCompany='atomic-client',reviewPost='crashed-publish-post';
  const reviewState=await readPublishingReview(pool,reviewCompany,reviewPost);
  assert.equal(reviewState.needsReview,true);assert.equal(reviewState.status,'UNKNOWN');
  assert.ok(!JSON.stringify(reviewState).includes('claim_token'));assert.ok(!JSON.stringify(reviewState).includes('crashed-owner'));
  const observation={expectedVersion:reviewState.version,decision:'UNRESOLVED' as const,evidenceReference:'Manual lookup fixture',note:'No provider resend requested'};
  const reviewRace=await Promise.allSettled(Array.from({length:8},()=>appendPublishingReview(pool!,reviewCompany,reviewPost,'fixture-operator',observation)));
  assert.equal(reviewRace.filter(result=>result.status==='fulfilled').length,1);
  assert.ok(reviewRace.filter(result=>result.status==='rejected').every(result=>(result as PromiseRejectedResult).reason.status===409));
  const reviewed=await readPublishingReview(pool,reviewCompany,reviewPost);
  assert.notEqual(reviewed.version,reviewState.version);assert.equal(reviewed.history.length,1);assert.equal(reviewed.history[0].actor_id,'fixture-operator');
  assert.equal(reviewed.status,'UNKNOWN');assert.equal((await claimSqlPublishing(pool,{postId:reviewPost,companyId:reviewCompany,token:'after-review'})).acquired,false);
  await assert.rejects(readPublishingReview(pool,'foreign-company',reviewPost),error=>(error as any).status===404);
  await assert.rejects(appendPublishingReview(pool,reviewCompany,reviewPost,'fixture-operator',{...observation,expectedVersion:reviewed.version,platform:'not-target'}),error=>(error as any).status===400);
  await pool.query('UPDATE content_posts SET caption = ? WHERE id = ?',['Changed while review open',reviewPost]);
  await assert.rejects(appendPublishingReview(pool,reviewCompany,reviewPost,'fixture-operator',{...observation,expectedVersion:reviewed.version}),error=>(error as any).status===409);
  let changedReview=await readPublishingReview(pool,reviewCompany,reviewPost);
  await pool.query("INSERT INTO publishing_records (id,post_id,company_id,platform,status,idempotency_key) VALUES ('review-provider-evidence',? ,?,'google','UNKNOWN','review-provider-fixture')",[reviewPost,reviewCompany]);
  await assert.rejects(appendPublishingReview(pool,reviewCompany,reviewPost,'fixture-operator',{...observation,expectedVersion:changedReview.version}),error=>(error as any).status===409);
  changedReview=await readPublishingReview(pool,reviewCompany,reviewPost);
  await pool.query("UPDATE publishing_records SET status = 'PUBLISHED',provider_post_id = 'observed-fixture-id' WHERE id = 'review-provider-evidence'");
  await assert.rejects(appendPublishingReview(pool,reviewCompany,reviewPost,'fixture-operator',{...observation,expectedVersion:changedReview.version}),error=>(error as any).status===409);
  changedReview=await readPublishingReview(pool,reviewCompany,reviewPost);
  const auditFaultPool={getConnection:async()=>{
    const connection=await pool!.getConnection();
    return new Proxy(connection,{get(target,property){
      if(property==='query')return async(sql:string,values:unknown[])=>{if(sql.startsWith('INSERT INTO publishing_review_audit'))throw new Error('AUDIT_WRITE_FIXTURE_FAILURE');return target.query(sql,values);};
      const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
    }});
  }} as unknown as mysql.Pool;
  await assert.rejects(appendPublishingReview(auditFaultPool,reviewCompany,reviewPost,'fixture-operator',{...observation,expectedVersion:changedReview.version}),/AUDIT_WRITE_FIXTURE_FAILURE/);
  assert.equal((await readPublishingReview(pool,reviewCompany,reviewPost)).version,changedReview.version);
  // Audits do not alter claims or release resend; bounded history keyset uses sequence order.
  for(let n=0;n<20;n++){
    const current=await readPublishingReview(pool,reviewCompany,reviewPost);
    await appendPublishingReview(pool,reviewCompany,reviewPost,'fixture-operator',{...observation,expectedVersion:current.version});
  }
  const reviewPage=await readPublishingReview(pool,reviewCompany,reviewPost);
  assert.equal(reviewPage.history.length,20);assert.ok(reviewPage.nextBefore);
  const olderReviews=await readPublishingReview(pool,reviewCompany,reviewPost,reviewPage.nextBefore!);
  assert.equal(olderReviews.history.length,1);assert.equal(olderReviews.nextBefore,null);
  assert.equal(new Set([...reviewPage.history,...olderReviews.history].map((row:any)=>row.id)).size,21);
  assert.equal((await claimSqlPublishing(pool,{postId:reviewPost,companyId:reviewCompany,token:'still-blocked'})).acquired,false);
  const finalObservationState=await readPublishingReview(pool,reviewCompany,reviewPost);
  await appendPublishingReview(pool,reviewCompany,reviewPost,'second-fixture-operator',{
    expectedVersion:finalObservationState.version,decision:'OBSERVED_PUBLISHED',platform:'google',providerPostId:'observed-fixture-id',evidenceReference:'External provider reference fixture',note:'Operator observation only',
  });
  const observedReview=await readPublishingReview(pool,reviewCompany,reviewPost);
  assert.equal(observedReview.history[0].decision,'OBSERVED_PUBLISHED');
  assert.equal(observedReview.history[0].observed_claim_status,'UNKNOWN');
  assert.match(observedReview.history[0].observed_content_version,/^[a-f0-9]{64}$/);
  assert.equal(observedReview.status,'UNKNOWN');assert.equal(observedReview.postStatus,finalObservationState.postStatus);
  const completedReview=await readPublishingReview(pool,'atomic-client','atomic-publishing-post');
  assert.equal(completedReview.needsReview,false);
  await assert.rejects(appendPublishingReview(pool,'atomic-client','atomic-publishing-post','fixture-operator',{...observation,expectedVersion:completedReview.version}),error=>(error as any).status===409);
  console.log('Publishing audit SQL: one concurrent observation, actor/history scope, stale/content-edit conflict, audit rollback, bounded pagination and no resend unlock passed.');

  // Read-only Meta evidence cannot release an uncertain dispatch.
  await pool.query("UPDATE content_posts SET platforms = ? WHERE id = ?",[JSON.stringify(['facebook']),reviewPost]);
  await pool.query("INSERT INTO company_integrations (id,company_id,provider,status,credentials) VALUES ('verify-meta',?,'meta_social','connected',?)",[reviewCompany,JSON.stringify({pageId:'101',accessToken:'private-verification-fixture'})]);
  const prepareCheck=async()=>{
    const current=await readPublishingReview(pool!,reviewCompany,reviewPost);
    return prepareMetaVerification(pool!,reviewCompany,reviewPost,{expectedVersion:current.version,platform:'facebook',providerPostId:'101_202'},value=>value);
  };
  const checkSnapshot=await prepareCheck();
  const matched={status:'MATCHED' as const,reason:'PUBLISHED_ACCOUNT_TEXT_TIME_MATCH',platform:'facebook' as const,providerObjectId:'101_202',publicationId:'101_202',accountId:'101',providerCreatedAtMs:Date.now(),mediaCompared:false as const,dispatchAttributionVerified:false as const};
  const checked=await recordMetaVerification(pool,checkSnapshot,'fixture-operator',matched);
  assert.equal(checked.verification.status,'MATCHED');assert.equal(checked.claimStateChanged,false);
  assert.ok(!JSON.stringify(checked).includes('private-verification-fixture'));
  const checkedReview=await readPublishingReview(pool,reviewCompany,reviewPost);
  assert.equal(checkedReview.verifications[0].contextCurrent,true);
  assert.equal(checkedReview.status,'UNKNOWN');
  assert.equal((await claimSqlPublishing(pool,{postId:reviewPost,companyId:reviewCompany,token:'verified-still-blocked'})).acquired,false);
  await pool.query("UPDATE content_posts SET caption = 'changed after verification snapshot' WHERE id = ?",[reviewPost]);
  assert.equal((await recordMetaVerification(pool,checkSnapshot,'fixture-operator',matched)).verification.status,'STALE');
  assert.equal((await readPublishingReview(pool,reviewCompany,reviewPost)).verifications.every((row:any)=>!row.contextCurrent),true);
  const connectionSnapshot=await prepareCheck();
  await pool.query("UPDATE company_integrations SET credentials = ? WHERE id = 'verify-meta'",[JSON.stringify({pageId:'999',accessToken:'rotated-private-fixture'})]);
  assert.equal((await recordMetaVerification(pool,connectionSnapshot,'fixture-operator',matched)).verification.status,'STALE');
  await assert.rejects(prepareMetaVerification(pool,reviewCompany,reviewPost,checkSnapshot.input,value=>value),error=>(error as any).status===409);
  const [checkCount]:any=await pool.query('SELECT COUNT(*) AS count FROM publishing_verification_audit');
  const checkFault={getConnection:async()=>{
    const connection=await pool!.getConnection();
    return new Proxy(connection,{get(target,property){
      if(property==='query')return async(sql:string,values:any[])=>{if(sql.startsWith('INSERT INTO publishing_verification_audit'))throw new Error('CHECK_AUDIT_FAILURE');return target.query(sql,values);};
      const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
    }});
  }} as unknown as mysql.Pool;
  await assert.rejects(recordMetaVerification(checkFault,await prepareCheck(),'fixture-operator',matched),/CHECK_AUDIT_FAILURE/);
  const [afterCheckCount]:any=await pool.query('SELECT COUNT(*) AS count FROM publishing_verification_audit');
  assert.equal(afterCheckCount[0].count,checkCount[0].count);
  console.log('Meta verification SQL: durable scoped metadata, stale content/connection, audit rollback and no resend release passed.');

  const draftInput={requestKey:'a'.repeat(64),content:'Durable intent fixture',platforms:['facebook'] as ['facebook']};
  const racedDrafts=await Promise.all(Array.from({length:8},()=>preparePublicationDraft(pool!,'atomic-client','fixture-actor',draftInput)));
  assert.equal(new Set(racedDrafts.map(row=>row.post.id)).size,1);
  assert.equal(racedDrafts.filter(row=>!row.reused).length,1);
  const firstDraft=racedDrafts[0];
  const replayedDraft=await preparePublicationDraft(pool,'atomic-client','fixture-actor',draftInput);
  assert.equal(replayedDraft.post.id,firstDraft.post.id);assert.equal(replayedDraft.sourceVersion,firstDraft.sourceVersion);
  await assert.rejects(preparePublicationDraft(pool,'atomic-client','fixture-actor',{...draftInput,content:'changed'}),error=>(error as any).status===409);
  const tenantDraft=await preparePublicationDraft(pool,'other-intent-company','fixture-actor',draftInput);
  assert.notEqual(tenantDraft.post.id,firstDraft.post.id);
  await pool.query("UPDATE content_posts SET headline = 'changed saved source' WHERE id = ?",[firstDraft.post.id]);
  await assert.rejects(preparePublicationDraft(pool,'atomic-client','fixture-actor',draftInput),error=>(error as any).status===409);
  const intentFaultPool={getConnection:async()=>{
    const connection=await pool!.getConnection();
    return new Proxy(connection,{get(target,property){
      if(property==='query')return async(sql:string,values:any[])=>{if(sql.startsWith('UPDATE publication_draft_intents SET post_id'))throw new Error('INTENT_FIXTURE_ROLLBACK');return target.query(sql,values);};
      const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
    }});
  }} as unknown as mysql.Pool;
  const [beforeIntentPosts]:any=await pool.query('SELECT COUNT(*) AS count FROM content_posts');
  await assert.rejects(preparePublicationDraft(intentFaultPool,'atomic-client','fixture-actor',{...draftInput,requestKey:'b'.repeat(64)}),/INTENT_FIXTURE_ROLLBACK/);
  const [afterIntentPosts]:any=await pool.query('SELECT COUNT(*) AS count FROM content_posts');
  assert.equal(afterIntentPosts[0].count,beforeIntentPosts[0].count);
  const [rolledIntent]:any=await pool.query("SELECT * FROM publication_draft_intents WHERE company_id = 'atomic-client' AND request_key = ?",['b'.repeat(64)]);
  assert.equal(rolledIntent.length,0);
  const recoveredIntent=await preparePublicationDraft(pool,'atomic-client','fixture-actor',{...draftInput,requestKey:'b'.repeat(64)});
  assert.equal(recoveredIntent.reused,false);
  await assert.rejects(pool.query('DELETE FROM content_posts WHERE id = ?',[recoveredIntent.post.id]),/foreign key constraint/i);
  console.log('Durable publication intents SQL: eight contenders one draft, acknowledgment-loss replay, content conflict, tenant separation, edited-source rejection, atomic rollback and protected reference passed.');

  const workflowId=recoveredIntent.post.id;
  const workflowInput={companyId:'atomic-client',expectedVersion:recoveredIntent.sourceVersion,status:'pending_approval' as const};
  const approvals=await Promise.allSettled(Array.from({length:8},()=>transitionPublication(pool!,workflowId,'authenticated-reviewer',workflowInput)));
  assert.equal(approvals.filter(row=>row.status==='fulfilled').length,1);
  const readWorkflow=async()=>{const [rows]:any=await pool!.query('SELECT * FROM content_posts WHERE id = ?',[workflowId]);return rows[0];};
  let workflowPost=await readWorkflow();assert.equal(workflowPost.status,'pending_approval');
  const scheduledWorkflow=await transitionPublication(pool,workflowId,'authenticated-reviewer',{...workflowInput,expectedVersion:publishingSourceVersion(workflowPost),status:'scheduled'});
  const draftWorkflow=await transitionPublication(pool,workflowId,'authenticated-reviewer',{...workflowInput,expectedVersion:scheduledWorkflow.sourceVersion,status:'draft'});
  assert.notEqual(draftWorkflow.sourceVersion,recoveredIntent.sourceVersion,'Revision must prevent status ABA');
  await assert.rejects(transitionPublication(pool,workflowId,'authenticated-reviewer',workflowInput),error=>(error as any).status===409);
  const [workflowAudit]:any=await pool.query('SELECT * FROM publication_workflow_audit WHERE post_id = ?',[workflowId]);
  assert.equal(workflowAudit.length,3);assert.ok(workflowAudit.every((row:any)=>row.actor_id==='authenticated-reviewer'));
  await assert.rejects(transitionPublication(pool,workflowId,'actor',{...workflowInput,companyId:'foreign',expectedVersion:draftWorkflow.sourceVersion}),error=>(error as any).status===404);
  const activeWorkflowClaim={postId:workflowId,companyId:'atomic-client',token:'workflow-inflight'};
  assert.equal((await claimSqlPublishing(pool,activeWorkflowClaim)).acquired,true);
  await assert.rejects(transitionPublication(pool,workflowId,'actor',{...workflowInput,expectedVersion:draftWorkflow.sourceVersion}),error=>(error as any).status===409);
  await settleSqlPublishing(pool,activeWorkflowClaim,'UNKNOWN');
  workflowPost=await readWorkflow();
  await assert.rejects(transitionPublication(pool,workflowId,'actor',{...workflowInput,expectedVersion:publishingSourceVersion(workflowPost)}),error=>(error as any).status===409);
  const rollbackWorkflow=await preparePublicationDraft(pool,'atomic-client','fixture-actor',{...draftInput,requestKey:'c'.repeat(64)});
  const workflowFaultPool={getConnection:async()=>{
    const connection=await pool!.getConnection();
    return new Proxy(connection,{get(target,property){
      if(property==='query')return async(sql:string,values:any[])=>{if(sql.startsWith('INSERT INTO publication_workflow_audit'))throw new Error('WORKFLOW_AUDIT_ROLLBACK');return target.query(sql,values);};
      const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
    }});
  }} as unknown as mysql.Pool;
  await assert.rejects(transitionPublication(workflowFaultPool,rollbackWorkflow.post.id,'actor',{...workflowInput,expectedVersion:rollbackWorkflow.sourceVersion}),/WORKFLOW_AUDIT_ROLLBACK/);
  const [rolledWorkflow]:any=await pool.query('SELECT * FROM content_posts WHERE id = ?',[rollbackWorkflow.post.id]);
  assert.equal(publishingSourceVersion(rolledWorkflow[0]),rollbackWorkflow.sourceVersion);
  console.log('Publication workflow SQL:8-way one approval, actor audit, state/version transition, ABA prevention, foreign scope, active/UNKNOWN dispatch fence and audit-write rollback passed.');

  let scheduledApproval=await transitionPublication(pool,rollbackWorkflow.post.id,'schedule-reviewer',{companyId:'atomic-client',expectedVersion:rollbackWorkflow.sourceVersion,status:'scheduled'});
  const rescheduledApproval=await transitionPublication(pool,rollbackWorkflow.post.id,'schedule-editor',{companyId:'atomic-client',expectedVersion:scheduledApproval.sourceVersion,status:'pending_approval',schedule:{date:'2026-11-04',time:'14:30'}});
  assert.notEqual(rescheduledApproval.sourceVersion,scheduledApproval.sourceVersion);
  assert.deepEqual(await claimSqlPublishing(pool,{postId:rollbackWorkflow.post.id,companyId:'atomic-client',token:'stale-schedule-owner'},scheduledApproval.sourceVersion),{acquired:false,status:'SOURCE_CHANGED'});
  const rescheduleHistory=await readPublicationWorkflowHistory(pool,'atomic-client',rollbackWorkflow.post.id);
  assert.equal(rescheduleHistory.history[0].change_kind,'RESCHEDULE');assert.equal(rescheduleHistory.history[0].to_status,'pending_approval');
  assert.deepEqual(rescheduleHistory.history[0].schedule_after,{date:'2026-11-04',time:'14:30'});
  await assert.rejects(readPublicationWorkflowHistory(pool,'foreign',rollbackWorkflow.post.id),error=>(error as any).status===404);
  let historyVersion=rescheduledApproval.sourceVersion;
  for(let n=0;n<21;n++){
    const next=await transitionPublication(pool,rollbackWorkflow.post.id,'history-reviewer',{companyId:'atomic-client',expectedVersion:historyVersion,status:n%2===0?'draft':'pending_approval'});
    historyVersion=next.sourceVersion;
  }
  const firstHistory=await readPublicationWorkflowHistory(pool,'atomic-client',rollbackWorkflow.post.id);
  assert.equal(firstHistory.history.length,20);assert.ok(firstHistory.nextBefore);
  const olderHistory=await readPublicationWorkflowHistory(pool,'atomic-client',rollbackWorkflow.post.id,firstHistory.nextBefore!);
  assert.equal(olderHistory.history.length,3);assert.equal(olderHistory.nextBefore,null);
  assert.equal(new Set([...firstHistory.history,...olderHistory.history].map((row:any)=>row.id)).size,23);
  // Resume the history migration with populated legacy audit metadata before AUTO_INCREMENT was finalized.
  await pool.query(`INSERT INTO publication_workflow_audit (id,company_id,post_id,actor_id,from_status,to_status,source_version,resulting_version,recorded_at)
    VALUES ('legacy-history-older','atomic-client',?,'legacy-fixture','draft','pending_approval',?,?, '2020-01-01 00:00:00'),
           ('legacy-history-newer','atomic-client',?,'legacy-fixture','pending_approval','scheduled',?,?, '2021-01-01 00:00:00')`,[rollbackWorkflow.post.id,'0'.repeat(64),'0'.repeat(64),rollbackWorkflow.post.id,'0'.repeat(64),'0'.repeat(64)]);
  const [auditCountBefore]:any=await pool.query('SELECT COUNT(*) AS count FROM publication_workflow_audit');
  await pool.query('ALTER TABLE publication_workflow_audit MODIFY audit_sequence BIGINT UNSIGNED DEFAULT NULL');
  await pool.query('UPDATE publication_workflow_audit SET audit_sequence = NULL');
  await MIGRATIONS.find(m=>m.name==='018_publication_schedule_history')!.up(pool);
  const [oldestHistory]:any=await pool.query('SELECT id FROM publication_workflow_audit ORDER BY audit_sequence LIMIT 2');
  assert.deepEqual(oldestHistory.map((row:any)=>row.id),['legacy-history-older','legacy-history-newer']);
  const [auditCountAfter]:any=await pool.query('SELECT COUNT(*) AS count FROM publication_workflow_audit');
  assert.equal(auditCountAfter[0].count,auditCountBefore[0].count);
  assert.equal((await verifySchema(pool)).status,'READY');
  console.log('Schedule approval SQL: pending reapproval, stale schedule claim rejection, before/after audit, tenant scope and bounded sequence pagination passed.');

  await pool.query("INSERT INTO companies (id,user_id,name,category,city,autopilot_enabled) VALUES ('policy-client','fixture','Policy','fixture','fixture',1)");
  const policyDraft=await preparePublicationDraft(pool,'policy-client','policy-author',{requestKey:'d'.repeat(64),content:'Policy guarded post',platforms:['facebook']});
  const initialPolicyOccurrence=scheduledPostKey({...policyDraft.post,status:'scheduled'});
  const deniedPolicyJob=await enqueueSqlJob(pool,{id:crypto.randomUUID(),company_id:'policy-client',job_type:'publishing',payload:{postId:policyDraft.post.id,scheduleOccurrence:initialPolicyOccurrence},status:'QUEUED',attempts:0,max_attempts:3,scheduled_for:new Date().toISOString(),idempotency_key:initialPolicyOccurrence});
  await pool.query("UPDATE job_queue SET status = 'FAILED' WHERE id = ?",[deniedPolicyJob.id]);
  const policyClaim={postId:policyDraft.post.id,companyId:'policy-client',token:'policy-owner'};
  assert.deepEqual(await claimSqlPublishing(pool,policyClaim),{acquired:false,status:'APPROVAL_REQUIRED'});
  await pool.query('INSERT INTO company_profiles_data (company_id,data_payload) VALUES (?,?)',['policy-client','malformed-json']);
  assert.deepEqual(await claimSqlPublishing(pool,policyClaim),{acquired:false,status:'APPROVAL_REQUIRED'});
  await pool.query("UPDATE content_posts SET status = 'scheduled' WHERE id = ?",[policyDraft.post.id]);
  assert.deepEqual(await claimSqlPublishing(pool,policyClaim),{acquired:false,status:'APPROVAL_REQUIRED'},'Legacy/direct scheduled status is not approval proof');
  const readPolicyPost=async()=>{const [rows]:any=await pool!.query('SELECT * FROM content_posts WHERE id = ?',[policyDraft.post.id]);return rows[0];};
  let policyPost=await readPolicyPost();
  let policyTransition=await transitionPublication(pool,policyDraft.post.id,'policy-reviewer',{companyId:'policy-client',status:'pending_approval',expectedVersion:publishingSourceVersion(policyPost)});
  policyTransition=await transitionPublication(pool,policyDraft.post.id,'policy-reviewer',{companyId:'policy-client',status:'scheduled',expectedVersion:policyTransition.sourceVersion});
  await pool.query('UPDATE company_profiles_data SET data_payload = ? WHERE company_id = ?',[JSON.stringify({engine_settings:{approvalSettings:{googlePosts:'auto',socialPosts:'approval',promotionalOffers:'approval'}}}),'policy-client']);
  assert.deepEqual(await claimSqlPublishing(pool,policyClaim),{acquired:false,status:'APPROVAL_REQUIRED'},'Policy change invalidates an otherwise identical approved source');
  policyTransition=await transitionPublication(pool,policyDraft.post.id,'policy-reviewer',{companyId:'policy-client',status:'pending_approval',expectedVersion:policyTransition.sourceVersion});
  policyTransition=await transitionPublication(pool,policyDraft.post.id,'policy-reviewer',{companyId:'policy-client',status:'scheduled',expectedVersion:policyTransition.sourceVersion});
  const approvedPolicyOccurrence=scheduledPostKey(await readPolicyPost());assert.notEqual(approvedPolicyOccurrence,initialPolicyOccurrence);
  const approvedPolicyJob=await enqueueSqlJob(pool,{id:crypto.randomUUID(),company_id:'policy-client',job_type:'publishing',payload:{postId:policyDraft.post.id,scheduleOccurrence:approvedPolicyOccurrence},status:'QUEUED',attempts:0,max_attempts:3,scheduled_for:new Date().toISOString(),idempotency_key:approvedPolicyOccurrence});
  assert.notEqual(approvedPolicyJob.id,deniedPolicyJob.id);
  assert.equal((await claimSqlPublishing(pool,policyClaim)).acquired,true);
  assert.equal(await settleSqlPublishing(pool,policyClaim,'FAILED'),true);
  policyPost=await readPolicyPost();
  policyTransition=await transitionPublication(pool,policyDraft.post.id,'policy-reviewer',{companyId:'policy-client',status:'pending_approval',expectedVersion:publishingSourceVersion(policyPost)});
  policyTransition=await transitionPublication(pool,policyDraft.post.id,'policy-reviewer',{companyId:'policy-client',status:'scheduled',expectedVersion:policyTransition.sourceVersion});
  assert.equal((await claimSqlPublishing(pool,{...policyClaim,token:'reapproved-owner'})).acquired,true);
  await settleSqlPublishing(pool,{...policyClaim,token:'reapproved-owner'},'FAILED');
  await pool.query('UPDATE company_profiles_data SET data_payload = ? WHERE company_id = ?',[JSON.stringify({engine_settings:{approvalSettings:{googlePosts:'auto',socialPosts:'auto',promotionalOffers:'auto'}}}),'policy-client']);
  const autoPolicyClaim={...policyClaim,token:'auto-policy-owner'};
  assert.equal((await claimSqlPublishing(pool,autoPolicyClaim)).acquired,true);
  await settleSqlPublishing(pool,autoPolicyClaim,'UNKNOWN');
  assert.deepEqual(await claimSqlPublishing(pool,{...policyClaim,token:'auto-cannot-replay'}),{acquired:false,status:'UNKNOWN'});
  const [boundApprovals]:any=await pool.query('SELECT policy_version FROM publication_workflow_audit WHERE post_id = ?',[policyDraft.post.id]);
  assert.ok(boundApprovals.every((row:any)=>/^[a-f0-9]{64}$/.test(row.policy_version)));
  console.log('Publication policy SQL: missing/direct-scheduled deny, policy change invalidates approval, matching approval succeeds, failed reapproval, explicit auto retry and UNKNOWN replay fence passed.');

  await pool.query("INSERT INTO companies (id,user_id,name,category,city,autopilot_enabled) VALUES ('controls-active','fixture','Active','fixture','fixture',1),('controls-paused','fixture','Paused','fixture','fixture',0)");
  await pool.query('INSERT INTO company_profiles_data (company_id,data_payload) VALUES (?,?)',['controls-active',JSON.stringify({engine_settings:{isHolidayPaused:true},knowledge_base:{documents:['private text not needed for control read']}})]);
  assert.deepEqual(await readAutomaticPublishingControls(pool,'controls-active'),{enabled:true,holiday:true});
  assert.deepEqual(await readAutomaticPublishingControls(pool,'controls-paused'),{enabled:false,holiday:false});
  assert.deepEqual(await readAutomaticPublishingControls(pool,'missing-controls'),{enabled:false,holiday:false});
  for(const flag of [true,'false',null,1]){
    await pool.query('UPDATE company_profiles_data SET data_payload = ? WHERE company_id = ?',[JSON.stringify({engine_settings:{isHolidayPaused:flag}}),'controls-active']);
    assert.equal((await readAutomaticPublishingControls(pool,'controls-active')).holiday,true);
  }
  await pool.query("UPDATE company_profiles_data SET data_payload = 'broken-json' WHERE company_id = 'controls-active'");
  assert.equal((await readAutomaticPublishingControls(pool,'controls-active')).holiday,true);
  for(const raw of ['null','[]',JSON.stringify({engine_settings:null}),JSON.stringify({engine_settings:[]})]){
    await pool.query('UPDATE company_profiles_data SET data_payload = ? WHERE company_id = ?',[raw,'controls-active']);
    assert.equal((await readAutomaticPublishingControls(pool,'controls-active')).holiday,true);
  }
  await pool.query('UPDATE company_profiles_data SET data_payload = ? WHERE company_id = ?',[JSON.stringify({engine_settings:{isHolidayPaused:false}}),'controls-active']);
  assert.deepEqual(await readAutomaticPublishingControls(pool,'controls-active'),{enabled:true,holiday:false});
  console.log('Automatic publishing control SQL: tenant autopilot isolation, holiday booleans, malformed/null/unknown fail closed and bounded metadata projection passed.');

  const pauseSqlJob=await enqueueSqlJob(pool,{id:'pause-sql-job',company_id:'pause-sql-company',job_type:'pause-fixture',payload:{},status:'QUEUED',attempts:0,max_attempts:1,scheduled_for:new Date().toISOString()});
  let priorPauseLease:any;
  for(let n=1;n<=6;n++){
    await pool.query('UPDATE job_queue SET scheduled_for = DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE id = ?',[pauseSqlJob.id]);
    const claimed=await claimSqlJob(pool,'same-pause-worker',['pause-fixture']);assert.ok(claimed);assert.equal(claimed.attempts,n);
    priorPauseLease={workerId:'same-pause-worker',attempt:claimed.attempts};
    if(n===1){const deferred=await Promise.all([deferSqlJob(pool,claimed.id,'CLIENT_AUTOPILOT_PAUSED',priorPauseLease),deferSqlJob(pool,claimed.id,'CLIENT_AUTOPILOT_PAUSED',priorPauseLease)]);assert.equal(deferred.filter(Boolean).length,1);}
    else await deferSqlJob(pool,claimed.id,'CLIENT_AUTOPILOT_PAUSED',priorPauseLease);
    const [rows]:any=await pool.query('SELECT attempts,deferrals,status FROM job_queue WHERE id = ?',[claimed.id]);
    assert.equal(rows[0].attempts,n);assert.equal(rows[0].deferrals,n);assert.equal(rows[0].status,'RETRY_WAIT');
  }
  await pool.query('UPDATE job_queue SET scheduled_for = NOW() WHERE id = ?',[pauseSqlJob.id]);
  const resumedPause=await claimSqlJob(pool,'same-pause-worker',['pause-fixture']);assert.ok(resumedPause);assert.equal(resumedPause.attempts,7);
  assert.equal(await deferSqlJob(pool,pauseSqlJob.id,'CLIENT_HOLIDAY_PAUSED',priorPauseLease),null);
  assert.equal(await completeSqlJob(pool,pauseSqlJob.id,{},priorPauseLease),null);
  assert.ok(await completeSqlJob(pool,pauseSqlJob.id,{resumed:true},{workerId:'same-pause-worker',attempt:7}));
  const [pauseEvents]:any=await pool.query("SELECT reason_code FROM job_action_events WHERE job_id = ? AND event_type = 'JOB_DEFERRED'",[pauseSqlJob.id]);
  assert.equal(pauseEvents.length,6);assert.ok(pauseEvents.every((row:any)=>row.reason_code==='CLIENT_AUTOPILOT_PAUSED'));
  const pauseBudget=await enqueueSqlJob(pool,{id:'pause-budget-sql',company_id:'pause-sql-company',job_type:'pause-budget-fixture',payload:{},status:'QUEUED',attempts:0,max_attempts:2,scheduled_for:new Date().toISOString()});
  let budgetClaim=await claimSqlJob(pool,'budget-sql-worker',['pause-budget-fixture']);assert.ok(budgetClaim);
  const deferralFaultPool={getConnection:async()=>{
    const connection=await pool!.getConnection();return new Proxy(connection,{get(target,property){
      if(property==='query')return async(sql:string,values:any[])=>{if(sql.startsWith('INSERT INTO job_action_events'))throw new Error('DEFERRAL_LEDGER_ROLLBACK');return target.query(sql,values);};
      const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
    }});
  }} as unknown as mysql.Pool;
  await assert.rejects(deferSqlJob(deferralFaultPool,pauseBudget.id,'GLOBAL_EMERGENCY_STOP',{workerId:'budget-sql-worker',attempt:1}),/DEFERRAL_LEDGER_ROLLBACK/);
  const [rollbackPause]:any=await pool.query('SELECT status,deferrals FROM job_queue WHERE id = ?',[pauseBudget.id]);assert.equal(rollbackPause[0].status,'RUNNING');assert.equal(rollbackPause[0].deferrals,0);
  await deferSqlJob(pool,pauseBudget.id,'GLOBAL_EMERGENCY_STOP',{workerId:'budget-sql-worker',attempt:1});
  for(let n=0;n<2;n++){
    await pool.query('UPDATE job_queue SET scheduled_for = NOW() WHERE id = ?',[pauseBudget.id]);budgetClaim=await claimSqlJob(pool,'budget-sql-worker',['pause-budget-fixture']);assert.ok(budgetClaim);
    await failSqlJob(pool,pauseBudget.id,'actual execution failure',true,{workerId:'budget-sql-worker',attempt:budgetClaim.attempts});
  }
  const [spentBudget]:any=await pool.query('SELECT status,attempts,deferrals FROM job_queue WHERE id = ?',[pauseBudget.id]);
  assert.equal(spentBudget[0].status,'FAILED');assert.equal(spentBudget[0].attempts,3);assert.equal(spentBudget[0].deferrals,1);
  console.log('Queue pause SQL: six pauses retain budget, concurrent defer single winner, monotonic stale-worker fencing, resume, bounded real failure budget and ledger/outbox rollback passed.');

  await pool.query("INSERT INTO reviews (id,company_id,author,rating,content) VALUES ('crud-review','crud-client','Fixture',5,'fixture')");
  assert.equal(await saveReviewReplySql(pool,'crud-review','Reply','2026-11-05','LOCAL_ONLY','other-client'),false);
  assert.equal(await deleteReviewSql(pool,'crud-review','other-client'),false);
  assert.equal(await saveReviewReplySql(pool,'crud-review','Reply','2026-11-05','LOCAL_ONLY','crud-client'),true);
  assert.equal(await deleteReviewSql(pool,'crud-review','crud-client'),true);
  assert.equal(await deleteReviewSql(pool,'crud-review','crud-client'),false);
  assert.equal(await saveReviewReplySql(pool,'crud-review','Reply','2026-11-05','LOCAL_ONLY','crud-client'),false);
  console.log('Review mutation SQL: foreign scope/missing rows rejected; actual saved/deleted rows acknowledged; repeated delete false.');

  await pool.query("INSERT INTO content_posts (id,company_id,caption,status) VALUES ('delete-draft','delete-client','fixture','draft'),('delete-published','delete-client','fixture','published'),('delete-unknown','delete-client','fixture','unknown')");
  assert.equal(await deleteContentPostSql(pool,'delete-draft','other-client'),false);
  assert.equal(await deleteContentPostSql(pool,'delete-published','delete-client'),false);assert.equal(await deleteContentPostSql(pool,'delete-unknown','delete-client'),false);
  await pool.query("INSERT INTO content_posts (id,company_id,caption,status) VALUES ('delete-claimed','delete-client','fixture','failed')");
  await pool.query("INSERT INTO publishing_dispatch_claims (post_id,company_id,status) VALUES ('delete-claimed','delete-client','FAILED')");
  assert.equal(await deleteContentPostSql(pool,'delete-claimed','delete-client'),false);
  assert.equal(await deleteContentPostSql(pool,'delete-draft','delete-client'),true);assert.equal(await deleteContentPostSql(pool,'delete-draft','delete-client'),false);
  console.log('Content deletion SQL: foreign/missing/published/unknown records retained; plain draft deleted once.');
  await pool.query("INSERT INTO leads (id,company_id,name,phone,service,stage) VALUES ('stage-fixture','stage-client','Fixture','9999999999','Fixture service','new')");
  assert.equal(await updateLeadStageSql(pool,'stage-fixture','won','other-client','new'),false);
  const stageRace=await Promise.all(Array.from({length:8},()=>updateLeadStageSql(pool,'stage-fixture','qualified','stage-client','new')));assert.equal(stageRace.filter(Boolean).length,1);
  assert.equal(await updateLeadStageSql(pool,'stage-fixture','won','stage-client','new'),false);
  assert.equal(await updateLeadStageSql(pool,'stage-missing','won','stage-client'),false);
  assert.equal(await updateLeadStageSql(pool,'stage-fixture','opportunity','stage-client','qualified'),true);
  console.log('Lead stage SQL:8-way expected-stage race single winner; foreign/missing/stale rows rejected, opportunity saved.');
  await pool.query("INSERT INTO companies (id,user_id,name,category,city) VALUES ('message-client','fixture','Messages','Service','Pune'),('message-other','fixture','Other','Service','Pune')");
  const inboundLead={name:'Fixture',company:'Inquiry',phone:'+919999999999',service:'Fixture',budget:'Pending',stage:'new',intent_score:12,source:'WhatsApp Cloud Inbound',notes:'Fixture',ai_suggested_reply:'Fixture'};
  const inboundRace=await Promise.all(Array.from({length:8},()=>recordWhatsAppInboundLead(pool!,'message-client','incoming-fixture',inboundLead)));assert.equal(inboundRace.filter(Boolean).length,1);
  assert.equal(await recordWhatsAppInboundLead(pool,'message-other','incoming-fixture',inboundLead),true);
  await pool.query("INSERT INTO processed_webhook_events(id,event_type,company_id) VALUES ('legacy-inbound','whatsapp_inbound_message','message-client')");
  assert.equal(await recordWhatsAppInboundLead(pool,'message-client','legacy-inbound',inboundLead),false);
  assert.equal(await recordWhatsAppInboundLead(pool,'message-other','legacy-inbound',inboundLead),true);
  const inboundFault={getConnection:async()=>{const connection=await pool!.getConnection();return new Proxy(connection,{get(target,property){if(property==='query')return async(sql:string,values:any[])=>{if(sql.startsWith('INSERT INTO sales_inbox_messages'))throw new Error('INBOUND_ROLLBACK');return target.query(sql,values);};const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;}});}} as unknown as mysql.Pool;
  await assert.rejects(recordWhatsAppInboundLead(inboundFault,'message-client','rollback-inbound',inboundLead),/INBOUND_ROLLBACK/);
  const [noInboundMarker]:any=await pool.query("SELECT id FROM processed_webhook_events WHERE id=SHA2('whatsapp-inbound:message-client:rollback-inbound',256)");assert.equal(noInboundMarker.length,0);
  const receipt={phoneNumberId:'123',providerId:'wamid.receipt',status:'read' as const,occurredAtMs:Date.now()};
  // Provider receipt can precede local acceptance settlement.
  await Promise.all(Array.from({length:8},()=>recordMessageReceipt(pool!,'message-client',receipt)));
  const receiptKey='7'.repeat(64);
  await dispatchMessageIntent(pool,'message-client',receiptKey,{sender:'123'},async()=>({success:true,messageId:'wamid.receipt'}));
  assert.equal((await readMessageDispatchStatus(pool,'message-client',receiptKey))?.delivery,'READ');
  await recordMessageReceipt(pool,'message-client',{...receipt,status:'sent',occurredAtMs:receipt.occurredAtMs-1000});
  await recordMessageReceipt(pool,'message-client',{...receipt,status:'failed',errorCode:131026});
  const receiptState=await readMessageDispatchStatus(pool,'message-client',receiptKey);assert.equal(receiptState?.delivery,'READ');assert.equal(receiptState?.receiptCount,3);assert.equal(receiptState?.conflicting,true);
  await dispatchMessageIntent(pool,'message-other',receiptKey,{sender:'123'},async()=>({success:true,messageId:'wamid.receipt'}));
  assert.equal((await readMessageDispatchStatus(pool,'message-other',receiptKey))?.delivery,'UNOBSERVED');
  await dispatchMessageIntent(pool,'message-client','6'.repeat(64),{sender:'456'},async()=>({success:true,messageId:'wamid.receipt'}));
  assert.equal((await readMessageDispatchStatus(pool,'message-client','6'.repeat(64)))?.delivery,'UNOBSERVED');
  await dispatchMessageIntent(pool,'message-client','5'.repeat(64),{},async()=>({success:true,messageId:'wamid.receipt'}));
  assert.equal((await readMessageDispatchStatus(pool,'message-client','5'.repeat(64)))?.delivery,'UNOBSERVED');
  console.log('WhatsApp receipt SQL:8-way dedupe, early receipt correlation, read never downgraded, conflict flagged, tenant/sender/legacy isolation. Inbound8-way atomic lead/marker, rollback and legacy ownership passed.');
  let autonomousSends=0;const autonomousSend=async(phone:string,text:string)=>{assert.equal(phone,'919999999999');assert.equal(text,'Fixture');autonomousSends++;return {success:true,messageId:'autonomous-fixture'};};
  await dispatchAutonomousMessage(pool,'message-client','fixture-action','123','9999999999','Fixture',autonomousSend,'fixture-actor');
  assert.equal((await dispatchAutonomousMessage(pool,'message-client','fixture-action','123','+919999999999','Fixture',autonomousSend,'other-actor')).status,'PAUSED');assert.equal(autonomousSends,0);
  await assert.rejects(dispatchAutonomousMessage(pool,'message-client','fixture-action','123','9999999999','Changed',autonomousSend,'fixture-actor'),/different message/);
  assert.equal((await readMessageDispatchStatus(pool,'message-client',autonomousMessageKey('fixture-action')))?.status,'PAUSED');
  await dispatchAutonomousMessage(pool,'message-client','uncertain-action','123','9999999999','Fixture',async()=>({success:false,status:'UNKNOWN'}),'fixture-actor');
  assert.equal((await dispatchAutonomousMessage(pool,'message-client','uncertain-action','123','9999999999','Fixture',autonomousSend,'fixture-actor')).status,'PAUSED');assert.equal(autonomousSends,0);
  console.log('Autonomous WhatsApp SQL: stable action key, normalized input replay, changed payload conflict and review-only policy pause without provider calls. General UNKNOWN no-resend remains covered by message-intent tests.');
  assert.deepEqual(await readCompanyProfile(pool,'message-client'),{data:null,version:'0'});
  const profileRace=await Promise.allSettled(Array.from({length:8},(_,i)=>writeCompanyProfile(pool!,'message-client',{value:i},'0')));assert.equal(profileRace.filter(r=>r.status==='fulfilled').length,1);assert.equal(profileRace.filter(r=>r.status==='rejected'&&r.reason instanceof WorkspaceConflict).length,7);
  const profile=await readCompanyProfile(pool,'message-client');assert.equal(profile.version,'1');
  await assert.rejects(writeCompanyProfile(pool,'message-client',{value:'stale'},'0'),WorkspaceConflict);assert.equal((await readCompanyProfile(pool,'message-client')).data.value,profile.data.value);
  assert.equal(await writeCompanyProfile(pool,'message-client',{value:'next'},'1'),'2');
  assert.deepEqual(await readCompanyProfile(pool,'message-other'),{data:null,version:'0'});
  await pool.query("UPDATE company_profiles_data SET revision='18446744073709551614' WHERE company_id='message-client'");assert.equal(await writeCompanyProfile(pool,'message-client',{value:'max'},'18446744073709551614'),'18446744073709551615');await assert.rejects(writeCompanyProfile(pool,'message-client',{},'18446744073709551615'),/exhausted/);assert.equal((await readCompanyProfile(pool,'message-client')).version,'18446744073709551615');
  const profileFault={getConnection:async()=>{const connection=await pool!.getConnection();return new Proxy(connection,{get(target,property){if(property==='query')return async(sql:string,values:any[])=>{if(sql.startsWith('INSERT INTO company_profiles_data'))throw new Error('PROFILE_ROLLBACK');return target.query(sql,values);};const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;}});}} as unknown as mysql.Pool;
  await assert.rejects(writeCompanyProfile(profileFault,'message-other',{},'0'),/PROFILE_ROLLBACK/);assert.equal((await readCompanyProfile(pool,'message-other')).version,'0');
  console.log('Profile CAS SQL:8-way initial race one winner; stale write retained, valid increment, tenant isolation, rollback and exact uint64 maximum/exhaustion passed.');
  let messageSends=0;let releaseMessage:()=>void=()=>{};let signalMessage:()=>void=()=>{};const messageStarted=new Promise<void>(resolve=>{signalMessage=resolve;});const messageHeld=new Promise<void>(resolve=>{releaseMessage=resolve;});
  const sendMessage=async()=>{messageSends++;signalMessage();await messageHeld;return {success:true,status:'API_ACCEPTED',messageId:'wamid.fixture'};};
  const messageOwner=dispatchMessageIntent(pool,'message-client','a'.repeat(64),{text:'private-message'},sendMessage);await messageStarted;
  const messageContenders=await Promise.all(Array.from({length:7},()=>dispatchMessageIntent(pool!,'message-client','a'.repeat(64),{text:'private-message'},sendMessage)));assert.ok(messageContenders.every(result=>result.status==='UNKNOWN'));assert.equal(messageSends,1);releaseMessage();assert.equal((await messageOwner).messageId,'wamid.fixture');
  assert.equal((await dispatchMessageIntent(pool,'message-client','a'.repeat(64),{text:'private-message'},sendMessage)).reused,true);assert.equal(messageSends,1);
  await assert.rejects(dispatchMessageIntent(pool,'message-client','a'.repeat(64),{text:'changed'},sendMessage),/different message/);
  assert.equal(await readMessageDispatchStatus(pool,'message-other','a'.repeat(64)),null);assert.ok(!JSON.stringify(await readMessageDispatchStatus(pool,'message-client','a'.repeat(64))).includes('private-message'));
  await dispatchMessageIntent(pool,'message-client','b'.repeat(64),{},async()=>({success:false,status:'UNKNOWN'}));assert.equal((await dispatchMessageIntent(pool,'message-client','b'.repeat(64),{},sendMessage)).status,'UNKNOWN');assert.equal(messageSends,1);
  await dispatchMessageIntent(pool,'message-client','c'.repeat(64),{},async()=>({success:false,status:'PAUSED'}));assert.equal((await dispatchMessageIntent(pool,'message-client','c'.repeat(64),{},async()=>({success:true,messageId:'resumed'}))).success,true);
  const failedSettlement={getConnection:()=>pool!.getConnection(),query:async()=>{throw new Error('SETTLEMENT_FAULT');}} as unknown as mysql.Pool;
  assert.equal((await dispatchMessageIntent(failedSettlement,'message-client','d'.repeat(64),{},async()=>({success:true,messageId:'provider-accepted'}))).status,'UNKNOWN');
  assert.equal((await dispatchMessageIntent(pool,'message-client','d'.repeat(64),{},sendMessage)).status,'UNKNOWN');assert.equal(messageSends,1);
  const rollbackMessagePool={getConnection:async()=>{const connection=await pool!.getConnection();return new Proxy(connection,{get(target,property){if(property==='query')return async(sql:string,values:any[])=>{if(sql.startsWith('SELECT input_hash,status'))throw new Error('CLAIM_ROLLBACK');return target.query(sql,values);};const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;}});}} as unknown as mysql.Pool;
  await assert.rejects(dispatchMessageIntent(rollbackMessagePool,'message-client','e'.repeat(64),{},sendMessage),/CLAIM_ROLLBACK/);assert.equal(await readMessageDispatchStatus(pool,'message-client','e'.repeat(64)),null);assert.equal(messageSends,1);
  let orderedSends=0;await dispatchMessageIntent(pool,'message-client','f'.repeat(64),{z:1,a:2},async()=>{orderedSends++;return {success:true,messageId:'ordered'};});
  assert.equal((await dispatchMessageIntent(pool,'message-client','f'.repeat(64),{a:2,z:1},async()=>{orderedSends++;return {success:true,messageId:'duplicate'};})).reused,true);assert.equal(orderedSends,1);
  console.log('Message intent SQL:8 contenders one network owner, cached acceptance, conflict, tenant/privacy, UNKNOWN/crash fencing, safe paused retry and settlement-failure no replay passed.');

  const dayBounds=platformDayBounds('2026-11-03');
  const dayJobs=[] as DbJobQueue[];
  for(const [id,company] of [['report-a','report-company'],['report-b','report-company'],['report-running','report-company'],['report-failed','report-company'],['report-foreign','report-other']]){
    dayJobs.push(await enqueueSqlJob(pool,{id,company_id:company,job_type:'ai_summary',payload:{private:'report-secret-never-returned'},status:'QUEUED',attempts:0,max_attempts:3,scheduled_for:new Date().toISOString()}));
  }
  for(const [id,jobId,company,type,status,time] of [
    ['report-event-fail1','report-a','report-company','JOB_FAILED','RETRY_WAIT',dayBounds.start],
    ['report-event-fail2','report-a','report-company','JOB_FAILED','RETRY_WAIT',dayBounds.start+1000],
    ['report-event-pause1','report-a','report-company','JOB_DEFERRED','RETRY_WAIT',dayBounds.start+2000],
    ['report-event-pause2','report-a','report-company','JOB_DEFERRED','RETRY_WAIT',dayBounds.start+3000],
    ['report-event-success','report-a','report-company','JOB_SUCCEEDED','SUCCEEDED',dayBounds.end-1000],
    ['report-event-next-day','report-b','report-company','JOB_SUCCEEDED','SUCCEEDED',dayBounds.end],
    ['report-event-before-day','report-b','report-company','JOB_FAILED','FAILED',dayBounds.start-1000],
    ['report-event-foreign','report-foreign','report-other','JOB_SUCCEEDED','SUCCEEDED',dayBounds.start+1000],
  ])await pool.query('INSERT INTO job_action_events (id,job_id,company_id,event_type,job_status,attempt,recorded_at) VALUES (?,?,?,?,?,1,FROM_UNIXTIME(?))',[id,jobId,company,type,status,Number(time)/1000]);
  await pool.query("UPDATE job_queue SET status = 'SUCCEEDED' WHERE id = 'report-a'");
  await pool.query("UPDATE job_queue SET status = 'RUNNING',attempts = 1,locked_at = NOW(),locked_by = 'report-worker' WHERE id = 'report-running'");
  await pool.query("UPDATE job_queue SET status = 'FAILED' WHERE id = 'report-failed'");
  const reportPost=await preparePublicationDraft(pool,'report-company','report-actor',{requestKey:'e'.repeat(64),content:'private-report-caption',platforms:['facebook']});
  let reportVersion=reportPost.sourceVersion;
  for(const status of ['pending_approval','scheduled','pending_approval','scheduled'] as const){const changed=await transitionPublication(pool,reportPost.post.id,'report-actor',{companyId:'report-company',expectedVersion:reportVersion,status});reportVersion=changed.sourceVersion;}
  for(const time of ['14:30','15:30']){const changed=await transitionPublication(pool,reportPost.post.id,'report-actor',{companyId:'report-company',expectedVersion:reportVersion,status:'pending_approval',schedule:{date:'2026-11-04',time}});reportVersion=changed.sourceVersion;}
  await pool.query("UPDATE publication_workflow_audit SET recorded_at = FROM_UNIXTIME(?) WHERE company_id = 'report-company'",[(dayBounds.start+3600000)/1000]);
  const reportUnknown=await preparePublicationDraft(pool,'report-company','report-actor',{requestKey:'f'.repeat(64),content:'Uncertain private fixture',platforms:['facebook']});
  await pool.query("UPDATE content_posts SET status = 'unknown' WHERE id = ?",[reportUnknown.post.id]);
  await pool.query("INSERT INTO publishing_dispatch_claims (post_id,company_id,status) VALUES (?,'report-company','UNKNOWN')",[reportUnknown.post.id]);
  const reportStale=await preparePublicationDraft(pool,'report-company','report-actor',{requestKey:'a'.repeat(64),content:'Stale private fixture',platforms:['facebook']});
  await pool.query("UPDATE content_posts SET status = 'publishing' WHERE id = ?",[reportStale.post.id]);
  await pool.query("INSERT INTO publishing_dispatch_claims (post_id,company_id,status,started_at) VALUES (?,'report-company','IN_PROGRESS',DATE_SUB(NOW(),INTERVAL 6 MINUTE))",[reportStale.post.id]);
  await pool.query("INSERT INTO publication_admission_reservations (company_id,quota_day,post_id,claim_token) VALUES ('report-company','2026-11-03',?,'private-report-token'),('report-company','2026-11-04',?,'private-next-token')",[reportUnknown.post.id,reportUnknown.post.id]);
  await pool.query("INSERT INTO companies (id,user_id,name,category,city) VALUES ('report-company','fixture','Report fixture','fixture','fixture') ON DUPLICATE KEY UPDATE name = name");
  await pool.query("INSERT INTO publication_execution_controls (company_id,paused_channels) VALUES ('report-company','[]')");
  for(const [id,revision,time] of [['report-control-start',1,dayBounds.start],['report-control-last',2,dayBounds.end-1000],['report-control-next',3,dayBounds.end]])await pool.query("INSERT INTO publication_control_audit (id,company_id,revision,actor_id,before_state,after_state,recorded_at) VALUES (?,'report-company',?,'private-report-actor','{}','{}',FROM_UNIXTIME(?))",[id,revision,Number(time)/1000]);
  await pool.query("INSERT INTO message_dispatch_intents (company_id,request_key,input_hash,actor_id,status,claim_token,provider_id,created_at,updated_at) VALUES ('report-company',?,?,?,'API_ACCEPTED','fixture','report-accepted',FROM_UNIXTIME(?),FROM_UNIXTIME(?)),('report-company',?,?,?,'UNKNOWN','fixture',NULL,FROM_UNIXTIME(?),FROM_UNIXTIME(?))",['9'.repeat(64),'0'.repeat(64),'report-actor',dayBounds.start/1000,(dayBounds.end-1000)/1000,'8'.repeat(64),'0'.repeat(64),'report-actor',dayBounds.end/1000,dayBounds.end/1000]);
  await pool.query("INSERT INTO companies(id,user_id,name,category,city) VALUES ('report-other','fixture','Other','fixture','fixture') ON DUPLICATE KEY UPDATE name=name");
  for(const [id,company,created,updated,state] of [
   ['before','report-company',dayBounds.start-1000,dayBounds.start+1000,'API_ACCEPTED'],
   ['start','report-company',dayBounds.start,dayBounds.start,'NOT_ATTEMPTED'],
   ['last','report-company',dayBounds.end-1000,dayBounds.end-1000,'API_ACCEPTED'],
   ['next','report-company',dayBounds.end,dayBounds.end,'STARTED'],
   ['old','report-company',dayBounds.start-10000,dayBounds.start-10000,'UNCONFIRMED'],
   ['foreign','report-other',dayBounds.start,dayBounds.start,'API_ACCEPTED']
  ])await pool.query('INSERT INTO public_lead_intakes(company_id,request_key,input_hash,lead_id,notification_state,created_at,updated_at) VALUES (?,?,?,?,?,FROM_UNIXTIME(?),FROM_UNIXTIME(?))',[company,crypto.createHash('sha256').update(String(id)).digest('hex'),'0'.repeat(64),'report-inquiry-'+id,state,Number(created)/1000,Number(updated)/1000]);
  const knowledgeReportEvents=[['KNOWLEDGE_STORED','STORED',dayBounds.start],['KNOWLEDGE_EXTRACTION_SETTLED','EXTRACTED',dayBounds.start+1],['KNOWLEDGE_EXTRACTION_SETTLED','NEEDS_OCR',dayBounds.start+2],['KNOWLEDGE_APPROVED','EXTRACTED',dayBounds.start+3],['KNOWLEDGE_APPROVAL_WITHDRAWN','EXTRACTED',dayBounds.start+4],['KNOWLEDGE_DELETED','DELETED',dayBounds.end-1],['KNOWLEDGE_STORED','STORED',dayBounds.start-1],['KNOWLEDGE_DELETED','DELETED',dayBounds.end]] as const;
  for(const [index,[event,state,at]]of knowledgeReportEvents.entries())await pool.query('INSERT INTO autonomous_audit_logs(id,company_id,action_id,actor,event_type,details,timestamp) VALUES (?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))',['report-source-event-'+index,'report-company','report-source','fixture',event,JSON.stringify({sourceVersion:String(index),state}),at/1000]);
  await pool.query('INSERT INTO autonomous_audit_logs(id,company_id,action_id,actor,event_type,details,timestamp) VALUES (?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))',['foreign-source-event','foreign-report-company','report-source','fixture','KNOWLEDGE_STORED',JSON.stringify({sourceVersion:'0',state:'STORED'}),dayBounds.start/1000]);
  // Website imports use durable run/event type, not mutable source rows or scraped text.
  for(const [id,company,status] of [['report-web-success','report-company','SUCCEEDED'],['report-web-wait','report-company','QUEUED'],['report-web-running','report-company','RUNNING'],['report-web-failed','report-company','FAILED'],['report-web-cancel','report-company','CANCELLED'],['report-web-foreign','report-other','SUCCEEDED']]){
   await enqueueSqlJob(pool,{id,company_id:company,job_type:'website_import',payload:{websiteUrl:'https://private-report-site.example/'},status:'QUEUED',attempts:0,max_attempts:3,scheduled_for:new Date(Date.now()+86400000).toISOString()});
   await pool.query('UPDATE job_queue SET status=? WHERE id=?',[status,id]);
  }
  const websiteReportEvents=[
   ['report-web-success','report-company','JOB_QUEUED','QUEUED',dayBounds.start],
   ['report-web-success','report-company','JOB_QUEUED','QUEUED',dayBounds.start+1000],
   ['report-web-success','report-company','JOB_FAILED','RETRY_WAIT',dayBounds.start+2000],
   ['report-web-success','report-company','JOB_FAILED','RETRY_WAIT',dayBounds.start+3000],
   ['report-web-success','report-company','JOB_DEFERRED','RETRY_WAIT',dayBounds.start+4000],
   ['report-web-success','report-company','JOB_DEFERRED','RETRY_WAIT',dayBounds.start+5000],
   ['report-web-success','report-company','JOB_SUCCEEDED','SUCCEEDED',dayBounds.end-1000],
   ['report-web-failed','report-company','JOB_ATTEMPTS_EXHAUSTED','FAILED',dayBounds.start+1000],
   ['report-web-failed','report-company','JOB_SUCCEEDED','SUCCEEDED',dayBounds.end],
   ['report-web-cancel','report-company','JOB_CANCELLED','CANCELLED',dayBounds.start],
   ['report-web-cancel','report-company','JOB_CANCELLED','CANCELLED',dayBounds.start+1000],
   ['report-web-wait','report-company','JOB_QUEUED','QUEUED',dayBounds.end],
   ['report-web-running','report-company','JOB_QUEUED','QUEUED',dayBounds.start-1000],
   ['report-web-foreign','report-other','JOB_SUCCEEDED','SUCCEEDED',dayBounds.start],
  ] as const;
  for(const [index,[jobId,company,event,status,at]]of websiteReportEvents.entries())await pool.query('INSERT INTO job_action_events(id,job_id,company_id,event_type,job_status,attempt,recorded_at) VALUES (?,?,?,?,?,1,FROM_UNIXTIME(?))',['report-web-event-'+index,jobId,company,event,status,at/1000]);
  const dayReport=await readDailyWorkReport(pool,'report-company','2026-11-03');
  assert.deepEqual(dayReport.activity,{completedJobs:2,failedJobs:3,pausedJobs:2,approvedPosts:1,rescheduledPosts:1,admittedPosts:1,controlChanges:2,messageRequests:1,apiAcceptedMessages:1,websiteInquiries:2,inquiryAlertsAccepted:2,knowledgeStored:1,knowledgeExtractionsSettled:2,knowledgeExtractionsBlocked:1,knowledgeApprovals:1,knowledgeWithdrawals:1,knowledgeDeleted:1,websiteImportsQueued:1,websiteImportsCommitted:1,websiteImportsWithFailures:2,websiteImportsPaused:1,websiteImportsCancelled:1});
  assert.deepEqual(dayReport.backlog,{waitingJobs:2,runningJobs:2,failedJobs:2,pendingApprovals:1,uncertainPublications:2,unconfirmedMessages:1,inquiryAlertsNotAttempted:1,inquiryAlertsUnconfirmed:2,knowledgeAwaitingApproval:0,knowledgeExtractionRunning:0,knowledgeExtractionBlocked:0,websiteImportsWaiting:1,websiteImportsRunning:1,websiteImportsFailed:1});
  assert.ok(!JSON.stringify(dayReport).includes('private'));assert.ok(!JSON.stringify(dayReport).includes('https://'));assert.equal(dayReport.activity.websiteImportsCommitted,1,'source rows are not required to preserve committed import history');
  const emptyDayReport=await readDailyWorkReport(pool,'empty-report-company','2026-11-03');assert.ok(Object.values(emptyDayReport.activity).every(count=>count===0));
  const timezoneDayPool=mysql.createPool({host:'127.0.0.1',port,user:'root',password:'',database,connectionLimit:1});
  try{await timezoneDayPool.query("SET time_zone = '+09:00'");const alternate=await readDailyWorkReport(timezoneDayPool,'report-company','2026-11-03');assert.deepEqual(alternate.activity,dayReport.activity);assert.deepEqual(alternate.backlog,dayReport.backlog);}finally{await timezoneDayPool.end();}
  console.log('Daily work SQL: exact IST half-open boundaries, distinct-job/post counts, current backlog, tenant isolation, empty data, metadata privacy and session timezone independence passed.');

  const initialControls=await readScopedPublicationControls(pool,'controls-active');assert.equal(initialControls.version,'0');assert.equal(initialControls.paused,false);
  const stopContenders=await Promise.allSettled(Array.from({length:8},()=>updateScopedPublicationControls(pool!,'controls-active','control-actor',{expectedVersion:'0',paused:true,channels:[]})));
  assert.equal(stopContenders.filter(row=>row.status==='fulfilled').length,1);
  const stoppedControls=await readScopedPublicationControls(pool,'controls-active');assert.equal(stoppedControls.version,'1');assert.equal(stoppedControls.updatedBy,'control-actor');
  assert.equal(await checkScopedPublicationControls(pool,'controls-active',['facebook']),'PUBLICATION_PAUSED');
  assert.equal(await checkScopedPublicationControls(pool,'controls-paused',['facebook']),null);
  const channelControls=await updateScopedPublicationControls(pool,'controls-active','control-actor',{expectedVersion:'1',paused:false,channels:['facebook']});assert.equal(channelControls.version,'2');
  assert.equal(await checkScopedPublicationControls(pool,'controls-active',['facebook','instagram']),'PUBLICATION_CHANNEL_PAUSED');
  assert.equal(await checkScopedPublicationControls(pool,'controls-active',['instagram']),null);
  assert.equal(await readPublicationExecutionBlock(pool,'controls-active','manual',['facebook']),'PUBLICATION_CHANNEL_PAUSED');
  assert.equal(await readPublicationExecutionBlock(pool,'controls-paused','manual',['facebook']),null);
  assert.equal(await readPublicationExecutionBlock(pool,'controls-paused','automatic',['facebook']),'CLIENT_AUTOPILOT_PAUSED');
  await assert.rejects(updateScopedPublicationControls(pool,'controls-active','control-actor',{expectedVersion:'1',paused:false,channels:[]}),error=>(error as any).status===409);
  const controlFaultPool={getConnection:async()=>{
    const connection=await pool!.getConnection();return new Proxy(connection,{get(target,property){
      if(property==='query')return async(sql:string,values:any[])=>{if(sql.startsWith('INSERT INTO publication_control_audit'))throw new Error('CONTROL_AUDIT_ROLLBACK');return target.query(sql,values);};
      const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
    }});
  }} as unknown as mysql.Pool;
  await assert.rejects(updateScopedPublicationControls(controlFaultPool,'controls-active','control-actor',{expectedVersion:'2',paused:true,channels:[]}),/CONTROL_AUDIT_ROLLBACK/);
  assert.deepEqual(await readScopedPublicationControls(pool,'controls-active'),channelControls);
  const [controlAudit]:any=await pool.query("SELECT actor_id,revision FROM publication_control_audit WHERE company_id = 'controls-active' ORDER BY revision");
  assert.equal(controlAudit.length,2);assert.ok(controlAudit.every((row:any)=>row.actor_id==='control-actor'));
  await pool.query("UPDATE publication_execution_controls SET paused_channels = 'malformed' WHERE company_id = 'controls-active'");
  await assert.rejects(checkScopedPublicationControls(pool,'controls-active',['instagram']),error=>(error as any).status===503);
  await pool.query("UPDATE publication_execution_controls SET paused_channels = '[\"facebook\"]' WHERE company_id = 'controls-active'");
  assert.equal((await readScopedPublicationControls(pool,'controls-paused')).version,'0');
  await assert.rejects(readScopedPublicationControls(pool,'missing-scope'),error=>(error as any).status===404);
  console.log('Scoped publication controls SQL:8-way CAS one writer, independent clients, workspace/channel gates, stale resume rejection, actor audit rollback and corrupt state fail closed passed.');

  await pool.query("INSERT INTO companies (id,user_id,name,category,city,autopilot_enabled) VALUES ('quota-company','fixture','Quota','fixture','fixture',1)");
  await pool.query('INSERT INTO company_profiles_data (company_id,data_payload) VALUES (?,?)',['quota-company',JSON.stringify({engine_settings:{approvalSettings:{googlePosts:'auto',socialPosts:'auto',promotionalOffers:'auto'}}})]);
  let quotaControls=await updateScopedPublicationControls(pool,'quota-company','quota-admin',{expectedVersion:'0',paused:false,channels:[],dailyPostLimit:2});
  const quotaPosts=[] as any[];
  for(let n=0;n<8;n++)quotaPosts.push((await preparePublicationDraft(pool,'quota-company','quota-author',{requestKey:n.toString(16).padStart(64,'0'),content:`quota candidate ${n}`,platforms:['facebook']})).post);
  const quotaClaims=quotaPosts.map((post,n)=>({postId:post.id,companyId:'quota-company',token:`quota-token-${n}`}));
  const quotaRace=await Promise.all(quotaClaims.map(claim=>claimSqlPublishing(pool!,claim)));
  assert.equal(quotaRace.filter(row=>row.acquired).length,2);assert.equal(quotaRace.filter(row=>row.status==='QUOTA_EXHAUSTED').length,6);
  const winners=quotaClaims.filter((_,n)=>quotaRace[n].acquired),losers=quotaClaims.filter((_,n)=>!quotaRace[n].acquired);
  for(const winner of winners)await settleSqlPublishing(pool,winner,'FAILED');
  assert.equal((await readScopedPublicationControls(pool,'quota-company')).quota?.reservedPosts,2);
  const reuse={...winners[0],token:'quota-reused-reservation'};assert.equal((await claimSqlPublishing(pool,reuse)).acquired,true);await settleSqlPublishing(pool,reuse,'FAILED');
  assert.equal((await readScopedPublicationControls(pool,'quota-company')).quota?.reservedPosts,2);
  quotaControls=await updateScopedPublicationControls(pool,'quota-company','quota-admin',{expectedVersion:quotaControls.version,paused:false,channels:[],dailyPostLimit:1});
  assert.equal((await claimSqlPublishing(pool,losers[0])).status,'QUOTA_EXHAUSTED');
  quotaControls=await updateScopedPublicationControls(pool,'quota-company','quota-admin',{expectedVersion:quotaControls.version,paused:false,channels:[],dailyPostLimit:3});
  assert.equal((await claimSqlPublishing(pool,losers[0])).acquired,true);await settleSqlPublishing(pool,losers[0],'UNKNOWN');
  assert.equal((await claimSqlPublishing(pool,{...losers[0],token:'quota-unknown-replay'})).status,'UNKNOWN');
  quotaControls=await updateScopedPublicationControls(pool,'quota-company','quota-admin',{expectedVersion:quotaControls.version,paused:false,channels:[],dailyPostLimit:4});
  const reservationFaultPool={getConnection:async()=>{
    const connection=await pool!.getConnection();return new Proxy(connection,{get(target,property){
      if(property==='query')return async(sql:string,values:any[])=>{if(sql.startsWith("UPDATE publishing_dispatch_claims SET status = 'IN_PROGRESS'"))throw new Error('QUOTA_CLAIM_ROLLBACK');return target.query(sql,values);};
      const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
    }});
  }} as unknown as mysql.Pool;
  await assert.rejects(claimSqlPublishing(reservationFaultPool,losers[1]),/QUOTA_CLAIM_ROLLBACK/);
  assert.equal((await readScopedPublicationControls(pool,'quota-company')).quota?.reservedPosts,3);
  assert.equal((await claimSqlPublishing(pool,losers[1])).acquired,true);await settleSqlPublishing(pool,losers[1],'FAILED');
  assert.equal((await readScopedPublicationControls(pool,'quota-company')).quota?.reservedPosts,4);
  await pool.query("UPDATE publication_admission_reservations SET quota_day = DATE_SUB(quota_day,INTERVAL 1 DAY) WHERE company_id = 'quota-company'");
  assert.equal((await readScopedPublicationControls(pool,'quota-company')).quota?.reservedPosts,0);
  const rolloverClaim={...winners[0],token:'quota-next-day'};assert.equal((await claimSqlPublishing(pool,rolloverClaim)).acquired,true);await settleSqlPublishing(pool,rolloverClaim,'FAILED');
  assert.equal((await readScopedPublicationControls(pool,'quota-company')).quota?.reservedPosts,1);
  const quotaZonePool=mysql.createPool({host:'127.0.0.1',port,user:'root',password:'',database,connectionLimit:1});
  try{await quotaZonePool.query("SET time_zone = '+09:00'");assert.deepEqual((await readScopedPublicationControls(quotaZonePool,'quota-company')).quota,(await readScopedPublicationControls(pool,'quota-company')).quota);}finally{await quotaZonePool.end();}
  for(let n=0;n<21;n++)quotaControls=await updateScopedPublicationControls(pool,'quota-company','quota-history-actor',{expectedVersion:quotaControls.version,paused:false,channels:[],dailyPostLimit:10+n});
  const quotaHistory=await readPublicationControlHistory(pool,'quota-company');assert.equal(quotaHistory.history.length,20);assert.ok(quotaHistory.nextBefore);
  const olderQuotaHistory=await readPublicationControlHistory(pool,'quota-company',quotaHistory.nextBefore!);assert.equal(olderQuotaHistory.history.length,5);assert.equal(olderQuotaHistory.nextBefore,null);
  assert.equal(new Set([...quotaHistory.history,...olderQuotaHistory.history].map((row:any)=>row.id)).size,25);
  assert.equal((await readPublicationControlHistory(pool,'controls-paused')).history.length,0);
  const legacyLimitPreserved=await updateScopedPublicationControls(pool,'quota-company','legacy-client',{expectedVersion:quotaControls.version,paused:false,channels:[]});assert.equal(legacyLimitPreserved.dailyPostLimit,30);
  await pool.query("INSERT INTO publication_execution_controls (company_id,paused_channels,revision,updated_by) VALUES ('controls-paused','[]',1,'legacy-control-actor')");
  await pool.query('INSERT INTO publication_control_audit (id,company_id,revision,actor_id,before_state,after_state) VALUES (?, ?,1,?,?,?)',['legacy-control-event','controls-paused','legacy-control-actor',JSON.stringify({paused:false,channels:[]}),JSON.stringify({paused:false,channels:['facebook']})]);
  const legacyControlHistory=await readPublicationControlHistory(pool,'controls-paused');assert.equal(legacyControlHistory.history.length,1);assert.equal(legacyControlHistory.history[0].after_state.dailyPostLimit,undefined);

  assert.ok(!JSON.stringify(await readScopedPublicationControls(pool,'quota-company')).includes('quota-token'));
  console.log('Publication quota SQL:8 contenders cap2, same-post reuse, lower/raise limit, UNKNOWN fence, reservation/claim rollback, IST rollover/session timezone and25-row control history pagination passed.');

  const duePost = { id: 'restart-safe-post', company_id: 'restart-client', status: 'scheduled' as const, scheduled_date: '2020-01-01T10:00:00Z', scheduled_time: null, time_slot: null };
  const dispatcher = {
    isStopped: () => false,
    getScheduledPosts: async () => [duePost],
    getCompanyById: async () => ({ autopilot_enabled: true }),
    enqueueJob: async (options: any) => enqueueSqlJob(pool!, { ...options, id: crypto.randomUUID(), status: 'QUEUED', attempts: 0, max_attempts: 3, scheduled_for: new Date().toISOString() }),
  };
  await Promise.all(Array.from({ length: 8 }, () => admitScheduledPosts(dispatcher)));
  // New dispatcher invocation models restart: SQL idempotency identity is retained.
  await admitScheduledPosts({ ...dispatcher });
  const [admittedDue]: any = await pool.query('SELECT id FROM job_queue WHERE company_id = ? AND idempotency_key = ?', [duePost.company_id, scheduledPostKey(duePost)]);
  assert.equal(admittedDue.length, 1);
  const [dueEvents]: any = await pool.query('SELECT id FROM job_action_events WHERE job_id = ?', [admittedDue[0].id]);
  assert.equal(dueEvents.length, 1);

  const [pendingBeforeBudget]: any = await pool.query("SELECT COUNT(*) AS count FROM job_action_outbox WHERE status = 'PENDING'");
  let outboxBudgetChecks = 0;
  const budgetedOutbox = await processActionOutbox(pool,'budgeted-sql-feed',25,() => outboxBudgetChecks++ === 0);
  assert.equal(budgetedOutbox.processed,1);
  const [pendingAfterBudget]: any = await pool.query("SELECT COUNT(*) AS count FROM job_action_outbox WHERE status = 'PENDING'");
  assert.equal(Number(pendingAfterBudget[0].count),Number(pendingBeforeBudget[0].count)-1);
  assert.equal((await processActionOutbox(pool,'expired-sql-feed',25,() => false)).processed,0);
  console.log('SQL work budget: current outbox transaction settles, next pending delivery remains unclaimed after deadline.');

  // Drain existing fixtures, then prove concurrent SQL-only receipts and replay safety.
  for (let i = 0; i < 12; i++) await processActionOutbox(pool, 'initial-feed-drain', 100);
  const feedCompany = 'feed-fixture-company';
  const fixture = (id: string) => ({ id, company_id: feedCompany, job_type: 'ai_summary', payload: { private: 'never-in-feed' }, status: 'QUEUED', attempts: 0, max_attempts: 3, scheduled_for: new Date().toISOString() } as DbJobQueue);
  for (let i = 0; i < 12; i++) await enqueueSqlJob(pool, fixture(`feed-${i}`));
  await Promise.all(Array.from({ length: 4 }, (_, i) => processActionOutbox(pool!, `feed-worker-${i}`, 25)));
  // Any lock conflict is retryable and must not duplicate a committed receipt.
  await pool.query("UPDATE job_action_outbox SET available_at = NOW() WHERE company_id = ? AND status = 'PENDING'", [feedCompany]);
  await processActionOutbox(pool, 'feed-retry', 100);
  const feed = await readActionFeed(pool, feedCompany, '0', 100);
  assert.equal(feed.events.length, 12);
  assert.equal(new Set(feed.events.map((e: any) => e.revision)).size, 12);
  assert.ok(!JSON.stringify(feed).includes('never-in-feed'));
  assert.equal((await readActionFeed(pool, 'absent-tenant')).events.length, 0);
  await pool.query("UPDATE job_action_outbox SET status = 'PENDING', attempts = 0, available_at = NOW() WHERE company_id = ?", [feedCompany]);
  await processActionOutbox(pool, 'feed-replay', 100);
  assert.equal((await readActionFeed(pool, feedCompany, '0', 100)).latestRevision, feed.latestRevision);

  // Processing an older source event later must remain visible after the prior feed cursor.
  await enqueueSqlJob(pool, fixture('feed-delayed'));
  await pool.query("UPDATE job_action_outbox o JOIN job_action_events e ON e.id = o.event_id SET o.available_at = DATE_ADD(NOW(), INTERVAL 1 DAY) WHERE e.job_id = 'feed-delayed'");
  await enqueueSqlJob(pool, fixture('feed-newer'));
  await processActionOutbox(pool, 'feed-newer-first', 100);
  const beforeDelayed = await readActionFeed(pool, feedCompany, feed.nextCursor, 100);
  assert.equal(beforeDelayed.events.length, 1);
  await pool.query("UPDATE job_action_outbox o JOIN job_action_events e ON e.id = o.event_id SET o.available_at = NOW() WHERE e.job_id = 'feed-delayed'");
  await processActionOutbox(pool, 'feed-delayed-later', 100);
  const delayed = await readActionFeed(pool, feedCompany, beforeDelayed.nextCursor, 100);
  assert.equal(delayed.events.length, 1);
  assert.equal(delayed.events[0].job_id, 'feed-delayed');

  await enqueueSqlJob(pool, fixture('feed-rollback-effect'));
  const failingConsumer = { getConnection: async () => {
    const connection = await pool!.getConnection();
    return new Proxy(connection, { get(target, property) {
      if (property === 'query') return async (sql: string, values: unknown[]) => {
        if (sql.includes("SET status = 'PROCESSED'")) throw new Error('ACK_FIXTURE_FAILURE');
        return target.query(sql, values);
      };
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
  } } as unknown as mysql.Pool;
  const revisionBeforeFault = (await readActionFeed(pool, feedCompany)).latestRevision;
  assert.equal((await processActionOutbox(failingConsumer, 'faulting-consumer', 1)).failed, 1);
  assert.equal((await readActionFeed(pool, feedCompany)).latestRevision, revisionBeforeFault);
  const [receiptAfterFault]: any = await pool.query("SELECT r.event_id FROM job_action_receipts r JOIN job_action_events e ON e.id = r.event_id WHERE e.job_id = 'feed-rollback-effect'");
  assert.equal(receiptAfterFault.length, 0);
  await pool.query("UPDATE job_action_outbox o JOIN job_action_events e ON e.id = o.event_id SET o.status = 'PROCESSING', o.locked_by = 'crashed-consumer', o.locked_at = DATE_SUB(NOW(), INTERVAL 6 MINUTE) WHERE e.job_id = 'feed-rollback-effect'");
  await processActionOutbox(pool, 'recovered-consumer', 100);
  assert.equal((await readActionFeed(pool, feedCompany, revisionBeforeFault)).events.length, 1);

  // Scope corruption retries to a bounded dead letter without publishing another tenant's event.
  await enqueueSqlJob(pool, fixture('feed-bad-scope'));
  await pool.query("UPDATE job_action_outbox o JOIN job_action_events e ON e.id = o.event_id SET o.company_id = 'incorrect-tenant' WHERE e.job_id = 'feed-bad-scope'");
  for (let i = 0; i < 3; i++) {
    await pool.query("UPDATE job_action_outbox SET available_at = NOW() WHERE company_id = 'incorrect-tenant'");
    await processActionOutbox(pool, 'scope-test', 100);
  }
  const [dead]: any = await pool.query("SELECT status, attempts, last_error_code FROM job_action_outbox WHERE company_id = 'incorrect-tenant'");
  assert.equal(dead[0].status, 'FAILED'); assert.equal(dead[0].attempts, 3); assert.equal(dead[0].last_error_code, 'SCOPE_MISMATCH');
  assert.equal((await readActionFeed(pool, 'incorrect-tenant')).events.length, 0);
  console.log('Internal action feed: concurrent receipts, replay, tenant isolation, bounded retries and late source event pagination passed.');
  // Native MariaDB session clock supplies deterministic minute slots without a production clock override.
  let nativeClockPool=mysql.createPool({host:'127.0.0.1',port,user:'root',password:'',database,connectionLimit:8});
  const [engineClock]:any=await admin.query('SELECT UNIX_TIMESTAMP() AS now');let clockTime=Math.floor(Number(engineClock[0].now)/60)*60;let clockZone='+05:30';
  const clockPool={getConnection:async()=>{const c=await nativeClockPool.getConnection();await c.query('SET timestamp=?',[clockTime]);await c.query('SET time_zone=?',[clockZone]);return c;},query:async(sql:string,values?:any[])=>{const c=await clockPool.getConnection();try{return await c.query(sql,values);}finally{c.release();}}} as unknown as mysql.Pool;
  try{
    const contenders=await Promise.all(Array.from({length:8},()=>claimDispatcherTick(clockPool)));assert.equal(contenders.filter(Boolean).length,1);const winner=contenders.find(Boolean)!;assert.equal(winner.firstGroup,0);
    await assert.rejects(checkpointDispatcherStage(clockPool,{...winner,token:'not-the-owner'},'queue','STARTED'),/unconfirmed/);
    for(const stage of DISPATCHER_STAGES){await checkpointDispatcherStage(clockPool,winner,stage,'STARTED');await checkpointDispatcherStage(clockPool,winner,stage,'OBSERVED');}
    await settleDispatcherTick(clockPool,winner,false);assert.equal(await claimDispatcherTick(clockPool),null);
    let digestCalls=0;const digestDue=clockTime*1000;const digestDelivery=async()=>{digestCalls++;return true;};assert.equal(await runNotificationOccurrence(clockPool,'dispatcher-notify-client','daily_digest',digestDue,digestDelivery),'SENT');
    // A fresh connection pool sees the cursor left by the preceding process/pool.
    await nativeClockPool.end();nativeClockPool=mysql.createPool({host:'127.0.0.1',port,user:'root',password:'',database,connectionLimit:8});clockTime+=60;clockZone='-08:00';assert.equal(await runNotificationOccurrence(clockPool,'dispatcher-notify-client','daily_digest',digestDue,digestDelivery),'EXISTING');assert.equal(digestCalls,1);
    const secondTick=(await claimDispatcherTick(clockPool))!;assert.equal(secondTick.firstGroup,1);await checkpointDispatcherStage(clockPool,secondTick,'outbox','FAILED');await settleDispatcherTick(clockPool,secondTick,true);
    clockTime+=60;const abandoned=(await claimDispatcherTick(clockPool))!;assert.equal(abandoned.firstGroup,2);await checkpointDispatcherStage(clockPool,abandoned,'digest','STARTED');
    clockTime+=360;const fourth=(await claimDispatcherTick(clockPool))!;assert.equal(fourth.firstGroup,3);await assert.rejects(settleDispatcherTick(clockPool,abandoned,false),/unconfirmed/);
    const history=await readDispatcherHistory(clockPool,null,2);assert.equal(history.history.length,2);assert.equal(history.history[1].status,'UNKNOWN');assert.equal(history.nextBefore,history.history[1].slot);assert.ok(!JSON.stringify(history).includes(winner.token));assert.ok(!JSON.stringify(history).includes('owner_token'));
    const older=await readDispatcherHistory(clockPool,history.nextBefore,2);assert.equal(older.history.length,2);assert.equal(older.history[0].status,'PARTIAL');assert.equal(older.history[1].status,'COMPLETED');assert.equal(older.nextBefore,null);
    clockTime+=60;const rollbackSlot=String(Math.floor(clockTime/60));
    const fault={getConnection:async()=>{const c=await clockPool.getConnection();return new Proxy(c,{get(target,property){if(property==='query')return async(sql:string,values:any[])=>{if(sql.startsWith('INSERT INTO dispatcher_ticks'))throw new Error('DISPATCHER_ROLLBACK');return target.query(sql,values);};const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;}});}} as unknown as mysql.Pool;
    await assert.rejects(claimDispatcherTick(fault),/DISPATCHER_ROLLBACK/);const [absentTick]:any=await clockPool.query('SELECT slot_key FROM dispatcher_ticks WHERE slot_key=?',[rollbackSlot]);assert.equal(absentTick.length,0);
    const [cursorAfterFault]:any=await clockPool.query("SELECT next_group FROM dispatcher_state WHERE cursor_key='universal'");assert.equal(cursorAfterFault[0].next_group,0);
    await clockPool.query("UPDATE dispatcher_state SET next_group=9 WHERE cursor_key='universal'");await assert.rejects(claimDispatcherTick(clockPool),/state unavailable/);await clockPool.query("UPDATE dispatcher_state SET next_group=0 WHERE cursor_key='universal'");
    console.log('Dispatcher SQL:8 claimants/one minute owner, no duplicate replay, persisted rotation across fresh pool, IST session/DB clock, journal/stale UNKNOWN fencing, private keyset history, corrupt-state rejection and atomic rollback passed.');
  }finally{await nativeClockPool.end();}

  console.log(JSON.stringify({ engine: identity[0].version, fresh_schema_001_to_005: 'passed', upgrade_from_005_through_038: 'passed', duplicate_domain_preflight: 'passed', incorrect_index_columns: 'rejected', equivalent_lead_index_reused: true, repeat_upgrade: 'passed', concurrent_workers: 12, single_claim: 'passed', type_filter: 'passed', expired_lease_recovery: 'passed', rollback: 'passed', stale_worker_completion_failure: 'rejected', unfenced_running_update: 'rejected', reused_worker_attempt_fence: 'passed', lease_renewal: 'passed', concurrent_settlement: 'single winner', attempt_exhaustion: 'dead letter', retry_backoff: 'passed', cancelled_state_fence: 'passed', transactional_enqueue_events_outbox: 'passed', outbox_fault_rollback: 'passed', concurrent_enqueue_idempotency: 8, tenant_key_separation: 'passed', production_access: false }));
} finally {
  await pool?.end();
  if (created) await admin.query(`DROP DATABASE ${database}`);
  if(freshCreated)await admin.query(`DROP DATABASE ${freshDatabase}`);
  if(runtimeUserCreated)await admin.query("DROP USER ?@'%'",[runtimeUser]);
  await admin.end();
}
