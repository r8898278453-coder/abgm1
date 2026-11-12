import type {Express} from 'express';
import {INTEGRATION_CATALOG} from './integrationCatalog';
import {IntegrationAccessError,explicitIntegrationCompany} from './integrationAccess';
import {integrationDefinition} from '../shared/integrationRegistry';
import {maskIntegrationCredentials as maskCredentialsObj} from '../shared/integrationCredentials';
export function registerIntegrationMetadataRoutes(app:Express,deps:{getAuthUserFromRequest:any;verifyCompanyWorkspaceAccess:any;getCompanyIntegrations:any;isEmailServiceConfigured:any}){const {getAuthUserFromRequest,verifyCompanyWorkspaceAccess,getCompanyIntegrations,isEmailServiceConfigured}=deps;
app.get('/api/integrations', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    res.set('Cache-Control','no-store');
    const companyId=explicitIntegrationCompany(req.query),access=await verifyCompanyWorkspaceAccess(user,companyId);
    if(!access.authorized){res.status(access.status).json({success:false,error:'Integration workspace access denied'});return;}

    const storedIntegrations = await getCompanyIntegrations(companyId);

    // Also check server system-level env variables
    const systemTelegramConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

    // Standard list of providers
    const providers=INTEGRATION_CATALOG;

    const emailConfiguredOnServer = isEmailServiceConfigured();

    const result = providers.map((p) => {
      const definition=integrationDefinition(p.id)!;const matches=storedIntegrations.filter((i:any)=>[definition.canonical,...definition.aliases].includes(i.provider));if(matches.length>1)throw new IntegrationAccessError(409,'INTEGRATION_ALIAS_CONFLICT');const stored=matches[0];
      let isConnected = false;
      let statusText=stored?'Credentials saved; current permissions unverified':'Not configured';
      let lastTestedAt = stored?.last_tested_at || null;
      let lastError=stored?.last_error?'Previous check failed; recheck required':null;
      let maskedCreds = stored ? maskCredentialsObj(stored.credentials || {}) : {};

      if(!stored&&['telegram_bot','transactional_email','meta_ads'].includes(p.id)){isConnected=false;statusText='Client credentials not configured';}

      return {
        ...p,
        connected: isConnected,
        status: stored?(stored.status==='error'?'error':'saved'):'disconnected',
        statusText,
        lastTestedAt,
        lastError,
        maskedCredentials: maskedCreds,
      };
    });

    res.json({
      success: true,
      companyId,
      integrations: result,
      systemTelegramConfigured,
      systemEmailConfigured: emailConfiguredOnServer,
    });
  } catch (err: any) {
    res.status(err instanceof IntegrationAccessError?err.status:503).json({success:false,error:err instanceof IntegrationAccessError?err.code:'Integration metadata unavailable'});
  }
});

}
