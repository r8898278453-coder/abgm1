import {IST_OFFSET_MS} from '../shared/platformTime';
import crypto from 'node:crypto';
import type {Connection,Pool,PoolConnection} from 'mysql2/promise';
import type {DbContentPost} from './db';
export function normalizeContentPost(post:Omit<DbContentPost,'id'> & {id?:string}):DbContentPost{
  const todayIST=new Date(Date.now()+IST_OFFSET_MS).toISOString().slice(0,10);
  const newPost: DbContentPost = {
    id: post.id || `post_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    company_id: post.company_id,
    campaign_id: post.campaign_id || null,
    title: post.title || 'Untitled Post',
    type: post.type || 'offer',
    platforms: post.platforms && post.platforms.length > 0 ? post.platforms : ['google'],
    channel: post.channel || post.platforms?.[0] || 'google',
    headline: post.headline || '',
    caption: post.caption,
    cta: post.cta || '',
    image_url: post.image_url || undefined,
    video_url: post.video_url || undefined,
    status: post.status || 'scheduled',
    scheduled_date: post.scheduled_date || todayIST,
    scheduled_time: post.scheduled_time || post.time_slot || '10:00:00',
    time_slot: post.time_slot || post.scheduled_time || '10:00 AM',
    hashtags: post.hashtags || [],
    reel_script: post.reel_script || undefined,
    created_at: new Date().toISOString(),
  };
  return newPost;
}
export async function insertContentPost(db:Connection|Pool|PoolConnection,newPost:DbContentPost):Promise<void>{
      await db.query(
        `INSERT INTO content_posts (id, company_id, campaign_id, title, type, platforms, channel, headline, caption, cta, image_url, video_url, status, scheduled_date, scheduled_time, time_slot, hashtags, reel_script)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newPost.id,
          newPost.company_id || null,
          newPost.campaign_id || null,
          newPost.title || null,
          newPost.type || 'offer',
          JSON.stringify(newPost.platforms || []),
          newPost.channel,
          newPost.headline || null,
          newPost.caption,
          newPost.cta || null,
          newPost.image_url || null,
          newPost.video_url || null,
          newPost.status,
          newPost.scheduled_date || null,
          newPost.scheduled_time || null,
          newPost.time_slot || null,
          JSON.stringify(newPost.hashtags || []),
          newPost.reel_script ? JSON.stringify(newPost.reel_script) : null,
        ]
      );
}
