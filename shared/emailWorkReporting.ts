export const EMAIL_WORK_ACTIVITY={
 emailSent:'Emails reported sent',
 emailDelayed:'Emails with delivery delays',
 emailDelivered:'Emails reported delivered',
 emailFailed:'Emails reported failed',
 emailBounced:'Emails reported bounced',
 emailSuppressed:'Emails reported suppressed',
 emailComplained:'Emails with spam complaints',
 emailRepliesLinked:'Linked email replies',
 emailReplyOptOuts:'Opt-outs from linked email replies',
 emailIntakesQueued:'Email replies admitted for recovery',
 emailIntakesRecorded:'Email reply intakes recorded',
 emailIntakesIgnored:'Email reply intakes ignored',
 emailIntakesFailed:'Email reply intakes failed',
 emailIntakesExpired:'Email reply intakes expired',
} as const;

export const EMAIL_WORK_BACKLOG={
 emailIntakesPending:'Email reply intakes pending',
 emailIntakesRunning:'Email reply intakes running',
} as const;
