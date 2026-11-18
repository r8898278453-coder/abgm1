/** Current local marketing evidence. A saved flag, text draft or provider failure is never verification. */
export const RANK_FRESH_MS=7*86400000;
export function currentObservation(row:any,now=Date.now()){
 const stamp=Date.parse(row?.timestamp||row?.lastObservedAt||row?.lastScannedAt||'');
 return ['LIVE','VERIFIED'].includes(row?.status||row?.dataClassification)&&typeof row?.provider==='string'&&!['unknown','unconfigured','manual','mock_test_provider'].includes(row.provider)&&Number.isFinite(stamp)&&stamp<=now+300000&&now-stamp<=RANK_FRESH_MS;
}
export function currentRank(row:any,now=Date.now()){return ['dataforseo','serpapi'].includes(row?.provider)&&currentObservation(row,now);}
export function rankPosition(value:unknown):number|null{return typeof value==='number'&&Number.isInteger(value)&&value>0&&value<=100?value:null;}
export function providerRating(value:unknown):number|null{return typeof value==='number'&&Number.isFinite(value)&&value>=1&&value<=5?value:null;}
export function providerCount(value:unknown):number|null{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=2147483647?value:null;}
export function normalizedBusinessName(value:unknown){return typeof value==='string'?value.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]/gu,''):'';}
export function samePlace(target:unknown,candidate:unknown){return typeof target==='string'&&!!target.trim()&&typeof candidate==='string'&&target.trim()===candidate.trim();}
/** Explicit provider identity wins; conflicting IDs never fall back to a similar name. */
export function rankIdentity(targetPlace:unknown,targetName:unknown,candidate:any){return typeof targetPlace==='string'&&targetPlace.trim()?samePlace(targetPlace,candidate?.place_id||candidate?.placeId):false;}
export function googleProfileCompleteness(profile:any){const present=(v:any,min:number)=>typeof v==='string'&&v.trim().length>=min;const fields={name:present(profile?.name,2),address:present(profile?.address,4),phone:present(profile?.phone,6),openingHours:present(profile?.openingHours,4),description:present(profile?.description,11)};const available=fields.address||fields.phone||fields.openingHours||fields.description;return{fields,score:available?Object.values(fields).filter(Boolean).length*20:null,formula:'20 × number of populated saved name/address/phone/openingHours/description fields; requires a detail beyond name; maximum 100',source:'Saved business profile; user-entered completeness, not Google health, OAuth or ranking'};}
export function providerResponseRows(data:any,kind:'dataforseo'|'serpapi'){
 if(kind==='dataforseo'){const task=data?.tasks?.[0];if(data?.status_code!==20000||task?.status_code!==20000||!Array.isArray(task.result)||task.result.length!==1||!Array.isArray(task.result[0]?.items))throw Error('RANK_PROVIDER_RESULT_UNAVAILABLE');return task.result[0].items.slice(0,100);}
 if(data?.error||!Array.isArray(data?.local_results))throw Error('RANK_PROVIDER_RESULT_UNAVAILABLE');return data.local_results.slice(0,100);
}
