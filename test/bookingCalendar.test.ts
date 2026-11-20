import assert from 'node:assert/strict';
import { calendarBinding, observeCalendar } from '../server/bookingCalendar';
import { calendarCheck } from '../shared/bookingCalendar';

const now = Date.parse('2026-11-20T04:00:00Z');
const window = calendarCheck.parse({
  kind: 'AVAILABILITY', startAt: '2026-11-20T10:00:00+05:30', endAt: '2026-11-20T10:30:00+05:30',
});
const credentials = {calendarId:'clinic@group.calendar.google.com',accessToken:'fixture-token',expiresAt:'2026-11-20T14:00:00+05:30'};
const binding = calendarBinding(credentials, now);
assert.ok(binding);
for (const calendarId of ['primary','..','.','north/other']) assert.equal(calendarBinding({...credentials,calendarId},now),null);
assert.equal(calendarBinding({...credentials,expiresAt:'2026-11-20T04:00:00Z'},now),null);
assert.equal(calendarBinding({...credentials,accessToken:'••••••••'},now),null);

const start = '2026-11-20T04:30:00.000Z';
const end = '2026-11-20T05:00:00.000Z';
const calendars = (busy: unknown[]) => ({
  [credentials.calendarId]: {busy},
});
const freeBusy = (value: unknown): typeof fetch => async (url, options) => {
  assert.equal(String(url),'https://www.googleapis.com/calendar/v3/freeBusy');
  assert.equal(options?.method,'POST');
  assert.equal(options.redirect,'error');
  assert.ok(options.signal);
  assert.deepEqual(JSON.parse(String(options.body)), {
    timeMin:start,timeMax:end,timeZone:'UTC',items:[{id:credentials.calendarId}],
  });
  return Response.json(value);
};
const data = (busy: unknown[]) => ({timeMin:start,timeMax:end,calendars:calendars(busy)});
assert.equal((await observeCalendar(binding,window,freeBusy(data([])),now)).status,'FREE');
assert.equal((await observeCalendar(binding,window,freeBusy(data([{start:'2026-11-20T04:00:00Z',end:start}])),now)).status,'FREE');
assert.equal((await observeCalendar(binding,window,freeBusy(data([{start,end}])),now)).status,'BUSY');
for (const invalid of [
  {timeMin:start,timeMax:end,calendars:{}},
  {timeMin:start,timeMax:end,calendars:{[credentials.calendarId]:{busy:[],errors:[{reason:'forbidden'}]}}},
  {...data([]),timeMax:'2026-11-20T06:00:00Z'},
  data([{start:'invalid',end}]),
  data([{start,end:start}]),
]) await assert.rejects(observeCalendar(binding,window,freeBusy(invalid),now),{code:'CALENDAR_PROVIDER_UNAVAILABLE'});
await assert.rejects(observeCalendar(binding,window,async()=>new Response('x'.repeat(262145)),now),{code:'CALENDAR_PROVIDER_UNAVAILABLE'});
await assert.rejects(observeCalendar(binding,window,async()=>{throw Error('Unexpected call');},Date.parse(end)),{code:'CALENDAR_WINDOW_INVALID'});

const event = calendarCheck.parse({kind:'EVENT',eventId:'fixture-event'});
const exact = await observeCalendar(binding,event,async(url, options)=>{
  assert.equal(new URL(String(url)).pathname,'/calendar/v3/calendars/clinic%40group.calendar.google.com/events/fixture-event');
  assert.equal(options?.method,undefined);
  return Response.json({id:'fixture-event',status:'confirmed',start:{dateTime:start},end:{dateTime:end},summary:'private-calendar-title'});
},now);
assert.equal(exact.kind,'EVENT');
assert.equal(exact.startAtMs,Date.parse(start));
assert.ok(!JSON.stringify(exact).includes('private-calendar-title'));
await assert.rejects(observeCalendar(binding,event,async()=>Response.json({id:'foreign',status:'confirmed',start:{dateTime:start},end:{dateTime:end}}),now),{code:'CALENDAR_PROVIDER_UNAVAILABLE'});
await assert.rejects(observeCalendar(binding,event,async()=>Response.json({id:'fixture-event',status:'cancelled'}),now),{code:'CALENDAR_EVENT_UNCONFIRMED'});
await assert.rejects(observeCalendar(binding,event,async()=>new Response('',{status:404}),now),{code:'CALENDAR_EVENT_NOT_FOUND'});
await assert.rejects(observeCalendar(binding,event,async()=>Response.json({id:'fixture-event',status:'confirmed',start:{date:'2026-11-20'},end:{date:'2026-11-21'}}),now),{code:'CALENDAR_EVENT_UNCONFIRMED'});
console.log('Calendar observations: exact tenant calendar, canonical IST-to-UTC window, bounded and malformed response refusal, conflicts and exact timed event identity passed.');
