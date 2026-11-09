/** Public connection diagnostics never return raw provider objects/errors/credentials. */
export function publicIntegrationCheck(result:any){
 const companyId=typeof result.companyId==='string'?{companyId:result.companyId}:{};
 if(['DNS_OBSERVED','PENDING_VERIFICATION'].includes(result.status))return {success:result.success===true,...companyId,status:result.status,sslState:'UNVERIFIED',message:result.status==='DNS_OBSERVED'?'Ownership TXT and routing observed. Deployment and TLS remain unverified.':'Ownership TXT and routing not confirmed. Use Website Builder domain verification.'};
 if(result.status==='NOT_VERIFIED')return {success:false,status:'NOT_VERIFIED',error:'Configuration is present; no live authorization check was completed.'};
 return result.success===true?{success:true,status:'CONNECTION_CHECK_PASSED',message:'Provider responded to this connection check. Sending permissions, delivery and publication remain separately verified.'}:{success:false,status:'CHECK_FAILED',error:'Integration check failed or unavailable. Check this client’s credentials and required permissions.'};
}
