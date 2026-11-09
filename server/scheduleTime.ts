import { IST_OFFSET_MS } from '../shared/platformTime';

/** Naive schedules are IST; offset-bearing timestamps retain their explicit instant. */
export function scheduledTimeMs(scheduledDate?: string | null, scheduledTime?: string | null, timeSlot?: string | null): number | null {
  if (typeof scheduledDate !== 'string') return null;
  // Historical writers stored a full datetime in scheduled_time alongside a date-only field.
  if(/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate.trim()) && typeof scheduledTime==='string' && /^\d{4}-\d{2}-\d{2}[T ]/.test(scheduledTime.trim())){
    if(scheduledTime.trim().slice(0,10)!==scheduledDate.trim())return null;
    return scheduledTimeMs(scheduledTime.trim(),null,null);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?)?$/.exec(scheduledDate.trim());
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const midnight = Date.UTC(year, month - 1, day);
  const date = new Date(midnight);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  let hours = 0, minutes = 0, seconds = 0, milliseconds = 0;
  let offset = IST_OFFSET_MS;
  if (match[4] !== undefined) {
    hours = Number(match[4]); minutes = Number(match[5]); seconds = Number(match[6] || 0);
    milliseconds = Number((match[7] || '').padEnd(3, '0'));
    if (match[8] === 'Z') offset = 0;
    else if (match[8]) {
      const offsetHours = Number(match[8].slice(1,3)), offsetMinutes = Number(match[8].slice(4));
      if (offsetHours > 23 || offsetMinutes > 59) return null;
      offset = (match[8][0] === '-' ? -1 : 1) * (offsetHours * 60 + offsetMinutes) * 60_000;
    }
  } else {
    const rawTime = (scheduledTime || timeSlot || '').trim();
    // Preserve date-only conservative policy: wait until that IST calendar day has ended.
    if (!rawTime) return midnight + 86400000 - IST_OFFSET_MS;
    const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(rawTime);
    if (!clock) return null;
    hours = Number(clock[1]); minutes = Number(clock[2]); seconds = Number(clock[3] || 0);
    if (clock[4]) {
      if (hours < 1 || hours > 12) return null;
      hours = hours % 12 + (clock[4].toUpperCase() === 'PM' ? 12 : 0);
    }
  }
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return midnight + hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds - offset;
}
export function isScheduledTimePassed(scheduledDate?: string | null, scheduledTime?: string | null, timeSlot?: string | null, now = Date.now()): boolean {
  const target = scheduledTimeMs(scheduledDate, scheduledTime, timeSlot);
  return target !== null && Number.isFinite(now) && target <= now;
}
