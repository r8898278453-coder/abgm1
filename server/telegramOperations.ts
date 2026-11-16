import {TelegramIdentityError} from './telegramIdentity';
import {validateTelegramIdentityProof} from '../shared/telegramIdentity';
import { createHash } from 'node:crypto';
import type { Express, Request } from 'express';
import { isGlobalEmergencyStopActive } from './executionStop';
export function telegramConfiguration(company: string, rows: any[]) {
    if (!Array.isArray(rows) || rows.some(r => !r || r.company_id !== company))
        throw new Error('TELEGRAM_CONFIGURATION_SCOPE_INVALID');
    const candidates = rows.filter(r => r.provider === 'telegram_bot');
    if (candidates.length > 1)
        throw new Error('TELEGRAM_CONFIGURATION_AMBIGUOUS');
    const row = candidates[0], base = { botId: null as string | null, destinationFingerprint: null as string | null, identityVerified: false as const, recipientDeliveryVerified: false as const, transportEnabled: false };
    if (!row)
        return { ...base, state: 'NOT_CONFIGURED' as const };
    const token = row.credentials?.botToken, chat = row.credentials?.chatId;
    if (typeof token !== 'string' || !/^\d{1,32}:[A-Za-z0-9_-]+$/.test(token) || typeof chat !== 'string' || !/^-?\d{1,32}$/.test(chat) || !['connected', 'disconnected', 'error', 'pending'].includes(row.status))
        return { ...base, state: 'INVALID' as const };
    return { ...base, state: row.status === 'error' ? 'ERROR' as const : 'SAVED' as const, botId: token.split(':')[0], destinationFingerprint: createHash('sha256').update(chat).digest('hex').slice(0, 12), transportEnabled: row.status === 'connected' };
}
export function registerTelegramOperations(app: Express, deps: {
    auth: (req: Request) => Promise<any>;
    access: (user: any, company: string, operation: 'read' | 'execute' | 'manage') => Promise<{
        authorized: boolean;
        status: number;
    }>;
    integrations: (company: string) => Promise<any[]>;
    stopped?: () => boolean;
    identity?: (company:string,rows:any[])=>Promise<any>;
    verifyIdentity?: (user:any,company:string)=>Promise<any>;
}) {
    app.post('/api/companies/:companyId/telegram-identity/verify',async(req,res)=>{res.set('Cache-Control','no-store');try{const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'AUTH_REQUIRED'});return;}const company=req.params.companyId;if(!company||company.length>64||Object.keys(req.query).length||!req.body||Array.isArray(req.body)||typeof req.body!=='object'||Object.keys(req.body).length)throw new TelegramIdentityError(400,'TELEGRAM_IDENTITY_INPUT_INVALID');const access=await deps.access(user,company,'manage');if(!access.authorized){res.status(access.status).json({success:false,error:'TELEGRAM_IDENTITY_ACCESS_DENIED'});return;}if(!deps.verifyIdentity)throw new Error();const identity=await deps.verifyIdentity(user,company);res.json({success:true,companyId:company,identity,recipientDelivery:'UNVERIFIED'});}catch(e){res.status(e instanceof TelegramIdentityError?e.status:503).json({success:false,error:e instanceof TelegramIdentityError?e.code:'TELEGRAM_IDENTITY_UNAVAILABLE'});}});
    app.get('/api/companies/:companyId/telegram-operations', async (req, res) => { res.set('Cache-Control', 'no-store'); try {
        const user = await deps.auth(req);
        if (!user) {
            res.status(401).json({ success: false, error: 'AUTH_REQUIRED' });
            return;
        }
        const company = req.params.companyId;
        if (!company || company.length > 64 || Object.keys(req.query).length) {
            res.status(400).json({ success: false, error: 'TELEGRAM_SCOPE_INVALID' });
            return;
        }
        const access = await deps.access(user, company, 'read');
        if (!access.authorized) {
            res.status(access.status).json({ success: false, error: 'TELEGRAM_ACCESS_DENIED' });
            return;
        }
        const rows=await deps.integrations(company), permission = await deps.access(user, company, 'execute'), integration:any = telegramConfiguration(company, rows), emergencyStopped = (deps.stopped || isGlobalEmergencyStopActive)();
        const identity=deps.identity?await deps.identity(company,rows):null;if(identity){integration.identityProof=validateTelegramIdentityProof(identity,integration.botId,Date.now());integration.identityVerified=true;}
        const canVerifyIdentity=Boolean(deps.verifyIdentity)&&(await deps.access(user,company,'manage')).authorized&&integration.state==='SAVED'&&integration.transportEnabled;
        res.json({ success: true, companyId: company, readOnly: true, checkedAtMs: Date.now(), emergencyStopped, canVerifyIdentity, canExecute:permission.authorized, canNotify: permission.authorized && integration.state === 'SAVED' && integration.transportEnabled && !emergencyStopped, integration });
    }
    catch {
        res.status(503).json({ success: false, error: 'TELEGRAM_OPERATIONS_UNAVAILABLE' });
    } });
}
