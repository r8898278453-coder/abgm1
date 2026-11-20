import type { Express, Request } from 'express';
import type { Pool } from 'mysql2/promise';
import { beginCalendarOAuth, finishCalendarOAuth, readCalendarOAuthStatus } from './calendarOAuth';
import { sessionToken } from './browserSession';
import { AgencyError } from './agencyPolicy';
import { SalesError } from './salesWorkspace';
import { crmId } from '../shared/crmIdentity';

export function registerCalendarOAuthRoutes(app:Express,deps:{
  auth:(req:Request)=>Promise<{id:string}|null>;
  token:(value:string)=>{jti:string}|null;
  pool:()=>Promise<Pool|null>;
  transport?:typeof fetch;
}){
  const handle=(action:'status'|'begin'|'finish')=>async(req:Request,res:any)=>{
    res.set('Cache-Control','no-store');
    try{
      const user=await deps.auth(req);
      const token=sessionToken(req);
      const identity=token?deps.token(token):null;
      if(!user||!identity)throw new SalesError(401,'AUTH_REQUIRED');
      const company=crmId.safeParse(req.params.companyId);
      if(!company.success||Object.keys(req.query).length)throw new SalesError(400,'CALENDAR_OAUTH_INPUT_INVALID');
      const pool=await deps.pool();
      if(!pool)throw new SalesError(503,'SALES_STORAGE_UNAVAILABLE');
      const result=action==='status'?await readCalendarOAuthStatus(pool,user.id,company.data):
        action==='begin'?await beginCalendarOAuth(pool,user,company.data,identity.jti,req.body):
        await finishCalendarOAuth(pool,user,company.data,identity.jti,req.body,deps.transport);
      res.json({success:true,companyId:company.data,oauth:result});
    }catch(error){
      const known=error instanceof SalesError||error instanceof AgencyError;
      res.status(known?error.status:503).json({success:false,error:known?error.code:'CALENDAR_OAUTH_UNAVAILABLE'});
    }
  };
  app.get('/api/companies/:companyId/calendar-oauth',handle('status'));
  app.post('/api/companies/:companyId/calendar-oauth/begin',handle('begin'));
  app.post('/api/companies/:companyId/calendar-oauth/finish',handle('finish'));
  app.get('/api/oauth/google-calendar/callback',(_req,res)=>{
    res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'none'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'"});
    res.type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><title>Google Calendar authorization</title><p id="calendar-oauth-status">Returning to the Calendar workspace…</p><script src="/calendar-oauth-callback.js" defer></script></html>');
  });
}
