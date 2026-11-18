import {execFileSync} from 'node:child_process';import {buildSourceIdentity,recordBuildProvenance} from './releasePackage';
const start=buildSourceIdentity();
for(const args of [['--import','tsx','server/scripts/checkMigrationSources.ts'],['node_modules/vite/bin/vite.js','build'],['--import','tsx','server/scripts/buildServer.ts']])execFileSync(process.execPath,args,{stdio:'inherit',env:process.env});
recordBuildProvenance(process.cwd(),start);
