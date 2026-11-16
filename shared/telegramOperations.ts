export const TELEGRAM_CONFIG_STATES = ['NOT_CONFIGURED', 'SAVED', 'ERROR', 'INVALID'] as const;
export function validateTelegramOperations(value: any, company: string) {
    if (value?.companyId !== company || value.readOnly !== true || typeof value.canNotify !== 'boolean' || typeof value.emergencyStopped !== 'boolean' || !TELEGRAM_CONFIG_STATES.includes(value.integration?.state) || typeof value.integration?.transportEnabled !== 'boolean' || value.integration.identityVerified !== false || value.integration.recipientDeliveryVerified !== false || value.integration.botId !== null && !/^\d{1,32}$/.test(value.integration.botId) || value.integration.destinationFingerprint !== null && !/^[a-f0-9]{12}$/.test(value.integration.destinationFingerprint) || !Number.isSafeInteger(value.checkedAtMs) || value.checkedAtMs < 0 || value.checkedAtMs > 8640000000000000)
        throw new Error('TELEGRAM_OPERATIONS_INVALID');
    if ((['SAVED', 'ERROR'].includes(value.integration.state) && (value.integration.botId === null || value.integration.destinationFingerprint === null)) || (value.integration.transportEnabled && value.integration.state !== 'SAVED'))
        throw new Error('TELEGRAM_OPERATIONS_CONTRADICTORY');
    if (value.canNotify && (value.emergencyStopped || value.integration.state !== 'SAVED' || !value.integration.transportEnabled))
        throw new Error('TELEGRAM_OPERATIONS_CONTRADICTORY');
    return value;
}
export function confirmedManualTelegram(result:any,company:string,key:string){return result?.success===true&&result.companyId===company&&result.requestKey===key&&result.outcome==='API_ACCEPTED'&&result.recipientDelivery==='UNVERIFIED'&&result.persisted===true&&result.intent?.requestKey===key&&result.intent?.state==='API_ACCEPTED'&&typeof result.intent.providerId==='string'&&/^[1-9][0-9]{0,31}$/.test(result.intent.providerId);}
