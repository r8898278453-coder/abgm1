# Sales workflow reporting

21 November 2026 IST · P09-01

The private Sales work report now includes thirteen counts for committed events, including draft saves, approvals, retirements, enrollments, review creation and completion, API acceptance and exits. Appointment reminders have dedicated scheduling, review and exit counts.

The report uses the selected `Asia/Kolkata` day with an inclusive start and exclusive end. Event counts can overlap. API acceptance establishes the provider's acceptance of the request. Recipient delivery uses separate delivery evidence.

Current inventory includes seven counters for drafts, approved definitions, retired definitions, active enrollments, review, send settlement and expired open enrollments. The enrollment counts use the current database clock across all dates. Expired open enrollments appear in the cleanup count. Terminal enrollments are outside current workload.

The existing private Sales report route reads these counts in the same read-only snapshot as its other sections. Operators see aggregate counts for the selected client. Audit notes, contact identities and message content stay outside the new projection. Database schema remains 064. The main daily work report and frozen captures require additional integration to include workflow counters.

[27-item checklist](SALES_WORKFLOW_REPORT_BATCH.csv) · [Verification](evidence/sales-workflow-report.json) · [Main tracker](STATUS.md)
