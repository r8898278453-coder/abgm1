# Appointment outcomes and declared sources

20 November 2026 IST · P07-05 and P08-05

Select a lead in the Sales workspace and load **Appointment outcomes**. The latest 20 ended appointments are available for review. An authorized operator chooses Held, No-show or Undetermined and records supporting evidence. Each declaration is attached to the exact confirmed booking revision. A future or cancelled booking cannot receive an outcome. A pending Calendar mutation for the viewed revision must be reconciled before declaring attendance.

An initial write and each correction create a new evidence revision. Exact retries reuse the original receipt. Concurrent edits against the same revision admit one change. The first declaration preserves the normalized lead source at the time of recording. Later lead edits and outcome corrections preserve that source. Unrecognized source declarations remain Unknown.

The IST Sales report groups appointments by the saved scheduled end. Held, No-show, Undetermined and Unrecorded are separate counts. A later booking revision for the same external event supersedes earlier versions. Superseded declarations remain visible in the lead’s history and count separately from current attendance, so one event is not counted twice. A superseded historical declaration can be corrected to Undetermined. A separate appointment with a distinct event ID remains independently reportable.

The report shows aggregate declared-source counts without evidence notes. Attendance is operator-declared. Calendar status, conversion revenue and first/last-touch attribution require their own evidence. Existing frozen reports retain their original schema.

Migration 062 adds the append-only evidence ledger. Live provider validation, the inquiry-to-booking pilot and broader attribution acceptance remain open. [Local acceptance evidence](evidence/appointment-outcomes.json)
