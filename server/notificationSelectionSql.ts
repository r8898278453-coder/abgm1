// Both the selector and the read model use these saved-record predicates.
export const NOTIFICATION_CONNECTED_SQL=`EXISTS (SELECT 1 FROM company_integrations i WHERE i.company_id = c.id AND i.provider = 'telegram_bot' AND i.status = 'connected')`;
export const NOTIFICATION_ACTIVE_SQL=`EXISTS (SELECT 1 FROM client_operations o WHERE o.company_id=c.id AND o.status='ACTIVE')`;
export const NOTIFICATION_ENABLED_SQL=`EXISTS (SELECT 1 FROM notification_policies p WHERE p.company_id=c.id AND p.notification_kind=? AND p.enabled=1)`;
export const NOTIFICATION_HAS_TELEGRAM_SQL=`EXISTS (SELECT 1 FROM company_integrations i WHERE i.company_id=c.id AND i.provider='telegram_bot')`;
