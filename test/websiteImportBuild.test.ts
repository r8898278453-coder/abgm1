import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {build} from 'esbuild';
import {isolatedTestEnvironment} from '../server/scripts/testEnvironment';
const require=createRequire(import.meta.url);let folder=path.dirname(require.resolve('parse5')),manifest:any;
for(let index=0;index<5;index++){try{const candidate=JSON.parse(await readFile(path.join(folder,'package.json'),'utf8'));if(candidate.name==='parse5'){manifest=candidate;break;}}catch{}folder=path.dirname(folder);}
assert.ok(manifest);assert.equal(typeof(manifest.exports?.require||manifest.exports?.['.']?.require),'string','Externalized CJS server requires an explicit parser require export for the supported Node runtime floor');
const temporary=await mkdtemp(path.join(process.cwd(),'.website-cjs-'));
try{
 const file=path.join(temporary,'fixture.cjs');await build({stdin:{contents:`import {extractWebsitePage} from './server/websiteImportExtract';const result=extractWebsitePage({url:'https://fixture.example/',contentType:'text/html',bytes:Buffer.from('<title>Fixture</title><p>Static price INR 25000</p>')});console.log(JSON.stringify({title:result.title,text:result.text}));`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',packages:'external',outfile:file,logLevel:'silent'});
 const output=await promisify(execFile)(process.execPath,[file],{env:isolatedTestEnvironment(process.env),timeout:10000});assert.ok(output.stdout.trim(),'CommonJS child must execute and produce a structured fixture result');const parsed=JSON.parse(output.stdout.trim());assert.equal(parsed.title,'Fixture');assert.equal(parsed.text,'Static price INR 25000');
 console.log('Website packaging: explicit CommonJS parser export and externalized server-style bundle execute static extraction with production credentials excluded.');
}finally{await rm(temporary,{recursive:true,force:true});}
