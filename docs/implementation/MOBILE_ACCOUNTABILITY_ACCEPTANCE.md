# Mobile workflows and agency accountability, 20 November 2026 IST

The workspace navigation now collapses below the desktop breakpoint. The mobile toggle exposes its expanded state, works with the keyboard and closes after selecting a tool. The report uses a single-column metric layout on narrow screens. Reply review fields fit the content width and long unbroken reply text wraps within the preview.

The SQL fixture creates a dental clinic, a manufacturing client and an empty workspace. It records one cost declaration for the clinic and two for manufacturing at the IST day boundary, then reads the canonical daily work report through HTTP. The owner receives the respective 1, 2 and 0 counts. The empty workspace has zero activity and backlog. The assigned viewer reads the clinic report, and other client scopes are denied. Reports omit the private cost notes.

Local acceptance covers the original P09-07 mobile workflows and the P09-08 agency accountability scenarios. P09-01 still tracks broader plan-to-outcome reconciliation. The acceptance uses disposable SQL and local Chromium with intercepted provider traffic. The live hosting and outbound pilot gates remain open.

All 157 default regressions and seven Chromium workflows passed. Native MariaDB, TypeScript, production build and frontend budget checks also passed. [Verification record](evidence/mobile-accountability-acceptance.json)
