import React, {useEffect,useRef,useState} from 'react';
import {formatPlatformDateTime} from '../../shared/platformTime';
import {apiRequest} from '../services/authService';

type Channel = {
  state: 'NOT_CONFIGURED'|'PENDING'|'ACTIVE'|'EXPIRED'|'DISABLED';
  expiresAtMs: number|null;
  enabled: boolean;
  originReady: boolean;
  canRegister: boolean;
  automaticRenewal?: boolean;
  renewalPending?: boolean;
  stopState?: 'READY'|'IN_PROGRESS'|'STOPPED'|'UNKNOWN'|'UNAVAILABLE'|null;
};

const labels: Record<Channel['state'],string> = {
  NOT_CONFIGURED:'No subscription', PENDING:'Registration unconfirmed', ACTIVE:'Active',
  EXPIRED:'Expired', DISABLED:'Disabled locally',
};

export const CalendarPushPanel: React.FC<{companyId:string}> = ({companyId}) => {
  const [channel,setChannel]=useState<Channel|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  const endpoint='/api/companies/'+encodeURIComponent(companyId)+'/sales/calendar-push';

  async function refresh(action?: 'REGISTER'|'DISABLE') {
    controller.current?.abort();
    const request=new AbortController();
    controller.current=request;
    setBusy(true);
    setError('');
    try {
      if(action){
        const update=await apiRequest<{success:boolean;companyId:string}>(endpoint,
          {method:'POST',body:JSON.stringify({action}),signal:request.signal});
        if(!update.success||update.companyId!==companyId)throw Error();
      }
      const status=await apiRequest<{success:boolean;companyId:string;channel:Channel}>(endpoint,{signal:request.signal});
      if(!status.success||status.companyId!==companyId||!Object.hasOwn(labels,status.channel?.state))throw Error();
      if(!request.signal.aborted)setChannel(status.channel);
    } catch {
      if(!request.signal.aborted){
        setChannel(null);
        setError('Calendar subscription status unconfirmed. Reload to check the saved state.');
      }
    } finally {
      if(!request.signal.aborted)setBusy(false);
    }
  }

  return <section aria-label="Google Calendar push" className="border p-3 space-y-2 rounded-xl">
    <h3>Google Calendar push</h3>
    <button disabled={busy} onClick={()=>void refresh()}>Load Calendar subscription</button>
    {error&&<p role="alert">{error}</p>}
    {channel&&<>
      <p>{labels[channel.state]}{channel.expiresAtMs&&['PENDING','ACTIVE'].includes(channel.state)
        ? ' · Until '+formatPlatformDateTime(channel.expiresAtMs) : ''}</p>
      {!channel.enabled&&<p>Calendar push is disabled in server settings.</p>}
      {channel.automaticRenewal&&<p>Automatic renewal is enabled.</p>}
      {channel.renewalPending&&<p>Renewal unconfirmed. The current channel stays active until it expires.</p>}
      {channel.stopState&&<p>{({
        READY:'Google-side stop queued.',IN_PROGRESS:'Google-side stop in progress.',STOPPED:'Google-side stop confirmed.',
        UNKNOWN:'Google-side stop unconfirmed.',UNAVAILABLE:'Google-side stop unavailable.',
      })[channel.stopState]}</p>}
      {channel.enabled&&!channel.originReady&&<p>Calendar push requires the configured HTTPS site origin.</p>}
      <div className="flex flex-wrap gap-2">
        {channel.enabled&&channel.originReady&&channel.canRegister&&
          <button disabled={busy} onClick={()=>void refresh('REGISTER')}>{channel.state==='ACTIVE'?'Renew Calendar subscription':'Register Calendar subscription'}</button>}
        {['ACTIVE','PENDING'].includes(channel.state)&&
          <button disabled={busy} onClick={()=>void refresh('DISABLE')}>Disable Calendar subscription locally</button>}
      </div>
    </>}
  </section>;
};
