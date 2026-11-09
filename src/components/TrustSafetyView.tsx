import React from 'react';
import type {NavTab} from '../types';
import {SchedulerHistory} from './SchedulerHistory';

export const TrustSafetyView:React.FC<{onNavigate:(tab:NavTab)=>void;isPlatformAdmin?:boolean;holidayDraft?:boolean;onHolidayDraftChange?:(paused:boolean)=>void}>=({onNavigate,isPlatformAdmin=false,holidayDraft=false,onHolidayDraftChange})=><div className="space-y-5 pb-12">
 <h1 className="text-2xl font-bold">Execution controls & recorded outcomes</h1>
 <p className="text-slate-600">Open the saved controls for the selected client and review recorded results before resuming work.</p>
 <section className="bg-white border rounded-2xl p-5 space-y-3"><h2 className="font-bold">Autonomous execution and global stop</h2><p className="text-sm">Review current backend state and request an authorized pause or resume. Already-started provider requests may finish.</p><button onClick={()=>onNavigate('autonomous')}>Review backend stop controls</button></section>
 <section className="bg-white border rounded-2xl p-5 space-y-3"><h2 className="font-bold">Client publishing pauses and limits</h2><p className="text-sm">Inspect saved client/channel pauses, daily publication admissions and control history.</p><button onClick={()=>onNavigate('dashboard')}>Open publishing controls</button></section>
 <section className="bg-white border rounded-2xl p-5 space-y-3"><h2 className="font-bold">Holiday publishing preference</h2><p className="text-sm">Applies to automatic publishing. A changed preference is a draft until the header confirms it was saved.</p><label><input aria-label="Draft holiday publishing pause" type="checkbox" checked={holidayDraft} disabled={!onHolidayDraftChange} onChange={event=>onHolidayDraftChange?.(event.target.checked)}/> Pause automatic publishing during closure</label></section>
 <section className="bg-white border rounded-2xl p-5 space-y-3"><h2 className="font-bold">Channel configuration</h2><p className="text-sm">Configure and check this client's provider connections.</p><button onClick={()=>onNavigate('integrations')}>Open integrations</button></section>
 <section className="bg-white border rounded-2xl p-5 space-y-3"><h2 className="font-bold">Daily work and pending outcomes</h2><p className="text-sm">Review client action history, failed work and unconfirmed provider outcomes.</p><button onClick={()=>onNavigate('dashboard')}>Open client work report</button></section>
 {isPlatformAdmin&&<SchedulerHistory/>}
</div>;
