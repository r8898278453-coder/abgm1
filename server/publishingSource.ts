import {createHash} from 'node:crypto';
import type {DbContentPost} from './db';
/** Same representation for mysql JSON strings and hydrated application posts. */
export function publishingSourceVersion(post:Partial<DbContentPost>):string{
  const list=(value:unknown):unknown=>{
    if(typeof value==='string'){try{return JSON.parse(value);}catch{return {invalid:value};}}
    return value || [];
  };
  return createHash('sha256').update(JSON.stringify([
    post.id,post.company_id,post.status,String(post.workflow_revision || 0),post.title || '',post.headline || '',post.caption || '',post.cta || '',
    list(post.hashtags),list(post.platforms || ['google']),post.channel || 'google',post.image_url || '',post.video_url || '',
    post.scheduled_date || '',post.scheduled_time || '',post.time_slot || '',
  ])).digest('hex');
}
