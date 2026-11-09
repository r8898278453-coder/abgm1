import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {isolatedTestEnvironment} from './testEnvironment';
import {inventoryRoutes} from './routeInventory';
if(process.argv[2]!=='--isolated'){
 const child=spawnSync(process.execPath,['--import','tsx',process.argv[1],'--isolated',...process.argv.slice(2)],{env:isolatedTestEnvironment(process.env),stdio:'inherit'});process.exit(child.status??1);
}
const source=await readFile('server.ts','utf8'),result=await inventoryRoutes(source,module=>import(pathToFileURL(path.resolve(module+'.ts')).href));
const artifact={kind:'source-declaration-inventory',scope:'Inline app HTTP methods plus imported register*(app, deps) functions. Middleware/static mounts, authorization behavior, deployed revision and live reachability are not established.',...result};
const target='docs/implementation/evidence/route-contract-inventory.json';
if(process.argv.includes('--write'))await writeFile(target,JSON.stringify(artifact,null,2)+'\n');
else {const stored=JSON.parse(await readFile(target,'utf8'));if(JSON.stringify(stored)!==JSON.stringify(artifact))throw new Error('ROUTE_INVENTORY_STALE: regenerate with npm run routes:record and review changes');}
console.log(JSON.stringify({routeDeclarations:result.routes.length,registrations:result.registrationCount,collisions:0,requestHandlersExecuted:false,productionCredentialsInherited:false}));
