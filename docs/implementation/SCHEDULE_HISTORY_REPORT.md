# Daily publishing schedule history

21 November 2026 IST · P09-01

The private daily dashboard and CSV include six timestamp-form schedule counts. They show currently saved posts whose resolved timestamp falls on the selected IST day, same-day admissions, other-day admissions, and posts without retained admission including approval and scheduled subsets. The report reuses the scheduler parser for naive IST timestamps, explicit offsets and legacy full timestamps stored in the time field.

V11 date-only metrics retain their existing definition. A date-only value paired with a legacy full timestamp can appear in both groups. These live groups can change as dates or admissions are updated. The timestamp reader checks a bounded candidate window around the selected day. If the client exceeds 2,000 candidates in that window, the aggregate is unavailable instead of presenting partial counts.

Five history counts use committed reschedule audit rows on the recorded IST day. They cover total revisions, distinct posts and the recorded status before and after each edit. Each reschedule can contribute to multiple counts. Historical coverage depends on the saved audit ledger. Original schedule values, notes and post content stay outside the report.

Manual and scheduled captures write V12. V1–V11 retain their original coverage, payloads and hashes. Comparisons require equal coverage. Release V12-capable readers and workers together before writing new captures. Public reports retain their approved metric allowlist. The database schema stays at 064.

[Calendar plan daily reporting](CALENDAR_PLAN_DAILY_REPORT.md) connects saved slots to drafts, retained admissions and recorded publish claims. Remaining P09-01 work includes the other modules.

[23-item checklist](SCHEDULE_HISTORY_REPORT_BATCH.csv) · [Verification](evidence/schedule-history-report.json) · [Main tracker](STATUS.md)
