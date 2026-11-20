import crypto from 'node:crypto';
import type { Pool } from 'mysql2/promise';
import { z } from 'zod';
import { acquireOAuthRefresh,commitOAuthRefresh,consumeOAuthState,createOAuthState,releaseOAuthRefresh } from './oauthLifecycle';
import { CALENDAR_PROVIDER,calendarBinding,calendarProviderJson,observeCalendar,readCalendarCredentialSnapshot,validCalendarId } from './bookingCalendar';
import { decryptCredential,encryptCredential } from './db';
import { agencyAudit } from './agencyRoutes';
import { SalesError,salesHash,withSalesLock } from './salesWorkspace';
import { withReadOnlySqlDeadline } from './readOnlySqlDeadline';

const oauthMarker='GOOGLE_CALENDAR';
const tokenUrl='https://oauth2.googleapis.com/token';
const scopes=['https://www.googleapis.com/auth/calendar.events','https://www.googleapis.com/auth/calendar.events.freebusy'];
const sha=(value: string|null)=>salesHash(value??'no-calendar');
export const calendarOAuthCallback='/api/oauth/google-calendar/callback';

function config() {
  const clientId=process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_ID;
  const clientSecret=process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET;
  try{
    const url=new URL(process.env.PUBLIC_APP_URL||'');
    if(!clientId||!clientSecret||url.protocol!=='https:'||url.username||url.password||
       url.pathname!=='/'||url.search||url.hash)return null;
    return {clientId,clientSecret,redirectUri:new URL(calendarOAuthCallback,url).href};
  }catch{return null;}
}
type OAuthConfig=NonNullable<ReturnType<typeof config>>;
const configHash=(settings:OAuthConfig)=>sha(JSON.stringify(settings));
const beginCommand=z.object({calendarId:z.custom<string>(validCalendarId)}).strict();
const finishCommand=z.object({state:z.string().regex(/^[A-Za-z0-9_-]{43}$/),code:z.string().regex(/^[!-~]{1,2048}$/)}).strict();
const safeToken=z.string().regex(/^[!-~]{1,8192}$/).refine(v=>!v.startsWith('enc:'));
const providerToken=z.object({access_token:safeToken,refresh_token:safeToken.optional(),
  token_type:z.string().refine(v=>v.toLowerCase()==='bearer'),scope:z.string().max(2000).optional(),
  expires_in:z.number().int().min(60).max(86400)});
const permissionGranted=(value?:string)=>scopes.every(scope=>value?.split(/\s+/).includes(scope));

async function exchange(settings:OAuthConfig, params:Record<string,string>, transport:typeof fetch) {
  try{
    const response=await transport(tokenUrl,{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(6000),
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({...params,client_id:settings.clientId,client_secret:settings.clientSecret}),
    });
    return providerToken.parse(await calendarProviderJson(response));
  }catch{throw new SalesError(503,'CALENDAR_OAUTH_EXCHANGE_UNAVAILABLE');}
}

export async function readCalendarOAuthStatus(pool:Pool,actor:string,company:string) {
  const snapshot=await withReadOnlySqlDeadline(pool,sql=>readCalendarCredentialSnapshot(sql,actor,company));
  const credentials=snapshot?.credentials;
  const expiry=Date.parse(credentials?.expiresAt);
  return {available:Boolean(config()),calendarId:validCalendarId(credentials?.calendarId)?credentials.calendarId:null,
    mode:credentials?.oauthMode===oauthMarker?'OAUTH':snapshot?'MANUAL':'NOT_CONNECTED',
    expiresAtMs:Number.isFinite(expiry)?expiry:null};
}

export async function beginCalendarOAuth(pool:Pool,user:{id:string},company:string,jti:string,input:unknown) {
  const settings=config();
  const command=beginCommand.safeParse(input);
  if(!command.success)throw new SalesError(400,'CALENDAR_OAUTH_INPUT_INVALID');
  if(!settings)throw new SalesError(409,'CALENDAR_OAUTH_NOT_CONFIGURED');
  const previous=await withReadOnlySqlDeadline(pool,sql=>readCalendarCredentialSnapshot(sql,user.id,company));
  const state=await createOAuthState(pool,user,company,CALENDAR_PROVIDER,jti,{
    calendarId:command.data.calendarId,revision:sha(previous?.fingerprint??null),settings:configHash(settings),
  });
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search=new URLSearchParams({client_id:settings.clientId,redirect_uri:settings.redirectUri,response_type:'code',
    scope:scopes.join(' '),state:state.state,code_challenge:state.challenge,code_challenge_method:'S256',
    access_type:'offline',prompt:'consent'}).toString();
  return {url:url.href,state:state.state};
}

export async function finishCalendarOAuth(
  pool:Pool,user:{id:string},company:string,jti:string,input:unknown,transport:typeof fetch=fetch,
) {
  const settings=config();
  const command=finishCommand.safeParse(input);
  if(!command.success)throw new SalesError(400,'CALENDAR_OAUTH_INPUT_INVALID');
  if(!settings)throw new SalesError(409,'CALENDAR_OAUTH_NOT_CONFIGURED');
  const state=await consumeOAuthState(pool,user,company,CALENDAR_PROVIDER,jti,command.data.state);
  const context=state.context as {calendarId:string;revision:string;settings:string}|undefined;
  if(!context||!validCalendarId(context.calendarId)||context.settings!==configHash(settings)) {
    throw new SalesError(409,'CALENDAR_OAUTH_BINDING_CHANGED');
  }
  const previous=await withReadOnlySqlDeadline(pool,sql=>readCalendarCredentialSnapshot(sql,user.id,company));
  if(sha(previous?.fingerprint??null)!==context.revision)throw new SalesError(409,'CALENDAR_OAUTH_BINDING_CHANGED');
  const tokens=await exchange(settings,{grant_type:'authorization_code',code:command.data.code,
    code_verifier:state.verifier,redirect_uri:settings.redirectUri},transport);
  if(!tokens.refresh_token||!permissionGranted(tokens.scope))throw new SalesError(409,'CALENDAR_OAUTH_SCOPE_REQUIRED');
  const now=Date.now();
  const expiresAt=new Date(now+tokens.expires_in*1000).toISOString();
  await observeCalendar({calendarId:context.calendarId,token:tokens.access_token,expiresAt},{
    kind:'AVAILABILITY',startAt:new Date(now+1000).toISOString(),endAt:new Date(now+61000).toISOString(),
  },transport,now);
  await withSalesLock(pool,user,company,'manage',async sql=>{
    const snapshot=await readCalendarCredentialSnapshot(sql,user.id,company);
    const latest=config();
    if(sha(snapshot?.fingerprint??null)!==context.revision||!latest||configHash(latest)!==context.settings){
      throw new SalesError(409,'CALENDAR_OAUTH_BINDING_CHANGED');
    }
    const credentials=JSON.stringify({calendarId:context.calendarId,oauthMode:oauthMarker,oauthClient:sha(settings.clientId),
      expiresAt,scope:tokens.scope,accessToken:encryptCredential(tokens.access_token),refreshToken:encryptCredential(tokens.refresh_token!)});
    await sql.query(`INSERT INTO company_integrations(id,company_id,provider,status,credentials,config,last_tested_at,last_error)
      VALUES (?,?,?,'verified',?,'{}',NOW(),NULL) ON DUPLICATE KEY UPDATE credentials=VALUES(credentials),
      status=VALUES(status),last_tested_at=VALUES(last_tested_at),last_error=NULL`,
      ['int_'+crypto.randomBytes(16).toString('hex'),company,CALENDAR_PROVIDER,credentials]);
    await agencyAudit(sql,company,user.id,'SALES_CALENDAR_OAUTH_CONNECTED',{});
  });
  return {state:'CONNECTED'};
}

/** Refresh outside booking/queue transactions, using the existing tenant lease and credential CAS. */
export async function ensureCalendarOAuth(
  pool:Pool,actor:string,company:string,lead?:string,transport:typeof fetch=fetch,
) {
  const settings=config();
  if(!settings)return;
  const read=()=>withReadOnlySqlDeadline(pool,sql=>readCalendarCredentialSnapshot(sql,actor,company,lead));
  const initial=await read();
  if(initial?.credentials?.oauthMode!==oauthMarker||!['saved','verified','connected'].includes(initial.status))return;
  const currentToken=(value:any)=>typeof value?.accessToken==='string'&&value.accessToken.startsWith('enc:v1:')&&
    calendarBinding({...value,accessToken:decryptCredential(value.accessToken)},Date.now()+15000);
  if(currentToken(initial.credentials))return;
  const lease=await acquireOAuthRefresh(pool,company,CALENDAR_PROVIDER);
  if(!lease)throw new SalesError(409,'CALENDAR_OAUTH_REFRESH_IN_PROGRESS');
  try{
    const snapshot=await read();
    const credentials=snapshot?.credentials;
    if(!snapshot||credentials?.oauthMode!==oauthMarker||credentials.oauthClient!==sha(settings.clientId)||
       !['saved','verified','connected'].includes(snapshot.status)||!permissionGranted(credentials.scope)||
       typeof credentials.refreshToken!=='string'||!credentials.refreshToken.startsWith('enc:v1:')){
      throw new SalesError(409,'CALENDAR_OAUTH_RECONNECT_REQUIRED');
    }
    if(currentToken(credentials))return;
    const refreshToken=decryptCredential(credentials.refreshToken);
    const fresh=await exchange(settings,{grant_type:'refresh_token',refresh_token:refreshToken},transport);
    if(fresh.scope!==undefined&&!permissionGranted(fresh.scope))throw new SalesError(409,'CALENDAR_OAUTH_SCOPE_REQUIRED');
    const latest=config();
    if(!latest||configHash(latest)!==configHash(settings)||(await read())?.fingerprint!==snapshot.fingerprint)throw new SalesError(409,'CALENDAR_OAUTH_BINDING_CHANGED');
    await commitOAuthRefresh(pool,lease,snapshot.id,JSON.stringify(credentials),{
      accessToken:fresh.access_token,expiresAt:new Date(Date.now()+fresh.expires_in*1000).toISOString(),
      ...(fresh.refresh_token?{refreshToken:fresh.refresh_token}:{}),
    });
  }finally{await releaseOAuthRefresh(pool,lease);}
}
