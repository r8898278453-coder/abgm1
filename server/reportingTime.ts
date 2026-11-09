export function recordTime(record: { created_at?: string; date?: string }): number | null {
  const primary = record.created_at ? Date.parse(record.created_at) : NaN;
  const fallback = record.date ? Date.parse(record.date) : NaN;
  const time = Number.isFinite(primary) ? primary : fallback;
  return Number.isFinite(time) ? time : null;
}
export function isInReportWindow(record: { created_at?: string; date?: string }, start: number, end: number): boolean {
  const time = recordTime(record);
  return time !== null && time >= start && time < end;
}
export function isOverdueUnrepliedReview(record: { created_at?: string; date?: string; replied?: boolean | number; reply_text?: string }, now: number): boolean {
  if (record.replied || record.reply_text?.trim()) return false;
  const time = recordTime(record);
  // Relative descriptions cannot establish an exact older-than-24-hour boundary.
  return time !== null && time < now - 24 * 60 * 60 * 1000;
}
