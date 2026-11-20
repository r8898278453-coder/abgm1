import {validateOperationalCapacity} from './operationalCapacity';
export function validateAgencyOperationsDetail(v:any,company:string){
 if(v&&Object.keys(v).some(k=>!['success','companyId','checkedAtMs','connections','declaredCostMinor','modelVersion','timeZone','capacity','providerHealth','costEvidence','revenue','roi'].includes(k)))throw Error('AGENCY_DETAIL_FIELDS');
 if(!v||v.companyId!==company||v.modelVersion!==1||v.timeZone!=='Asia/Kolkata'||!Number.isSafeInteger(v.checkedAtMs)||v.checkedAtMs<0||v.providerHealth!=='UNVERIFIED'||v.costEvidence!=='DECLARED_UNVERIFIED'||v.revenue!==null||v.roi!==null||!Array.isArray(v.connections)||v.connections.length>100||!v.declaredCostMinor||typeof v.declaredCostMinor!=='object'||Array.isArray(v.declaredCostMinor))throw Error('AGENCY_DETAIL_INVALID');
 for(const r of v.connections)if(!r||Object.keys(r).sort().join(',')!=='provider,status'||typeof r.provider!=='string'||r.provider.length>100||typeof r.status!=='string'||r.status.length>64)throw Error('AGENCY_CONNECTION_INVALID');
 for(const[k,n]of Object.entries(v.declaredCostMinor))if(!/^[A-Z]{3}$/.test(k)||typeof n!=='string'||!/^(0|[1-9]\d{0,30})$/.test(n))throw Error('AGENCY_COST_INVALID');
 validateOperationalCapacity(v.capacity,company);return v;
}
