import type { DbContentPost } from './db';
/** Shared canonical text for publishing and read-only verification. */
export function metaPublishingText(post:Pick<DbContentPost,'headline'|'caption'|'hashtags'>):string {
  return `${post.headline ? post.headline+'\n\n' : ''}${post.caption}\n\n${(post.hashtags || []).join(' ')}`.trim();
}
