export const NOTIFICATION_DAILY_ACTIVITY={
 dailyDigestAccepted:'Daily digest slots API-accepted',
 dailyDigestUnknown:'Daily digest slots unconfirmed',
 dailyDigestRunning:'Daily digest slots running inside the claim window',
 dailyDigestStale:'Daily digest slots running beyond the claim window',
 reviewReminderAccepted:'Review reminder slots API-accepted',
 reviewReminderUnknown:'Review reminder slots unconfirmed',
 reviewReminderRunning:'Review reminder slots running inside the claim window',
 reviewReminderStale:'Review reminder slots running beyond the claim window',
 criticalAlertAccepted:'Critical alert slots API-accepted',
 criticalAlertUnknown:'Critical alert slots unconfirmed',
 criticalAlertRunning:'Critical alert slots running inside the claim window',
 criticalAlertStale:'Critical alert slots running beyond the claim window',
} as const;

export const NOTIFICATION_DAILY_BACKLOG={
 notificationsRunning:'Current notification claims inside the claim window',
 notificationsStale:'Current notification claims beyond the claim window',
 notificationsUnconfirmed:'Retained unconfirmed notification occurrences',
} as const;
