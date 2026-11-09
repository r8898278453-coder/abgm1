import {normalizeWebsiteDomain} from '../shared/website';
import {IntegrationAccessError} from './integrationAccess';
export async function inspectDomainIntegration(company:string,value:unknown,deps:{domains:(company:string)=>Promise<any[]>;verify:(...args:any[])=>Promise<any>}){
 if(typeof value!=='string'||value.length>2048)throw new IntegrationAccessError(400,'DOMAIN_URL_INVALID');
 let domain:string;try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)throw new Error();domain=normalizeWebsiteDomain(url.hostname);}catch{throw new IntegrationAccessError(400,'DOMAIN_URL_INVALID');}
 const domains=await deps.domains(company);if(!Array.isArray(domains)||domains.some(row=>row.company_id!==company))throw new IntegrationAccessError(503,'DOMAIN_EVIDENCE_UNAVAILABLE');
 const record=domains.find(row=>row.domain===domain);if(!record)throw new IntegrationAccessError(400,'DOMAIN_REGISTRATION_REQUIRED');
 const proof=await deps.verify(record.domain,record.cname_target,record.a_record_target,record.dns_txt_record);
 if(proof.unavailable)throw new IntegrationAccessError(503,'DOMAIN_EVIDENCE_UNAVAILABLE');
 return {success:proof.verified===true,companyId:company,status:proof.verified?'DNS_OBSERVED':'PENDING_VERIFICATION',sslState:'UNVERIFIED',message:proof.verified?'Ownership TXT and routing observed. Hosting attachment, deployment and TLS remain unverified.':'Matching ownership TXT and routing required. Use domain verification in Website Builder.'};
}
