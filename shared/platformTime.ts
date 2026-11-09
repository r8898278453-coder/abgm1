/** Product-wide scheduling/display policy: fixed India time, independent of host TZ. */
export const PLATFORM_TIME_ZONE = 'Asia/Kolkata';
export const IST_OFFSET_MS = 330 * 60_000;
export function formatPlatformDateTime(value: string | number | Date): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `${date.toLocaleString('en-IN', { timeZone: PLATFORM_TIME_ZONE })} IST` : 'Time unavailable';
}
