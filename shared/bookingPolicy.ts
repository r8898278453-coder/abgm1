import { z } from 'zod';

export const bookingPolicy = z.object({
  minimumMinutes:z.number().int().min(0).max(1440),
  maximumMinutes:z.number().int().min(1).max(1440),
  bufferBeforeMinutes:z.number().int().min(0).max(120),
  bufferAfterMinutes:z.number().int().min(0).max(120),
  minimumNoticeMinutes:z.number().int().min(0).max(10080),
  horizonDays:z.number().int().min(1).max(60),
}).strict().refine(value=>value.minimumMinutes<=value.maximumMinutes);

export type BookingPolicy = z.infer<typeof bookingPolicy>;
export const DEFAULT_BOOKING_POLICY: BookingPolicy = {
  minimumMinutes:0,maximumMinutes:1440,bufferBeforeMinutes:0,bufferAfterMinutes:0,minimumNoticeMinutes:0,horizonDays:60,
};

export function bookingSlot(policy:BookingPolicy,start:number,end:number,now:number) {
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<=start||start<=now) {
    return {ok:false,reason:'CALENDAR_WINDOW_INVALID'} as const;
  }
  const beforeMs=policy.bufferBeforeMinutes*60000;
  const afterMs=policy.bufferAfterMinutes*60000;
  if(end-start<policy.minimumMinutes*60000||end-start>policy.maximumMinutes*60000){
    return {ok:false,reason:'CALENDAR_DURATION_OUTSIDE_POLICY'} as const;
  }
  if(start-now<policy.minimumNoticeMinutes*60000||start-beforeMs<now||end>now+policy.horizonDays*86400000){
    return {ok:false,reason:'CALENDAR_NOTICE_OR_HORIZON'} as const;
  }
  return {ok:true,start,end,beforeMs,afterMs,checkStart:start-beforeMs,checkEnd:end+afterMs} as const;
}
