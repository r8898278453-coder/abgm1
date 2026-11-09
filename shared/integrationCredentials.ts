/** Shared key classification for encryption and browser-safe metadata. */
export function isIntegrationSecret(key:string){return /token|secret|key|pass|auth|login/i.test(key);}
export function maskIntegrationCredentials(credentials:Record<string,unknown>){
 return Object.fromEntries(Object.entries(credentials).map(([key,value])=>[key,isIntegrationSecret(key)?'••••••••':typeof value==='string'?value:'']));
}
