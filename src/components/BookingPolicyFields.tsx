import React from 'react';
import type {BookingPolicy} from '../../shared/bookingPolicy';

const limits: Array<{key:keyof BookingPolicy;label:string;min:number;max:number}> = [
  {key:'minimumMinutes',label:'Minimum appointment duration (minutes)',min:0,max:1440},
  {key:'maximumMinutes',label:'Maximum appointment duration (minutes)',min:1,max:1440},
  {key:'bufferBeforeMinutes',label:'Buffer before appointment (minutes)',min:0,max:120},
  {key:'bufferAfterMinutes',label:'Buffer after appointment (minutes)',min:0,max:120},
  {key:'minimumNoticeMinutes',label:'Minimum booking notice (minutes)',min:0,max:10080},
  {key:'horizonDays',label:'Booking horizon (days)',min:1,max:60},
];

export const BookingPolicyFields: React.FC<{
  value:BookingPolicy; disabled:boolean; onChange:(value:BookingPolicy)=>void;
}> = ({value,disabled,onChange}) => (
  <fieldset disabled={disabled} className="space-y-2">
    <legend>Google Calendar booking policy</legend>
    <div className="grid gap-2 sm:grid-cols-2">
      {limits.map(({key,label,min,max})=><label key={key} className="block">
        {label}
        <input className="block max-w-full" type="number" min={min} max={max} value={value[key]}
          onChange={event=>onChange({...value,[key]:Number(event.target.value)})}/>
      </label>)}
    </div>
    <p>Zero minimum duration allows any positive duration. These limits apply when checking or placing a Google Calendar booking.</p>
  </fieldset>
);
