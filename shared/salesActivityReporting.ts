/** Recorded transitions, not distinct contacts, consent grants, pipeline value or sales. */
export const SALES_ACTIVITY={
 prospectImportBatches:'Prospect import batches committed',
 prospectRowsImported:'Prospect rows created as new leads',
 prospectRowsNotImported:'Prospect rows not imported',
 salesInboundRecorded:'Inbound sales messages recorded',
 salesInboundAmbiguous:'Inbound sales messages with ambiguous identity',
 salesInboundOptOut:'Inbound sales opt-outs recorded',
 salesQualificationsRecorded:'Sales qualification revisions recorded',
 salesQualificationsReview:'Qualification revisions requiring human review',
 salesOpportunitiesUpdated:'Sales opportunity revisions recorded',
 salesPermissionsUpdated:'Contact permission revisions recorded',
 salesPoliciesUpdated:'Sales policy revisions recorded',
} as const;
