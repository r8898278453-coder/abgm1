import assert from 'node:assert/strict';
import {validateAgencyOperationsDetail} from '../shared/agencyOperationsDetail';
import {CAPACITY_KEYS,capacityRows} from '../shared/operationalCapacity';
import {platformDateKey} from '../shared/dailyWorkReport';
const now=Date.now(),v={companyId:'A',modelVersion:1,timeZone:'Asia/Kolkata',checkedAtMs:now,connections:[{provider:'google_gmb_oauth',status:'saved'}],declaredCostMinor:{INR:'123',USD:'45'},providerHealth:'UNVERIFIED',costEvidence:'DECLARED_UNVERIFIED',revenue:null,roi:null,capacity:{companyId:'A',modelVersion:1,timeZone:'Asia/Kolkata',checkedAtMs:now,dayIST:platformDateKey(now),resources:capacityRows(Object.fromEntries(CAPACITY_KEYS.map(k=>[k,0])))}};
assert.equal(validateAgencyOperationsDetail(v,'A'),v);
for(const patch of [{companyId:'B'},{roi:1},{providerHealth:'HEALTHY'},{declaredCostMinor:{INR:123}},{declaredCostMinor:{USD:'01'}},{connections:[{provider:'google',status:'saved',token:'secret'}]},{secret:'private'},{capacity:{...v.capacity,companyId:'B'}}])assert.throws(()=>validateAgencyOperationsDetail({...v,...patch},'A'));
console.log('Agency detail: exact private contract, same-client capacity, separate currency declarations and forged health/revenue/secret rejection passed.');
