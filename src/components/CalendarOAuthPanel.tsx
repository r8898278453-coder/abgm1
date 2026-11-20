import React, {useEffect,useRef,useState} from 'react';
import {formatPlatformDateTime} from '../../shared/platformTime';
import {apiRequest} from '../services/authService';

type Status = {available:boolean;calendarId:string|null;mode:'OAUTH'|'MANUAL'|'NOT_CONNECTED';expiresAtMs:number|null};
type Flow = {request:AbortController;popup:Window;channel?:BroadcastChannel;timer?:number};

export const CalendarOAuthPanel: React.FC<{companyId:string;onConnected:()=>void}> = ({companyId,onConnected}) => {
  const [status,setStatus]=useState<Status|null>(null);
  const [calendarId,setCalendarId]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const active=useRef<Flow|null>(null);
  const loadRequest=useRef<AbortController|null>(null);
  const base='/api/companies/'+encodeURIComponent(companyId)+'/calendar-oauth';

  function clear(flow:Flow) {
    flow.request.abort();
    flow.channel?.close();
    window.clearTimeout(flow.timer);
    flow.popup.close();
    if(active.current===flow)active.current=null;
  }
  useEffect(()=>()=>{loadRequest.current?.abort();if(active.current)clear(active.current);},[]);

  async function statusRequest(keepNotice=false) {
    loadRequest.current?.abort();
    const controller=new AbortController();
    loadRequest.current=controller;
    setBusy(true);
    if(!keepNotice)setMessage('');
    try{
      const result=await apiRequest<{success:boolean;companyId:string;oauth:Status}>(base,{signal:controller.signal});
      if(!result.success||result.companyId!==companyId)throw Error();
      if(!controller.signal.aborted){
        setStatus(result.oauth);
        setCalendarId(result.oauth.calendarId||'');
      }
    }catch{
      if(!controller.signal.aborted)setMessage('Calendar connection status is unavailable.');
    }finally{if(!controller.signal.aborted)setBusy(false);}
  }

  async function connect() {
    if(busy||!status?.available||!calendarId.trim())return;
    if(typeof BroadcastChannel!=='function'){setMessage('Open this workspace in a browser that supports Calendar authorization.');return;}
    const popup=window.open('about:blank','_blank','popup,width=580,height=710');
    if(!popup){setMessage('Allow the Google authorization popup and try again.');return;}
    popup.opener=null;
    const flow:Flow={popup,request:new AbortController()};
    active.current=flow;
    setBusy(true);
    setMessage('');
    try{
      const result=await apiRequest<{success:boolean;companyId:string;oauth:{url:string;state:string}}>(
        base+'/begin',{method:'POST',body:JSON.stringify({calendarId:calendarId.trim()}),signal:flow.request.signal});
      if(active.current!==flow)return;
      const authorize=new URL(result.oauth.url);
      const redirect=new URL(authorize.searchParams.get('redirect_uri')||'');
      if(!result.success||result.companyId!==companyId||authorize.origin!=='https://accounts.google.com'||
          authorize.pathname!=='/o/oauth2/v2/auth'||redirect.origin!==window.location.origin||
          redirect.pathname!=='/api/oauth/google-calendar/callback'||!/^[A-Za-z0-9_-]{43}$/.test(result.oauth.state))throw Error();
      const channel=new BroadcastChannel('abgm1-calendar-oauth:'+result.oauth.state);
      flow.channel=channel;
      channel.onmessage=async event=>{
        if(active.current!==flow)return;
        channel.close();
        try{
          if(typeof event.data?.code!=='string')throw Error();
          const done=await apiRequest<{success:boolean;companyId:string}>(base+'/finish',{
            method:'POST',body:JSON.stringify({state:result.oauth.state,code:event.data.code}),signal:flow.request.signal});
          if(active.current!==flow)return;
          if(!done.success||done.companyId!==companyId)throw Error();
          clear(flow);
          setMessage('Google Calendar connection verified.');
          onConnected();
          await statusRequest(true);
        }catch{
          if(active.current===flow){clear(flow);setBusy(false);setMessage('Calendar authorization did not complete. Start a new connection to retry.');}
        }
      };
      flow.timer=window.setTimeout(()=>{
        if(active.current===flow){clear(flow);setBusy(false);setMessage('Calendar authorization expired. Start a new connection to retry.');}
      },600000);
      popup.location.href=authorize.href;
    }catch{
      if(active.current===flow){clear(flow);setBusy(false);setMessage('Calendar authorization could not start.');}
    }
  }

  return <section aria-label="Google Calendar OAuth" className="rounded-xl border p-3 space-y-2">
    <h3 className="font-semibold">Google Calendar connection</h3>
    <button disabled={busy} onClick={()=>void statusRequest()}>Load Calendar connection</button>
    {status&&<>
      <p>{status.mode==='OAUTH'?'Google OAuth':status.mode==='MANUAL'?'Manually configured':'No saved connection'}
        {status.expiresAtMs?' · Token expires '+formatPlatformDateTime(status.expiresAtMs):''}</p>
      {status.available?<label className="block">Calendar ID
        <input className="block w-full" value={calendarId} disabled={busy} maxLength={255} onChange={e=>setCalendarId(e.target.value)}/>
      </label>:<p>Calendar OAuth needs server configuration.</p>}
      {status.available&&<button disabled={busy||!calendarId.trim()} onClick={()=>void connect()}>Connect with Google</button>}
    </>}
    {active.current&&<button onClick={()=>{if(active.current)clear(active.current);setBusy(false);setMessage('Calendar authorization cancelled.');}}>Cancel authorization</button>}
    {message&&<p role="status">{message}</p>}
  </section>;
};
