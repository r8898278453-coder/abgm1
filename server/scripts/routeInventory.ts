import ts from 'typescript';
export interface RouteContract{method:string;path:string;owner:string;kind?:'handler'|'middleware-chain';}
const methods=new Set(['get','post','put','patch','delete','options','head','all']);
export function assertUniqueRoutes(routes:RouteContract[]){
 const seen=new Map<string,string>();for(const row of routes){
  if(row.kind==='middleware-chain')continue;
  const key=row.method+' '+row.path.replace(/:[A-Za-z_][A-Za-z0-9_]*/g,':param').replace(/\/$/,'').toLowerCase();
  if(seen.has(key))throw new Error(`ROUTE_COLLISION: ${row.method} ${row.path} (${seen.get(key)}, ${row.owner})`);seen.set(key,row.owner);
 }
}
/** Analyze inline routes; run only imported registration functions against a recorder.
 * The application entrypoint and registered request handlers are never executed.
 */
export async function inventoryRoutes(source:string,load:(module:string)=>Promise<Record<string,any>>){
 const file=ts.createSourceFile('server.ts',source,ts.ScriptTarget.Latest,true),imports=new Map<string,{module:string;name:string}>(),routes:RouteContract[]=[],registrations:{local:string;module:string;name:string}[]=[];
 const literal=(node:ts.Expression):string[]=>{
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return [node.text];
  if(ts.isArrayLiteralExpression(node))return node.elements.flatMap(item=>literal(item as ts.Expression));
  throw new Error('ROUTE_PATH_UNRESOLVED');
 };
 for(const node of file.statements)if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)){
  const bindings=node.importClause?.namedBindings;if(bindings&&ts.isNamedImports(bindings))for(const item of bindings.elements)imports.set(item.name.text,{module:node.moduleSpecifier.text,name:item.propertyName?.text||item.name.text});
 }
 const visit=(node:ts.Node)=>{
  if(ts.isCallExpression(node)){
   if(ts.isPropertyAccessExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text==='app'&&methods.has(node.expression.name.text)){
    const last=node.arguments[node.arguments.length-1];
    // This factory supplies auth/rate-limit context then calls next(); it is a
    // deliberately separate chain, not a second terminal AI endpoint.
    const chain=ts.isCallExpression(last)&&ts.isIdentifier(last.expression)&&last.expression.text==='requireAiWorkspace';
    if(!chain&&!ts.isArrowFunction(last)&&!ts.isFunctionExpression(last))throw new Error('INLINE_ROUTE_ROLE_UNRESOLVED');
    for(const path of literal(node.arguments[0]))routes.push({method:node.expression.name.text.toUpperCase(),path,owner:'server.ts',...(chain?{kind:'middleware-chain' as const}:{})});
   }else if(ts.isElementAccessExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text==='app')throw new Error('INLINE_ROUTE_METHOD_UNRESOLVED');
   else if(ts.isIdentifier(node.expression)&&node.expression.text.startsWith('register')&&node.arguments[0]?.getText(file)==='app'){
    const imported=imports.get(node.expression.text);if(!imported||!/^\.\/server\/[A-Za-z0-9_/-]+$/.test(imported.module))throw new Error('ROUTE_REGISTRATION_UNRESOLVED');registrations.push({local:node.expression.text,...imported});
   }
  }ts.forEachChild(node,visit);
 };visit(file);
 const forbidden=()=>{throw new Error('ROUTE_REGISTRATION_ATTEMPTED_EFFECT');},dependencies=new Proxy({}, {get:()=>forbidden});
 for(const registration of registrations){
  const app=new Proxy({}, {get:(_,method)=>{
   if(typeof method!=='string'||!methods.has(method))throw new Error('ROUTE_REGISTRATION_UNSUPPORTED');
   return (paths:unknown)=>{for(const path of Array.isArray(paths)?paths:[paths]){if(typeof path!=='string')throw new Error('ROUTE_PATH_UNRESOLVED');routes.push({method:method.toUpperCase(),path,owner:registration.module.slice(2)+'.ts#'+registration.name});}return app;};
  }});
  const module=await load(registration.module);if(typeof module[registration.name]!=='function')throw new Error('ROUTE_REGISTRATION_MISSING');await module[registration.name](app,dependencies);
 }
 assertUniqueRoutes(routes);return {routes:routes.sort((a,b)=>a.path.localeCompare(b.path)||a.method.localeCompare(b.method)),registrationCount:registrations.length};
}
