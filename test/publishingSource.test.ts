import assert from 'node:assert/strict';
import {publishingSourceVersion as version} from '../server/publishingSource';
const source={id:'post',company_id:'company',status:'draft' as const,caption:'approved',platforms:['facebook'],hashtags:['#tag']};
assert.equal(version(source),version({...source,platforms:JSON.stringify(source.platforms),hashtags:JSON.stringify(source.hashtags)} as any));
for(const change of [{scheduled_date:'2026-11-04'},{scheduled_time:'10:00'},{time_slot:'11:00'},{workflow_revision:1},{caption:'edited'},{company_id:'other'},{status:'pending_approval'},{platforms:['instagram']},{hashtags:['#new']},{image_url:'changed'},{headline:'changed'},{video_url:'changed'}])assert.notEqual(version(source),version({...source,...change} as any));
assert.equal(version({...source,platforms:undefined}),version({...source,platforms:['google']}));
console.log('Publishing source versions: SQL/hydrated JSON parity and tenant/status/content/target/media changes passed.');
