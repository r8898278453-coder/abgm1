import assert from 'node:assert/strict';
import {validateAssetLibrary,assetLibraryCsv} from '../shared/assetLibrary';
import {assetReviewInput} from '../server/renderAssets';
const a:any={id:'one',label:'=PRIVATE_LABEL',assetType:'photo',url:'/uploads/A/a.png',revision:'18446744073709551615',reviewStatus:'APPROVED',licenseNote:'PRIVATE_RIGHTS_NOTE',fileState:'MATCHES_REVIEWED_FILE',observedHash:'a'.repeat(64),checkedAtMs:1000,duplicateIds:['two'],recordedDuplicateIds:['two']},b={...a,id:'two',duplicateIds:['one'],recordedDuplicateIds:['one']},report={model:1,companyId:'A',catalogVersion:'b'.repeat(64),catalogSize:2,checkedAtMs:1000,assets:[a,b],nextCursor:null};assert.equal(validateAssetLibrary(report,'A'),report);assert.throws(()=>validateAssetLibrary(report,'B'));for(const bad of [{...a,fileState:'REVOKED'},{...a,observedHash:null},{...a,duplicateIds:['foreign']},{...a,revision:'18446744073709551616'}])assert.throws(()=>validateAssetLibrary({...report,assets:[bad,b]},'A'));
assert.equal(validateAssetLibrary({...report,assets:[{...a,fileState:'FILE_UNAVAILABLE',observedHash:null,duplicateIds:[]},{...b,duplicateIds:[]}]},'A').assets.length,2);const csv=assetLibraryCsv(report,'A');assert.ok(csv.includes("'=PRIVATE_LABEL"));assert.equal(csv.includes('PRIVATE_RIGHTS_NOTE'),false);assert.equal(csv.includes('/uploads/'),false);assert.match(csv,/Asia\/Kolkata/);assert.match(csv,/recorded approval matches may be stale/);
for(const revision of ['0','18446744073709551614','18446744073709551615'])assert.equal(assetReviewInput.safeParse({expectedRevision:revision,decision:'REVOKED',licenseNote:'Reason'}).success,true);for(const revision of ['01','-1','18446744073709551616',1])assert.equal(assetReviewInput.safeParse({expectedRevision:revision,decision:'REVOKED',licenseNote:'Reason'}).success,false);
console.log('Asset library: strict current-file/review/hash/page-match/client contracts, exact uint64 review revisions, private CSV and recorded-vs-observed distinction passed.');
const approval = {expectedRevision:'1',decision:'APPROVED',licenseNote:'Client provided a rights declaration'};
for (const licenseThrough of ['2028-02-29', null, undefined]) {
 assert.ok(assetReviewInput.safeParse({...approval,licenseThrough}).success);
}
for (const licenseThrough of ['2027-02-29', '2026-11-21T18:30:00Z', '21/11/2026', 20261121]) {
 assert.equal(assetReviewInput.safeParse({...approval,licenseThrough}).success,false);
}

assert.ok(assetReviewInput.safeParse({...approval,licenseSource:'THIRD_PARTY_LICENSE'}).success);
assert.equal(assetReviewInput.safeParse({...approval,licenseSource:'UNKNOWN'}).success,false);
