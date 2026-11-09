import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import {isolatedTestEnvironment} from './testEnvironment';

const exec = promisify(execFile);
const image = 'mariadb@sha256:d769e37960821dfdcf096954f6e7ac89f747e116c1bba98e48edd265dfc7deae';
const name = `abgm1-sql-${crypto.randomUUID().slice(0, 8)}`;
const env = { ...process.env };
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key];
const docker = async (...args: string[]) => (await exec('docker', ['--host=unix:///var/run/docker.sock', ...args], { env, timeout: 120_000, maxBuffer: 1024 * 1024 })).stdout.trim();
let created = false;
try {
  await docker('info', '--format', '{{.ServerVersion}}');
  try { await docker('image', 'inspect', image, '--format', '{{.Id}}'); }
  catch { await docker('pull', image); }
  await docker('run', '--detach', '--name', name, '--publish', '127.0.0.1::3306', '-e', 'MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1', image);
  created = true;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { await docker('exec', name, 'healthcheck.sh', '--connect', '--innodb_initialized'); ready = true; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 500)); }
  }
  if (!ready) throw new Error('Disposable SQL instance did not become ready');
  const binding = await docker('port', name, '3306/tcp');
  const match = /^127\.0\.0\.1:(\d+)$/.exec(binding);
  if (!match) throw new Error('Expected loopback-only SQL binding');
  const hostname = await docker('inspect', '--format', '{{.Config.Hostname}}', name);
  const testEnv = { ...isolatedTestEnvironment(env), NODE_ENV: 'test', ABGM1_LOCAL_SQL_TESTS: '1', LOCAL_SQL_CONTAINER_ID: hostname, LOCAL_SQL_PORT: match[1] };
  for (const key of Object.keys(testEnv)) if (/^(DB_|DATABASE_URL$|INITIAL_ADMIN_)/.test(key)) delete testEnv[key];
  let result;try{result = await exec(process.execPath, ['--import', 'tsx', ...(process.argv[2]==='--restore' ? ['test/integration/dumpRestore.test.ts', process.argv[3] || ''] : ['test/integration/localQueueSql.test.ts'])], { env: testEnv, timeout: 120_000, maxBuffer: 1024 * 1024 });
  }catch(error:any){process.stdout.write(error.stdout||'');if(process.argv[2]!=='--restore')process.stderr.write(error.stderr||'');throw new Error('Disposable SQL worker failed; see redacted report above');}
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
} finally {
  if (created) await docker('rm', '--force', name);
}
